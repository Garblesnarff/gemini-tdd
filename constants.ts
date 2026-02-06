
import { TowerType, EnemyType, TechPath, PassiveType, ActiveAbilityType, Augment, AugmentType, StageId, StageConfig, BossConfig, BossAbilityType, Vector3Tuple, WaveDefinition, WaveGroup, StageProgress, MetaProgress } from './types';

export const GRID_SIZE = 12;

export const DIRECTOR_CONFIG = {
    PRESSURE: {
        CLEAN_WAVES: 3,
        GOLD: 400,
        LIVES_PCT: 0.8
    },
    RELIEF: {
        LIVES_PCT: 0.4,
        LIVES_LOST_WAVE: 2
    },
    SCALING: {
        PRESSURE: 1.30,
        RELIEF: 0.85,
        NEUTRAL: 1.0
    },
    GOLD_BONUS: {
        PRESSURE: 1.0,
        RELIEF: 1.25,
        NEUTRAL: 1.0
    },
    COOLDOWN: {
        PRESSURE: 0.85,
        RELIEF: 1.15,
        NEUTRAL: 1.0
    },
    ELITE_CHANCE: 0.15,
    SUPPLY_DROP_CHANCE: 0.20,
    SUPPLY_DROP_VALUE: { MIN: 50, MAX: 100 },
    SUPPLY_DROP_LIFETIME: 10000 // 10s
};

// --- PATHS ---

const STAGE_1_PATH: Vector3Tuple[] = [
  { x: -6, y: 0.2, z: -6 }, { x: -6, y: 0.2, z: -2 },
  { x: 0, y: 0.2, z: -2 }, { x: 0, y: 0.2, z: 2 },
  { x: 6, y: 0.2, z: 2 }, { x: 6, y: 0.2, z: 6 }
];

const STAGE_2_PATH: Vector3Tuple[] = [
  { x: -6, y: 0.2, z: -6 }, { x: 6, y: 0.2, z: -6 },
  { x: 6, y: 0.2, z: -3 }, { x: -6, y: 0.2, z: -3 },
  { x: -6, y: 0.2, z: 0 }, { x: 6, y: 0.2, z: 0 },
  { x: 6, y: 0.2, z: 3 }, { x: -6, y: 0.2, z: 3 },
  { x: -6, y: 0.2, z: 6 }, { x: 6, y: 0.2, z: 6 }
];

const STAGE_3_PATH_A: Vector3Tuple[] = [
    { x: -6, y: 0.2, z: -6 }, { x: -4, y: 0.2, z: -4 },
    { x: -4, y: 0.2, z: 4 }, { x: 0, y: 0.2, z: 4 },
    { x: 0, y: 0.2, z: 0 }, { x: 6, y: 0.2, z: 6 }
];

const STAGE_3_PATH_B: Vector3Tuple[] = [
    { x: -6, y: 0.2, z: -6 }, { x: -4, y: 0.2, z: -4 },
    { x: 4, y: 0.2, z: -4 }, { x: 4, y: 0.2, z: 0 },
    { x: 0, y: 0.2, z: 0 }, { x: 6, y: 0.2, z: 6 }
];

const STAGE_4_PATH: Vector3Tuple[] = [
    { x: -6, y: 0.2, z: -6 }, { x: 6, y: 0.2, z: -6 },
    { x: 6, y: 0.2, z: 6 }, { x: -6, y: 0.2, z: 6 },
    { x: -6, y: 0.2, z: -2 }, { x: 2, y: 0.2, z: -2 },
    { x: 2, y: 0.2, z: 2 }, { x: 0, y: 0.2, z: 0 }
];

const STAGE_5_PATH: Vector3Tuple[] = [
    { x: 0, y: 0.2, z: -7 }, { x: 0, y: 0.2, z: -4 },
    { x: -5, y: 0.2, z: -4 }, { x: -5, y: 0.2, z: 4 },
    { x: 5, y: 0.2, z: 4 }, { x: 5, y: 0.2, z: -2 },
    { x: 0, y: 0.2, z: -2 }, { x: 0, y: 0.2, z: 0 },
    { x: -2, y: 0.2, z: 2 }, { x: 0, y: 0.2, z: 7 }
];

// --- BOSS CONFIGS ---

const STAGE_1_BOSS: BossConfig = {
  id: 'sentinel_prime',
  name: 'SENTINEL PRIME',
  title: 'Guardian of the Forward Base',
  baseHealth: 5000,
  speed: 0.5,
  size: 2.5,
  color: '#f97316', 
  phases: [
    { healthThreshold: 1.0, speedMultiplier: 1.0, damageResistance: 0, announcement: "TARGET ACQUIRED: SENTINEL PRIME", visualChange: 'unstable' }, 
    { healthThreshold: 0.75, speedMultiplier: 1.2, damageResistance: 0.1, announcement: "SYSTEMS ACCELERATING", visualChange: 'enraged' },
    { healthThreshold: 0.50, speedMultiplier: 1.0, damageResistance: 0.25, announcement: "SHIELD GENERATOR ONLINE", visualChange: 'shielded', abilityUnlock: 'shield_pulse' },
    { healthThreshold: 0.25, speedMultiplier: 1.5, damageResistance: 0, announcement: "CRITICAL DAMAGE DETECTED", visualChange: 'unstable' }
  ],
  abilities: [
    { id: 'spawn_minions', name: 'Reinforcements', type: BossAbilityType.SPAWN_MINIONS, cooldown: 15000 },
    { id: 'shield_pulse', name: 'Shield Pulse', type: BossAbilityType.SHIELD_PULSE, cooldown: 20000, duration: 3000 }
  ],
  minionSpawns: [
    { triggerHealth: 0.6, enemyType: EnemyType.BASIC, count: 5, announcement: "Minions deployed" },
    { triggerHealth: 0.3, enemyType: EnemyType.FAST, count: 8, announcement: "Fast units incoming" }
  ]
};

