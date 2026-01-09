
import { TowerType, EnemyType, TechPath, PassiveType, ActiveAbilityType, Augment, AugmentType, StageId, StageConfig, BossConfig } from './types';

export const MAX_LEVEL = 3;
export const SELL_REFUND_RATIO = 0.7;
export const GRID_SIZE = 12;

// Standard Path Waypoints for Stage 1 (Tutorial)
export const PATH_WAYPOINTS = [
  { x: -8, y: 0.2, z: -6 },
  { x: 0, y: 0.2, z: -6 },
  { x: 0, y: 0.2, z: 0 },
  { x: -4, y: 0.2, z: 0 },
  { x: -4, y: 0.2, z: 6 },
  { x: 8, y: 0.2, z: 6 },
];

export const BOSS_CONFIGS: Record<string, BossConfig> = {
  sentinel_prime: {
    id: 'sentinel_prime',
    name: 'SENTINEL PRIME',
    title: 'Guardian of the Forward Base',
    baseHealth: 5000,
    speed: 0.5,
    size: 2.5,
    color: '#f97316',
    phases: [
      { healthThreshold: 1.0, speedMultiplier: 1.0, damageResistance: 0, announcement: 'SENTINEL PRIME APPROACHES' },
      { healthThreshold: 0.75, speedMultiplier: 1.2, damageResistance: 0.1, announcement: 'PHASE 2: ACCELERATING', visualChange: 'enraged' },
      { healthThreshold: 0.5, speedMultiplier: 1.0, damageResistance: 0.25, announcement: 'PHASE 3: SHIELDS ONLINE', visualChange: 'shielded', abilityUnlock: 'shield_pulse' },
      { healthThreshold: 0.25, speedMultiplier: 1.5, damageResistance: 0, announcement: 'FINAL PHASE: CRITICAL DAMAGE', visualChange: 'unstable' }
    ],
    abilities: [
      { id: 'spawn_minions', name: 'Deploy Drones', type: 'SPAWN_MINIONS', cooldown: 15000 },
      { id: 'shield_pulse', name: 'Emergency Shields', type: 'SHIELD_PULSE', cooldown: 20000, duration: 3000 }
    ],
    minionSpawns: [
      { triggerHealth: 0.6, enemyType: EnemyType.BASIC, count: 5, announcement: 'DEPLOYING DEFENSE DRONES' },
      { triggerHealth: 0.3, enemyType: EnemyType.FAST, count: 8, announcement: 'RELEASING INTERCEPTORS' }
    ]
  }
};

