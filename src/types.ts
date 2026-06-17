export enum GameState {
  MENU = 'MENU',
  STAGE_SELECT = 'STAGE_SELECT',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  SHOP = 'SHOP',
  GAME_OVER = 'GAME_OVER',
  GAME_CLEAR = 'GAME_CLEAR',
}

export interface PlayerStats {
  coins: number;
  fishes: number;
  maxHp: number; // 3 to 6
  currentHp: number;
  speedLevel: number; // 1 to 5
  jumpLevel: number; // 1 to 5 (at level 4+ unlock double jump!)
  clawLevel: number; // 0 to 5 (0 means no attack, 1+ unlocks scratch, 3+ shoots fishbone!)
  magnetLevel: number; // 1 to 5
  unlockedStage: number; // 1 to 3
  shieldLevel: number; // 1 to 5 (increases post-damage invincibility duration, purchased with fish)
}

export interface UpgradeItem {
  id: string;
  name: string;
  description: string;
  costType: 'coin' | 'fish';
  baseCost: number;
  maxLevel: number;
  currentLevel: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  type: string;
}

export interface Enemy extends Entity {
  enemyType: 'mouse' | 'dog' | 'crab' | 'fish_enemy' | 'bird' | 'hedgehog';
  hp: number;
  maxHp: number;
  direction: number; // -1 or 1
  patrolMinX?: number;
  patrolMaxX?: number;
  isDefeated: boolean;
  scoreValue: number;
  stateTimer?: number;
}

export interface Item extends Entity {
  itemType: 'coin' | 'fish' | 'milk_potion' | 'catnip'; // milk cures hp, catnip gives brief speed/invincibility
  isCollected: boolean;
}

export interface Platform extends Entity {
  platformType: 'normal' | 'sinking' | 'spring' | 'moving' | 'spikes' | 'water_current';
  dx?: number; // moving amplitude
  dy?: number;
  speed?: number;
  startX?: number;
  startY?: number;
  flowDirection?: number; // for water currents or wind triggers
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'square' | 'bubble' | 'star' | 'wind' | 'scratch';
}

export interface Projectile extends Entity {
  shooter: 'player' | 'enemy';
  damage: number;
  life: number; // frames before disappearing
  projectileType?: 'hairball' | 'fishbone';
}

export interface LevelConfig {
  id: number;
  name: string;
  jpName: string;
  description: string;
  environment: 'grassland' | 'sewer' | 'sky_castle' | 'magma_cave' | 'cyber_space' | 'japanese_temple';
  bgColors: string[]; // Gradient colors for canvas bg
  groundColor: string;
  physics: {
    gravity: number;
    friction: number;
    waterPhysics?: boolean;
    windForce?: number; // constant acceleration x direction
  };
  gimmicksDescription: string;
  targetScore: number;
  mapLength: number; // grid width of the stage map (e.g. 4000 pixels)
}