const STAGE_2_BOSS: BossConfig = {
    id: 'vanguard_alpha',
    name: 'VANGUARD ALPHA',
    title: 'Frontline Destroyer',
    baseHealth: 8000,
    speed: 0.6,
    size: 2.8,
    color: '#991b1b', 
    phases: [
        { healthThreshold: 1.0, speedMultiplier: 1.0, damageResistance: 0.1, announcement: "VANGUARD ALPHA ENGAGED", visualChange: 'charged' },
        { healthThreshold: 0.7, speedMultiplier: 1.0, damageResistance: 0.15, announcement: "ENGINES SPOOLING UP", visualChange: 'unstable', abilityUnlock: 'speed_burst' },
        { healthThreshold: 0.4, speedMultiplier: 1.0, damageResistance: 0.2, announcement: "ARMOR PLATING PURGED", visualChange: 'enraged' },
        { healthThreshold: 0.2, speedMultiplier: 1.5, damageResistance: 0.05, announcement: "BERSERK PROTOCOL ACTIVE", visualChange: 'unstable' }
    ],
    abilities: [
        { id: 'speed_burst', name: 'Afterburner', type: BossAbilityType.SPEED_BURST, cooldown: 12000, duration: 3000, value: 2.0 },
        { id: 'spawn_tanks', name: 'Heavy Support', type: BossAbilityType.SPAWN_MINIONS, cooldown: 25000 }
    ],
    minionSpawns: [
        { triggerHealth: 0.4, enemyType: EnemyType.TANK, count: 2, announcement: "Heavy Armor Support Inbound" }
    ]
};

const STAGE_3_BOSS: BossConfig = {
    id: 'swarm_queen',
    name: 'THE SWARM QUEEN',
    title: 'Mother of Thousands',
    baseHealth: 10000,
    speed: 0.4,
    size: 3.0,
    color: '#84cc16', 
    phases: [
        { healthThreshold: 1.0, speedMultiplier: 1.0, damageResistance: 0.1, announcement: "THE HIVE AWAKENS", visualChange: 'unstable' },
        { healthThreshold: 0.75, speedMultiplier: 1.1, damageResistance: 0.1, announcement: "BROOD ACCELERATION", visualChange: 'enraged', abilityUnlock: 'regen' },
        { healthThreshold: 0.5, speedMultiplier: 1.2, damageResistance: 0.1, announcement: "ELITE GUARD DEPLOYED", visualChange: 'charged' },
        { healthThreshold: 0.25, speedMultiplier: 1.3, damageResistance: 0.1, announcement: "HIVE MIND CRITICAL", visualChange: 'unstable' }
    ],
    abilities: [
        { id: 'spawn_swarm', name: 'Swarm', type: BossAbilityType.SPAWN_MINIONS, cooldown: 10000 },
        { id: 'regen', name: 'Biomass Recovery', type: BossAbilityType.REGEN, cooldown: 15000, duration: 5000, value: 0.05 } 
    ],
    minionSpawns: [
        { triggerHealth: 0.8, enemyType: EnemyType.BASIC, count: 10, announcement: "Swarm Deployed" },
        { triggerHealth: 0.5, enemyType: EnemyType.SPLITTER, count: 6, announcement: "Splitters Inbound" },
        { triggerHealth: 0.25, enemyType: EnemyType.FAST, count: 10, announcement: "Fastlings Inbound" }
    ]
};

const STAGE_4_BOSS: BossConfig = {
    id: 'siege_engine',
    name: 'SIEGE ENGINE MK-IV',
    title: 'The Unstoppable',
    baseHealth: 15000,
    speed: 0.35,
    size: 3.5,
    color: '#475569', 
    phases: [
        { healthThreshold: 1.0, speedMultiplier: 1.0, damageResistance: 0.4, announcement: "SIEGE PROTOCOL INITIATED", visualChange: 'shielded' },
        { healthThreshold: 0.7, speedMultiplier: 1.0, damageResistance: 0.3, announcement: "JAMMING FIELD ACTIVE", visualChange: 'charged', abilityUnlock: 'disable_zone' },
        { healthThreshold: 0.4, speedMultiplier: 1.2, damageResistance: 0.2, announcement: "ARMOR COMPROMISED", visualChange: 'unstable' },
        { healthThreshold: 0.15, speedMultiplier: 2.0, damageResistance: 0, announcement: "CORE MELTDOWN IMMINENT", visualChange: 'enraged' }
    ],
    abilities: [
        { id: 'disable_zone', name: 'EMP Field', type: BossAbilityType.DISABLE_ZONE, cooldown: 18000, radius: 4, duration: 6000 },
        { id: 'spawn_escort', name: 'Escort Detail', type: BossAbilityType.SPAWN_MINIONS, cooldown: 30000 }
    ],
    minionSpawns: [
        { triggerHealth: 0.8, enemyType: EnemyType.TANK, count: 2, announcement: "Escorts Deployed" },
        { triggerHealth: 0.5, enemyType: EnemyType.TANK, count: 4, announcement: "Defensive Line Formed" }
    ]
};