export const STAGE_CONFIGS: Record<StageId, StageConfig> = {
  [StageId.STAGE_1]: {
    id: StageId.STAGE_1,
    name: "Forward Base",
    description: "Secure the perimeter of our newly established research site.",
    waves: 25,
    path: PATH_WAYPOINTS,
    startingGold: 400,
    startingLives: 20,
    enemyScaling: 1.0,
    bossConfig: BOSS_CONFIGS.sentinel_prime,
    unlockRequirement: null,
    environment: {
      skyPreset: 'night',
      gridColor: '#1e293b',
      pathColor: '#334155',
      ambientIntensity: 0.5
    }
  },
  [StageId.STAGE_2]: {
    id: StageId.STAGE_2,
    name: "The Gauntlet",
    description: "A narrow canyon pass where precision is your only ally.",
    waves: 25,
    path: [
      { x: -10, y: 0.2, z: -8 },
      { x: -10, y: 0.2, z: 8 },
      { x: -5, y: 0.2, z: 8 },
      { x: -5, y: 0.2, z: -8 },
      { x: 0, y: 0.2, z: -8 },
      { x: 0, y: 0.2, z: 8 },
      { x: 10, y: 0.2, z: 8 }
    ],
    startingGold: 350,
    startingLives: 15,
    enemyScaling: 1.3,
    bossConfig: { ...BOSS_CONFIGS.sentinel_prime, name: 'RAZORWING', title: 'The Sky-Splitter', speed: 1.2, color: '#fbbf24' },
    unlockRequirement: StageId.STAGE_1,
    environment: {
      skyPreset: 'sunset',
      gridColor: '#451a03',
      pathColor: '#78350f',
      ambientIntensity: 0.7,
      fogColor: '#451a03',
      fogDensity: 0.02
    }
  },
  [StageId.STAGE_3]: {
    id: StageId.STAGE_3,
    name: "Crossroads",
    description: "Multiple entry points merge into a single, chaotic chokepoint.",
    waves: 30,
    path: [
      { x: -10, y: 0.2, z: 0 },
      { x: 0, y: 0.2, z: 0 },
      { x: 0, y: 0.2, z: -10 },
      { x: 5, y: 0.2, z: -10 },
      { x: 5, y: 0.2, z: 10 }
    ],
    startingGold: 500,
    startingLives: 20,
    enemyScaling: 1.6,
    bossConfig: { ...BOSS_CONFIGS.sentinel_prime, name: 'VOID REAVER', title: 'Ender of Logic', baseHealth: 8000, color: '#8b5cf6' },
    unlockRequirement: StageId.STAGE_2,
    environment: {
      skyPreset: 'void',
      gridColor: '#1e1b4b',
      pathColor: '#312e81',
      ambientIntensity: 0.3,
      fogColor: '#000',
      fogDensity: 0.05
    }
  },
  [StageId.STAGE_4]: {
    id: StageId.STAGE_4,
    name: "The Spiral",
    description: "Defend the core at the center of a winding gravity well.",
    waves: 30,
    path: [
      { x: -10, y: 0.2, z: -10 },
      { x: 10, y: 0.2, z: -10 },
      { x: 10, y: 0.2, z: 10 },
      { x: -5, y: 0.2, z: 10 },
      { x: -5, y: 0.2, z: -5 },
      { x: 5, y: 0.2, z: -5 },
      { x: 5, y: 0.2, z: 0 }
    ],
    startingGold: 450,
    startingLives: 10,
    enemyScaling: 2.0,
    bossConfig: { ...BOSS_CONFIGS.sentinel_prime, name: 'OMEGA UNIT', title: 'World-Eater Prototype', baseHealth: 15000, size: 4, color: '#be123c' },
    unlockRequirement: StageId.STAGE_3,
    environment: {
      skyPreset: 'storm',
      gridColor: '#0f172a',
      pathColor: '#1e293b',
      ambientIntensity: 0.4,
      fogColor: '#1e293b',
      fogDensity: 0.03
    }
  },
  [StageId.STAGE_5]: {
    id: StageId.STAGE_5,
    name: "Void Rift",
    description: "The final stand where space-time itself begins to unravel.",
    waves: 35,
    path: [
      { x: 0, y: 0.2, z: -10 },
      { x: 0, y: 0.2, z: 10 },
      { x: -10, y: 0.2, z: 0 },
      { x: 10, y: 0.2, z: 0 }
    ],
    startingGold: 600,
    startingLives: 20,
    enemyScaling: 2.5,
    bossConfig: { ...BOSS_CONFIGS.sentinel_prime, name: 'HARBINGER', title: 'The Architect of Null', baseHealth: 30000, size: 5, color: '#000000' },
    unlockRequirement: StageId.STAGE_4,
    environment: {
      skyPreset: 'inferno',
      gridColor: '#450a0a',
      pathColor: '#7f1d1d',
      ambientIntensity: 0.2,
      fogColor: '#450a0a',
      fogDensity: 0.08
    }
  }
};

