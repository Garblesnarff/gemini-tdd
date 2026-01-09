
export interface Vector3Tuple {
  x: number;
  y: number;
  z: number;
}

export enum EnemyType {
  BASIC = 'BASIC',
  FAST = 'FAST',
  TANK = 'TANK',
  BOSS = 'BOSS'
}

export interface Enemy {
  id: string;
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  position: Vector3Tuple;
  pathIndex: number;
  progress: number; // 0 to 1 between waypoints
  frozen?: number; // 0 to 1 (slow factor, 0 is stopped, 1 is normal)
  freezeTimer?: number; // Time remaining for full freeze
}

export enum TowerType {
  BASIC = 'BASIC',
  SNIPER = 'SNIPER',
  FAST = 'FAST'
}

export enum TechPath {
  NONE = 'NONE',
  MAGMA = 'MAGMA',   // Damage Focus
  PLASMA = 'PLASMA', // Fire Rate Focus
  VOID = 'VOID'      // Range Focus
}

export enum PassiveType {
  NONE = 'NONE',
  DAMAGE_AURA = 'DAMAGE_AURA', // Magma Lvl 2
  RATE_AURA = 'RATE_AURA',     // Plasma Lvl 2
  SLOW_AURA = 'SLOW_AURA'      // Void Lvl 2
}

export enum ActiveAbilityType {
  NONE = 'NONE',
  ERUPTION = 'ERUPTION',   // Magma Lvl 3 (Basic/Fast)
  ORBITAL_STRIKE = 'ORBITAL_STRIKE', // Magma Lvl 3 (Sniper)
  OVERCLOCK = 'OVERCLOCK', // Plasma Lvl 3
  FREEZE = 'FREEZE'        // Void Lvl 3
}

export enum TargetPriority {
  FIRST = 'FIRST',
  STRONGEST = 'STRONGEST',
  WEAKEST = 'WEAKEST'
}

export enum AugmentType {
  STAT_BUFF = 'STAT_BUFF',
  ECONOMY = 'ECONOMY',
  ON_HIT = 'ON_HIT'
}

export interface Augment {
  id: string;
  name: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  type: AugmentType;
  effect: {
    stat?: 'damage' | 'range' | 'fireRate';
    value: number;
    target?: TowerType | 'ALL';
    techTarget?: TechPath; // New field for path-specific buffs
    special?: 'INTEREST' | 'SPLASH_DAMAGE';
  };
}

export interface Tower {
  id: string;
  type: TowerType;
  position: Vector3Tuple;
  range: number;
  fireRate: number; 
  damage: number;
  baseRange: number;
  baseFireRate: number;
  baseDamage: number;
  cooldown: number; 
  lastShotTime: number; 
  level: number;
  techPath: TechPath;
  totalInvested: number;
  passiveType: PassiveType;
  activeType: ActiveAbilityType;
  abilityCooldown: number;     
  abilityMaxCooldown: number;  
  abilityDuration: number;     
  targetPriority: TargetPriority;
}

export interface Projectile {
  id: string;
  position: Vector3Tuple;
  targetId: string;
  damage: number;
  speed: number;
  color: string;
  sourceType: TowerType;
}

export interface Effect {
  id: string;
  type: 'EXPLOSION' | 'SPARK' | 'TEXT' | 'NOVA' | 'FREEZE_WAVE' | 'ORBITAL_STRIKE';
  position: Vector3Tuple;
  color: string;
  scale: number;
  lifetime: number; 
  maxLifetime: number; 
}

export interface GameState {
  gold: number;
  lives: number;
  wave: number;
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  effects: Effect[];
  gameSpeed: number; 
  isGameOver: boolean;
  waveStatus: 'IDLE' | 'SPAWNING' | 'CLEARING';
  waveIntel?: string;
  selectedTowerId: string | null;
  activeAugments: Augment[];
  augmentChoices: Augment[];
  isChoosingAugment: boolean;
  targetingAbility: ActiveAbilityType | null;
}