const STAGE_5_BOSS: BossConfig = {
    id: 'void_harbinger',
    name: 'VOID HARBINGER',
    title: 'Herald of the End',
    baseHealth: 25000,
    speed: 0.5,
    size: 4.0,
    color: '#3b0764', 
    phases: [
        { healthThreshold: 1.0, speedMultiplier: 1.0, damageResistance: 0.2, announcement: "REALITY BREACH DETECTED", visualChange: 'unstable', abilityUnlock: 'shield_pulse' },
        { healthThreshold: 0.75, speedMultiplier: 1.0, damageResistance: 0.2, announcement: "THE VOID EXPANDS", visualChange: 'charged', abilityUnlock: 'spawn_void' },
        { healthThreshold: 0.5, speedMultiplier: 1.1, damageResistance: 0.2, announcement: "NULLIFICATION FIELD ACTIVE", visualChange: 'shielded', abilityUnlock: 'disable_zone' },
        { healthThreshold: 0.25, speedMultiplier: 1.5, damageResistance: 0.1, announcement: "ENTROPY UNLEASHED", visualChange: 'enraged', abilityUnlock: 'speed_burst' }
    ],
    abilities: [
        { id: 'shield_pulse', name: 'Void Shield', type: BossAbilityType.SHIELD_PULSE, cooldown: 20000, duration: 4000 },
        { id: 'disable_zone', name: 'Null Zone', type: BossAbilityType.DISABLE_ZONE, cooldown: 15000, radius: 5, duration: 5000 },
        { id: 'speed_burst', name: 'Warp Step', type: BossAbilityType.SPEED_BURST, cooldown: 12000, duration: 2000, value: 3.0 },
        { id: 'spawn_void', name: 'Void Spawn', type: BossAbilityType.SPAWN_MINIONS, cooldown: 25000 }
    ],
    minionSpawns: [
        { triggerHealth: 0.9, enemyType: EnemyType.SPLITTER, count: 8, announcement: "Void Entities Splitting" },
        { triggerHealth: 0.6, enemyType: EnemyType.FAST, count: 15, announcement: "Reality Destabilized" },
        { triggerHealth: 0.3, enemyType: EnemyType.TANK, count: 5, announcement: "Heavy Void Constructs" }
    ]
};

// --- STAGE CONFIGS ---

export const STAGE_CONFIGS: Record<StageId, StageConfig> = {
  [StageId.STAGE_1]: {
    id: StageId.STAGE_1,
    name: "Forward Base",
    description: "The outer perimeter. Enemy resistance is linear but persistent.",
    waves: 26,
    paths: [STAGE_1_PATH],
    startingGold: 400,
    startingLives: 20,
    enemyScaling: 1.0,
    bossConfig: STAGE_1_BOSS,
    environment: {
      skyPreset: "night",
      gridColor: "#0f172a",
      pathColor: "#334155",
      fogColor: "#020617",
      fogDensity: 0.02,
      ambientIntensity: 0.5,
      particleType: 'none'
    }
  },
  [StageId.STAGE_2]: { 
    id: StageId.STAGE_2, 
    name: "The Gauntlet", 
    description: "A zigzag canyon ambush. High speed units expected.", 
    waves: 28, 
    paths: [STAGE_2_PATH], 
    startingGold: 450, 
    startingLives: 20, 
    enemyScaling: 1.3, 
    bossConfig: STAGE_2_BOSS, 
    environment: { 
        skyPreset: "sunset", 
        gridColor: "#450a0a", 
        pathColor: "#7f1d1d", 
        fogColor: "#450a0a",
        fogDensity: 0.03,
        ambientIntensity: 0.6,
        particleType: 'embers'
    }
  },
  [StageId.STAGE_3]: { 
    id: StageId.STAGE_3, 
    name: "Crossroads", 
    description: "Enemies split their forces amidst a torrential storm.", 
    waves: 29, 
    paths: [STAGE_3_PATH_A, STAGE_3_PATH_B], 
    startingGold: 500, 
    startingLives: 18, 
    enemyScaling: 1.6, 
    bossConfig: STAGE_3_BOSS, 
    environment: { 
        skyPreset: "park", 
        gridColor: "#1a2e05", 
        pathColor: "#365314", 
        fogColor: "#1e1b4b",
        fogDensity: 0.04,
        ambientIntensity: 0.3,
        particleType: 'rain'
    }
  },
  [StageId.STAGE_4]: { 
    id: StageId.STAGE_4, 
    name: "The Spiral", 
    description: "A tightening coil shrouded in dense fog. Visibility is low.", 
    waves: 29, 
    paths: [STAGE_4_PATH], 
    startingGold: 500, 
    startingLives: 15, 
    enemyScaling: 2.0, 
    bossConfig: STAGE_4_BOSS, 
    environment: { 
        skyPreset: "forest", 
        gridColor: "#022c22", 
        pathColor: "#064e3b", 
        fogColor: "#064e3b",
        fogDensity: 0.04, // Reduced from 0.08
        ambientIntensity: 0.3,
        particleType: 'dust'
    }
  },
  [StageId.STAGE_5]: { 
    id: StageId.STAGE_5, 
    name: "Void Rift", 
    description: "The source of the incursion. Reality is breaking down.", 
    waves: 31, 
    paths: [STAGE_5_PATH], 
    startingGold: 550, 
    startingLives: 15, 
    enemyScaling: 2.5, 
    bossConfig: STAGE_5_BOSS, 
    environment: { 
        skyPreset: "city", 
        gridColor: "#2e1065", 
        pathColor: "#581c87", 
        fogColor: "#000000",
        fogDensity: 0.05,
        ambientIntensity: 0.4,
        particleType: 'void_particles'
    }
  },
};

