
import { TowerType, EnemyType, TechPath, PassiveType, ActiveAbilityType, Augment, AugmentType } from './types';

export const GRID_SIZE = 12;
export const PATH_WAYPOINTS = [
  { x: -5, y: 0.2, z: -5 },
  { x: 5, y: 0.2, z: -5 },
  { x: 5, y: 0.2, z: 0 },
  { x: -5, y: 0.2, z: 0 },
  { x: -5, y: 0.2, z: 5 },
  { x: 5, y: 0.2, z: 5 },
];

export const MAX_LEVEL = 3;
export const SELL_REFUND_RATIO = 0.7; 

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
  }
];

// Ability Configuration
export const ABILITY_CONFIG = {
  [PassiveType.DAMAGE_AURA]: { range: 2.5, multiplier: 1.25 }, 
  [PassiveType.RATE_AURA]: { range: 2.5, multiplier: 1.25 },   
  [PassiveType.SLOW_AURA]: { range: 3.5, slowFactor: 0.7 },    

  [ActiveAbilityType.NUKE]: { 
    damage: 500, 
    range: 5, 
    cooldown: 20000, 
    color: '#ef4444'
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
      3: { damage: 4.0, range: 1.1, fireRate: 0.8, active: ActiveAbilityType.NUKE }
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
        'Active: Eruption (Massive AoE Damage)'
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
