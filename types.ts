
export interface Vector3Tuple {
  x: number;
  y: number;
  z: number;
}

export enum EnemyType {
  BASIC = 'BASIC',
  FAST = 'FAST',
  TANK = 'TANK',
  BOSS = 'BOSS',
  SPLITTER = 'SPLITTER',
  SPLITTER_MINI = 'SPLITTER_MINI'
}

export interface DamageNumber {
  id: string;
  position: Vector3Tuple;
  value: number;
  color: string;
  lifetime: number; 
  maxLifetime: number;
  isCritical: boolean;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  position: Vector3Tuple;
  pathId: number; // Index of the path in StageConfig.paths
  waypointIndex: number; // Formerly pathIndex
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
  FAST = 'FAST',
  ARTILLERY = 'ARTILLERY'
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
  FREEZE = 'FREEZE',       // Void Lvl 3
  NAPALM = 'NAPALM',       // Magma Lvl 3 (Artillery)
  BARRAGE = 'BARRAGE',     // Plasma Lvl 3 (Artillery)
  SINGULARITY = 'SINGULARITY' // Void Lvl 3 (Artillery)
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
    special?: 'INTEREST' | 'SPLASH_DAMAGE' | 'CLUSTER_MUNITIONS' | 'CHAIN_REACTION' | 'BOMBARDMENT';
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
  disabledTimer?: number; // For boss disable zones
}

export interface Projectile {
  id: string;
  position: Vector3Tuple;
  targetId: string;
  damage: number;
  speed: number;
  color: string;
  sourceType: TowerType;
  blastRadius?: number; // For Artillery
}

export interface Effect {
  id: string;
  type: 'EXPLOSION' | 'SPARK' | 'TEXT' | 'NOVA' | 'FREEZE_WAVE' | 'ORBITAL_STRIKE' | 'PORTAL' | 'BLOCKED' | 'DISABLE_FIELD';
  position: Vector3Tuple;
  color: string;
  scale: number;
  lifetime: number; 
  maxLifetime: number; 
  text?: string;
}

export interface Hazard {
    id: string;
    type: 'NAPALM' | 'SINGULARITY';
    position: Vector3Tuple;
    radius: number;
    duration: number; // ms
    value: number; // damage per tick or pull force
    color: string;
}

// --- NEW STAGE & BOSS TYPES ---

export enum StageId {
  STAGE_1 = 'STAGE_1',
  STAGE_2 = 'STAGE_2',
  STAGE_3 = 'STAGE_3',
  STAGE_4 = 'STAGE_4',
  STAGE_5 = 'STAGE_5'
}

export type GamePhase = 'MENU' | 'STAGE_SELECT' | 'PLAYING' | 'BOSS_INTRO' | 'BOSS_FIGHT' | 'BOSS_DEATH' | 'STAGE_COMPLETE' | 'GAME_OVER';

export interface StageEnvironment {
  skyPreset: string; // 'night' | 'sunset' | 'city' | 'park' | 'forest'
  gridColor: string;
  pathColor: string;
  fogColor?: string;
  fogDensity?: number;
  ambientIntensity: number;
  particleType?: 'none' | 'snow' | 'embers' | 'rain' | 'void_particles' | 'dust';
}

export interface StageConfig {
  id: StageId;
  name: string;
  description: string;
  waves: number;
  paths: Vector3Tuple[][]; // Supports multiple paths
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

// --- META PROGRESSION ---

export interface MetaStats {
  totalEnemiesKilled: number;
  totalGoldEarned: number;
  totalBossesDefeated: number;
  totalPlayTime: number; // milliseconds
}

export interface MetaProgress {
  dataCores: number;
  totalCoresEarned: number;
  purchasedUpgrades: string[];
  achievements: Record<string, boolean>; // id -> unlocked
  stats: MetaStats;
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
  visualChange: 'enraged' | 'shielded' | 'unstable' | 'charged';
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
  activeBuffs?: { type: 'SPEED' | 'REGEN'; duration: number; value: number }[];
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

export interface GameStats {
  startTime: number;
  endTime: number;
  totalGoldEarned: number;
  towersBuilt: number;
  abilitiesUsed: number;
  enemiesKilled: number; // Added for tracking
  coresEarned?: number; // Ephemeral for results screen
}

export type DirectorActionType = 'NONE' | 'ELITE' | 'SUPPLY';

export interface GameState {
  gold: number;
  lives: number;
  wave: number;
  enemies: Enemy[]; // Can contain Boss instances
  towers: Tower[];
  projectiles: Projectile[];
  effects: Effect[];
  damageNumbers: DamageNumber[];
  hazards: Hazard[];
  gameSpeed: number; 
  isGameOver: boolean;
  waveStatus: 'IDLE' | 'SPAWNING' | 'CLEARING';
  waveIntel?: string;
  selectedTowerId: string | null;
  activeAugments: Augment[];
  augmentChoices: Augment[];
  isChoosingAugment: boolean;
  targetingAbility: null | ActiveAbilityType;

  // New Fields
  currentStage: StageId;
  stageProgress: Record<StageId, StageProgress>;
  metaProgress: MetaProgress; // Added Meta Progress to GameState
  activeBoss: Boss | null;
  bossAnnouncement: string | null;
  gamePhase: GamePhase;
  stats: GameStats;
  bossDeathTimer: number;

  // AI Director DDA Fields
  directorAction: DirectorActionType;
  directorScaling: number;
  directorGoldBonus: number;
  directorCooldownMult: number;
}