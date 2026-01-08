
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
  NUKE = 'NUKE',           // Magma Lvl 3
  OVERCLOCK = 'OVERCLOCK', // Plasma Lvl 3
  FREEZE = 'FREEZE'        // Void Lvl 3
}

export enum TargetPriority {
  FIRST = 'FIRST',
  STRONGEST = 'STRONGEST',
  WEAKEST = 'WEAKEST'
}

export interface Tower {
  id: string;
  type: TowerType;
  position: Vector3Tuple;
  // Current effective stats (recalculated every frame)
  range: number;
  fireRate: number; 
  damage: number;
  
  // Base stats (persisted from upgrades)
  baseRange: number;
  baseFireRate: number;
  baseDamage: number;

  cooldown: number; // ms remaining until next shot
  lastShotTime: number; // timestamp for visual effects only
  level: number;
  techPath: TechPath;
  totalInvested: number;
  
  // Ability State
  passiveType: PassiveType;
  activeType: ActiveAbilityType;
  abilityCooldown: number;     // Remaining cooldown
  abilityMaxCooldown: number;  // Total cooldown time
  abilityDuration: number;     // Remaining active duration (for Overclock etc)
  
  // Strategy
  targetPriority: TargetPriority;
}

export interface Projectile {
  id: string;
  position: Vector3Tuple;
  targetId: string;
  damage: number;
  speed: number;
  color: string;
}

export interface Effect {
  id: string;
  type: 'EXPLOSION' | 'SPARK' | 'TEXT' | 'NOVA' | 'FREEZE_WAVE';
  position: Vector3Tuple;
  color: string;
  scale: number;
  lifetime: number; // 0 to 1
  maxLifetime: number; // frames
}

export interface GameState {
  gold: number;
  lives: number;
  wave: number;
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  effects: Effect[];
  gameSpeed: number; // 0 (pause), 1 (normal), 2 (fast)
  isGameOver: boolean;
  waveStatus: 'IDLE' | 'SPAWNING' | 'CLEARING';
  waveIntel?: string;
  selectedTowerId: string | null;
}