export const INITIAL_STAGE_PROGRESS: Record<StageId, StageProgress> = {
  [StageId.STAGE_1]: { unlocked: true, completed: false, bestWave: 0, stars: 0 },
  [StageId.STAGE_2]: { unlocked: false, completed: false, bestWave: 0, stars: 0 },
  [StageId.STAGE_3]: { unlocked: false, completed: false, bestWave: 0, stars: 0 },
  [StageId.STAGE_4]: { unlocked: false, completed: false, bestWave: 0, stars: 0 },
  [StageId.STAGE_5]: { unlocked: false, completed: false, bestWave: 0, stars: 0 },
};

export const INITIAL_META_PROGRESS: MetaProgress = {
  dataCores: 0,
  totalCoresEarned: 0,
  purchasedUpgrades: [],
  upgradeLevels: {},
  achievements: {},
  achievementProgress: {
      totalBurnKills: 0,
      totalSuppliesCollected: 0,
      abilitiesEverUsed: [],
      bossesDefeated: []
  },
  stats: {
    totalEnemiesKilled: 0,
    totalGoldEarned: 0,
    totalBossesDefeated: 0,
    totalPlayTime: 0
  }
};

export const STAGE_CORE_REWARDS: Record<StageId, { firstClear: number, replay: number }> = {
  [StageId.STAGE_1]: { firstClear: 50, replay: 10 },
  [StageId.STAGE_2]: { firstClear: 75, replay: 15 },
  [StageId.STAGE_3]: { firstClear: 100, replay: 20 },
  [StageId.STAGE_4]: { firstClear: 150, replay: 30 },
  [StageId.STAGE_5]: { firstClear: 250, replay: 50 },
};

export const MAX_LEVEL = 3;
export const SELL_REFUND_RATIO = 0.7; 

