/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameState, PlayerStats, LevelConfig } from './types';
import { audio } from './components/AudioEngine';
import { MainMenu } from './components/MainMenu';
import { StageSelector } from './components/StageSelector';
import { UpgradeShop } from './components/UpgradeShop';
import { GameCanvas } from './components/GameCanvas';
import { Sparkles, Trophy, Heart, ArrowRight, Play, ShoppingBag, RotateCcw, Volume2, VolumeX, Crown, Star } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'neko_adventure_save_01';

const initialStats: PlayerStats = {
  coins: 0,
  fishes: 0,
  maxHp: 3,
  currentHp: 3,
  speedLevel: 1,
  jumpLevel: 1,
  clawLevel: 1,
  magnetLevel: 1,
  unlockedStage: 1,
  shieldLevel: 1,
};

const levels: LevelConfig[] = [
  {
    id: 1,
    name: 'warm_meadow',
    jpName: '陽だまりの草原',
    description: '穏やかな日差しが差し込む広大な草原。基本的な足場があり、初心者に適しています。時々ネズミが偵察しているので気をつけて！',
    environment: 'grassland',
    bgColors: ['#38bdf8', '#bae6fd'], // Skies
    groundColor: '#78350f', // Dirt floor
    physics: {
      gravity: 0.35,
      friction: 0.88,
    },
    gimmicksDescription: 'バネの床（ハイジャンプ）、基本的なパトロールネズミ（踏みつけで討伐可能）。',
    targetScore: 1000,
    mapLength: 3600,
  },
  {
    id: 2,
    name: 'wet_sewer',
    jpName: '下水道のディープダイブ',
    description: '怪しい緑の液体が流れる薄暗い下水路。水の中にダイブすると、ジャンプや動きがふわふわになります。トゲの罠や凶暴なカニを乗り越えましょう。',
    environment: 'sewer',
    bgColors: ['#0f172a', '#1e293b'], // Sewer bricks depth
    groundColor: '#334155', // Grey concrete
    physics: {
      gravity: 0.35,
      friction: 0.88,
      waterPhysics: true,
    },
    gimmicksDescription: '水の中の浮力＆右へ流れる水流、トゲトゲ針の罠、一定時間で崩落する足場。',
    targetScore: 2500,
    mapLength: 3800,
  },
  {
    id: 3,
    name: 'cloud_realm',
    jpName: '天空にそびえる雲の城',
    description: 'お空の上にぽっかり浮かぶ伝説の宮殿。突如襲い来る強風は、猫ちゃんの走る速度を押し流します。奈落の底へ落ちないように慎重に雲を超えましょう！',
    environment: 'sky_castle',
    bgColors: ['#4f46e5', '#a5b4fc'], // Sky purple-blue
    groundColor: '#475569', // Granite stones
    physics: {
      gravity: 0.32, // slightly light
      friction: 0.90,
      windForce: 0.05, // constant gust gusts physics
    },
    gimmicksDescription: '風向きが変わる突風ギミック、一定間隔で消え去る雲ブロック、急降下して襲うカラス鳥。',
    targetScore: 5000,
    mapLength: 4000,
  },
  {
    id: 4,
    name: 'magma_cave',
    jpName: '紅蓮の溶岩洞窟',
    description: '熱い熱気が渦巻く危険な古代の洞窟。足元に揺らめく溶岩池や、頭上から突然降り注ぐマグマ弾を回避しながら、赤く熱せられた足場を渡りきりましょう！',
    environment: 'magma_cave',
    bgColors: ['#110c1f', '#7f1d1d'], // Magma purple-dark-red
    groundColor: '#451a03', // Dark charcoal lava crust
    physics: {
      gravity: 0.36, // heavy atmosphere
      friction: 0.85,
    },
    gimmicksDescription: '立ち上る火の粉（マグマ弾）、火を吹くサラマンダー、灼熱の溶岩池（落ちると大ダメージ！）。',
    targetScore: 7500,
    mapLength: 4200,
  },
  {
    id: 5,
    name: 'cyber_space',
    jpName: '電脳サイバーシティ',
    description: 'デジタルノイズとネオン光が交錯する電脳ワールド。未来派ロボットネズミ、ワープ用エネルギーリング、そして低重力の反重力空間を大冒険！',
    environment: 'cyber_space',
    bgColors: ['#030712', '#1e1b4b'], // Dark cyber neon grid
    groundColor: '#0f172a', // Cyber metallic plate
    physics: {
      gravity: 0.25, // Anti-gravity / Low-gravity floating physics!
      friction: 0.92,
    },
    gimmicksDescription: '半重力エリアでの無限浮遊感、超高速に走るレーザービット、電脳界を守る巨大球体ボス。',
    targetScore: 10000,
    mapLength: 4500,
  },
  {
    id: 6,
    name: 'japanese_temple',
    jpName: '絢爛の和風神社',
    description: '桜吹雪が舞い散る、朱塗りの大鳥居や太鼓橋がそびえる神秘的な和風神社エリア。空中を飛び交う不気味な桜の手裏剣や、ゆらゆら浮遊する「狐火」の難関をくぐり抜け、最奥部に潜む「九尾の妖狐」に挑みましょう！',
    environment: 'japanese_temple',
    bgColors: ['#1c0d12', '#581c24'], // Cherry blossom crimson dark gradient
    groundColor: '#1a120b', // Lacquered wood / stone path style
    physics: {
      gravity: 0.32,
      friction: 0.89,
    },
    gimmicksDescription: '美しく華麗な桜吹雪の風。不規則に漂う幽玄な「狐火」、和傘のジャンプクッション。最深ボス「九尾の妖狐」。',
    targetScore: 12500,
    mapLength: 4800,
  },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [stats, setStats] = useState<PlayerStats>(initialStats);
  const [currentStageId, setCurrentStageId] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(audio.getMuteStatus());

  // Run stats and rewards calculations on victory/gameOver
  const [sessionCoinsGained, setSessionCoinsGained] = useState(0);
  const [sessionFishesGained, setSessionFishesGained] = useState(0);

  // Load Savestate inside LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // validate data compatibility
        if (parsed && typeof parsed.coins === 'number') {
          // Retroactively set clawlevel to at least 1 since upgrade is removed
          if (typeof parsed.clawLevel !== 'number' || parsed.clawLevel < 1) {
            parsed.clawLevel = 1;
          }
          if (typeof parsed.shieldLevel !== 'number' || parsed.shieldLevel < 1) {
            parsed.shieldLevel = 1;
          }
          setStats(parsed);
          setIsMuted(audio.getMuteStatus());
        }
      } catch (e) {
        console.error("Savestate parse failure, resetting stats:", e);
      }
    }
  }, []);

  // Manage Background Music (BGM) based on game state and selected stage
  useEffect(() => {
    if (gameState === GameState.MENU || gameState === GameState.STAGE_SELECT || gameState === GameState.SHOP) {
      audio.playBgm('/2_23_AM.mp3');
    } else if (gameState === GameState.PLAYING) {
      // Map stages to respective BGM track paths
      if (currentStageId === 1) {
        audio.playBgm('/少年達の夏休み的なBGM.mp3');
      } else if (currentStageId === 2) {
        audio.playBgm('/Flutter.mp3');
      } else if (currentStageId === 3) {
        audio.playBgm('/パステルハウス.mp3');
      } else if (currentStageId === 4) {
        audio.playBgm('/Thunderbolt.mp3');
      } else if (currentStageId === 5) {
        audio.playBgm('/8-bit_Aggressive1.mp3');
      } else if (currentStageId === 6) {
        audio.playBgm('/風切.mp3');
      }
    } else if (gameState === GameState.GAME_OVER || gameState === GameState.GAME_CLEAR) {
      // Pause/stop stage BGM so the specialized game over or clear melody plays perfectly
      audio.stopBgm();
    }
  }, [gameState, currentStageId]);

  const saveStats = (newStats: PlayerStats) => {
    setStats(newStats);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newStats));
  };

  const handlePurchaseUpgrade = (id: string, costType: 'coin' | 'fish', cost: number) => {
    const updated = { ...stats };
    
    // Deduct cost
    if (costType === 'coin') {
      updated.coins -= cost;
    } else {
      updated.fishes -= cost;
    }

    // Apply upgrade
    if (id === 'maxHp') {
      updated.maxHp += 1;
      updated.currentHp = updated.maxHp; // Heal fully on upgrading max hearts
    } else if (id === 'speedLevel') {
      updated.speedLevel += 1;
    } else if (id === 'jumpLevel') {
      updated.jumpLevel += 1;
    } else if (id === 'clawLevel') {
      updated.clawLevel += 1;
    } else if (id === 'magnetLevel') {
      updated.magnetLevel += 1;
    } else if (id === 'shieldLevel') {
      updated.shieldLevel += 1;
    }

    audio.playPurchase();
    saveStats(updated);
  };

  const handleStageSelection = (stageId: number) => {
    const updated = { ...stats };
    updated.currentHp = stats.maxHp; // Heal player fully for a new run
    saveStats(updated);

    setCurrentStageId(stageId);
    setGameState(GameState.PLAYING);
  };

  const handleCoinsAdd = (amount: number) => {
    // Collect during ongoing active level run
  };

  const handleFishesAdd = (amount: number) => {
    // Collect during ongoing active level run
  };

  const handleHpChanged = (hp: number) => {
    // HUD syncing
  };

  const handleClearStage = (coinsCollected: number, fishesCollected: number) => {
    setSessionCoinsGained(coinsCollected);
    setSessionFishesGained(fishesCollected);

    const updated = { ...stats };
    updated.coins += coinsCollected;
    updated.fishes += fishesCollected;
    
    // Unlock next stage if cleared current
    if (currentStageId === stats.unlockedStage && currentStageId < levels.length) {
      updated.unlockedStage = currentStageId + 1;
    }

    saveStats(updated);
    setGameState(GameState.GAME_CLEAR);
  };

  const handleGameOver = () => {
    audio.playGameOver();
    setGameState(GameState.GAME_OVER);
  };

  const handleResetStats = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setStats(initialStats);
    setGameState(GameState.MENU);
  };

  const handleToggleMute = () => {
    const mutedStatus = audio.toggleMute();
    setIsMuted(mutedStatus);
    audio.playClick();
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans leading-normal tracking-wide flex flex-col justify-between">
      
      {/* Top Main navigation bar overlay */}
      <header className="bg-slate-900 border-b border-slate-800 text-white px-6 py-4 flex justify-between items-center z-40 select-none">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-bounce">🐱</span>
          <div>
            <h1 className="text-lg font-bold font-pixel tracking-wider text-amber-400">Neko Adventure</h1>
            <p className="text-[10px] text-slate-400 font-sans tracking-widest uppercase">Chibi Cat Side-Scroll Act</p>
          </div>
        </div>

        {/* Global Sound controller */}
        <button
          onClick={handleToggleMute}
          className="p-2 border border-slate-700 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition flex items-center gap-2 text-xs font-pixel font-bold"
          title="ミュート切り替え"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-red-400" />
              <span className="text-red-400">消音</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">音あり</span>
            </>
          )}
        </button>
      </header>

      {/* Primary State Screen Router */}
      <main className="flex-1 flex items-center justify-center">
        {gameState === GameState.MENU && (
          <MainMenu 
            stats={stats}
            onStartGame={() => setGameState(GameState.STAGE_SELECT)}
            onOpenShop={() => setGameState(GameState.SHOP)}
            onResetStats={handleResetStats}
          />
        )}

        {gameState === GameState.STAGE_SELECT && (
          <StageSelector 
            stats={stats}
            levels={levels}
            onSelectStage={handleStageSelection}
            onOpenShop={() => setGameState(GameState.SHOP)}
            onBackToMenu={() => setGameState(GameState.MENU)}
          />
        )}

        {gameState === GameState.SHOP && (
          <UpgradeShop 
            stats={stats}
            onPurchaseUpgrade={handlePurchaseUpgrade}
            onClose={() => setGameState(GameState.STAGE_SELECT)}
          />
        )}

        {gameState === GameState.PLAYING && (
          <div className="p-4 w-full flex justify-center">
            <GameCanvas 
              stats={stats}
              currentStageId={currentStageId}
              levelConfig={levels.find(l => l.id === currentStageId) || levels[0]}
              onCoinsCollected={handleCoinsAdd}
              onFishesCollected={handleFishesAdd}
              onHpChanged={handleHpChanged}
              onClearStage={handleClearStage}
              onGameOver={handleGameOver}
              onPauseToggle={() => {}}
              onBackToMenu={() => setGameState(GameState.STAGE_SELECT)}
            />
          </div>
        )}

        {/* Custom Game Over Overlay Screen */}
        {gameState === GameState.GAME_OVER && (
          <div className="w-full max-w-lg p-6 mx-4 bg-slate-900 border-4 border-slate-950 rounded-3xl shadow-2xl text-center text-white font-pixel animate-fade-in my-8">
            <div className="text-7xl mb-4 animate-bounce">☠️</div>
            <h2 className="text-3xl text-red-500 font-bold tracking-widest mb-2 uppercase">Game Over</h2>
            <p className="text-xs font-sans text-slate-400 max-w-sm mx-auto leading-relaxed mb-6">
              ライフが尽きてしまいました。敵を踏むか、駄菓子屋で攻撃や体力を強化して、もう一度挑戦しましょう！
            </p>

            {/* Stage Quick stats summary */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex justify-around items-center mb-8 max-w-xs mx-auto">
              <div className="text-left">
                <div className="text-[10px] text-slate-500 font-sans uppercase">あきらめない心</div>
                <div className="text-yellow-400 font-bold text-sm">次こそクリア！</div>
              </div>
              <div className="w-[1px] h-8 bg-slate-800" />
              <div className="text-left font-sans text-xs text-slate-300">
                <span>合計コイン: 🪙 {stats.coins}</span>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
              <button
                onClick={() => {
                  audio.playClick();
                  setGameState(GameState.PLAYING);
                }}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-xl font-bold border-2 border-slate-950 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[0px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>もう一回にゃ！</span>
              </button>
              
              <button
                onClick={() => {
                  audio.playClick();
                  setGameState(GameState.STAGE_SELECT);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold border-2 border-slate-950 transition cursor-pointer"
              >
                マップへ戻る 🗺️
              </button>
            </div>
          </div>
        )}

        {/* Custom Stage Victory Overlay Screen */}
        {gameState === GameState.GAME_CLEAR && (
          <div className="w-full max-w-lg p-6 mx-4 bg-slate-900 border-4 border-amber-400 rounded-3xl shadow-2xl text-center text-white font-pixel animate-fade-in my-8">
            <div className="inline-block relative mb-4">
              <span className="text-7xl animate-bounce inline-block">🎉</span>
              <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-4 animate-pulse" />
            </div>

            <h2 className="text-3xl text-yellow-400 font-bold tracking-widest mb-1">STAGE CLEARED!</h2>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-semibold mb-6">
              ステージを無事に突破しましたにゃん！
            </p>

            {/* Gold rewards card */}
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 max-w-md mx-auto space-y-3 mb-8">
              <div className="text-sm border-b border-slate-800/40 pb-2 flex justify-between items-center text-slate-300 font-sans">
                <span>獲得コイン:</span>
                <span className="font-pixel text-yellow-400 text-base font-bold">🪙 + {sessionCoinsGained}</span>
              </div>
              <div className="text-sm border-b border-slate-800/40 pb-2 flex justify-between items-center text-slate-300 font-sans">
                <span>獲得お魚:</span>
                <span className="font-pixel text-red-300 text-base font-bold">🐟 + {sessionFishesGained}</span>
              </div>
              
              {/* Grand status total */}
              <div className="pt-2 flex justify-between items-center text-xs font-sans text-slate-500">
                <span>お財布の合計:</span>
                <span className="font-pixel font-bold">🪙 {stats.coins} / 🐟 {stats.fishes}</span>
              </div>
            </div>

            {/* Branching paths forward */}
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center max-w-xs mx-auto">
              {currentStageId < levels.length ? (
                <button
                  onClick={() => {
                    audio.playClick();
                    // Go next stage
                    const nextId = currentStageId + 1;
                    setCurrentStageId(nextId);
                    setGameState(GameState.PLAYING);
                  }}
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-900 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 border-2 border-slate-950 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[0px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  <span>次のステージへ</span>
                  <ArrowRight className="w-4 h-4 stroke-[3px]" />
                </button>
              ) : (
                <div className="w-full bg-linear-to-r from-fuchsia-600 to-indigo-600 text-white p-3 rounded-xl border border-fuchsia-400 font-pixel font-bold mb-2 flex items-center gap-1 justify-center animate-pulse">
                  <Crown className="w-4 h-4" />
                  <span>全ステージ完全制覇！🏆</span>
                </div>
              )}

              <button
                onClick={() => {
                  audio.playClick();
                  setGameState(GameState.SHOP);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold py-3 rounded-xl border-2 border-slate-950 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>ショップで強化 🛒</span>
              </button>
            </div>
            
            <button
              onClick={() => {
                audio.playClick();
                setGameState(GameState.STAGE_SELECT);
              }}
              className="mt-4 text-[10px] font-sans text-slate-500 hover:text-slate-300 underline block mx-auto py-1"
            >
              ステージ選択へ戻る
            </button>
          </div>
        )}
      </main>

      {/* Footer credits disclaimer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-slate-500 text-[10px] select-none font-sans">
        <p>© 2026 Neko Adventure. All rights reserved. Powered by HTML5 Canvas & React.</p>
      </footer>

    </div>
  );
}
