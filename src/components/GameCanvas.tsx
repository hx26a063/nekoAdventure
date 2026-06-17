import React, { useEffect, useRef, useState } from 'react';
import { GameState, PlayerStats, LevelConfig, Position, Enemy, Item, Platform, Particle, Projectile } from '../types';
import { audio } from './AudioEngine';
import { Heart, Play, RefreshCw, Volume2, VolumeX, Menu, ChevronLeft, ChevronRight, Zap, Target } from 'lucide-react';

interface GameCanvasProps {
  stats: PlayerStats;
  currentStageId: number;
  levelConfig: LevelConfig;
  onCoinsCollected: (amount: number) => void;
  onFishesCollected: (amount: number) => void;
  onHpChanged: (currentHp: number) => void;
  onClearStage: (coinsGained: number, fishesGained: number) => void;
  onGameOver: () => void;
  onPauseToggle: (isPaused: boolean) => void;
  onBackToMenu: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  stats,
  currentStageId,
  levelConfig,
  onCoinsCollected,
  onFishesCollected,
  onHpChanged,
  onClearStage,
  onGameOver,
  onPauseToggle,
  onBackToMenu,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keyboard input states
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Game state references
  const player = useRef({
    x: 100,
    y: 200,
    width: 32,
    height: 32,
    vx: 0,
    vy: 0,
    onGround: false,
    jumpCount: 0,
    isInvincible: 0, // frames left
    isCatnipActive: 0, // speed boost frame counter
    facingDir: 1, // -1: left, 1: right
    isAttacking: 0, // frame counter
    attackCooldown: 0,
    score: 0,
    coinsCollected: 0,
    fishesCollected: 0,
    currentHp: stats.currentHp,
  });

  const [hudHp, setHudHp] = useState(stats.currentHp);
  const [stageScore, setStageScore] = useState(0);
  const [coinsThisRun, setCoinsThisRun] = useState(0);
  const [fishesThisRun, setFishesThisRun] = useState(0);
  const [isPausedState, setIsPausedState] = useState(false);
  const [isMuted, setIsMuted] = useState(audio.getMuteStatus());