// --- WAVE DEFINITIONS ---
export const getWaveDefinition = (stageId: StageId, waveNumber: number): WaveDefinition => {
    const grp = (type: EnemyType, count: number, startDelay: number, interval: number, burstSize: number = 1): WaveGroup => 
        ({ type, count, startDelay, interval, burstSize });

    const multipliers = {
        [StageId.STAGE_1]: 1.0,
        [StageId.STAGE_2]: 1.2,
        [StageId.STAGE_3]: 1.5,
        [StageId.STAGE_4]: 2.0,
        [StageId.STAGE_5]: 2.5
    };
    const scale = multipliers[stageId] || 1.0;
    const c = (base: number) => Math.floor(base * scale); 

    const groups: WaveGroup[] = [];
    let intel = "";

    const p1 = 500;
    const p2 = 4000;
    const p3 = 7000;

    // Introduction waves
    if (waveNumber <= 5) {
        if (waveNumber === 1) {
            groups.push(grp(EnemyType.BASIC, c(5), p1, 1000));
            intel = "Scout party detected. Single formation.";
        } else if (waveNumber === 2) {
            groups.push(grp(EnemyType.BASIC, c(8), p1, 800));
        } else if (waveNumber === 3) {
            groups.push(grp(EnemyType.BASIC, c(5), p1, 800));
            groups.push(grp(EnemyType.SPLITTER, c(2), p1 + 2000, 2000));
            intel = "Splitter units carry mini-drones. Area damage recommended.";
        } else if (waveNumber === 4) {
            groups.push(grp(EnemyType.BASIC, c(8), p1, 800));
            groups.push(grp(EnemyType.FAST, c(3), p1 + 1000, 1000));
        } else { 
            groups.push(grp(EnemyType.BASIC, c(15), p1, 400, 2)); 
            intel = "High density signature. Swarm incoming.";
        }
    } 
    else if (waveNumber <= 15) {
        if (waveNumber === 6) {
             // Introduce SWARM in Stage 3, else just Basic
             if (stageId >= StageId.STAGE_3) {
                groups.push(grp(EnemyType.SWARM, c(24), p1, 100, 4));
                intel = "Micro-drone swarm inbound. Area denial recommended.";
             } else {
                groups.push(grp(EnemyType.BASIC, c(18), p1, 300));
             }
        } else if (waveNumber === 8) {
             groups.push(grp(EnemyType.SHIELDED, c(4), p1, 1500));
             groups.push(grp(EnemyType.BASIC, c(10), p1 + 2000, 500));
             intel = "Shielded contacts detected. Sustained fire recommended to prevent regen.";
             
             // STAGE 3+ also gets ARMORED
             if (stageId >= StageId.STAGE_3) {
                 groups.push(grp(EnemyType.ARMORED, c(2), p2, 3000));
                 intel += " Heavy plating detected.";
             }
        } else if (waveNumber === 10) {
             // STAGE 2+ Introduce BOMBER
             if (stageId >= StageId.STAGE_2) {
                groups.push(grp(EnemyType.BOMBER, c(3), p1, 2000));
                groups.push(grp(EnemyType.BASIC, c(10), p1 + 500, 500));
                intel = "WARNING: Volatile units detected. Explosion on kill. Keep towers clear.";
             } else {
                groups.push(grp(EnemyType.SPLITTER, c(5), p1, 1500));
                groups.push(grp(EnemyType.FAST, c(10), p1 + 500, 500));
             }
        } else if (waveNumber === 12) {
             groups.push(grp(EnemyType.BASIC, c(10), p1, 500));
             groups.push(grp(EnemyType.HEALER, c(2), p1 + 2000, 3000));
             groups.push(grp(EnemyType.SHIELDED, c(3), 4000, 2000));
             intel = "Enemy medics identified. Prioritize healer units.";
        } else if (waveNumber === 14) {
             // STAGE 2+ Introduce PHASER
             if (stageId >= StageId.STAGE_2) {
                 groups.push(grp(EnemyType.PHASER, c(5), p1, 2000));
                 groups.push(grp(EnemyType.FAST, c(8), p1 + 1000, 400));
                 intel = "Phase-shifting hostiles. Damage windows limited.";
             } else {
                 groups.push(grp(EnemyType.FAST, c(15), p1, 300));
                 groups.push(grp(EnemyType.TANK, c(2), p2, 2000));
             }
        } else {
             // Filler
             groups.push(grp(EnemyType.BASIC, c(15), p1, 500));
             groups.push(grp(EnemyType.FAST, c(8), p1 + 1000, 300));
             if (waveNumber >= 11) groups.push(grp(EnemyType.TANK, c(2), p2, 3000));
        }
    }
    else if (waveNumber <= 25) {
        const difficulty = waveNumber - 15;
        if (waveNumber === 16) {
             groups.push(grp(EnemyType.ARMORED, c(4), p1, 2500));
             groups.push(grp(EnemyType.SWARM, c(16), p1 + 2000, 100, 4));
             intel = "Heavy armor and swarm support detected. Combined arms approach required.";
        } else {
             // Mixed Waves
             groups.push(grp(EnemyType.BASIC, c(10 + difficulty), p1, 400));
             groups.push(grp(EnemyType.FAST, c(8 + difficulty), p1 + 500, 300));
             groups.push(grp(EnemyType.TANK, c(2 + Math.floor(difficulty/3)), p2, 2000));
             
             // Add variety based on wave modulo
             if (waveNumber % 3 === 0) groups.push(grp(EnemyType.SHIELDED, c(5), p3, 1500));
             if (waveNumber % 4 === 0) groups.push(grp(EnemyType.HEALER, c(2), p3, 2500));
             if (stageId >= StageId.STAGE_2 && waveNumber % 5 === 0) groups.push(grp(EnemyType.PHASER, c(4), p3, 2000));
             if (stageId >= StageId.STAGE_2 && waveNumber % 2 === 0) groups.push(grp(EnemyType.BOMBER, c(3), p2, 3000));
             
             if (waveNumber === 25) intel = "MAXIMUM THREAT. Multiple heavy columns inbound.";
        }
    } 
    else {
        // Endless / Late Game scaling
        const loop = waveNumber - 25;
        groups.push(grp(EnemyType.TANK, c(3 + loop), 0, 1000));
        groups.push(grp(EnemyType.ARMORED, c(4 + Math.floor(loop/2)), 1000, 1500));
        groups.push(grp(EnemyType.HEALER, c(2 + Math.floor(loop/3)), 2000, 3000));
        groups.push(grp(EnemyType.FAST, c(20 + loop * 2), 3000, 100, 2));
        groups.push(grp(EnemyType.SPLITTER, c(10 + loop), 5000, 500));
        groups.push(grp(EnemyType.SHIELDED, c(6 + loop), 6000, 1000));
        if (stageId >= StageId.STAGE_2) groups.push(grp(EnemyType.PHASER, c(5 + loop), 8000, 1500));
        if (stageId >= StageId.STAGE_2) groups.push(grp(EnemyType.BOMBER, c(4 + Math.floor(loop/2)), 4000, 2000));
    }

    if (!intel) intel = TACTICAL_INTEL_POOL[Math.floor(Math.random() * TACTICAL_INTEL_POOL.length)];

    return { composition: groups, intel };
};