export const TACTICAL_INTEL_POOL = [
  "Massive heat signatures detected in the sub-sector. Prepare for heavy resistance.",
  "Enemy cloaking tech detected. Scanners are struggling to lock on target.",
  "Scout reports indicate high-speed units approaching.",
  "Atmospheric interference is high. Tower target acquisition might be sluggish.",
  "Energy readings spiking. A high-priority target is leading this assault.",
  "Armor plating on units is reinforced. Focus on high-damage output.",
  "Power grid fluctuating. Keep a reserve of gold for emergency deployments.",
  "The swarm is evolving. Unconventional movement patterns detected.",
  "Magma Tech is recommended for this wave's heavy armor configuration.",
  "Plasma Tech overclocking is advised to handle the upcoming swarm density.",
  "Target the leader. Breaking their formation will slow the remaining units.",
  "The core must not fall. Hold the line at all costs.",
  "Warning: Incoming Boss class signature. Prepare all active protocols."
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
    description: 'Gain 10% interest on gold at end of wave.',
    rarity: 'RARE',
    type: AugmentType.ECONOMY,
    effect: { value: 0.1, special: 'INTEREST' }
  },
  {
    id: 'splash_sniper_1',
    name: 'H.E. Munitions',
    description: 'Sniper rounds deal 50% splash damage.',
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
];

// Ability Configuration
export const ABILITY_CONFIG = {
  [PassiveType.DAMAGE_AURA]: { range: 2.5, multiplier: 1.25 }, 
  [PassiveType.RATE_AURA]: { range: 2.5, multiplier: 1.25 },   
  [PassiveType.SLOW_AURA]: { range: 3.5, slowFactor: 0.7 },    

  [ActiveAbilityType.ERUPTION]: { 
    damage: 500, 
    range: 5, 
    cooldown: 20000, 
    color: '#ef4444'
  },
  [ActiveAbilityType.ORBITAL_STRIKE]: { 
    damage: 1200, 
    range: 4, 
    cooldown: 25000, 
    color: '#fb7185'
  },
  [ActiveAbilityType.OVERCLOCK]: { 
    multiplier: 3, 
    duration: 5000, 
    cooldown: 25000, 
    color: '#06b6d4'
  },
  [ActiveAbilityType.FREEZE]: { 
    duration: 4000, 
    range: 6, 
    cooldown: 30000, 
    color: '#8b5cf6'
  }
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
      3: { damage: 4.0, range: 1.1, fireRate: 0.8, active: ActiveAbilityType.ERUPTION }
    },
    [TechPath.PLASMA]: { 
      2: { damage: 0.8, range: 0.9, fireRate: 2.0, passive: PassiveType.RATE_AURA },
      3: { damage: 0.7, range: 1.0, fireRate: 3.5, active: ActiveAbilityType.OVERCLOCK }
    },
    [TechPath.VOID]: { 
      2: { damage: 1.2, range: 1.5, fireRate: 1.0, passive: PassiveType.SLOW_AURA },
      3: { damage: 1.5, range: 2.0, fireRate: 1.1, active: ActiveAbilityType.FREEZE }
    }
  }
};

export const TECH_PATH_INFO = {
  [TechPath.MAGMA]: { 
    name: 'Magma Tech', 
    description: 'Concentrates raw power into high-damage rounds.', 
    color: '#ef4444',
    icon: 'Swords',
    abilities: [
        'Passive: Ignition Aura (Neighbors +25% DMG)',
        'Active: Eruption / Orbital Strike'
    ]
  },
  [TechPath.PLASMA]: { 
    name: 'Plasma Tech', 
    description: 'Overclocks servos for extreme fire rates.', 
    color: '#06b6d4',
    icon: 'Zap',
    abilities: [
        'Passive: Flux Network (Neighbors +25% Fire Rate)',
        'Active: Overclock (Self 3x Fire Rate)'
    ]
  },
  [TechPath.VOID]: { 
    name: 'Void Tech', 
    description: 'Advanced optics for superior range coverage.', 
    color: '#8b5cf6',
    icon: 'Eye',
    abilities: [
        'Passive: Gravity Field (Slows Enemies)',
        'Active: Time Stop (Freezes Enemies)'
    ]
  }
};

export const TOWER_STATS = {
  [TowerType.BASIC]: {
    cost: 100,
    range: 4,
    fireRate: 1,
    damage: 20,
    color: '#3b82f6'
  },
  [TowerType.SNIPER]: {
    cost: 250,
    range: 8,
    fireRate: 0.4,
    damage: 60,
    color: '#ef4444'
  },
  [TowerType.FAST]: {
    cost: 150,
    range: 3,
    fireRate: 3,
    damage: 8,
    color: '#10b981'
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
  }
};
