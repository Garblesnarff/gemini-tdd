
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
  
  // Boss-specific properties (optional on base Enemy for easier array handling)
  isBoss?: boolean;
  bossConfig?: BossConfig;
  currentPhase?: number;
  abilityCooldowns?: Record<string, number>;
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
    techTarget?: TechPath; 
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
  type: 'EXPLOSION' | 'SPARK' | 'TEXT' | 'NOVA' | 'FREEZE_WAVE' | 'ORBITAL_STRIKE' | 'PORTAL' | 'BLOCKED';
  position: Vector3Tuple;
  color: string;
  scale: number;
  lifetime: number; 
  maxLifetime: number; 
  text?: string;
}

// --- NEW STAGE & BOSS TYPES ---

export enum StageId {
  STAGE_1 = 'STAGE_1',
  STAGE_2 = 'STAGE_2',
  STAGE_3 = 'STAGE_3',
  STAGE_4 = 'STAGE_4',
  STAGE_5 = 'STAGE_5'
}

export type GamePhase = 'MENU' | 'STAGE_SELECT' | 'PLAYING' | 'BOSS_INTRO' | 'BOSS_FIGHT' | 'STAGE_COMPLETE' | 'GAME_OVER';

export interface StageEnvironment {
  skyPreset: string;
  gridColor: string;
  pathColor: string;
  fogColor?: string;
  ambientIntensity: number;
}

export interface StageConfig {
  id: StageId;
  name: string;
  description: string;
  waves: number;
  path: Vector3Tuple[];
  startingGold: number;
  startingLives: number;
  enemyScaling: number;
  bossConfig: BossConfig;
  environment: StageEnvironment;
}

export interface StageProgress {
  unlocked: boolean;
  completed: boolean;
  bestWave: number;
  stars: 0 | 1 | 2 | 3;
}

export enum BossAbilityType {
  DISABLE_ZONE = 'DISABLE_ZONE',
  SPAWN_MINIONS = 'SPAWN_MINIONS',
  SHIELD_PULSE = 'SHIELD_PULSE',
  SPEED_BURST = 'SPEED_BURST',
  REGEN = 'REGEN'
}

export interface BossPhase {
  healthThreshold: number;
  speedMultiplier: number;
  damageResistance: number;
  announcement: string;
  visualChange: 'enraged' | 'shielded' | 'unstable';
  abilityUnlock?: string;
}

export interface BossAbility {
  id: string;
  name: string;
  type: BossAbilityType;
  cooldown: number;
  duration?: number;
  radius?: number;
  value?: number;
}

export interface MinionSpawn {
  triggerHealth: number;
  enemyType: EnemyType;
  count: number;
  announcement?: string;
}

export interface BossConfig {
  id: string;
  name: string;
  title: string;
  baseHealth: number;
  speed: number;
  size: number;
  color: string;
  phases: BossPhase[];
  abilities: BossAbility[];
  minionSpawns: MinionSpawn[];
}

export interface Boss extends Enemy {
  isBoss: true;
  bossConfig: BossConfig;
  currentPhase: number;
  abilityCooldowns: Record<string, number>;
  isShielded: boolean;
  shieldTimer?: number;
  triggeredSpawnIndices: number[];
  disabledZone?: { position: Vector3Tuple; radius: number; duration: number };
}

export interface WaveGroup {
  type: EnemyType;
  count: number;
  interval: number; // ms between units
  wait?: number; // ms to wait before starting this group
}

export interface WaveDefinition {
  composition: WaveGroup[];
  intel?: string; 
}

export interface GameState {
  gold: number;
  lives: number;
  wave: number;
  enemies: Enemy[]; // Can contain Boss instances
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

  // New Fields
  currentStage: StageId;
  stageProgress: Record<StageId, StageProgress>;
  activeBoss: Boss | null;
  bossAnnouncement: string | null;
  gamePhase: GamePhase;
}
