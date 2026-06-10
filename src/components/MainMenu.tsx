import React, { useState } from 'react';
import { PlayerStats } from '../types';
import { audio } from './AudioEngine';
import { Play, ShoppingBag, Volume2, VolumeX, HelpCircle, Gamepad2, ArrowUp, Scissors, Compass } from 'lucide-react';

interface MainMenuProps {
  stats: PlayerStats;
  onStartGame: () => void;
  onOpenShop: () => void;
  onResetStats: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  stats,
  onStartGame,
  onOpenShop,
  onResetStats,
}) => {
  const [isMuted, setIsMuted] = useState(audio.getMuteStatus());
  const [showHowTo, setShowHowTo] = useState(false);

  const handleToggleMute = () => {
    const mutedStatus = audio.toggleMute();
    setIsMuted(mutedStatus);
    audio.playClick();
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-linear-to-br from-slate-950 via-slate-900 to-amber-950/20 text-white flex flex-col items-center justify-center p-4 relative select-none overflow-hidden animate-fade-in">
      
      {/* Visual Stars background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none font-pixel text-slate-500 overflow-hidden">
        {Array.from({ length: 40 }).map((_, idx) => (
          <span 
            key={idx} 
            className="absolute animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${1 + Math.random() * 3}s`,
              fontSize: `${10 + Math.random() * 20}px`
            }}
          >
            ★
          </span>
        ))}
      </div>

      <div className="z-10 w-full max-w-lg text-center flex flex-col items-center">
        
        {/* Cute Big Animated Cat Mascot */}
        <div className="relative mb-6 group cursor-pointer" onClick={() => audio.playMeow ? (audio as any).playMeow() : audio.playJump()}>
          <div className="absolute -inset-4 bg-amber-400/20 rounded-full blur-2xl group-hover:bg-amber-400/30 transition" />
          
          {/* Custom drawing or big emoji */}
          <div className="text-8xl select-none animate-bounce" style={{ animationDuration: '2.5s' }}>
            🐱
          </div>
          
          <div className="absolute -bottom-2 -right-4 bg-amber-400 text-slate-950 font-pixel text-xs px-2.5 py-1 rounded-full border-2 border-slate-950 font-bold rotate-12 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            にゃー！
          </div>
        </div>

        {/* Game Logo Text */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold font-pixel tracking-wider bg-clip-text text-linear-to-b from-amber-300 via-amber-400 to-yellow-600 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] filter">
            ねこアドベンチャー
          </h1>
          <p className="text-xs font-sans tracking-widest text-slate-400 mt-2 uppercase font-medium">
            〜 ちび猫のひみつ大冒険 2Dアクション 〜
          </p>
        </div>

        {/* Center menu actions container */}
        <div className="w-full space-y-4 max-w-xs mb-8">
          <button
            onClick={() => {
              audio.playClick();
              onStartGame();
            }}
            className="w-full bg-linear-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-900 font-pixel font-bold py-4 rounded-2xl text-lg flex items-center justify-center gap-3 border-4 border-slate-950 transition shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950 stroke-[3px]" />
            <span>冒険をはじめにゃ！</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onOpenShop();
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-pixel font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-3 border-3 border-slate-950 transition shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            <span>ショップ 🛒</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setShowHowTo(!showHowTo);
            }}
            className="w-full bg-indigo-950 hover:bg-indigo-900 border-3 border-slate-950 text-indigo-200 font-pixel font-semibold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>あそびかた・操作方法</span>
          </button>
        </div>

        {/* Mini Utility Bar */}
        <div className="flex gap-4 items-center">
          {/* Mute Toggling */}
          <button 
            onClick={handleToggleMute}
            className="p-3.5 rounded-full border-2 border-slate-800 bg-slate-850 hover:bg-slate-800 transition active:scale-95"
            title={isMuted ? "ミュート解除" : "ミュート"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-amber-400" />}
          </button>

          {/* Reset Stats */}
          {stats.unlockedStage > 1 || stats.coins > 0 || stats.fishes > 0 ? (
            <button
              onClick={() => {
                if (confirm("セーブデータを初期化して最初からプレイしますか？")) {
                  audio.playHurt();
                  onResetStats();
                }
              }}
              className="px-3 py-2 border border-slate-700 bg-slate-900 text-slate-500 font-pixel text-[10px] rounded-lg hover:text-red-400 hover:border-red-500/30 transition"
            >
              データ初期化 🔄
            </button>
          ) : null}
        </div>

        {/* Modal / Panel: How to Play */}
        {showHowTo && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white text-slate-800 rounded-3xl border-4 border-slate-950 max-w-md w-full p-6 text-left shadow-2xl">
              <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-3 mb-4">
                <Gamepad2 className="w-6 h-6 text-amber-500" />
                <h3 className="text-xl font-bold font-sans text-slate-900">ゲームのルール & 操作手順</h3>
              </div>

              <div className="space-y-4 text-xs font-sans leading-relaxed">
                <div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-1 text-sm">
                    <Compass className="w-4 h-4 text-blue-500" /> 基本ルール
                  </h4>
                  <p className="text-slate-600 mt-1">
                    猫ちゃんのライフが0になる、または落とし穴に落ちるとゲームオーバー。
                    ゴール（右端のゴールハウスや金魚鉢）に到着するとステージクリアです！
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-1 text-sm">
                    🕹️ PCでの操作方法
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 mt-1 pl-1">
                    <li><strong>走る (移動)</strong>: [←] [→] キー、または [A] [D]</li>
                    <li><strong>ジャンプ</strong>: [↑] キー、または [W]、または [SPACE] キー</li>
                    <li><strong>ひっかき／魚の骨発射 (攻撃)</strong>: [Z] キー または [J] キー</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-1 text-sm">
                    📱 スマホでの操作方法
                  </h4>
                  <p className="text-slate-600 mt-1">
                    スマートフォンなどのタッチデバイスでは、プレイ中に画面左下に十字キー、
                    画面右下に「ジャンプ」「攻撃」のバーチャルボタンが表示されます。
                  </p>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <h4 className="font-bold text-amber-800 flex items-center gap-1">
                    ✨ 猫ちゃんの強化
                  </h4>
                  <p className="text-amber-700 leading-normal mt-0.5 text-[11px]">
                    ステージで拾う<strong>「🪙 コイン」</strong>と<strong>「🐟 魚」</strong>を使ってショップで猫を強化できます。
                    「2段ジャンプ」や「魚の骨ショット」は、強烈なボスやトラップを突破する鍵です！
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  audio.playClick();
                  setShowHowTo(false);
                }}
                className="mt-5 w-full bg-slate-900 hover:bg-slate-800 text-white font-pixel font-bold py-3 rounded-xl border-2 border-slate-950 transition"
              >
                了解にゃ！
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
