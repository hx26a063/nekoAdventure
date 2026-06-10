import React from 'react';
import { LevelConfig, PlayerStats } from '../types';
import { audio } from './AudioEngine';
import { Play, Lock, AlertTriangle, ArrowRight, Home, Cloud, Waves, HelpCircle, Flame, Cpu } from 'lucide-react';

interface StageSelectorProps {
  stats: PlayerStats;
  levels: LevelConfig[];
  onSelectStage: (stageId: number) => void;
  onOpenShop: () => void;
  onBackToMenu: () => void;
}

export const StageSelector: React.FC<StageSelectorProps> = ({
  stats,
  levels,
  onSelectStage,
  onOpenShop,
  onBackToMenu,
}) => {
  const getStageIcon = (env: string) => {
    switch (env) {
      case 'grassland':
        return <Home className="w-8 h-8 text-emerald-500" />;
      case 'sewer':
        return <Waves className="w-8 h-8 text-blue-500 animate-pulse" />;
      case 'sky_castle':
        return <Cloud className="w-8 h-8 text-fuchsia-500 animate-bounce" />;
      case 'magma_cave':
        return <Flame className="w-8 h-8 text-orange-500 animate-pulse" />;
      case 'cyber_space':
        return <Cpu className="w-8 h-8 text-cyan-400 rotate-45 animate-pulse" />;
      default:
        return <HelpCircle className="w-8 h-8 text-slate-500" />;
    }
  };

  const getStageBadgeColor = (env: string) => {
    switch (env) {
      case 'grassland':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'sewer':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'sky_castle':
        return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300';
      case 'magma_cave':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'cyber_space':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-linear-to-br from-slate-900 via-slate-800 to-amber-950/20 text-white flex flex-col items-center justify-center p-6 select-none animate-fade-in">
      
      {/* Background cat elements */}
      <div className="absolute top-10 left-10 text-slate-700/20 font-pixel text-9xl pointer-events-none">🐱</div>
      <div className="absolute bottom-10 right-10 text-slate-700/20 font-pixel text-9xl pointer-events-none">🐟</div>

      <div className="w-full max-w-4xl z-10">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🗺️</span>
              <h1 className="text-3xl font-extrabold font-pixel text-amber-400 tracking-wider">冒険のステージ選択</h1>
            </div>
            <p className="text-sm font-sans text-slate-300">
              各ステージには特別な環境ギミック（水、強風、崩落）が待っています！
            </p>
          </div>

          {/* Quick HUD */}
          <div className="flex items-center gap-3 bg-slate-800/80 border-2 border-slate-700 px-5 py-3 rounded-2xl shadow-lg">
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span>🪙</span>
                <span className="font-pixel font-bold text-yellow-400">{stats.coins}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🐟</span>
                <span className="font-pixel font-bold text-red-300">{stats.fishes}</span>
              </div>
            </div>
            <div className="w-[1px] h-8 bg-slate-700 mx-1" />
            <button
              onClick={() => {
                audio.playClick();
                onOpenShop();
              }}
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-pixel text-xs px-4 py-2.5 rounded-xl font-bold transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]"
            >
              ショップへ 🛒
            </button>
          </div>
        </div>

        {/* Stage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {levels.map((level) => {
            const isUnlocked = stats.unlockedStage >= level.id;
            const bgClass =
              level.environment === 'grassland'
                ? 'from-emerald-900/40 via-slate-900 to-slate-900 border-emerald-800/40'
                : level.environment === 'sewer'
                ? 'from-blue-900/40 via-slate-900 to-slate-900 border-blue-800/40'
                : level.environment === 'sky_castle'
                ? 'from-purple-900/40 via-slate-900 to-slate-900 border-purple-800/40'
                : level.environment === 'magma_cave'
                ? 'from-orange-950/40 via-slate-900 to-slate-900 border-orange-900/40'
                : 'from-cyan-900/40 via-slate-900 to-slate-900 border-cyan-800/40';

            const previewArt =
              level.environment === 'grassland'
                ? 'bg-linear-to-b from-sky-400 to-emerald-500'
                : level.environment === 'sewer'
                ? 'bg-linear-to-b from-teal-800 to-blue-950'
                : level.environment === 'sky_castle'
                ? 'bg-linear-to-b from-purple-500 to-indigo-950'
                : level.environment === 'magma_cave'
                ? 'bg-linear-to-b from-orange-600 to-red-950'
                : 'bg-linear-to-b from-cyan-600 to-violet-950';

            return (
              <div
                key={level.id}
                className={`relative rounded-3xl border-4 bg-gradient-to-b ${
                  isUnlocked ? `${bgClass} border-slate-700` : 'border-slate-800 bg-slate-950/60 opacity-70'
                } flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                  isUnlocked ? 'hover:border-amber-400 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(251,191,36,0.1)]' : ''
                }`}
              >
                {/* Visual Stage Art Preview header */}
                <div className={`h-28 w-full relative ${previewArt} overflow-hidden flex items-center justify-center`}>
                  {/* Decorative Elements inside preview card depending on environment */}
                  {level.environment === 'grassland' && (
                    <>
                      <div className="absolute inset-x-0 bottom-0 h-6 bg-emerald-600" />
                      <div className="absolute bottom-4 left-6 w-3 h-3 bg-yellow-300 rounded-full animate-pulse" />
                      <div className="absolute top-4 right-10 w-8 h-8 rounded-full bg-yellow-200/40" />
                      <div className="absolute bottom-6 right-6 font-pixel text-xl animate-bounce">🐱</div>
                      <div className="absolute bottom-6 left-1/2 font-pixel text-xs">🌵</div>
                    </>
                  )}
                  {level.environment === 'sewer' && (
                    <>
                      <div className="absolute inset-x-0 bottom-0 h-8 bg-blue-900 opacity-60 flex items-center justify-center gap-1">
                        <span className="text-[9px] text-teal-300">🌊 流れる水流 🌊</span>
                      </div>
                      <div className="absolute top-2 left-4 w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                      <div className="absolute top-5 right-8 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="absolute bottom-9 right-8 font-pixel text-lg">🦀</div>
                    </>
                  )}
                  {level.environment === 'sky_castle' && (
                    <>
                      <div className="absolute bottom-4 left-4 w-12 h-4 bg-white/70 rounded-full" />
                      <div className="absolute top-4 right-4 w-16 h-6 bg-white/40 rounded-full" />
                      <div className="absolute bottom-2 right-12 w-14 h-5 bg-white/80 rounded-full" />
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-pixel text-xl animate-bounce">🏰</div>
                      <div className="absolute bottom-1 right-2 text-xs">💨 強風</div>
                    </>
                  )}
                  {level.environment === 'magma_cave' && (
                    <>
                      <div className="absolute inset-x-0 bottom-0 h-6 bg-red-950 opacity-80" />
                      <div className="absolute bottom-2 left-6 w-3 h-3 bg-orange-400 rounded-full animate-ping" />
                      <div className="absolute bottom-7 right-6 font-pixel text-lg">🌋</div>
                      <div className="absolute top-3 right-12 font-pixel text-xs animate-bounce">🔥</div>
                      <div className="absolute bottom-1 right-2 text-[10px] text-orange-300 font-pixel">🔥 灼熱</div>
                    </>
                  )}
                  {level.environment === 'cyber_space' && (
                    <>
                      <div className="absolute inset-x-0 bottom-0 h-4 bg-cyan-950/60" />
                      <div className="absolute bottom-5 right-6 font-pixel text-lg animate-bounce">👾</div>
                      <div className="absolute bottom-5 left-6 font-pixel text-xs animate-pulse">💿</div>
                      <div className="absolute top-2 right-10 text-[9px] font-mono text-cyan-300/40">01010101</div>
                      <div className="absolute bottom-1 right-2 text-[10px] text-cyan-300 font-pixel">⚡ 超重力</div>
                    </>
                  )}
                  
                  {/* Lock Overlay */}
                  {!isUnlocked && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                      <Lock className="w-8 h-8 text-slate-500" />
                      <span className="text-xs font-pixel text-slate-400">ロックされています</span>
                    </div>
                  )}

                  {/* Stage Badge ID */}
                  <div className="absolute top-3 left-3 bg-slate-900/80 border border-slate-700 px-2.5 py-1 rounded-full text-xs font-pixel font-bold text-amber-400 flex items-center gap-1">
                    <span>STAGE 0{level.id}</span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getStageIcon(level.environment)}
                      <h3 className="text-xl font-bold font-sans text-white">{level.jpName}</h3>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-relaxed mb-4 min-h-[48px]">
                      {level.description}
                    </p>

                    {/* Environment/Gimmick info label */}
                    <div className={`border rounded-xl p-2.5 text-xs font-sans ${getStageBadgeColor(level.environment)} mb-4`}>
                      <div className="font-bold flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>マップ内ギミック:</span>
                      </div>
                      <p className="text-[11px] leading-tight opacity-90">{level.gimmicksDescription}</p>
                    </div>
                  </div>

                  {/* Play Action button */}
                  <div>
                    {isUnlocked ? (
                      <button
                        onClick={() => {
                          audio.playClick();
                          onSelectStage(level.id);
                        }}
                        className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-900 font-pixel py-3 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 border-slate-800 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-slate-900 text-slate-900" />
                        <span>出発する！</span>
                      </button>
                    ) : (
                      <div className="border-2 border-dashed border-slate-800 rounded-2xl py-3 text-center text-xs font-pixel text-slate-600">
                        前のステージをクリア
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Back navigation button */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              audio.playClick();
              onBackToMenu();
            }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-slate-600 rounded-2xl font-pixel text-sm text-slate-300 font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            <span>タイトルへ戻る</span>
          </button>
        </div>

      </div>
    </div>
  );
};