  // Entity Lists
  const platforms = useRef<Platform[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const items = useRef<Item[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const particles = useRef<Particle[]>([]);

  // Camera scroll viewport
  const cameraX = useRef(0);
  
  // Boss state trackers
  const bossRef = useRef<Enemy | null>(null);
  const isBossTriggered = useRef(false);

  // Virtual controller triggers (for mobile responsive pads)
  const virtualCtrl = useRef({
    left: false,
    right: false,
    jump: false,
    attack: false,
  });

  // Cycle counters for tail wave, feet stepping
  const animCycle = useRef(0);

  // --- MAP BUILDER FOR STAGES ---
  const buildCurrentStageMap = () => {
    const pList: Platform[] = [];
    const eList: Enemy[] = [];
    const iList: Item[] = [];
    const mapLen = levelConfig.mapLength;

    player.current.x = 100;
    player.current.y = 150;
    player.current.vx = 0;
    player.current.vy = 0;
    player.current.currentHp = stats.maxHp; // Start healed on stage boot
    onHpChanged(stats.maxHp);
    setHudHp(stats.maxHp);
    isBossTriggered.current = false;
    bossRef.current = null;
    cameraX.current = 0;

    projectiles.current = [];
    particles.current = [];

    // 1. Core floor boxes
    if (levelConfig.environment === 'grassland') {
      // Normal floor grids with gaps
      let currentX = 0;
      while (currentX < mapLen) {
        // Floor platform
        const sectionLen = 600 + Math.random() * 400;
        const gapLen = 100 + Math.random() * 80;

        pList.push({
          id: `floor_${currentX}`,
          x: currentX,
          y: 400,
          width: sectionLen,
          height: 80,
          vx: 0, vy: 0,
          type: 'platform',
          platformType: 'normal',
        });

        // Add some flowers/bushes visual coordinates later.
        
        // Spawn standard enemies & coins on this platform section
        if (currentX > 200) {
          const enemyCount = Math.floor(sectionLen / 300);
          for (let k = 0; k < enemyCount; k++) {
            const ex = currentX + 150 + k * 220;
            const enemyType = Math.random() > 0.4 ? 'mouse' : 'hedgehog';
            eList.push({
              id: ` enemy_g_${currentX}_${k}`,
              x: ex,
              y: 360,
              width: 32,
              height: 32,
              vx: enemyType === 'mouse' ? -1.2 : -0.7,
              vy: 0,
              type: 'enemy',
              enemyType,
              hp: enemyType === 'mouse' ? 1 : 2,
              maxHp: enemyType === 'mouse' ? 1 : 2,
              direction: -1,
              patrolMinX: currentX + 50,
              patrolMaxX: currentX + sectionLen - 50,
              isDefeated: false,
              scoreValue: enemyType === 'mouse' ? 100 : 250,
            });
          }

          // Coin/Fish lines
          const coinCount = Math.floor(sectionLen / 100);
          for (let c = 0; c < coinCount; c++) {
            const cx = currentX + 80 + c * 80;
            const cy = 250 - Math.sin(c * 0.5) * 60;
            iList.push({
              id: `item_c_${currentX}_${c}`,
              x: cx,
              y: cy,
              width: 18,
              height: 18,
              vx: 0, vy: 0,
              type: 'item',
              itemType: Math.random() > 0.9 ? 'fish' : 'coin',
              isCollected: false,
            });
          }
        }

        currentX += sectionLen + gapLen;
      }

      // Add floating grassland platforms & springs - lowered for easier jumping
      pList.push(
        { id: 'g_float_1', x: 450, y: 310, width: 140, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'normal' },
        { id: 'g_spring_1', x: 500, y: 375, width: 35, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'spring' },
        { id: 'g_float_2', x: 950, y: 290, width: 160, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'normal' },
        { id: 'g_float_3', x: 1400, y: 310, width: 150, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'normal' },
        { id: 'g_spring_2', x: 1750, y: 375, width: 35, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'spring' },
        { id: 'g_float_4', x: 2100, y: 280, width: 140, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'moving', dx: 100, speed: 0.02, startX: 2105, startY: 280 },
        // Step stairs for Torii Goal Gate easily!
        { id: 'g_step_1', x: mapLen - 440, y: 340, width: 80, height: 60, vx: 0, vy: 0, type: 'platform', platformType: 'normal' },
        { id: 'g_step_2', x: mapLen - 340, y: 280, width: 80, height: 120, vx: 0, vy: 0, type: 'platform', platformType: 'normal' }
      );

      iList.push(
        { id: 'g_milk_1', x: 1450, y: 270, width: 18, height: 18, vx: 0, vy: 0, type: 'item', itemType: 'milk_potion', isCollected: false },
        { id: 'g_catnip_1', x: 2150, y: 220, width: 18, height: 18, vx: 0, vy: 0, type: 'item', itemType: 'catnip', isCollected: false }
      );

      // Grassland Giga Mouse Boss!
      const bossX = mapLen - 600;
      const stageBoss: Enemy = {
        id: 'boss_stage_1',
        x: bossX,
        y: 315,
        width: 80,
        height: 85,
        vx: -1.5,
        vy: 0,
        type: 'enemy',
        enemyType: 'mouse', // customized drawing handles Boss
        hp: 12,
        maxHp: 12,
        direction: -1,
        patrolMinX: bossX - 250,
        patrolMaxX: bossX + 250,
        isDefeated: false,
        scoreValue: 2000,
        stateTimer: 0,
      };
      eList.push(stageBoss);
      bossRef.current = stageBoss;

    } else if (levelConfig.environment === 'sewer') {
      // Sewer watery floor grids - lower level filled with sewer current, player needs to navigate platforms above, or dive-in.
      let currentX = 0;
      while (currentX < mapLen) {
        const platformWidth = 350 + Math.random() * 250;
        const poolWidth = 200 + Math.random() * 100;

        // Platform block
        pList.push({
          id: `sewer_plat_${currentX}`,
          x: currentX,
          y: 360,
          width: platformWidth,
          height: 120,
          vx: 0, vy: 0,
          type: 'platform',
          platformType: 'normal',
        });

        // Water current pool next to it
        pList.push({
          id: `sewer_water_${currentX}`,
          x: currentX + platformWidth,
          y: 400,
          width: poolWidth,
          height: 80,
          vx: 0, vy: 0,
          type: 'platform',
          platformType: 'water_current',
          flowDirection: 0.2, // slowly push to the right!
        });

        // Solid pool bed (so player doesn't fall into the abyss and can stand)
        pList.push({
          id: `sewer_pool_bed_${currentX}`,
          x: currentX + platformWidth,
          y: 450,
          width: poolWidth,
          height: 30,
          vx: 0, vy: 0,
          type: 'platform',
          platformType: 'normal',
        });

        // Spring inside the water to bounce player back up to main platforms
        pList.push({
          id: `sewer_pool_spring_${currentX}`,
          x: currentX + platformWidth + poolWidth / 2 - 20,
          y: 430,
          width: 40,
          height: 20,
          vx: 0, vy: 0,
          type: 'platform',
          platformType: 'spring',
        });

        // Left climbing step to escape sewer water
        pList.push({
          id: `sewer_pool_step_l_${currentX}`,
          x: currentX + platformWidth,
          y: 390,
          width: 35,
          height: 60,
          vx: 0, vy: 0,
          type: 'platform',
          platformType: 'normal',
        });

        // Right climbing step to escape sewer water
        pList.push({
          id: `sewer_pool_step_r_${currentX}`,
          x: currentX + platformWidth + poolWidth - 35,
          y: 390,
          width: 35,
          height: 60,
          vx: 0, vy: 0,
          type: 'platform',
          platformType: 'normal',
        });

        // Slime Crab enemies patrol brick platforms
        if (currentX > 150) {
          eList.push({
            id: `enemy_crab_${currentX}`,
            x: currentX + platformWidth / 2,
            y: 320,
            width: 32,
            height: 32,
            vx: -0.8,
            vy: 0,
            type: 'enemy',
            enemyType: 'crab',
            hp: 3,
            maxHp: 3,
            direction: -1,
            patrolMinX: currentX + 20,
            patrolMaxX: currentX + platformWidth - 20,
            isDefeated: false,
            scoreValue: 300,
          });

          // Leaping fish enemies in pools!
          eList.push({
            id: `enemy_fish_${currentX}`,
            x: currentX + platformWidth + poolWidth / 2 - 16,
            y: 420,
            width: 24,
            height: 24,
            vx: 0,
            vy: -1 * (6 + Math.random() * 4), // leaping velocity up
            type: 'enemy',
            enemyType: 'fish_enemy',
            hp: 1,
            maxHp: 1,
            direction: -1,
            isDefeated: false,
            scoreValue: 150,
            stateTimer: 0, // frame counter to toggle jumps
          });
        }

        // Coins scattered inside water
        const itemsCount = Math.floor(poolWidth / 60);
        for (let j = 0; j < itemsCount; j++) {
          iList.push({
            id: `sewer_item_${currentX}_${j}`,
            x: currentX + platformWidth + 30 + j * 60,
            y: 430, // submerged
            width: 18,
            height: 18,
            vx: 0, vy: 0,
            type: 'item',
            itemType: Math.random() > 0.8 ? 'fish' : 'coin',
            isCollected: false,
          });
        }

        currentX += platformWidth + poolWidth;
      }

      // Add custom sinking platforms & traps - lowered for easier jumping
      pList.push(
        { id: 'sewer_sink_1', x: 450, y: 290, width: 110, height: 20, vx: 0, vy: 0, type: 'platform', platformType: 'sinking' },
        { id: 'sewer_sink_2', x: 1200, y: 300, width: 110, height: 20, vx: 0, vy: 0, type: 'platform', platformType: 'sinking' },
        { id: 'sewer_spike_1', x: 800, y: 345, width: 60, height: 20, vx: 0, vy: 0, type: 'platform', platformType: 'spikes' },
        { id: 'sewer_spike_2', x: 1600, y: 345, width: 60, height: 20, vx: 0, vy: 0, type: 'platform', platformType: 'spikes' },
        { id: 'sewer_moving_v1', x: 2000, y: 290, width: 120, height: 20, vx: 0, vy: 0, type: 'platform', platformType: 'moving', dy: 80, speed: 0.015, startX: 2000, startY: 290 },
        // Sewer steps for Torii Gate entry!
        { id: 'sewer_step_1', x: mapLen - 440, y: 310, width: 80, height: 90, vx: 0, vy: 0, type: 'platform', platformType: 'normal' },
        { id: 'sewer_step_2', x: mapLen - 340, y: 260, width: 80, height: 140, vx: 0, vy: 0, type: 'platform', platformType: 'normal' }
      );

      iList.push(
        { id: 'sewer_milk', x: 1240, y: 240, width: 18, height: 18, vx: 0, vy: 0, type: 'item', itemType: 'milk_potion', isCollected: false }
      );

      // Crab Cave King Boss (Giant Lobster)
      const bossX = mapLen - 600;
      const stageBoss: Enemy = {
        id: 'boss_stage_2',
        x: bossX,
        y: 240,
        width: 90,
        height: 90,
        vx: -1.2,
        vy: 0,
        type: 'enemy',
        enemyType: 'crab',
        hp: 20,
        maxHp: 20,
        direction: -1,
        patrolMinX: bossX - 250,
        patrolMaxX: bossX + 250,
        isDefeated: false,
        scoreValue: 4000,
        stateTimer: 0,
      };
      eList.push(stageBoss);
      bossRef.current = stageBoss;

    } else if (levelConfig.environment === 'sky_castle') {
      // Stage 3: sky_castle - hovering clouds and vanish platforms, bird divebombing, constant wind gusts
      let currentX = 0;
      while (currentX < mapLen) {
        const sizeOffset = Math.random() * 100;
        pList.push({
          id: `sky_plat_${currentX}`,
          x: currentX,
          y: currentX === 0 ? 350 : 270 + Math.random() * 100, // Reduced height randomness for smoother jump-overs
          width: 300 + sizeOffset,
          height: 30,
          vx: 0, vy: 0,
          type: 'platform',
          platformType: 'normal',
        });

        // Spawn diving birds!
        if (currentX > 200) {
          eList.push({
            id: `enemy_bird_${currentX}`,
            x: currentX + 150,
            y: 80 + Math.random() * 50,
            width: 32,
            height: 32,
            vx: -2.0,
            vy: 0,
            type: 'enemy',
            enemyType: 'bird',
            hp: 2,
            maxHp: 2,
            direction: -1,
            patrolMinX: currentX + 20,
            patrolMaxX: currentX + 320,
            isDefeated: false,
            scoreValue: 400,
            stateTimer: 0,
          });

          // Sky Dogs
          eList.push({
            id: `enemy_dog_${currentX}`,
            x: currentX + 100,
            y: 190,
            width: 36,
            height: 36,
            vx: -1.8,
            vy: 0,
            type: 'enemy',
            enemyType: 'dog',
            hp: 4,
            maxHp: 4,
            direction: -1,
            patrolMinX: currentX + 10,
            patrolMaxX: currentX + 280,
            isDefeated: false,
            scoreValue: 500,
          });
        }

        // Hanging items in sky
        const skyCoinCnt = Math.floor((300 + sizeOffset) / 80);
        for (let s = 0; s < skyCoinCnt; s++) {
          iList.push({
            id: `sky_coin_${currentX}_${s}`,
            x: currentX + 40 + s * 80,
            y: 120 + Math.sin(s * 0.8) * 40,
            width: 18,
            height: 18,
            vx: 0, vy: 0,
            type: 'item',
            itemType: Math.random() > 0.75 ? 'fish' : 'coin',
            isCollected: false,
          });
        }

        currentX += 340 + Math.random() * 80; // Shorter gaps so player can easily jump across
      }

      // Add magical spring-bouncy cloud series & spikes on top of regular platforms - lowered for easier jumping
      pList.push(
        { id: 'sky_spring_1', x: 600, y: 350, width: 35, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'spring' },
        { id: 'sky_sink_1', x: 1300, y: 260, width: 120, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'sinking' },
        { id: 'sky_sink_2', x: 1550, y: 230, width: 120, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'sinking' },
        { id: 'sky_moving_1', x: 2100, y: 270, width: 130, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'moving', dx: 140, speed: 0.025, startX: 2100, startY: 270 },
        // Cloud stairs for high-sky Torii entry!
        { id: 'sky_step_1', x: mapLen - 440, y: 300, width: 80, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'normal' },
        { id: 'sky_step_2', x: mapLen - 340, y: 260, width: 80, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'normal' }
      );

      iList.push(
        { id: 'sky_catnip', x: 1350, y: 180, width: 18, height: 18, vx: 0, vy: 0, type: 'item', itemType: 'catnip', isCollected: false },
        { id: 'sky_milk', x: 2160, y: 200, width: 18, height: 18, vx: 0, vy: 0, type: 'item', itemType: 'milk_potion', isCollected: false }
      );

      // Mecha Crow Cloud Sovereign Boss
      const bossX = mapLen - 600;
      const stageBoss: Enemy = {
        id: 'boss_stage_3',
        x: bossX,
        y: 120,
        width: 100,
        height: 100,
        vx: -1.8,
        vy: 0,
        type: 'enemy',
        enemyType: 'bird',
        hp: 35,
        maxHp: 35,
        direction: -1,
        patrolMinX: bossX - 250,
        patrolMaxX: bossX + 250,
        isDefeated: false,
        scoreValue: 6000,
        stateTimer: 0,
      };
      eList.push(stageBoss);
      bossRef.current = stageBoss;
    } else if (levelConfig.environment === 'magma_cave') {
      // Stage 4: magma_cave - volcanic lava rocks & bubbling magma hazards
      let currentX = 0;
      while (currentX < mapLen) {
        const platformWidth = 250 + Math.random() * 150;
        const gap = 110 + Math.random() * 90;

        // Lava crust platform
        pList.push({
          id: `magma_plat_${currentX}`,
          x: currentX,
          y: currentX === 0 ? 380 : 330 + Math.random() * 70,
          width: platformWidth,
          height: 90,
          vx: 0, vy: 0,
          type: 'platform',
          platformType: 'normal',
        });

        // Lava pooling items / hazards underneath
        if (currentX > 200 && currentX < mapLen - 700) {
          // Volcanic spikes (crystallized lava blades)
          if (Math.random() > 0.5) {
            pList.push({
              id: `magma_spikes_${currentX}`,
              x: currentX + platformWidth / 2 - 20,
              y: 330,
              width: 40,
              height: 25,
              vx: 0, vy: 0,
              type: 'platform',
              platformType: 'spikes',
            });
          }

          // Volcanic hedgehogs (magma salamanders)
          eList.push({
            id: `magma_salamander_${currentX}`,
            x: currentX + 60,
            y: 285,
            width: 34,
            height: 34,
            vx: -1.5,
            vy: 0,
            type: 'enemy',
            enemyType: 'hedgehog',
            hp: 4,
            maxHp: 4,
            direction: -1,
            patrolMinX: currentX + 10,
            patrolMaxX: currentX + platformWidth - 40,
            isDefeated: false,
            scoreValue: 600,
          });

          // Red crabs (magma crabs)
          if (Math.random() > 0.4) {
            eList.push({
              id: `magma_crab_${currentX}`,
              x: currentX + platformWidth - 80,
              y: 285,
              width: 32,
              height: 32,
              vx: 1.8,
              vy: 0,
              type: 'enemy',
              enemyType: 'crab',
              hp: 5,
              maxHp: 5,
              direction: 1,
              patrolMinX: currentX + 20,
              patrolMaxX: currentX + platformWidth - 20,
              isDefeated: false,
              scoreValue: 700,
            });
          }
        }

        // Magma coins & fishes
        const magmaCoinCnt = Math.floor(platformWidth / 80);
        for (let m = 0; m < magmaCoinCnt; m++) {
          iList.push({
            id: `magma_coin_${currentX}_${m}`,
            x: currentX + 30 + m * 70,
            y: 240 - Math.random() * 40,
            width: 18,
            height: 18,
            vx: 0, vy: 0,
            type: 'item',
            itemType: Math.random() > 0.70 ? 'fish' : 'coin',
            isCollected: false,
          });
        }

        currentX += platformWidth + gap;
      }

      // Volcanic springs and moving stones
      pList.push(
        { id: 'magma_spring_1', x: 800, y: 320, width: 35, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'spring' },
        { id: 'magma_sink_1', x: 1500, y: 280, width: 110, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'sinking' },
        { id: 'magma_moving_1', x: 2300, y: 310, width: 120, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'moving', dx: 150, speed: 0.03, startX: 2300, startY: 310 },
        { id: 'magma_step_1', x: mapLen - 440, y: 300, width: 80, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'normal' },
        { id: 'magma_step_2', x: mapLen - 340, y: 260, width: 80, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'normal' }
      );

      iList.push(
        { id: 'magma_catnip', x: 1540, y: 200, width: 18, height: 18, vx: 0, vy: 0, type: 'item', itemType: 'catnip', isCollected: false },
        { id: 'magma_milk', x: 2350, y: 230, width: 18, height: 18, vx: 0, vy: 0, type: 'item', itemType: 'milk_potion', isCollected: false }
      );

      // Boss: Salamander King
      const bossX = mapLen - 600;
      const stageBoss: Enemy = {
        id: 'boss_stage_4',
        x: bossX,
        y: 220,
        width: 110,
        height: 110,
        vx: -1.6,
        vy: 0,
        type: 'enemy',
        enemyType: 'hedgehog', // custom-colored glowing magma salamander
        hp: 55,
        maxHp: 55,
        direction: -1,
        patrolMinX: bossX - 250,
        patrolMaxX: bossX + 250,
        isDefeated: false,
        scoreValue: 8000,
      };
      eList.push(stageBoss);
      bossRef.current = stageBoss;
    } else if (levelConfig.environment === 'cyber_space') {
      // Stage 5: cyber_space - neon circuits and digital floating platforms
      let currentX = 0;
      while (currentX < mapLen) {
        const platformWidth = 200 + Math.random() * 180;
        const gap = 120 + Math.random() * 80;

        // Cyber steel grid
        pList.push({
          id: `cyber_plat_${currentX}`,
          x: currentX,
          y: currentX === 0 ? 370 : 250 + Math.random() * 120, // larger height diversity because of high jump/low gravity!
          width: platformWidth,
          height: 35,
          vx: 0, vy: 0,
          type: 'platform',
          platformType: 'normal',
        });

        if (currentX > 200 && currentX < mapLen - 700) {
          // Cyber Security Dogs (Tech guards)
          eList.push({
            id: `cyber_dog_${currentX}`,
            x: currentX + 50,
            y: 190,
            width: 36,
            height: 36,
            vx: -2.3, // very fast!
            vy: 0,
            type: 'enemy',
            enemyType: 'dog',
            hp: 6,
            maxHp: 6,
            direction: -1,
            patrolMinX: currentX + 10,
            patrolMaxX: currentX + platformWidth - 20,
            isDefeated: false,
            scoreValue: 800,
          });

          // Cyber floating Bits (fish_enemy / bird custom style)
          eList.push({
            id: `cyber_bit_${currentX}`,
            x: currentX + platformWidth - 70,
            y: 100 + Math.random() * 80,
            width: 30,
            height: 30,
            vx: 1.8,
            vy: 0,
            type: 'enemy',
            enemyType: 'bird',
            hp: 4,
            maxHp: 4,
            direction: 1,
            patrolMinX: currentX + 20,
            patrolMaxX: currentX + platformWidth - 10,
            isDefeated: false,
            scoreValue: 800,
          });
        }

        // Cyber coins & fishes in wave shapes
        const cyberCoinCnt = Math.floor(platformWidth / 60);
        for (let cy = 0; cy < cyberCoinCnt; cy++) {
          iList.push({
            id: `cyber_coin_${currentX}_${cy}`,
            x: currentX + 25 + cy * 60,
            y: 150 + Math.sin(cy * 1.2) * 50,
            width: 18,
            height: 18,
            vx: 0, vy: 0,
            type: 'item',
            itemType: Math.random() > 0.65 ? 'fish' : 'coin',
            isCollected: false,
          });
        }

        currentX += platformWidth + gap;
      }

      // Cyber springs & special moving platforms
      pList.push(
        { id: 'cyber_spring_1', x: 700, y: 310, width: 35, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'spring' },
        { id: 'cyber_sink_1', x: 1600, y: 220, width: 120, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'sinking' },
        { id: 'cyber_moving_1', x: 2500, y: 190, width: 120, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'moving', dx: 180, speed: 0.04, startX: 2500, startY: 190 },
        { id: 'cyber_step_1', x: mapLen - 440, y: 320, width: 80, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'normal' },
        { id: 'cyber_step_2', x: mapLen - 340, y: 270, width: 80, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'normal' }
      );

      iList.push(
        { id: 'cyber_catnip_1', x: 1640, y: 130, width: 18, height: 18, vx: 0, vy: 0, type: 'item', itemType: 'catnip', isCollected: false },
        { id: 'cyber_milk_1', x: 2550, y: 110, width: 18, height: 18, vx: 0, vy: 0, type: 'item', itemType: 'milk_potion', isCollected: false }
      );

      // Boss: Mother Matrix AI (represented as a giant robot dog / custom painted laser eye core)
      const bossX = mapLen - 600;
      const stageBoss: Enemy = {
        id: 'boss_stage_5',
        x: bossX,
        y: 100,
        width: 120,
        height: 120,
        vx: -2.2,
        vy: 0,
        type: 'enemy',
        enemyType: 'bird', // beautiful robotic core floats
        hp: 80,
        maxHp: 80,
        direction: -1,
        patrolMinX: bossX - 250,
        patrolMaxX: bossX + 250,
        isDefeated: false,
        scoreValue: 12000,
      };
      eList.push(stageBoss);
      bossRef.current = stageBoss;
    } else if (levelConfig.environment === 'japanese_temple') {
      // Stage 6: japanese_temple - cherry blossom shrines, torii arches and floating lanterns
      let currentX = 0;
      while (currentX < mapLen) {
        const platformWidth = 240 + Math.random() * 160;
        const gap = 110 + Math.random() * 90;

        // Traditional Stone Path or Red Lacquered Wood platforms
        pList.push({
          id: `temple_plat_${currentX}`,
          x: currentX,
          y: currentX === 0 ? 380 : 250 + Math.random() * 110,
          width: platformWidth,
          height: 40,
          vx: 0, vy: 0,
          type: 'platform',
          platformType: 'normal',
        });

        if (currentX > 200 && currentX < mapLen - 700) {
          // Ninja Mice (trained spy rodents!)
          eList.push({
            id: `ninja_mouse_${currentX}`,
            x: currentX + 40,
            y: 190,
            width: 34,
            height: 34,
            vx: -1.8,
            vy: 0,
            type: 'enemy',
            enemyType: 'mouse',
            hp: 5,
            maxHp: 5,
            direction: -1,
            patrolMinX: currentX + 10,
            patrolMaxX: currentX + platformWidth - 20,
            isDefeated: false,
            scoreValue: 900,
          });

          // Floating Wisps / Kitsunebi (represented as hedgehogs with fiery glow that cannot be jumped on easily)
          if (Math.random() > 0.5) {
            eList.push({
              id: `kitsunebi_${currentX}`,
              x: currentX + platformWidth / 2,
              y: 150,
              width: 32,
              height: 32,
              vx: 0.8,
              vy: 0,
              type: 'enemy',
              enemyType: 'hedgehog',
              hp: 4,
              maxHp: 4,
              direction: 1,
              patrolMinX: currentX + 30,
              patrolMaxX: currentX + platformWidth - 30,
              isDefeated: false,
              scoreValue: 1000,
            });
          }

          // Karasu Tengu / Origami Crow (represented as birds)
          if (Math.random() > 0.6) {
            eList.push({
              id: `tengu_crow_${currentX}`,
              x: currentX + platformWidth - 60,
              y: 80 + Math.random() * 60,
              width: 34,
              height: 34,
              vx: 1.5,
              vy: 0,
              type: 'enemy',
              enemyType: 'bird',
              hp: 5,
              maxHp: 5,
              direction: 1,
              patrolMinX: currentX + 40,
              patrolMaxX: currentX + platformWidth - 10,
              isDefeated: false,
              scoreValue: 1100,
            });
          }
        }

        // Koban (traditional Japanese gold coins) in waves
        const kobanCount = Math.floor(platformWidth / 70);
        for (let k = 0; k < kobanCount; k++) {
          iList.push({
            id: `koban_${currentX}_${k}`,
            x: currentX + 30 + k * 65,
            y: 170 + Math.sin(k * 1.5) * 45,
            width: 16,
            height: 22, // slightly taller like a koban!
            vx: 0, vy: 0,
            type: 'item',
            itemType: Math.random() > 0.75 ? 'fish' : 'coin',
            isCollected: false,
          });
        }

        currentX += platformWidth + gap;
      }

      // Torii gate structures and Japanese paper umbrellas (springs)
      pList.push(
        // red parasol springs
        { id: 'temple_parasol_1', x: 750, y: 310, width: 45, height: 30, vx: 0, vy: 0, type: 'platform', platformType: 'spring' },
        { id: 'temple_parasol_2', x: 2000, y: 280, width: 45, height: 30, vx: 0, vy: 0, type: 'platform', platformType: 'spring' },
        // falling paper platform
        { id: 'temple_sinking_paper', x: 1400, y: 240, width: 110, height: 20, vx: 0, vy: 0, type: 'platform', platformType: 'sinking' },
        // floating clouds/wood platforms
        { id: 'temple_moving_wood', x: 2700, y: 200, width: 130, height: 25, vx: 0, vy: 0, type: 'platform', platformType: 'moving', dx: 150, speed: 0.03, startX: 2700, startY: 200 },
        { id: 'temple_torii_top_1', x: mapLen - 440, y: 320, width: 80, height: 20, vx: 0, vy: 0, type: 'platform', platformType: 'normal' },
        { id: 'temple_torii_top_2', x: mapLen - 340, y: 270, width: 80, height: 20, vx: 0, vy: 0, type: 'platform', platformType: 'normal' }
      );

      iList.push(
        { id: 'temple_sacred_sake', x: 1440, y: 160, width: 18, height: 18, vx: 0, vy: 0, type: 'item', itemType: 'milk_potion', isCollected: false },
        { id: 'temple_scroll', x: 2750, y: 130, width: 18, height: 18, vx: 0, vy: 0, type: 'item', itemType: 'catnip', isCollected: false }
      );

      // Boss: Nine-Tailed Fox (九尾の妖狐) - floats gracefully, shoots foxfire and dashes
      const bossX = mapLen - 600;
      const stageBoss: Enemy = {
        id: 'boss_stage_6',
        x: bossX,
        y: 120,
        width: 140, // majestic and large!
        height: 140,
        vx: -1.8,
        vy: 0,
        type: 'enemy',
        enemyType: 'bird', // floats and glides in midair beautifully!
        hp: 120, // highest tier boss
        maxHp: 120,
        direction: -1,
        patrolMinX: bossX - 250,
        patrolMaxX: bossX + 250,
        isDefeated: false,
        scoreValue: 20000,
      };
      eList.push(stageBoss);
      bossRef.current = stageBoss;
    }

    // Goal Flag / House at the very end
    pList.push({
      id: 'stage_goal_house',
      x: mapLen - 250,
      y: 220, // Lowered so player can jump/walk on the Torii gate beams!
      width: 100,
      height: 180, // standardized to align with standard ground height (400)
      vx: 0, vy: 0,
      type: 'platform',
      platformType: 'normal',
    });

    platforms.current = pList;
    enemies.current = eList;
    items.current = iList;
  };

  useEffect(() => {
    buildCurrentStageMap();
  }, [currentStageId]);

  // --- AUDIO STATUS ---
  const handleToggleMute = () => {
    const mutedStatus = audio.toggleMute();
    setIsMuted(mutedStatus);
    audio.playClick();
  };

  // --- CONTROLS LISTENERS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      // Prevent scrolling
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
      }
      keysPressed.current[code] = true;

      // Handle Immediate Trigger on KeyDown (like jumping or attacking)
      const p = player.current;
      if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        const maxJumps = stats.jumpLevel >= 4 ? 2 : 1;
        
        let canJump = false;
        if (p.onGround) {
          canJump = true;
          p.vy = -1 * (9.6 + stats.jumpLevel * 0.5); // Jump power calculation (boosted from 8.5)
          p.jumpCount = 1;
          p.onGround = false;
          audio.playJump();
          spawnDustParticles(p.x + p.width/2, p.y + p.height, 'square', 10);
        } else if (p.jumpCount < maxJumps) {
          canJump = true;
          // Double jump
          p.vy = -1 * (8.5 + stats.jumpLevel * 0.45);
          p.jumpCount++;
          audio.playDoubleJump();
          spawnDustParticles(p.x + p.width/2, p.y + p.height, 'star', 12, '#67e8f9');
        }

        // Submerged swimming jump (less high but infinite)
        const isInsideWater = checkIfPlayerInWater();
        if (isInsideWater) {
          p.vy = -5;
          audio.playFish();
        }
      }