export const TACTICAL_INTEL_POOL = [
  "Massive heat signatures detected. Prepare for heavy resistance.",
  "Enemy cloaking tech detected. Scanners struggling.",
  "High-speed units approaching from the North-East gate.",
  "Atmospheric interference high. Target acquisition sluggish.",
  "Energy readings spiking. High-priority target inbound.",
  "Sub-space ripples detected. Unconventional movement expected.",
  "Armor plating reinforced. Focus on high-damage output.",
  "Intercepted comms suggest multi-pronged attack.",
  "Power grid fluctuating. Keep reserve gold.",
  "Biological signatures mixed with cybernetics. Swarm evolving.",
  "Void readings off the charts. Void Tech recommended.",
  "Magma Tech recommended for heavy armor.",
  "Plasma Tech overclocking advised for swarms.",
  "Enemy formations tightly packed. Splash damage effective.",
  "Breach in outer perimeter. They're coming.",
  "Neighboring towers benefit from Magma/Plasma auras.",
  "Incoming 'Fast' class units. Optimize fire rate.",
  "'Tank' unit leading the column. Prepare for a slog.",
  "Gravity fields weakening. Void Tech may compensate.",
  "Sensors picking up residual radiation.",
  "Recursive logic detected. Expect speed bursts.",
  "Target the leader. Break formation.",
  "Sell underperforming towers. 70% refund.",
  "System patch event approaching.",
  "Aura stacking key to holding sector.",
  "The core must not fall.",
  "Seismic activity detected.",
  "Optical sensors blinded. Rely on tracking.",
  "Enemy shields tuned high. Plasma may struggle.",
  "Boss unit assembling at jump-point.",
  "Massive influx of 'Basic' drones.",
  "Sniper towers wasted on fast units.",
  "Deploy Fast towers at chokepoints.",
  "Magma Eruption protocol ready.",
  "Time Stop protocol detected.",
  "Overclock protocol draining heat sinks.",
  "Weakness in enemy rear-guard plating.",
  "Maintain defensive depth.",
  "Interest rates high. Save gold.",
  "Enemy mapped static defenses. Reposition.",
  "Swarms weak to plasma bursts.",
  "Heavy machinery detected. Use Magma.",
  "Void resonance high. Snipers gain focus.",
  "Protocol X in effect.",
  "Sensors failing. Going in blind.",
  "Swarm learning. Pathing adjusted.",
  "Energy spikes in perimeter towers.",
  "Splitter units detected. Prepare AOE countermeasures.",
  "Artillery recommended for dense clusters.",
  "Shielded units detected. Sustained fire recommended.",
  "Medical support units embedded. Prioritize healer elimination.",
  "Phase-capable hostiles inbound. Rear defense critical.",
  "Explosive units detected. Check tower spacing.",
  "Heavy armor column approaching. Artillery support critical."
];

export const AUGMENT_POOL: Augment[] = [
  {
    id: 'dmg_all_1',
    name: 'Calibration Matrix',
    description: '+15% Damage for all tower systems.',
    rarity: 'COMMON',
    type: AugmentType.STAT_BUFF,
    effect: { stat: 'damage', value: 0.15, target: 'ALL' }
  },
  {
    id: 'range_sniper_1',
    name: 'Long-Range Optics',
    description: '+25% Range for Sniper towers.',
    rarity: 'COMMON',
    type: AugmentType.STAT_BUFF,
    effect: { stat: 'range', value: 0.25, target: TowerType.SNIPER }
  },
  {
    id: 'rate_fast_1',
    name: 'Hyper-Threading',
    description: '+20% Fire Rate for Fast towers.',
    rarity: 'COMMON',
    type: AugmentType.STAT_BUFF,
    effect: { stat: 'fireRate', value: 0.20, target: TowerType.FAST }
  },
  {
    id: 'econ_interest_1',
    name: 'Compound Logic',
    description: 'Gain 10% interest on current gold at the end of each wave.',
    rarity: 'RARE',
    type: AugmentType.ECONOMY,
    effect: { value: 0.1, special: 'INTEREST' }
  },
  {
    id: 'splash_sniper_1',
    name: 'H.E. Munitions',
    description: 'Sniper rounds deal 50% splash damage in a small radius.',
    rarity: 'LEGENDARY',
    type: AugmentType.ON_HIT,
    effect: { value: 0.5, target: TowerType.SNIPER, special: 'SPLASH_DAMAGE' }
  },
  {
    id: 'dmg_magma_1',
    name: 'Volcanic Core',
    description: '+40% Damage for Magma-path towers.',
    rarity: 'RARE',
    type: AugmentType.STAT_BUFF,
    effect: { stat: 'damage', value: 0.4, target: 'ALL', techTarget: TechPath.MAGMA }
  },
  {
    id: 'rate_all_1',
    name: 'Overclocked Servos',
    description: '+10% Fire Rate for all towers.',
    rarity: 'COMMON',
    type: AugmentType.STAT_BUFF,
    effect: { stat: 'fireRate', value: 0.1, target: 'ALL' }
  },
  {
    id: 'range_all_1',
    name: 'Enhanced Uplink',
    description: '+15% Range for all towers.',
    rarity: 'COMMON',
    type: AugmentType.STAT_BUFF,
    effect: { stat: 'range', value: 0.15, target: 'ALL' }
  },
  {
      id: 'cluster_munitions',
      name: 'Cluster Munitions',
      description: '+50% Blast Radius for Artillery towers.',
      rarity: 'RARE',
      type: AugmentType.STAT_BUFF,
      effect: { value: 0.5, target: TowerType.ARTILLERY, special: 'CLUSTER_MUNITIONS' }
  },
  {
      id: 'chain_reaction',
      name: 'Chain Reaction',
      description: 'Splitter minis take 50% damage on spawn.',
      rarity: 'LEGENDARY',
      type: AugmentType.ON_HIT,
      effect: { value: 0.5, special: 'CHAIN_REACTION' }
  },
  {
      id: 'bombardment_protocol',
      name: 'Bombardment Protocol',
      description: 'Artillery +30% Damage, -20% Fire Rate.',
      rarity: 'RARE',
      type: AugmentType.STAT_BUFF,
      effect: { value: 0.3, target: TowerType.ARTILLERY, special: 'BOMBARDMENT' }
  }
];

