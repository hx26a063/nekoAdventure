import React from 'react';
import { PlayerStats, UpgradeItem } from '../types';
import { audio } from './AudioEngine';
import { Heart, Zap, ArrowUp, Scissors, Magnet, ShoppingBag, X, Star } from 'lucide-react';

interface UpgradeShopProps {
  stats: PlayerStats;
  onPurchaseUpgrade: (id: string, costType: 'coin' | 'fish', cost: number) => void;
  onClose: () => void;
}

export const UpgradeShop: React.FC<UpgradeShopProps> = ({ stats, onPurchaseUpgrade, onClose }) => {
  // Define upgrades config based on current levels
  const upgrades: {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    level: number;
    maxLevel: number;
    costType: 'coin' | 'fish';
    getCost: (lvl: number) => number;
    lvlDescriptions: string[];
  }[] = [
    {
      id: 'maxHp',
      name: '体力アップ (ライフ)',
      description: '猫のライフ上限を増やして、より多くの痛みに耐えられるようにします。',
      icon: <Heart className="w-6 h-6 text-red-500 fill-red-500" />,
      color: 'from-pink-50 to-red-50 hover:from-pink-100 hover:to-red-100 border-red-200',
      level: stats.maxHp - 3, // starts at 3, level is maxHp - 3
      maxLevel: 3, // max is 6 hearts (level 3)
      costType: 'fish',
      getCost: (lvl) => (lvl + 1) * 3, // 3, 6, 9 fish
      lvlDescriptions: ['初期ライフ (3)', 'ライフ 4つ', 'ライフ 5つ', '最大ライフ (6つ)'],
    },
    {
      id: 'speedLevel',
      name: 'すばやさ (走る速度)',
      description: 'ダッシュスピードをアップして、時間制限のギミックを駆け抜けます。',
      icon: <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />,
      color: 'from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 border-yellow-200',
      level: stats.speedLevel,
      maxLevel: 5,
      costType: 'coin',
      getCost: (lvl) => lvl * 20, // 20, 40, 60, 80, 100 coins
      lvlDescriptions: [
        '初期速度',
        '少し身軽になった！',
        '走りがなめらかに！',
        '風を感じるスピード！',
        '超高速キャットロード',
        '音速の猫神！'
      ],
    },
    {
      id: 'jumpLevel',
      name: '跳躍力 (ジャンプ)',
      description: '高く跳ぶ力を上げ、レベル4以上で「空中2段ジャンプ」が解放されます！',
      icon: <ArrowUp className="w-6 h-6 text-blue-500" />,
      color: 'from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200',
      level: stats.jumpLevel,
      maxLevel: 5,
      costType: 'coin',
      getCost: (lvl) => lvl * 30, // 30, 60, 90, 120, 150 coins
      lvlDescriptions: [
        '初期ジャンプ',
        '高所への興味がわく',
        '大ジャンプが可能！',
        '驚異のジャンプ力',
        '★2段ジャンプ解放！',
        '★究極のハイダブルジャンパー！'
      ],
    },
    {
      id: 'magnetLevel',
      name: 'お宝磁石 (マグネット)',
      description: '近くにあるコインや魚を、不思議な力で自動的に引き寄せます。',
      icon: <Magnet className="w-6 h-6 text-purple-500" />,
      color: 'from-purple-50 to-fuchsia-50 hover:from-purple-100 hover:to-fuchsia-100 border-purple-200',
      level: stats.magnetLevel,
      maxLevel: 5,
      costType: 'coin',
      getCost: (lvl) => lvl * 15, // 15, 30, 45, 60, 75 coins
      lvlDescriptions: [
        '磁力なし',
        'わずかに吸い寄せる',
        '磁力エリアアップ！',
        '小ジャンプで一網打尽',
        '強力な猫マグネット',
        'ブラックホール猫 (超広範囲！)'
      ],
    },
    {
      id: 'clawLevel',
      name: 'つめ強化 (ひっかき/お魚の骨シュート)',
      description: 'つめの強度と威力を高めます。レベル3以上で遠距離「お魚の骨シュート」が解放されます！',
      icon: <Scissors className="w-6 h-6 text-emerald-500" />,
      color: 'from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-teal-200',
      level: stats.clawLevel,
      maxLevel: 5,
      costType: 'fish',
      getCost: (lvl) => lvl * 4, // 4, 8, 12, 16 fish
      lvlDescriptions: [
        '攻撃不可',
        '通常ひっかき (初期)',
        'ひっかき威力アップ！',
        '★お魚の骨シュート解放！',
        '骨の威力・弾速アップ！',
        '究極の魚の骨魔導ネコ！'
      ],
    },
    {
      id: 'shieldLevel',
      name: 'お魚アーマー (被弾無敵時間)',
      description: 'ダメージを受けた後の無敵時間を延ばし、安全に敵を通り抜けたり立て直しを図れます。',
      icon: <Star className="w-6 h-6 text-fuchsia-500" />,
      color: 'from-fuchsia-50 to-pink-50 hover:from-fuchsia-100 hover:to-pink-100 border-pink-200',
      level: stats.shieldLevel,
      maxLevel: 5,
      costType: 'fish',
      getCost: (lvl) => lvl * 3, // 3, 6, 9, 12 fish
      lvlDescriptions: [
        'なし',
        '初期無敵 (1.5秒)',
        '無敵時間: 2.0秒',
        '無敵時間: 2.5秒',
        '無敵時間: 3.0秒',
        '究極の鉄壁スキン (3.5秒！)'
      ],
    },
  ];

  const handlePurchase = (id: string, costType: 'coin' | 'fish', cost: number, currentLvl: number, maxLvl: number) => {
    if (currentLvl >= maxLvl) return;

    if (costType === 'coin' && stats.coins < cost) {
      audio.playHurt(); // buzzer sound
      return;
    }
    if (costType === 'fish' && stats.fishes < cost) {
      audio.playHurt(); // buzzer sound
      return;
    }

    onPurchaseUpgrade(id, costType, cost);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl border-4 border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden text-slate-800">
        
        {/* Header Ribbon */}
        <div className="bg-amber-400 border-b-4 border-slate-800 p-6 flex justify-between items-center relative">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-slate-800 animate-bounce" />
            <div>
              <h2 className="text-2xl font-bold font-pixel text-slate-900 tracking-tight">猫の秘密駄菓子屋 (強化ショップ)</h2>
              <p className="text-xs text-slate-800 font-semibold font-sans mt-0.5">あつめたアイテムで、猫ちゃんをパワーアップ！</p>
            </div>
          </div>
          <button 
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="p-2 bg-red-400 hover:bg-red-500 border-2 border-slate-800 rounded-xl transition shadow-[2px_2px_0px_0px_rgba(30,41,59,1)] active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(30,41,59,1)]"
          >
            <X className="w-5 h-5 text-white stroke-[3px]" />
          </button>
        </div>

        {/* Currency Display Bar */}
        <div className="bg-slate-100 border-b-2 border-slate-200 py-3 px-6 flex justify-around items-center font-pixel text-sm">
          <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <span className="text-yellow-500 text-lg">🪙</span>
            <span className="text-slate-500 font-sans">コイン:</span>
            <span className="text-slate-800 font-bold ml-1">{stats.coins}</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <span className="text-red-400 text-lg">🐟</span>
            <span className="text-slate-500 font-sans">お魚:</span>
            <span className="text-slate-800 font-bold ml-1">{stats.fishes}</span>
          </div>
        </div>

        {/* Upgrade Cards List */}
        <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto bg-amber-50/20">
          {upgrades.map((up) => {
            const isMax = up.level >= up.maxLevel;
            const cost = isMax ? 0 : up.getCost(up.level);
            const canAfford = up.costType === 'coin' ? stats.coins >= cost : stats.fishes >= cost;

            return (
              <div 
                key={up.id} 
                className={`p-4 rounded-2xl border-2 border-slate-800 bg-gradient-to-r ${up.color} flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-[3px_3px_0px_0px_rgba(30,41,59,1)] hover:shadow-[4px_4px_0px_0px_rgba(30,41,59,1)]`}
              >
                <div className="flex gap-3 items-start flex-1">
                  <div className="p-3 bg-white border-2 border-slate-800 rounded-xl flex-shrink-0 shadow-sm">
                    {up.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold font-sans text-base text-slate-900">{up.name}</h3>
                      <div className="flex bg-slate-800/10 px-2 py-0.5 rounded-md text-xs font-pixel font-semibold gap-0.5">
                        <span className="text-slate-600">Lv</span>
                        <span className="text-slate-800">{up.level}/{up.maxLevel}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 text-zinc-600 mt-1 font-sans">{up.description}</p>
                    
                    {/* Progress bars (ticks) */}
                    <div className="flex items-center gap-1 mt-3">
                      {Array.from({ length: up.maxLevel }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-2.5 w-6 rounded-md border border-slate-700 transition-all ${
                            i < up.level 
                              ? 'bg-amber-400 shadow-inner' 
                              : 'bg-white'
                          }`}
                        />
                      ))}
                      <span className="text-[10px] text-slate-600 font-pixel ml-2 block sm:inline">
                        ({up.lvlDescriptions[up.level]})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t border-slate-800/10 sm:border-0 pt-3 sm:pt-0">
                  <div className="text-right">
                    {isMax ? (
                      <span className="text-xs bg-slate-800 text-white font-pixel font-bold px-3 py-1.5 rounded-full inline-block">
                        LEVEL MAX 🎉
                      </span>
                    ) : (
                      <div className="font-pixel flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 font-sans">費用:</span>
                        <span className="text-base font-bold flex items-center">
                          {up.costType === 'coin' ? '🪙' : '🐟'} {cost}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isMax && (
                    <button
                      onClick={() => handlePurchase(up.id, up.costType, cost, up.level, up.maxLevel)}
                      disabled={!canAfford}
                      className={`font-pixel text-xs px-4 py-2 border-2 border-slate-800 rounded-xl font-bold transition shadow-[2px_2px_0px_0px_rgba(30,41,59,1)] active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(30,41,59,1)] ${
                        canAfford 
                          ? 'bg-amber-400 hover:bg-amber-500 text-slate-900 cursor-pointer' 
                          : 'bg-slate-200 text-slate-400 border-slate-400 cursor-not-allowed shadow-[0px_0px_0px_0px]'
                      }`}
                    >
                      強化する
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info advice footer */}
        <div className="bg-slate-50 p-4 border-t-2 border-slate-200 flex items-center justify-between text-xs text-slate-500 font-sans font-medium">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 animate-spin" style={{ animationDuration: '6s' }} />
            <span>ジャンプLv4は <strong>空中ダブルジャンプ</strong> が付与されます！</span>
          </div>
          <div>
            <span>つめで敵を引っかこう！</span>
          </div>
        </div>

      </div>
    </div>
  );
};