      // Attack Trigger
      if (code === 'KeyZ' || code === 'KeyJ') {
         triggerPlayerAttack();
      }
      if (code === 'KeyX' || code === 'KeyK') {
         triggerPlayerRangedAttack();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [stats]);

  // Check if player is inside the horizontal water boundaries of Stage 2
  const checkIfPlayerInWater = () => {
    const p = player.current;
    if (levelConfig.environment !== 'sewer') return false;
    return platforms.current.some(plat => 
      plat.platformType === 'water_current' &&
      p.x + p.width > plat.x &&
      p.x < plat.x + plat.width &&
      p.y + p.height > plat.y
    );
  };

  const triggerPlayerAttack = () => {
    const p = player.current;
    if (p.attackCooldown > 0) return;
    if (stats.clawLevel < 1) return; // cannot attack if lvl is 0

    p.isAttacking = 10; // active swipe for 10 frames
    p.attackCooldown = 12; // slightly faster cooldown for smoother melee
    audio.playScratch();

    // Spawn scratch sweep anim particle
    particles.current.push({
      x: p.facingDir === 1 ? p.x + p.width : p.x - 30,
      y: p.y - 10,
      vx: 0,
      vy: 0,
      size: 40,
      color: 'rgba(255,255,255,0.7)',
      life: 8,
      maxLife: 8,
      shape: 'scratch',
    });

    // Check melee reach collision instantly with nearby enemies
    // Claw Level stretches melee reach slightly
    const attackReach = 55 + stats.clawLevel * 5; 
    const ax = p.facingDir === 1 ? p.x + p.width : p.x - attackReach;
    enemies.current.forEach((enemy) => {
      if (enemy.isDefeated) return;
      
      const isHit = 
        ax + attackReach > enemy.x &&
        ax < enemy.x + enemy.width &&
        p.y + p.height > enemy.y &&
        p.y < enemy.y + enemy.height;

      if (isHit) {
        // Melee Scratch Damage Scales on Claw Level! (Lv1: 3.0, Lv2: 3.5, Lv3: 4.0, Lv4: 4.5, Lv5: 5.5)
        const dScore = 2.5 + (stats.clawLevel === 5 ? 3.0 : stats.clawLevel * 0.5);
        damageEnemy(enemy, dScore);
      }
    });
  };

  const triggerPlayerRangedAttack = () => {
    const p = player.current;
    if (p.attackCooldown > 0) return;

    p.isAttacking = 8;
    p.attackCooldown = 15;
    audio.playShoot();

    // Ranged attack unlocks different models depending on clawLevel (hairball on low-level, fishbone on level 3+)
    const isFishbone = stats.clawLevel >= 3;
    const projSpeed = isFishbone ? 11 : 8.5;
    const projDmg = isFishbone ? (1.5 + (stats.clawLevel - 3) * 0.5) : (0.8 + stats.clawLevel * 0.2); 
    const projLife = isFishbone ? 24 : 18;

    projectiles.current.push({
      id: `m_proj_${Date.now()}_${Math.trunc(Math.random() * 1000)}`,
      x: p.facingDir === 1 ? p.x + p.width + 5 : p.x - 15,
      y: p.y + p.height / 2 - 4,
      width: 14,
      height: 14,
      vx: p.facingDir * projSpeed,
      vy: 0,
      shooter: 'player',
      type: 'projectile',
      damage: projDmg,
      life: projLife,
      projectileType: isFishbone ? 'fishbone' : 'hairball',
    });

    // Tiny cloud launch dust
    spawnDustParticles(
      p.facingDir === 1 ? p.x + p.width : p.x, 
      p.y + p.height / 2, 
      isFishbone ? 'star' : 'bubble', 
      5, 
      isFishbone ? '#38bdf8' : '#cbd5e1'
    );
  };

  // Handle combat resolution
  const damageEnemy = (enemy: Enemy, damage: number) => {
    if (enemy.isDefeated) return;
    enemy.hp -= damage;
    
    // Spark particles
    spawnDustParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 'star', 12, '#f59e0b');