export interface AbilityConfig {
    id: string;
    name: string;
    description: string;
    type: 'INSTANT_AOE' | 'TARGETED_AOE' | 'SELF_BUFF' | 'DEBUFF' | 'ZONE' | 'PROJECTILE_MOD';
    damage?: number;
    range?: number; // Effect radius
    cooldown: number;
    duration?: number;
    value?: number; // Generic value for buff/debuff magnitude
    color: string;
    requiresTargeting?: boolean;
}

// Full 12-Ability Matrix
export const ABILITY_MATRIX: Record<TowerType, Record<TechPath, AbilityConfig | null>> = {
    [TowerType.BASIC]: {
        [TechPath.NONE]: null,
        [TechPath.MAGMA]: {
            id: ActiveAbilityType.ERUPTION,
            name: 'Eruption',
            description: 'Deals 500 damage to enemies in a large radius.',
            type: 'INSTANT_AOE',
            damage: 500,
            range: 5,
            cooldown: 20000,
            color: '#ef4444'
        },
        [TechPath.PLASMA]: {
            id: ActiveAbilityType.OVERCLOCK,
            name: 'Overclock',
            description: 'Triples fire rate for 5 seconds.',
            type: 'SELF_BUFF',
            value: 3, // Multiplier
            duration: 5000,
            cooldown: 25000,
            color: '#06b6d4'
        },
        [TechPath.VOID]: {
            id: ActiveAbilityType.TEMPORAL_ANCHOR,
            name: 'Temporal Anchor',
            description: 'Freezes all enemies in range for 4 seconds.',
            type: 'INSTANT_AOE',
            duration: 4000,
            range: 6,
            cooldown: 30000,
            color: '#8b5cf6'
        }
    },
    [TowerType.SNIPER]: {
        [TechPath.NONE]: null,
        [TechPath.MAGMA]: {
            id: ActiveAbilityType.ORBITAL_STRIKE,
            name: 'Orbital Strike',
            description: 'Call down a beam dealing 1000 damage in a targeted area.',
            type: 'TARGETED_AOE',
            damage: 1000,
            range: 4,
            cooldown: 25000,
            color: '#fb7185',
            requiresTargeting: true
        },
        [TechPath.PLASMA]: {
            id: ActiveAbilityType.PERFORATION,
            name: 'Perforation',
            description: 'Shots pierce through all enemies for 8 seconds.',
            type: 'PROJECTILE_MOD',
            duration: 8000,
            cooldown: 20000,
            color: '#38bdf8'
        },
        [TechPath.VOID]: {
            id: ActiveAbilityType.VOID_MARK,
            name: 'Void Mark',
            description: 'Next shot marks target to take 50% extra damage.',
            type: 'DEBUFF',
            duration: 8000,
            value: 1.5,
            cooldown: 20000,
            color: '#c084fc'
        }
    },
    [TowerType.FAST]: {
        [TechPath.NONE]: null,
        [TechPath.MAGMA]: {
            id: ActiveAbilityType.IGNITION_BURST,
            name: 'Ignition Burst',
            description: 'Next 30 shots apply a stacking burn effect.',
            type: 'DEBUFF',
            value: 50, // Damage over time
            duration: 3000, // Dot duration
            cooldown: 18000,
            color: '#f97316'
        },
        [TechPath.PLASMA]: {
            id: ActiveAbilityType.CHAIN_LIGHTNING,
            name: 'Chain Lightning',
            description: 'Shots arc to 3 nearby enemies for 6 seconds.',
            type: 'PROJECTILE_MOD',
            duration: 6000,
            cooldown: 22000,
            color: '#22d3ee'
        },
        [TechPath.VOID]: {
            id: ActiveAbilityType.ENTROPY_FIELD,
            name: 'Entropy Field',
            description: 'Slow aura becomes a root (0 speed) for 3 seconds.',
            type: 'ZONE',
            duration: 3000,
            cooldown: 25000,
            color: '#4c1d95'
        }
    },
    [TowerType.ARTILLERY]: {
        [TechPath.NONE]: null,
        [TechPath.MAGMA]: {
            id: ActiveAbilityType.NAPALM,
            name: 'Napalm Zone',
            description: 'Creates a damaging fire zone at target location.',
            type: 'TARGETED_AOE',
            damage: 100, // per tick
            duration: 5000,
            range: 4,
            cooldown: 25000,
            color: '#ea580c',
            requiresTargeting: true
        },
        [TechPath.PLASMA]: {
            id: ActiveAbilityType.BARRAGE,
            name: 'Barrage',
            description: 'Fire rate increased 10x for 1.5 seconds (Rapid Volley).',
            type: 'SELF_BUFF',
            value: 10,
            duration: 1500,
            cooldown: 15000,
            color: '#0ea5e9'
        },
        [TechPath.VOID]: {
            id: ActiveAbilityType.SINGULARITY,
            name: 'Singularity',
            description: 'Creates a vortex that pulls enemies in.',
            type: 'TARGETED_AOE',
            value: 0.1, // Pull strength
            duration: 3000,
            range: 6,
            cooldown: 30000,
            color: '#7c3aed',
            requiresTargeting: true
        }
    }
};