    if (enemy.hp <= 0) {
      enemy.isDefeated = true;
      audio.playDefeatEnemy();
      player.current.score += enemy.scoreValue;
      setStageScore(player.current.score);

      // Throw mini coin/items occasionally from bosses or big units
      if (enemy.id.startsWith('boss_stage_')) {
        for (let t = 0; t < 15; t++) {
          items.current.push({
            id: `boss_reward_${enemy.id}_${t}`,
            x: enemy.x + Math.random() * enemy.width,
            y: enemy.y + Math.random() * enemy.height - 40,
            width: 18,
            height: 18,
            vx: (Math.random() - 0.5) * 8,
            vy: -4 - Math.random() * 5,
            type: 'item',
            itemType: Math.random() > 0.6 ? 'fish' : 'coin',
            isCollected: false,
          });
        }
      }
    }
  };

  // Damage to player
  const damagePlayer = (amount: number, pushX: number) => {
    const p = player.current;
    if (p.isInvincible > 0 || p.currentHp <= 0) return;

    p.currentHp -= amount;
    p.isInvincible = 60 + stats.shieldLevel * 30; // Scales with shieldLevel, Lv1: 90 (1.5s), Lv5: 210 (3.5s)
    p.vy = -5.5; // bouncing hurt jump
    p.vx = pushX * 3.5;
    audio.playHurt();
    
    // Bubble screen flash effect particles
    spawnDustParticles(p.x + p.width/2, p.y + p.height/2, 'bubble', 20, '#ef4444');

    setHudHp(p.currentHp);
    onHpChanged(p.currentHp);

    if (p.currentHp <= 0) {
      onGameOver();
    }
  };

  const spawnDustParticles = (x: number, y: number, shape: 'square' | 'circle' | 'star' | 'bubble' | 'wind' = 'circle', count = 5, customColor?: string) => {
    for (let c = 0; c < count; c++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4.5,
        vy: (Math.random() - 0.5) * 4.5,
        size: 3 + Math.random() * 6,
        color: customColor || ['#ffffff', '#fcd34d', '#fef08a', '#e2e8f0'][Math.floor(Math.random() * 4)],
        life: 15 + Math.random() * 20,
        maxLife: 35,
        shape,
      });
    }
  };

  // --- CORE GAME TICK (GAMELOOP) ---
  useEffect(() => {
    let frameId: number;

    const tick = () => {
      if (isPausedState) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      updatePhysics();
      renderScene();

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [currentStageId, isPausedState]);

  // Main physics solver
  const updatePhysics = () => {
    const p = player.current;

    // Increment cosmetic tickers
    animCycle.current += 0.25;

    // Timers cooldown ticks
    if (p.isInvincible > 0) p.isInvincible--;
    if (p.isCatnipActive > 0) p.isCatnipActive--;
    if (p.isAttacking > 0) p.isAttacking--;
    if (p.attackCooldown > 0) p.attackCooldown--;

    // 1. Water vs Air environments physics determinants
    const inWater = checkIfPlayerInWater();
    const currentGravity = inWater ? 0.15 : levelConfig.physics.gravity;
    const currentFriction = inWater ? 0.82 : levelConfig.physics.friction;

    // Wind Force Gusts (Stage 3 gimmick)
    if (levelConfig.physics.windForce && !inWater) {
      // Wind alternates cycles blowing left or right
      const windSpeed = levelConfig.physics.windForce * Math.sin(animCycle.current * 0.005);
      p.vx += windSpeed;
      if (Math.abs(windSpeed) > 0.03 && Math.random() > 0.9) {
        // Spawn blowing wind trace lines
        particles.current.push({
          x: windSpeed > 0 ? cameraX.current : cameraX.current + 800,
          y: Math.random() * 450,
          vx: windSpeed * 25,
          vy: (Math.random() - 0.5) * 0.4,
          size: 20 + Math.random() * 30,
          color: 'rgba(255,255,255,0.15)',
          life: 40,
          maxLife: 40,
          shape: 'wind',
        });
      }
    }

    // 2. Resolve Input Movements
    let rightKey = keysPressed.current['ArrowRight'] || keysPressed.current['KeyD'] || virtualCtrl.current.right;
    let leftKey = keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA'] || virtualCtrl.current.left;

    let targetSpeed = 3.2 + stats.speedLevel * 0.45;
    if (p.isCatnipActive > 0) {
      targetSpeed *= 1.5; // Catnip super run!
    }

    if (rightKey) {
      p.vx += inWater ? 0.35 : 0.45;
      p.facingDir = 1;
      if (p.vx > targetSpeed) p.vx = targetSpeed;
    } else if (leftKey) {
      p.vx -= inWater ? 0.35 : 0.45;
      p.facingDir = -1;
      if (p.vx < -targetSpeed) p.vx = -targetSpeed;
    } else {
      // Apply frictional dampening
      p.vx *= currentFriction;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }

    // Gravity falls
    p.vy += currentGravity;
    const maxFallSpeed = inWater ? 3.0 : 12;
    if (p.vy > maxFallSpeed) p.vy = maxFallSpeed;

    // Apply speed mechanics to current coords
    p.x += p.vx;
    p.y += p.vy;

    // Lock boundaries left
    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }

    // Defeated / Fall in Holes
    if (p.y > 480) {
      damagePlayer(p.currentHp, 0); // direct defeat
    }

    // --- ITEM RETRIEVAL MAGNET SOLVER ---
    const magnetRadius = stats.magnetLevel > 1 ? 50 + stats.magnetLevel * 45 : 0;
    items.current.forEach((it) => {
      if (it.isCollected) return;

      if (magnetRadius > 0) {
        const dx = (p.x + p.width/2) - (it.x + it.width/2);
        const dy = (p.y + p.height/2) - (it.y + it.height/2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < magnetRadius) {
          // Magnetize! Pull towards player
          it.x += (dx > 0 ? 3.5 : -3.5);
          it.y += (dy > 0 ? 3.5 : -3.5);
        }
      }

      // Exact intersection
      const collected = 
        p.x + p.width > it.x &&
        p.x < it.x + it.width &&
        p.y + p.height > it.y &&
        p.y < it.y + it.height;

      if (collected) {
        it.isCollected = true;
        if (it.itemType === 'coin') {
          p.coinsCollected++;
          setCoinsThisRun(p.coinsCollected);
          audio.playCoin();
          onCoinsCollected(1);
          spawnDustParticles(it.x, it.y, 'star', 6, '#eab308');
        } else if (it.itemType === 'fish') {
          p.fishesCollected++;
          setFishesThisRun(p.fishesCollected);
          audio.playFish();
          onFishesCollected(1);
          spawnDustParticles(it.x, it.y, 'star', 10, '#fb7185');
        } else if (it.itemType === 'milk_potion') {
          if (p.currentHp < stats.maxHp) {
            p.currentHp++;
            setHudHp(p.currentHp);
            onHpChanged(p.currentHp);
          }
          audio.playHeal();
          spawnDustParticles(it.x, it.y, 'bubble', 15, '#a7f3d0');
        } else if (it.itemType === 'catnip') {
          p.isCatnipActive = 240; // 4 seconds of gold frenzy speed!
          audio.playClear();
          spawnDustParticles(it.x, it.y, 'star', 25, '#f472b6');
        }
      }
    });

    // --- ENEMY RECT COLLISION & STOMPING SOLVER ---
    enemies.current.forEach((enemy) => {
      if (enemy.isDefeated) return;

      // Handle individual enemy patrol routines & movement actions
      if (enemy.enemyType === 'fish_enemy') {
        // Leaps up-down water pools
        enemy.y += enemy.vy;
        enemy.vy += 0.22; // gravity inside leap
        if (enemy.y > 450) {
          enemy.y = 455;
          enemy.vy = -1 * (8 + Math.random() * 5); // leap again
        }
      } else if (enemy.enemyType === 'bird') {
        // Flaps in wavy sin curves
        enemy.stateTimer = (enemy.stateTimer || 0) + 1;
        
        if (enemy.id === 'boss_stage_6') {
          // Nine-Tailed Fox: tracks player height gently and shoots forward/sinusoidal dashes!
          enemy.y += Math.sin(enemy.stateTimer * 0.04) * 20 * 0.1;
          
          // Gentle tracking of player y level to be challenging!
          if (p.y < enemy.y && enemy.y > 60) {
            enemy.y -= 0.6;
          } else if (p.y > enemy.y && enemy.y < 280) {
            enemy.y += 0.6;
          }
          
          // Move in patrol range
          enemy.x += enemy.vx;
          if (enemy.patrolMinX && enemy.x < enemy.patrolMinX) {
            enemy.vx = Math.abs(enemy.vx) * 1.02; // speed up slightly when bouncing
            if (enemy.vx > 3.2) enemy.vx = 3.2;
            enemy.direction = 1;
          } else if (enemy.patrolMaxX && enemy.x > enemy.patrolMaxX) {
            enemy.vx = -Math.abs(enemy.vx) * 1.02;
            if (Math.abs(enemy.vx) > 3.2) enemy.vx = -3.2;
            enemy.direction = -1;
          }
        } else {
          enemy.y += Math.sin(enemy.stateTimer * 0.05) * 1.5;
          enemy.x += enemy.vx;
          
          // Loop range
          if (enemy.patrolMinX && enemy.x < enemy.patrolMinX) {
            enemy.vx = Math.abs(enemy.vx);
            enemy.direction = 1;
          } else if (enemy.patrolMaxX && enemy.x > enemy.patrolMaxX) {
            enemy.vx = -Math.abs(enemy.vx);
            enemy.direction = -1;
          }
        }
      } else {
        // Grounded enemies
        enemy.x += enemy.vx;
        if (enemy.patrolMinX && enemy.x < enemy.patrolMinX) {
          enemy.vx = Math.abs(enemy.vx);
          enemy.direction = 1;
        } else if (enemy.patrolMaxX && enemy.x > enemy.patrolMaxX) {
          enemy.vx = -Math.abs(enemy.vx);
          enemy.direction = -1;
        }
      }

      // Check collision with cat
      const overlapX = Math.min(p.x + p.width, enemy.x + enemy.width) - Math.max(p.x, enemy.x);
      const overlapY = Math.min(p.y + p.height, enemy.y + enemy.height) - Math.max(p.y, enemy.y);

      if (overlapX > 0 && overlapY > 0) {
        // Collision exists! Is it a STOMP (jumping on target's head)?
        // Verify falling velocity, and cat's bottoms is high enough.
        const isStomp = p.vy > 0 && (p.y + p.height - p.vy) <= (enemy.y + 12);

        if (isStomp && enemy.enemyType !== 'hedgehog') {
          // Hedgehog has prickles, cannot be jumped!
          p.vy = -6.5; // bounce up
          p.jumpCount = 1; // grant single jump again
          const stompDamage = stats.clawLevel; // 踏みつけ攻撃力はつめレベルに比例 (Lv1: 1.0, Lv5: 5.0)
          damageEnemy(enemy, stompDamage);
        } else {
          // Cat takes damage!
          const pushSide = p.x < enemy.x ? -1 : 1;
          damagePlayer(1, pushSide);
        }
      }
    });

    // --- PROJECTILE TRACKERS ---
    for (let idx = projectiles.current.length - 1; idx >= 0; idx--) {
      const proj = projectiles.current[idx];
      proj.x += proj.vx;
      proj.y += proj.vy;
      
      let shouldRemove = false;
      if (Math.abs(proj.x - p.x) > 600) {
        shouldRemove = true;
      }

      // Decrement range / lifetime limit of medium-range attacks
      if (proj.life !== undefined) {
        proj.life--;
        if (proj.life <= 0) {
          shouldRemove = true;
        }
      }

      if (shouldRemove) {
        projectiles.current.splice(idx, 1);
        continue;
      }

      // Check hits on enemies
      if (proj.shooter === 'player') {
        const pDmg = proj.damage !== undefined ? proj.damage : 2;
        for (let eIdx = 0; eIdx < enemies.current.length; eIdx++) {
          const enemy = enemies.current[eIdx];
          if (enemy.isDefeated) continue;
          if (
            proj.x + proj.width > enemy.x &&
            proj.x < enemy.x + enemy.width &&
            proj.y + proj.height > enemy.y &&
            proj.y < enemy.y + enemy.height
          ) {
            damageEnemy(enemy, pDmg); // Hairball is 1.0, fishbone is 2.0
            spawnDustParticles(proj.x, proj.y, 'star', 8, '#38bdf8');
            projectiles.current.splice(idx, 1);
            break;
          }
        }
      }
    }

    // --- PARTICLE LOGICS ---
    particles.current.forEach((part, idx) => {
      part.x += part.vx;
      part.y += part.vy;
      part.life--;
      if (part.life <= 0) {
        particles.current.splice(idx, 1);
      }
    });

    // --- DETECT PLATFORM SOLID COLLISIONS ---
    let landingGround = false;
    platforms.current.forEach((plat) => {
      // Sinking Platform logic
      if (plat.platformType === 'sinking') {
        const isStoodOn = 
          p.x + p.width > plat.x &&
          p.x < plat.x + plat.width &&
          Math.abs(p.y + p.height - plat.y) < 4 &&
          p.vy >= 0;

        if (isStoodOn) {
          plat.y += 0.75; // Sinks!
        }
      }

      // Moving Platform logic
      if (plat.platformType === 'moving' && plat.startX && plat.startY) {
        plat.stateTimer = (plat.stateTimer || 0) + 1;
        if (plat.dx) {
          plat.x = plat.startX + Math.sin(plat.stateTimer * (plat.speed || 0.02)) * plat.dx;
        }
        if (plat.dy) {
          plat.y = plat.startY + Math.sin(plat.stateTimer * (plat.speed || 0.02)) * plat.dy;
        }
      }

      const overlapX = Math.min(p.x + p.width, plat.x + plat.width) - Math.max(p.x, plat.x);
      const overlapY = Math.min(p.y + p.height, plat.y + plat.height) - Math.max(p.y, plat.y);

      if (overlapX > 0 && overlapY > 0) {
        // Resolve platform collision based on overlap depths & direction
        if (plat.platformType === 'water_current') {
          // Translucent water - affects gravity, no solid pushing
          p.vx += plat.flowDirection || 0; // slowly carries player
          if (Math.random() > 0.95) {
            // bubble particles rising
            particles.current.push({
              x: p.x + Math.random() * p.width,
              y: p.y + p.height,
              vx: 0,
              vy: -0.8 - Math.random() * 1.5,
              size: 2 + Math.random() * 5,
              color: 'rgba(56, 189, 248, 0.5)',
              life: 30,
              maxLife: 30,
              shape: 'bubble',
            });
          }
          return;
        }

        if (plat.platformType === 'spikes') {
          // Spike deals instant damage
          damagePlayer(1, p.x < (plat.x + plat.width/2) ? -1 : 1);
          return;
        }

        if (plat.platformType === 'spring') {
          // Bounce spring mechanism
          p.vy = -12; // super bounce!
          p.jumpCount = 1; // grant double jump again
          audio.playSpring();
          spawnDustParticles(plat.x + plat.width/2, plat.y + 10, 'star', 15, '#eab308');
          return;
        }

        // Standard physics solid resolution
        if (overlapX < overlapY) {
          // Resolve side push
          if (p.x < plat.x) {
            p.x -= overlapX;
          } else {
            p.x += overlapX;
          }
          p.vx = 0;
        } else {
          // Resolve top/bottom push
          if (p.y < plat.y) {
            // Player lands on top!
            p.y -= overlapY;
            p.vy = 0;
            p.onGround = true;
            p.jumpCount = 0; // Reset double jumping limits
            landingGround = true;
            
            // Re-bind to moving platform speeds
            if (plat.platformType === 'moving' && plat.dx && plat.startX) {
              const movingSpeedX = Math.cos((plat.stateTimer || 0) * (plat.speed || 0.02)) * plat.dx * (plat.speed || 0.02);
              p.x += movingSpeedX;
            }
          } else {
            // Head hitting brick bottom
            p.y += overlapY;
            p.vy = 0.5;
          }
        }
      }
    });

    if (landingGround) {
      p.onGround = true;
    } else {
      p.onGround = false;
    }

    // --- CHECK STAGE GOAL HOUSES TARGETS COMPLETE ---
    if (p.x > levelConfig.mapLength - 200) {
      const bossDead = bossRef.current ? bossRef.current.isDefeated : true;
      if (bossDead) {
        // Success clearance!
        audio.playClear();
        // Return coin reward bonus
        onClearStage(p.coinsCollected, p.fishesCollected);
      } else {
        // Block by invisible boss border trigger
        p.x = levelConfig.mapLength - 205;
        p.vx = 0;
        if (!isBossTriggered.current) {
          isBossTriggered.current = true;
        }
      }
    }

    // Camera tracker positioning
    let targetCamX = p.x - 250;
    if (targetCamX < 0) targetCamX = 0;
    if (targetCamX > levelConfig.mapLength - 800) targetCamX = levelConfig.mapLength - 800;
    cameraX.current = cameraX.current * 0.9 + targetCamX * 0.1;
  };

  // Rendering graphics on Canvas
  const renderScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const p = player.current;
    const camX = cameraX.current;

    // 1. Draw gradient environmental backgrounds
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, levelConfig.bgColors[0]);
    grad.addColorStop(1, levelConfig.bgColors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative clouds / sun depending on environments
    if (levelConfig.environment === 'grassland') {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(100 - camX * 0.1, 80, 25, 0, Math.PI * 2);
      ctx.arc(130 - camX * 0.1, 70, 35, 0, Math.PI * 2);
      ctx.arc(160 - camX * 0.1, 80, 25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(500 - camX * 0.1, 100, 20, 0, Math.PI * 2);
      ctx.arc(525 - camX * 0.1, 90, 30, 0, Math.PI * 2);
      ctx.arc(550 - camX * 0.1, 100, 20, 0, Math.PI * 2);
      ctx.fill();

      // Giant warm sun
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(700, 60, 45, 0, Math.PI * 2);
      ctx.fill();
    } else if (levelConfig.environment === 'sewer') {
      // Sewer wall patterns
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      for (let s = 0; s < 4000; s += 200) {
        ctx.beginPath();
        ctx.moveTo(s - camX, 0);
        ctx.lineTo(s - camX, 450);
        ctx.stroke();
      }
    } else if (levelConfig.environment === 'sky_castle') {
      // Sky clouds background floating
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let sc = 0; sc < 4; sc++) {
        const offsetCloudX = (sc * 350) - camX * 0.25;
        ctx.beginPath();
        ctx.arc(offsetCloudX, 150, 30, 0, Math.PI*2);
        ctx.arc(offsetCloudX + 40, 140, 45, 0, Math.PI*2);
        ctx.arc(offsetCloudX + 80, 150, 30, 0, Math.PI*2);
        ctx.fill();
      }
    } else if (levelConfig.environment === 'magma_cave') {
      // Volcanic magma embers floating up!
      ctx.fillStyle = 'rgba(249, 115, 22, 0.4)'; // semi-transparent orange embers
      for (let sc = 0; sc < 8; sc++) {
        const emberX = ((sc * 140) + Math.sin(animCycle.current * 0.02 + sc) * 40 - camX * 0.4) % 850;
        const finalEmberX = emberX < 0 ? emberX + 850 : emberX;
        const emberY = (450 - (animCycle.current * 1.6 + sc * 70) % 450);
        ctx.beginPath();
        ctx.arc(finalEmberX, emberY, 3 + (sc % 3) * 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(finalEmberX, emberY, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
      }
      // Draw lava glowing mist at the bottom
      ctx.fillStyle = 'rgba(220, 38, 38, 0.15)';
      ctx.fillRect(0, 390, canvas.width, 60);
    } else if (levelConfig.environment === 'cyber_space') {
      // Draw neon cybergrid wireframe lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)'; // electric cyan
      ctx.lineWidth = 1;
      
      // Vertical grid lines with perspective shift
      for (let sx = -100; sx < 1000; sx += 80) {
        const shiftX = sx - (camX * 0.2) % 80;
        ctx.beginPath();
        ctx.moveTo(shiftX, 0);
        ctx.lineTo(shiftX - 40, 450);
        ctx.stroke();
      }
      // Horizontal digital scanner lines
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.12)'; // neon purple
      for (let sy = 30; sy < 450; sy += 50) {
        ctx.beginPath();
        ctx.moveTo(0, sy + Math.sin(animCycle.current * 0.005) * 5);
        ctx.lineTo(800, sy + Math.sin(animCycle.current * 0.005) * 5);
        ctx.stroke();
      }
    } else if (levelConfig.environment === 'japanese_temple') {
      // Draw magnificent shrine backdrops (Silhouette Torii or mountains or trees)
      ctx.fillStyle = 'rgba(74, 4, 16, 0.2)'; // deep dark pink shadow mountains
      for (let m = 0; m < 3; m++) {
        const offsetM = (m * 400 - camX * 0.15) % 900;
        const finalOM = offsetM < 0 ? offsetM + 900 : offsetM;
        ctx.beginPath();
        ctx.moveTo(finalOM, 450);
        ctx.lineTo(finalOM + 150, 180 + m * 30);
        ctx.lineTo(finalOM + 300, 450);
        ctx.closePath();
        ctx.fill();
      }

      // Traditional Red Torii Gate silhouettes in the deep background
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)'; // soft red silhouette
      for (let t = 0; t < 2; t++) {
        const toriiX = (t * 500 - camX * 0.2) % 850;
        const finalTX = toriiX < 0 ? toriiX + 850 : toriiX;
        ctx.fillRect(finalTX, 280, 8, 120);
        ctx.fillRect(finalTX + 50, 280, 8, 120);
        ctx.fillRect(finalTX - 10, 270, 78, 12);
        ctx.fillRect(finalTX - 5, 260, 68, 6);
      }

      // Elegant falling Cherry Blossom petals (桜吹雪) blowing in a gentle wind
      ctx.fillStyle = 'rgba(251, 113, 133, 0.7)'; // beautiful sakura pink
      for (let p = 0; p < 12; p++) {
        const sakuraX = ((p * 90) + Math.sin(animCycle.current * 0.01 + p) * 35 - camX * 0.35) % 850;
        const finalSakuraX = sakuraX < 0 ? sakuraX + 850 : sakuraX;
        const sakuraY = (animCycle.current * 1.2 + p * 50) % 450;
        
        ctx.beginPath();
        ctx.ellipse(finalSakuraX, sakuraY, 6, 3, Math.sin(animCycle.current * 0.03 + p), 0, Math.PI * 2);
        ctx.fill();

        // White glowing highlights for extra magic
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(finalSakuraX - 1, sakuraY - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(251, 113, 133, 0.7)';
      }
    }

    // 2. Draw solid platforms/gimmicks
    platforms.current.forEach((plat) => {
      if (plat.x + plat.width < camX || plat.x > camX + 800) return; // culling off-screen platforms

      const drawX = plat.x - camX;
      const drawY = plat.y;

      if (plat.id === 'stage_goal_house') {
        // Draw Japanese Goal House & Torii Gate / Golden Fish Bowl!
        ctx.fillStyle = '#b45309'; // brown pillar
        ctx.fillRect(drawX, 260, 15, 140);
        ctx.fillRect(drawX + 85, 260, 15, 140);
        
        ctx.fillStyle = '#ef4444'; // red gate top
        ctx.fillRect(drawX - 15, 240, 130, 25);
        ctx.fillRect(drawX - 5, 220, 110, 10);

        // Gold bowl at center table
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(drawX + 50, 340, 20, 0, Math.PI, true);
        ctx.fill();
        ctx.fillStyle = '#38bdf8'; // water inside
        ctx.beginPath();
        ctx.arc(drawX + 50, 340, 16, 0, Math.PI, true);
        ctx.fill();
        ctx.fillStyle = '#f97316'; // fish inside
        ctx.fillRect(drawX + 45, 332, 10, 5);

        // Cleared flag checking indication text
        const isBossDead = bossRef.current ? bossRef.current.isDefeated : true;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Kiwi Maru, sans-serif';
        ctx.fillText(isBossDead ? '← GOAL!' : '🔒 ボスを倒して', drawX + 5, 200);
        return;
      }

      switch (plat.platformType) {
        case 'water_current':
          ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'; // translucent blue
          ctx.fillRect(drawX, drawY, plat.width, plat.height);
          // Wave lines
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(drawX, drawY + 15);
          ctx.lineTo(drawX + plat.width, drawY + 15);
          ctx.stroke();
          break;
        case 'spikes':
          ctx.fillStyle = '#94a3b8';
          // Draw metallic spike triangles along width
          const spikeWidth = 15;
          const spikeCount = Math.floor(plat.width / spikeWidth);
          for (let s = 0; s < spikeCount; s++) {
            ctx.beginPath();
            ctx.moveTo(drawX + s * spikeWidth, drawY + plat.height);
            ctx.lineTo(drawX + s * spikeWidth + spikeWidth / 2, drawY);
            ctx.lineTo(drawX + (s + 1) * spikeWidth, drawY + plat.height);
            ctx.closePath();
            ctx.fill();
          }
          break;
        case 'spring':
          ctx.fillStyle = '#ef4444'; // red spring bases
          ctx.fillRect(drawX, drawY + plat.height - 8, plat.width, 8);
          ctx.fillStyle = '#fcd34d'; // yellow coils
          ctx.fillRect(drawX + 6, drawY + 4, plat.width - 12, plat.height - 12);
          ctx.fillStyle = '#ef4444'; // top cap
          ctx.fillRect(drawX, drawY, plat.width, 6);
          break;
        case 'sinking':
          ctx.fillStyle = '#1e293b'; // sinking slabs obsidian dark slate
          ctx.fillRect(drawX, drawY, plat.width, plat.height);
          ctx.fillStyle = '#e2e8f0'; // cracking white veins
          ctx.fillRect(drawX + 8, drawY + 2, plat.width - 16, 4);
          ctx.fillText('⚡ 崩落', drawX + 15, drawY + 14);
          break;
        case 'moving':
          ctx.fillStyle = '#0f172a'; // darker blue Moving Platform
          ctx.fillRect(drawX, drawY, plat.width, plat.height);
          ctx.fillStyle = '#a855f7'; // purple edge
          ctx.fillRect(drawX, drawY, plat.width, 4);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px system-ui';
          ctx.fillText('⇆ 浮遊中', drawX + 22, drawY + 15);
          break;
        case 'normal':
        default:
          ctx.fillStyle = levelConfig.groundColor;
          ctx.fillRect(drawX, drawY, plat.width, plat.height);
          
          // Draw organic decorations like grass tops or brick joints
          if (levelConfig.environment === 'grassland') {
            ctx.fillStyle = '#34d399'; // green surface
            ctx.fillRect(drawX, drawY, plat.width, 8);
          } else if (levelConfig.environment === 'sewer') {
            ctx.fillStyle = 'rgba(255,255,255,0.06)'; // moss
            ctx.fillRect(drawX, drawY, plat.width, 10);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(drawX, drawY + plat.height - 4, plat.width, 4);
          } else if (levelConfig.environment === 'sky_castle') {
            // clouds fluffy platform look
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(drawX, drawY, plat.width, 6);
          } else if (levelConfig.environment === 'magma_cave') {
            // Hot orange/red glowing lava veins on the edges
            ctx.fillStyle = '#f97316'; 
            ctx.fillRect(drawX, drawY, plat.width, 5);
            ctx.fillStyle = '#ef4444'; // deep hot red lines underneath
            ctx.fillRect(drawX, drawY + 5, plat.width, 3);
          } else if (levelConfig.environment === 'cyber_space') {
            // Glowing cyan lines & neon tech circuits
            ctx.fillStyle = '#06b6d4'; 
            ctx.fillRect(drawX, drawY, plat.width, 4);
            ctx.fillStyle = '#3b82f6'; // cobalt details on bottom corner
            ctx.fillRect(drawX, drawY + plat.height - 3, plat.width, 3);
          } else if (levelConfig.environment === 'japanese_temple') {
            // 朱塗りの漆器（朱色）と金色のライン
            ctx.fillStyle = '#dc2626'; // Vermilion red lacquer
            ctx.fillRect(drawX, drawY, plat.width, 10);
            ctx.fillStyle = '#eab308'; // Golden ornamental line
            ctx.fillRect(drawX, drawY + 10, plat.width, 3);
            ctx.fillStyle = '#7b2cbf'; // Deep temple violet side
            ctx.fillRect(drawX, drawY + 13, plat.width, plat.height - 13);
          }
          break;
      }
    });

    // 3. Draw collectible items
    items.current.forEach((it) => {
      if (it.isCollected) return;
      if (it.x + it.width < camX || it.x > camX + 800) return;

      const drawX = it.x - camX;
      const drawY = it.y;
      const pulseScalar = Math.sin(animCycle.current * 0.15) * 2;

      if (it.itemType === 'coin') {
        if (levelConfig.environment === 'japanese_temple') {
          // Draw dynamic gold Koban coin (Japanese traditional gold coin)
          ctx.fillStyle = '#fbbf24'; // gold
          ctx.strokeStyle = '#b45309'; // bronze border
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(drawX + 9, drawY + 9 + pulseScalar, 6, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Horizontal grid lines (characters on Koban)
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(drawX + 6, drawY + 6 + pulseScalar);
          ctx.lineTo(drawX + 12, drawY + 6 + pulseScalar);
          ctx.moveTo(drawX + 5, drawY + 9 + pulseScalar);
          ctx.lineTo(drawX + 13, drawY + 9 + pulseScalar);
          ctx.moveTo(drawX + 6, drawY + 12 + pulseScalar);
          ctx.lineTo(drawX + 12, drawY + 12 + pulseScalar);
          ctx.stroke();
        } else {
          // Double concentric glowing gold circles
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(drawX + 9, drawY + 9 + pulseScalar, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(drawX + 9, drawY + 9 + pulseScalar, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (it.itemType === 'fish') {
        if (levelConfig.environment === 'japanese_temple') {
          // Japanese beautiful Carp / Tai fish
          ctx.fillStyle = '#f43f5e'; // cherry rosy pink Tai
          ctx.strokeStyle = '#ffffff'; // white highlight outlines
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(drawX + 10, drawY + 9 + pulseScalar, 9, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Tail fin
          ctx.beginPath();
          ctx.moveTo(drawX + 2, drawY + 9 + pulseScalar);
          ctx.lineTo(drawX - 3, drawY + 4 + pulseScalar);
          ctx.lineTo(drawX - 3, drawY + 14 + pulseScalar);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Red rare tuna fish representation
          ctx.fillStyle = '#f43f5e';
          ctx.strokeStyle = '#9f1239';
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.ellipse(drawX + 10, drawY + 9 + pulseScalar, 9, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Tail fin triangle
          ctx.beginPath();
          ctx.moveTo(drawX + 2, drawY + 9 + pulseScalar);
          ctx.lineTo(drawX - 2, drawY + 5 + pulseScalar);
          ctx.lineTo(drawX - 2, drawY + 13 + pulseScalar);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (it.itemType === 'milk_potion') {
        if (levelConfig.environment === 'japanese_temple') {
          // Sacred Sake ceramic flask (おみき)
          ctx.fillStyle = '#f8fafc'; // clean white ceramic
          ctx.beginPath();
          ctx.moveTo(drawX + 6, drawY + 17);
          ctx.lineTo(drawX + 4, drawY + 11);
          ctx.quadraticCurveTo(drawX + 4, drawY + 6, drawX + 7, drawY + 6);
          ctx.lineTo(drawX + 7, drawY + 2);
          ctx.lineTo(drawX + 11, drawY + 2);
          ctx.lineTo(drawX + 11, drawY + 6);
          ctx.quadraticCurveTo(drawX + 14, drawY + 6, drawX + 14, drawY + 11);
          ctx.lineTo(drawX + 12, drawY + 17);
          ctx.closePath();
          ctx.fill();
          // Red thread tie decoration
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(drawX + 7, drawY + 6, 4, 2);
        } else {
          // Cute green potion bottle
          ctx.fillStyle = '#10b981';
          ctx.fillRect(drawX + 4, drawY + 6, 10, 11);
          ctx.fillStyle = '#ffffff'; // milk white stopper cap
          ctx.fillRect(drawX + 6, drawY + 2, 6, 4);
        }
      } else if (it.itemType === 'catnip') {
        if (levelConfig.environment === 'japanese_temple') {
          // Japanese Legendary scroll (巻物)
          ctx.fillStyle = '#dc2626'; // Vermillion outer scroll
          ctx.fillRect(drawX + 4, drawY + 4, 11, 10);
          ctx.fillStyle = '#fef08a'; // golden scroll rods
          ctx.fillRect(drawX + 2, drawY + 3, 2, 12);
          ctx.fillRect(drawX + 15, drawY + 3, 2, 12);
          // white binding cord
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(drawX + 8, drawY + 4, 3, 10);
        } else {
          // Glowing purple leaves
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.ellipse(drawX + 9, drawY + 9, 8, 4, Math.PI/4, 0, Math.PI*2);
          ctx.ellipse(drawX + 9, drawY + 9, 8, 4, -Math.PI/4, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillText('⭐', drawX + 3, drawY + 12);
        }
      }
    });

    // 4. Draw projectiles
    projectiles.current.forEach((proj) => {
      const drawX = proj.x - camX;
      
      if (proj.projectileType === 'hairball') {
        // Draw soft, fuzzy hairball circular shape
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(drawX + 7, proj.y + 7, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // shine dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(drawX + 5, proj.y + 5, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;

        // Draw fishbone shape!
        ctx.beginPath();
        // center bone
        ctx.moveTo(drawX, proj.y + 5);
        ctx.lineTo(drawX + 16, proj.y + 5);
        // ribs spine-lines
        ctx.moveTo(drawX + 4, proj.y); ctx.lineTo(drawX + 5, proj.y + 10);
        ctx.moveTo(drawX + 8, proj.y); ctx.lineTo(drawX + 9, proj.y + 10);
        ctx.moveTo(drawX + 12, proj.y); ctx.lineTo(drawX + 13, proj.y + 10);
        // tail triangle head
        ctx.stroke();
        
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(drawX + 16, proj.y + 5);
        ctx.lineTo(drawX + 12, proj.y);
        ctx.lineTo(drawX + 12, proj.y + 10);
        ctx.closePath();
        ctx.fill();
      }
    });

    // 5. Draw enemies
    enemies.current.forEach((enemy) => {
      if (enemy.isDefeated) return;
      if (enemy.x + enemy.width < camX || enemy.x > camX + 800) return;

      const drawX = enemy.x - camX;
      const drawY = enemy.y;

      // Handle customized BOSS drawing parameters
      if (enemy.id.startsWith('boss_stage_')) {
        // Under boss glowing red aura
        const glowPulse = Math.sin(animCycle.current * 0.2) * 10;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.beginPath();
        ctx.arc(drawX + enemy.width/2, drawY + enemy.height, 50 + glowPulse, 0, Math.PI, true);
        ctx.fill();

        // HP track above Boss
        const barW = 100;
        const hpPercent = enemy.hp / enemy.maxHp;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(drawX + enemy.width/2 - barW/2, drawY - 20, barW, 8);
        ctx.fillStyle = '#ef4444'; // red health
        ctx.fillRect(drawX + enemy.width/2 - barW/2, drawY - 20, barW * hpPercent, 8);
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(drawX + enemy.width/2 - barW/2, drawY - 20, barW, 8);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px pixel, monospace';
        ctx.fillText(`BOSS: HP ${Math.ceil(enemy.hp)}/${enemy.maxHp}`, drawX + enemy.width/2 - 40, drawY - 26);
      }

      switch (enemy.enemyType) {
        case 'mouse':
          // Grey round body, small pink nose, tail
          const isBoss = enemy.id === 'boss_stage_1';
          ctx.fillStyle = isBoss ? '#475569' : '#94a3b8'; // darker slate if Boss
          ctx.beginPath();
          ctx.arc(drawX + enemy.width / 2, drawY + enemy.height / 2 + 3, enemy.width / 2 - 2, 0, Math.PI * 2);
          ctx.fill();

          // Big ears
          ctx.fillStyle = '#f87171'; // red pink inner ears
          ctx.beginPath();
          const pMin = isBoss ? 16 : 6;
          ctx.arc(drawX + enemy.width / 4, drawY + enemy.height / 3, pMin, 0, Math.PI * 2);
          ctx.arc(drawX + (3 * enemy.width) / 4, drawY + enemy.height / 3, pMin, 0, Math.PI * 2);
          ctx.fill();

          // Face nose
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(enemy.direction === 1 ? drawX + enemy.width - 3 : drawX + 3, drawY + enemy.height / 2 + 5, isBoss ? 8 : 4, 0, Math.PI * 2);
          ctx.fill();

          // Boss tag text
          if (isBoss) {
            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 11px system-ui';
            ctx.fillText('👑ギガ・マウス', drawX - 10, drawY - 5);
          }
          break;

        case 'dog':
          // Sky bulldog look
          ctx.fillStyle = '#78350f'; // brown fur
          ctx.fillRect(drawX, drawY + 8, enemy.width, enemy.height - 8);
          ctx.fillStyle = '#ffffff'; // white collar teeth
          ctx.fillRect(enemy.direction === 1 ? drawX + enemy.width - 8 : drawX, drawY + 12, 8, 8);
          // Red eyes
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(enemy.direction === 1 ? drawX + enemy.width - 12 : drawX + 12, drawY + 12, 3, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'crab':
          // Shell + Snapping Claws
          const isCrabBoss = enemy.id === 'boss_stage_2';
          ctx.fillStyle = isCrabBoss ? '#9f1239' : '#e11d48'; // red structure
          // shell body
          ctx.fillRect(drawX, drawY + enemy.height/2, enemy.width, enemy.height/2);
          // stalk eyes
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(drawX + 6, drawY + 4, 4, 8);
          ctx.fillRect(drawX + enemy.width - 10, drawY + 4, 4, 8);
          ctx.fillStyle = '#000000';
          ctx.fillRect(drawX + 7, drawY + 4, 2, 2);
          ctx.fillRect(drawX + enemy.width - 9, drawY + 4, 2, 2);
          // pincers snapping
          ctx.fillStyle = isCrabBoss ? '#b91c1c' : '#f43f5e';
          const pincerOffset = Math.sin(animCycle.current * 0.3) * 6;
          ctx.fillRect(drawX - 5, drawY + 10 + pincerOffset, 8, 12);
          ctx.fillRect(drawX + enemy.width - 3, drawY + 10 - pincerOffset, 8, 12);
          
          if (isCrabBoss) {
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 11px system-ui';
            ctx.fillText('🦀大ザリガニ', drawX - 10, drawY - 6);
          }
          break;

        case 'fish_enemy':
          // Vertical leaping gold piranha fish
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.ellipse(drawX + enemy.width/2, drawY + enemy.height/2, enemy.width/2, enemy.height/3, Math.PI/4, 0, Math.PI*2);
          ctx.fill();
          // tail
          ctx.beginPath();
          ctx.moveTo(drawX + 2, drawY + enemy.height/2);
          ctx.lineTo(drawX - 4, drawY + enemy.height/2 - 8);
          ctx.lineTo(drawX - 4, drawY + enemy.height/2 + 8);
          ctx.closePath();
          ctx.fill();
          break;

        case 'bird':
          // Flapping wings sky crow logic
          const isSkyBoss = enemy.id === 'boss_stage_3';
          const isCyberBoss = enemy.id === 'boss_stage_5';
          const isFoxBoss = enemy.id === 'boss_stage_6';

          if (isFoxBoss) {
            // Draw Nine-Tailed Fox!
            // First, 9 flowing glowing tails behind the fox
            for (let t = 0; t < 9; t++) {
              const tailAngle = -Math.PI / 4 + (t * Math.PI) / 8;
              const waveY = Math.sin(animCycle.current * 0.15 + t) * 10;
              const tailLen = 65;
              const tailX = drawX + enemy.width / 2 + Math.cos(tailAngle) * tailLen;
              const tailY = drawY + enemy.height / 2 + Math.sin(tailAngle) * tailLen + waveY;
              
              const grad = ctx.createLinearGradient(drawX + enemy.width / 2, drawY + enemy.height / 2, tailX, tailY);
              grad.addColorStop(0, '#f97316'); // fire orange fox base
              grad.addColorStop(0.7, '#f43f5e'); // beautiful rose pink
              grad.addColorStop(1, '#ffffff'); // pure white tips!
              
              ctx.strokeStyle = grad;
              ctx.lineWidth = 14 - Math.abs(t - 4) * 1.2; // middle tails are thicker
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(drawX + enemy.width / 2, drawY + enemy.height / 2);
              ctx.quadraticCurveTo(
                drawX + enemy.width / 2 + Math.cos(tailAngle) * (tailLen/2),
                drawY + enemy.height / 2 + Math.sin(tailAngle) * (tailLen/2) + waveY * 2,
                tailX, tailY
              );
              ctx.stroke();
            }

            // Draw large fox body (oval)
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.ellipse(drawX + enemy.width / 2, drawY + enemy.height / 2 + 10, enemy.width / 3, enemy.height / 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Draw fox head (rounded triangle pointing down)
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.moveTo(drawX + enemy.width / 2 - 25, drawY + enemy.height / 2 - 15);
            ctx.lineTo(drawX + enemy.width / 2 + 25, drawY + enemy.height / 2 - 15);
            ctx.lineTo(drawX + enemy.width / 2, drawY + enemy.height / 2 + 15);
            ctx.closePath();
            ctx.fill();

            // Ear left
            ctx.fillStyle = '#e11d48'; // inner rose red
            ctx.beginPath();
            ctx.moveTo(drawX + enemy.width / 2 - 22, drawY + enemy.height / 2 - 15);
            ctx.lineTo(drawX + enemy.width / 2 - 35, drawY + enemy.height / 2 - 40);
            ctx.lineTo(drawX + enemy.width / 2 - 5, drawY + enemy.height / 2 - 15);
            ctx.closePath();
            ctx.fill();
            // Ear right
            ctx.beginPath();
            ctx.moveTo(drawX + enemy.width / 2 + 22, drawY + enemy.height / 2 - 15);
            ctx.lineTo(drawX + enemy.width / 2 + 35, drawY + enemy.height / 2 - 40);
            ctx.lineTo(drawX + enemy.width / 2 + 5, drawY + enemy.height / 2 - 15);
            ctx.closePath();
            ctx.fill();

            // White face fur masks
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(drawX + enemy.width / 2 - 10, drawY + enemy.height / 2, 8, 12, Math.PI / 6, 0, Math.PI * 2);
            ctx.ellipse(drawX + enemy.width / 2 + 10, drawY + enemy.height / 2, 8, 12, -Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();

            // Golden glowing eyes
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(drawX + enemy.width / 2 - 8, drawY + enemy.height / 2 - 3, 3, 0, Math.PI * 2);
            ctx.arc(drawX + enemy.width / 2 + 8, drawY + enemy.height / 2 - 3, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Nose
            ctx.fillStyle = '#000000';
            ctx.fillRect(drawX + enemy.width / 2 - 2, drawY + enemy.height / 2 + 10, 4, 3);

            // Red sacred forehead crest mark
            ctx.fillStyle = '#e11d48';
            ctx.beginPath();
            ctx.arc(drawX + enemy.width / 2, drawY + enemy.height / 2 - 10, 3, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = '#fda4af'; // beautiful pastel pink
            ctx.font = 'bold 12px "Inter", system-ui';
            ctx.fillText('🦊九尾の妖狐', drawX + enemy.width / 2 - 35, drawY - 8);
          } else {
            ctx.fillStyle = isCyberBoss ? '#083344' : (isSkyBoss ? '#1e1b4b' : '#312e81'); // dark dark blue crown
            // main head-body oval
            ctx.beginPath();
            ctx.ellipse(drawX + enemy.width/2, drawY + enemy.height/2, enemy.width/2 - 2, enemy.height/3, 0, 0, Math.PI*2);
            ctx.fill();
            // flapping wings
            ctx.fillStyle = isCyberBoss ? '#06b6d4' : (isSkyBoss ? '#2e1065' : '#4f46e5');
            const wingFlap = Math.sin(animCycle.current * 0.4) * (enemy.height / 2);
            ctx.beginPath();
            ctx.moveTo(drawX + enemy.width/2, drawY + enemy.height/2);
            ctx.lineTo(drawX + enemy.width/4, drawY + enemy.height/2 - wingFlap);
            ctx.lineTo(drawX + enemy.width/2, drawY + enemy.height/3);
            ctx.closePath();
            ctx.fill();
            // golden beak
            ctx.fillStyle = isCyberBoss ? '#a855f7' : '#fbbf24'; // Cyber is glowing purple laser eye beak
            ctx.beginPath();
            ctx.moveTo(enemy.direction === 1 ? drawX + enemy.width : drawX, drawY + enemy.height/2 - 2);
            ctx.lineTo(enemy.direction === 1 ? drawX + enemy.width + 10 : drawX - 10, drawY + enemy.height/2);
            ctx.lineTo(enemy.direction === 1 ? drawX + enemy.width : drawX, drawY + enemy.height/2 + 4);
            ctx.closePath();
            ctx.fill();

            if (isSkyBoss) {
              ctx.fillStyle = '#f472b6';
              ctx.font = 'bold 11px system-ui';
              ctx.fillText('🦅メカ・トワ', drawX - 10, drawY - 6);
            } else if (isCyberBoss) {
              ctx.fillStyle = '#22d3ee';
              ctx.font = 'bold 11px system-ui';
              ctx.fillText('👾マザー・マトリクスAI', drawX - 10, drawY - 6);
            }
          }
          break;

        case 'hedgehog':
        default:
          // Spiky hedgehog can't be jumped upon
          const isLavaBoss = enemy.id === 'boss_stage_4';
          ctx.fillStyle = isLavaBoss ? '#991b1b' : '#7c2d12'; // dark scarlet lava crust spikes for Lava Boss
          ctx.beginPath();
          ctx.moveTo(drawX + 2, drawY + enemy.height);
          ctx.lineTo(drawX + enemy.width/2, drawY + 2);
          ctx.lineTo(drawX + enemy.width - 2, drawY + enemy.height);
          ctx.closePath();
          ctx.fill();

          // Spiky body outline
          ctx.strokeStyle = isLavaBoss ? '#fb923c' : '#ea580c'; // fiery orange for Lava Boss
          ctx.lineWidth = isLavaBoss ? 2.5 : 1.5;
          ctx.beginPath();
          for (let s = 1; s < enemy.width; s += 5) {
            ctx.moveTo(drawX + s, drawY + enemy.height);
            ctx.lineTo(drawX + s + 2, drawY + 8);
          }
          ctx.stroke();

          // Tiny walking legs
          ctx.fillStyle = '#000000';
          ctx.fillRect(drawX + 6, drawY + enemy.height - 2, 4, 3);
          ctx.fillRect(drawX + enemy.width - 10, drawY + enemy.height - 2, 4, 3);

          if (isLavaBoss) {
            ctx.fillStyle = '#f97316';
            ctx.font = 'bold 11px system-ui';
            ctx.fillText('🌋サラマンダーキング', drawX - 10, drawY - 6);
          }
          break;
      }
    });

    // 6. Draw particles
    particles.current.forEach((part) => {
      ctx.fillStyle = part.color;

      if (part.shape === 'star') {
        ctx.beginPath();
        ctx.arc(part.x - camX, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (part.shape === 'bubble') {
        ctx.strokeStyle = part.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(part.x - camX, part.y, part.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (part.shape === 'wind') {
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x - camX, part.y, part.size, 2);
      } else if (part.shape === 'scratch') {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(part.x - camX + 15, part.y + 15, part.size / 2, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
      } else {
        ctx.fillRect(part.x - camX - part.size/2, part.y - part.size/2, part.size, part.size);
      }
    });

    // 7. Draw Player (THE CUTE CAT!)
    const pDrawX = p.x - camX;
    const pDrawY = p.y;
    const catGlowActive = p.isCatnipActive > 0;

    // Catnip Frenzy glowing outer visual
    if (catGlowActive) {
      const auraGlow = Math.sin(animCycle.current * 0.4) * 8 + 12;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.beginPath();
      ctx.arc(pDrawX + p.width/2, pDrawY + p.height/2, 22 + auraGlow, 0, Math.PI*2);
      ctx.fill();
    }

    // Blink effect if invincible after damage
    let isVisible = true;
    if (p.isInvincible > 0 && Math.floor(p.isInvincible / 4) % 2 === 0) {
      isVisible = false;
    }

    if (isVisible) {
      ctx.save();

      // Main cat colors (Orange Tabby)
      const primaryCatColor = catGlowActive ? '#facc15' : '#fb923c'; // gold if catnip active
      const stripeCatColor = '#ea580c';
      const innerEarColor = '#fca5a5';

      // Face direction flip transformation on Canvas context
      ctx.translate(pDrawX + p.width / 2, pDrawY + p.height / 2);
      if (p.facingDir === -1) {
        ctx.scale(-1, 1);
      }

      // Draw Tail (Waving)
      const tailTilt = Math.sin(animCycle.current * 0.35) * 0.3;
      ctx.fillStyle = primaryCatColor;
      ctx.beginPath();
      ctx.moveTo(-10, 4);
      // quadratic curves tail
      ctx.quadraticCurveTo(-22, -15 + tailTilt * 20, -18 + tailTilt * 5, -25 + tailTilt * 10);
      ctx.quadraticCurveTo(-12, -12, -4, 8);
      ctx.fill();

      // Draw Rounded Body
      ctx.fillStyle = primaryCatColor;
      ctx.beginPath();
      ctx.arc(-2, 3, 11, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw Stripes on Back Body
      ctx.strokeStyle = stripeCatColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-8, -4); ctx.lineTo(-4, -1);
      ctx.moveTo(-10, 3); ctx.lineTo(-3, 4);
      ctx.stroke();

      // Draw Head
      ctx.fillStyle = primaryCatColor;
      ctx.beginPath();
      ctx.arc(6, -6, 9, 0, Math.PI * 2);
      ctx.fill();

      // Draw Ears
      const earFlat = p.vy < -0.5 ? -2 : 0; // flatten when jump flying up
      ctx.fillStyle = primaryCatColor;
      // Left Ear
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(2, -21 + earFlat);
      ctx.lineTo(8, -13);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = innerEarColor;
      ctx.beginPath();
      ctx.moveTo(2, -12);
      ctx.lineTo(3, -18 + earFlat);
      ctx.lineTo(6, -13);
      ctx.closePath();
      ctx.fill();

      // Eyes (blinking)
      const isBlinking = Math.floor(animCycle.current * 0.05) % 15 === 0;
      if (isBlinking) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(7, -8); ctx.lineTo(11, -8);
        ctx.stroke();
      } else {
        ctx.fillStyle = catGlowActive ? '#b91c1c' : '#000000'; // red angry hyper eyes on catnip!
        ctx.beginPath();
        ctx.arc(9, -8, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pink Nose & Muzzle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(10, -5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fda4af'; // pink
      ctx.beginPath();
      ctx.moveTo(11, -6);
      ctx.lineTo(13, -6);
      ctx.lineTo(12, -4);
      ctx.closePath();
      ctx.fill();

      // White whisker traces
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, -4); ctx.lineTo(18, -2);
      ctx.moveTo(12, -5); ctx.lineTo(19, -5);
      ctx.stroke();

      // Draw 4 Footsteps stepping on ground
      ctx.fillStyle = primaryCatColor;
      if (Math.abs(p.vx) > 0.1 && p.onGround) {
        const step = Math.sin(animCycle.current * 0.8) * 6;
        // relative back leg
        ctx.fillRect(-10, 10, 4, 6);
        ctx.fillRect(-10 + step, 10, 4, 6);
        // front legs step
        ctx.fillRect(4, 10, 4, 6);
        ctx.fillRect(4 - step, 10, 4, 6);
      } else {
        // Idle legs
        ctx.fillRect(-9, 10, 4, 6);
        ctx.fillRect(-3, 10, 4, 6);
        ctx.fillRect(3, 10, 4, 6);
        ctx.fillRect(8, 10, 4, 6);
      }

      ctx.restore();
    }
  };

  // Virtual control toggles
  const handleVirtualLeft = (active: boolean) => {
    virtualCtrl.current.left = active;
  };
  const handleVirtualRight = (active: boolean) => {
    virtualCtrl.current.right = active;
  };

  const handleVirtualJump = () => {
    const p = player.current;
    const maxJumps = stats.jumpLevel >= 4 ? 2 : 1;

    if (p.onGround) {
      p.vy = -1 * (9.6 + stats.jumpLevel * 0.5); // Boosted jump power
      p.jumpCount = 1;
      p.onGround = false;
      audio.playJump();
      spawnDustParticles(p.x + p.width/2, p.y + p.height, 'square', 10);
    } else if (p.jumpCount < maxJumps) {
      p.vy = -1 * (8.5 + stats.jumpLevel * 0.45); // Boosted double jump
      p.jumpCount++;
      audio.playDoubleJump();
      spawnDustParticles(p.x + p.width/2, p.y + p.height, 'star', 12, '#67e8f9');
    }

    const isInsideWater = checkIfPlayerInWater();
    if (isInsideWater) {
      p.vy = -5;
      audio.playFish();
    }
  };

  return (
    <div className="relative w-full max-w-4xl bg-slate-950 rounded-3xl border-4 border-slate-950 overflow-hidden shadow-2xl flex flex-col font-sans select-none" ref={containerRef}>
      
      {/* Top HUD Stats Panel */}
      <div className="bg-slate-900 border-b-2 border-slate-950 px-4 py-2 flex items-center justify-between text-white font-pixel text-xs">
        
        {/* Lives / Hearts */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
          <span className="text-slate-400 font-sans text-[10px] uppercase font-bold mr-1">LIFE:</span>
          {Array.from({ length: stats.maxHp }).map((_, idx) => (
            <Heart 
              key={idx} 
              className={`w-4 h-4 transition ${
                idx < hudHp 
                  ? 'text-red-500 fill-red-500 scale-100 animate-pulse' 
                  : 'text-slate-800 fill-transparent scale-90'
              }`} 
            />
          ))}
        </div>

        {/* Level Tag & Gimmick Info */}
        <div className="text-center">
          <div className="font-bold text-amber-400 text-sm tracking-wider">{levelConfig.jpName}</div>
          <div className="text-[10px] text-slate-400 font-sans tracking-tight leading-none mt-0.5">
            {levelConfig.environment === 'grassland' && '🌾 ぽかぽか草原エリア'}
            {levelConfig.environment === 'sewer' && '💧 急な下水流（浮力変化）'}
            {levelConfig.environment === 'sky_castle' && '⛅ 強風の雲間迷宮'}
          </div>
        </div>

        {/* Coin & Fish Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 flex items-center gap-1.5 min-w-[70px]">
            <span>🪙</span>
            <span className="text-yellow-400 text-sm font-bold">{coinsThisRun}</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 flex items-center gap-1.5 min-w-[55px]">
            <span>🐟</span>
            <span className="text-red-400 text-sm font-bold">{fishesThisRun}</span>
          </div>

          <button 
            onClick={() => {
              audio.playClick();
              setIsPausedState(!isPausedState);
              onPauseToggle(!isPausedState);
            }}
            className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-lg text-[9px] cursor-pointer"
          >
            {isPausedState ? '再開 ▶' : '一時停止 ⏸'}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport container */}
      <div className="relative aspect-video w-full bg-indigo-950 overflow-hidden flex items-center justify-center">
        
        {/* Render Canvas */}
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={450} 
          className="w-full h-full object-contain bg-slate-900 block"
        />

        {/* BOSS HEALTH HUD POPUP BANNER AT SCREEN CENTER */}
        {isBossTriggered.current && bossRef.current && !bossRef.current.isDefeated && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/90 border-2 border-red-500 rounded-xl px-4 py-2 w-72 text-center text-white font-pixel font-bold shadow-lg animate-bounce pointer-events-none">
            <div className="text-xs text-red-400 tracking-widest mb-1 animate-pulse">⚠️ ボス接近中！ ⚠️</div>
            <div className="text-[10px] text-slate-300 font-sans">
              {currentStageId === 1 && 'ギガ・マウスを踏みつけて倒そう！'}
              {currentStageId === 2 && '強力なひっかき等で甲羅を撃破せよ！'}
              {currentStageId === 3 && '空中から襲いくる黒烏王を滅ぼそう！'}
            </div>
          </div>
        )}

        {/* Pause Screen Overlay */}
        {isPausedState && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20 text-white font-pixel animate-fade-in">
            <div className="text-3xl text-amber-400 font-bold tracking-widest mb-2">PAUSED</div>
            <p className="text-slate-300 font-sans text-xs max-w-sm text-center leading-relaxed">
              猫ちゃんはひと休み。駄菓子で強化した技は、Z／Jキーで繰り出せます。
            </p>
            <div className="flex gap-4 mt-2">
              <button
                onClick={() => {
                  audio.playClick();
                  setIsPausedState(false);
                  onPauseToggle(false);
                }}
                className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-xl transition cursor-pointer"
              >
                ゲームに戻る ▶
              </button>
              <button
                onClick={() => {
                  audio.playClick();
                  onBackToMenu();
                }}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
              >
                あきらめる
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Touch virtual controller panel layout for mobiles / smaller screens (always render nicely beneath canvas so both keyboard & touch are 100% supported smoothly) */}
      <div className="bg-slate-900 border-t-2 border-slate-950 p-4 grid grid-cols-2 gap-4 select-none">
        
        {/* Left Side: Directional D-Pad */}
        <div className="flex items-center gap-3">
          <button
            onMouseDown={() => handleVirtualLeft(true)}
            onMouseUp={() => handleVirtualLeft(false)}
            onTouchStart={(e) => { e.preventDefault(); handleVirtualLeft(true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleVirtualLeft(false); }}
            className="w-14 h-14 bg-slate-800 active:bg-slate-700 border-2 border-slate-950 rounded-xl flex items-center justify-center text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[0px_0px_0px_0px]"
            title="左へ"
          >
            <ChevronLeft className="w-8 h-8 font-extrabold stroke-[3.5px]" />
          </button>
          
          <button
            onMouseDown={() => handleVirtualRight(true)}
            onMouseUp={() => handleVirtualRight(false)}
            onTouchStart={(e) => { e.preventDefault(); handleVirtualRight(true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleVirtualRight(false); }}
            className="w-14 h-14 bg-slate-800 active:bg-slate-700 border-2 border-slate-950 rounded-xl flex items-center justify-center text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[0px_0px_0px_0px]"
            title="右へ"
          >
            <ChevronRight className="w-8 h-8 font-extrabold stroke-[3.5px]" />
          </button>
          
            <div className="hidden lg:flex flex-col text-[10px] text-slate-400 font-sans ml-2 leading-tight">
              <span>💻 <strong>PCキーバインド一覧:</strong></span>
              <span>・左右走る: [A]/[D] 又は [←]/[→] キー</span>
              <span>・ジャンプ: [SPACE], [W], [↑]</span>
              <span>・ひっかき(近): [Z] 又は [J] (威力 {(2.5 + (stats.clawLevel === 5 ? 3.0 : stats.clawLevel * 0.5)).toFixed(1)}) / 踏みつけ: 敵の上に着地 (威力 {stats.clawLevel.toFixed(1)})</span>
              <span>・{stats.clawLevel >= 3 ? '骨シュート(長)' : '毛玉弾(中)'}: [X] 又は [K] (威力 {(stats.clawLevel >= 3 ? (1.5 + (stats.clawLevel - 3) * 0.5) : (0.8 + stats.clawLevel * 0.2)).toFixed(1)})</span>
            </div>
         </div>
 
         {/* Right Side: Jump & Action Buttons */}
         <div className="flex justify-end gap-2.5 items-center">
           
           {/* Close Range: Scratch Button */}
           <button
             onMouseDown={triggerPlayerAttack}
             onTouchStart={(e) => { e.preventDefault(); triggerPlayerAttack(); }}
             className="w-16 h-16 bg-red-600 hover:bg-red-500 text-white font-pixel font-bold rounded-full flex flex-col items-center justify-center border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 active:translate-y-0.5 transition cursor-pointer"
           >
             <Zap className="w-4 h-4 fill-white" />
             <span className="text-[8px] mt-0.5 font-bold">ひっかき(近)</span>
             <span className="text-[8px] text-amber-200">威力 {(2.5 + (stats.clawLevel === 5 ? 3.0 : stats.clawLevel * 0.5)).toFixed(1)}</span>
           </button>
 
           {/* Medium Range: Hairball Button */}
           <button
             onMouseDown={triggerPlayerRangedAttack}
             onTouchStart={(e) => { e.preventDefault(); triggerPlayerRangedAttack(); }}
             className="w-16 h-16 bg-amber-500 hover:bg-amber-400 text-white font-pixel font-bold rounded-full flex flex-col items-center justify-center border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 active:translate-y-0.5 transition cursor-pointer"
           >
             <Target className="w-4 h-4 text-white" />
             <span className="text-[8px] mt-0.5 font-bold">
               {stats.clawLevel >= 3 ? '骨シュート(長)' : '毛玉弾(中)'}
             </span>
             <span className="text-[8px] text-emerald-100">
               威力 {(stats.clawLevel >= 3 ? (1.5 + (stats.clawLevel - 3) * 0.5) : (0.8 + stats.clawLevel * 0.2)).toFixed(1)}
             </span>
           </button>
 
           {/* Jump Button (Up/Space equivalent) */}
           <button
             onMouseDown={handleVirtualJump}
             onTouchStart={(e) => { e.preventDefault(); handleVirtualJump(); }}
             className="w-16 h-16 bg-blue-500 hover:bg-blue-400 text-white font-pixel font-bold rounded-full flex flex-col items-center justify-center border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 active:translate-y-0.5 transition cursor-pointer"
           >
             <span className="text-lg">⬆</span>
             <span className="text-[8px] mt-0.5 font-bold">
               {stats.jumpLevel >= 4 ? '2段ジャンプ' : 'ジャンプ'}
             </span>
           </button>
         </div>
      </div>

    </div>
  );
};