// Helper to access aura configs which were previously in ABILITY_CONFIG
export const PASSIVE_CONFIG = {
  [PassiveType.DAMAGE_AURA]: { range: 2.5, multiplier: 1.25 }, 
  [PassiveType.RATE_AURA]: { range: 2.5, multiplier: 1.25 },   
  [PassiveType.SLOW_AURA]: { range: 3.5, slowFactor: 0.7 },    
};

export const UPGRADE_CONFIG = {
  costs: {
    2: 200, 
    3: 450  
  },
  paths: {
    [TechPath.NONE]: { damage: 1, range: 1, fireRate: 1 },
    [TechPath.MAGMA]: { 
      2: { damage: 2.0, range: 1.0, fireRate: 0.9, passive: PassiveType.DAMAGE_AURA },
      3: { damage: 4.0, range: 1.1, fireRate: 0.8 } // Ability looked up dynamically
    },
    [TechPath.PLASMA]: { 
      2: { damage: 0.8, range: 0.9, fireRate: 2.0, passive: PassiveType.RATE_AURA },
      3: { damage: 0.7, range: 1.0, fireRate: 3.5 }
    },
    [TechPath.VOID]: { 
      2: { damage: 1.2, range: 1.5, fireRate: 1.0, passive: PassiveType.SLOW_AURA },
      3: { damage: 1.5, range: 2.0, fireRate: 1.1 }
    }
  }
};

export const TECH_PATH_INFO = {
  [TechPath.MAGMA]: { 
    name: 'Magma Tech', 
    description: 'Concentrates raw power into high-damage rounds.', 
    color: '#ef4444',
    icon: 'Swords',
    passiveDesc: 'Ignition Aura (Neighbors +25% DMG)'
  },
  [TechPath.PLASMA]: { 
    name: 'Plasma Tech', 
    description: 'Overclocks servos for extreme fire rates.', 
    color: '#06b6d4',
    icon: 'Zap',
    passiveDesc: 'Flux Network (Neighbors +25% Fire Rate)'
  },
  [TechPath.VOID]: { 
    name: 'Void Tech', 
    description: 'Advanced optics for superior range coverage.', 
    color: '#8b5cf6',
    icon: 'Eye',
    passiveDesc: 'Gravity Field (Slows Enemies)'
  }
};

export const TOWER_STATS = {
  [TowerType.BASIC]: {
    cost: 100,
    range: 4,
    fireRate: 1,
    damage: 20,
    color: '#3b82f6',
    projectileSpeed: 0.5
  },
  [TowerType.SNIPER]: {
    cost: 250,
    range: 8,
    fireRate: 0.4,
    damage: 60,
    color: '#ef4444',
    projectileSpeed: 1.0
  },
  [TowerType.FAST]: {
    cost: 150,
    range: 3,
    fireRate: 3,
    damage: 8,
    color: '#10b981',
    projectileSpeed: 0.6
  },
  [TowerType.ARTILLERY]: {
      cost: 350,
      range: 6,
      fireRate: 0.25,
      damage: 80,
      color: '#f59e0b',
      blastRadius: 2.5,
      projectileSpeed: 0.2
  }
};

export const ENEMY_STATS = {
  [EnemyType.BASIC]: {
    health: 50,
    speed: 1.5,
    goldReward: 15,
    color: '#f97316'
  },
  [EnemyType.FAST]: {
    health: 30,
    speed: 3.0,
    goldReward: 10,
    color: '#fbbf24'
  },
  [EnemyType.TANK]: {
    health: 200,
    speed: 0.8,
    goldReward: 40,
    color: '#6d28d9'
  },
  [EnemyType.BOSS]: {
    health: 1000,
    speed: 0.6,
    goldReward: 200,
    color: '#be123c'
  },
  [EnemyType.SPLITTER]: {
      health: 80,
      speed: 1.2,
      goldReward: 20,
      color: '#14b8a6',
      splitsInto: { type: EnemyType.SPLITTER_MINI, count: 3 }
  },
  [EnemyType.SPLITTER_MINI]: {
      health: 25,
      speed: 2.5,
      goldReward: 5,
      color: '#5eead4'
  },
  [EnemyType.SHIELDED]: {
    health: 80,
    speed: 1.2,
    goldReward: 25,
    color: '#3b82f6',
    shield: 60,
    shieldRegen: 5 // per second
  },
  [EnemyType.HEALER]: {
    health: 60,
    speed: 1.0,
    goldReward: 30,
    color: '#4ade80',
    healAmount: 15,
    healRadius: 3.0,
    healInterval: 2000
  },
  [EnemyType.PHASER]: {
    health: 50,
    speed: 1.8,
    goldReward: 20,
    color: '#a78bfa',
    phaseDuration: 2000,
    solidDuration: 3000
  },
  [EnemyType.BOMBER]: {
    health: 40,
    speed: 2.0,
    goldReward: 20,
    color: '#f43f5e',
    explosionRadius: 2.5,
    disableDuration: 3000,
    explosionDamageToEnemies: 30
  },
  [EnemyType.ARMORED]: {
    health: 150,
    speed: 0.9,
    goldReward: 35,
    color: '#78716c',
    armor: 10
  },
  [EnemyType.SWARM]: {
    health: 15,
    speed: 2.5,
    goldReward: 3,
    color: '#fbbf24'
  }
};
