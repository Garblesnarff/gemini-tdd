
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

export interface EnemyDebuff {
  id: string;
  type: 'BURN' | 'VOID_MARK';
  duration: number;
  value?: number; // Damage per tick for Burn, Multiplier for Mark
  sourceId?: string;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  position: Vector3Tuple;
  pathId: number; 
  waypointIndex: number; 
  progress: number; 
  frozen?: number; 
  freezeTimer?: number; 
  isElite?: boolean; 
  debuffs: EnemyDebuff[]; // New
  
  isBoss?: boolean;
  bossConfig?: BossConfig;
  currentPhase?: number;
  abilityCooldowns?: Record<string, number>;
  isShielded?: boolean;
  shieldTimer?: number;
  triggeredSpawnIndices?: number[];
  disabledZone?: { position: Vector3Tuple; radius: number; duration: number };
  activeBuffs?: { type: 'SPEED' | 'REGEN'; duration: number; value: number }[];
}

export enum TowerType {
  BASIC = 'BASIC',
  SNIPER = 'SNIPER',
  FAST = 'FAST',
  ARTILLERY = 'ARTILLERY'
}

export enum TechPath {
  NONE = 'NONE',
  MAGMA = 'MAGMA',   
  PLASMA = 'PLASMA', 
  VOID = 'VOID'      
}

export enum PassiveType {
  NONE = 'NONE',
  DAMAGE_AURA = 'DAMAGE_AURA', 
  RATE_AURA = 'RATE_AURA',     
  SLOW_AURA = 'SLOW_AURA'      
}

export enum ActiveAbilityType {
  NONE = 'NONE',
  // MAGMA
  ERUPTION = 'ERUPTION',          // Basic
  ORBITAL_STRIKE = 'ORBITAL_STRIKE', // Sniper
  IGNITION_BURST = 'IGNITION_BURST', // Fast (New)
  NAPALM = 'NAPALM',              // Artillery
  // PLASMA
  OVERCLOCK = 'OVERCLOCK',        // Basic
  PERFORATION = 'PERFORATION',    // Sniper (New)
  CHAIN_LIGHTNING = 'CHAIN_LIGHTNING', // Fast (New)
  BARRAGE = 'BARRAGE',            // Artillery
  // VOID
  TEMPORAL_ANCHOR = 'TEMPORAL_ANCHOR', // Basic (Renamed from FREEZE)
  VOID_MARK = 'VOID_MARK',        // Sniper (New)
  ENTROPY_FIELD = 'ENTROPY_FIELD', // Fast (New)
  SINGULARITY = 'SINGULARITY'     // Artillery
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

export interface TowerActiveBuff {
  type: 'IGNITION' | 'PERFORATION' | 'CHAIN_LIGHTNING' | 'ENTROPY_FIELD' | 'VOID_MARK_READY' | 'OVERCLOCK' | 'BARRAGE';
  duration?: number;
  stacks?: number;
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
  disabledTimer?: number; 
  activeBuffs: TowerActiveBuff[]; // New
}

export interface Projectile {
  id: string;
  position: Vector3Tuple;
  targetId: string;
  damage: number;
  speed: number;
  color: string;
  sourceType: TowerType;
  blastRadius?: number; 
  
  // New props for special abilities
  isPerforating?: boolean;
  perforationHitList?: string[]; // IDs of enemies already hit
  isChainLightning?: boolean;
  isIgnition?: boolean;
  isVoidMark?: boolean;
}

export interface Effect {
  id: string;
  type: 'EXPLOSION' | 'SPARK' | 'TEXT' | 'NOVA' | 'FREEZE_WAVE' | 'ORBITAL_STRIKE' | 'PORTAL' | 'BLOCKED' | 'DISABLE_FIELD' | 'CHAIN_ARC' | 'VOID_SIGIL';
  position: Vector3Tuple;
  targetPosition?: Vector3Tuple; // For Chain Arc
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

export interface SupplyDrop {
    id: string;
    position: Vector3Tuple;
    value: number;
    lifetime: number;
    maxLifetime: number;
}

// --- NEW STAGE & BOSS TYPES ---

export enum StageId {
  STAGE_1 = 'STAGE_1',
  STAGE_2 = 'STAGE_2',
  STAGE_3 = 'STAGE_3',
  STAGE_4 = 'STAGE_4',
  STAGE_5 = 'STAGE_5'
}

export type GamePhase = 'MENU' | 'STAGE_SELECT' | 'SHOP' | 'PLAYING' | 'BOSS_INTRO' | 'BOSS_FIGHT' | 'BOSS_DEATH' | 'STAGE_COMPLETE' | 'GAME_OVER';

export interface StageEnvironment {
  skyPreset: string; 
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
  purchasedUpgrades: string[]; // Legacy field (keeping for safety)
  upgradeLevels: Record<string, number>; // New: Upgrade ID -> Level
  achievements: Record<string, boolean>; // id -> unlocked
  stats: MetaStats;
}

// --- META UPGRADES TYPES ---

export type MetaUpgradeCategory = 'ECONOMIC' | 'DEFENSIVE' | 'OFFENSIVE' | 'TECH' | 'UNLOCKABLE';

export type MetaUpgradeEffectType = 
  | 'STARTING_GOLD' 
  | 'STARTING_LIVES' 
  | 'KILL_GOLD_MULT' 
  | 'SELL_RATIO' 
  | 'GLOBAL_DAMAGE' 
  | 'GLOBAL_RANGE' 
  | 'TOWER_COST_MULT' 
  | 'CRIT_CHANCE' 
  | 'INTEREST_RATE' 
  | 'ABILITY_DAMAGE' 
  | 'ABILITY_COOLDOWN' 
  | 'ABILITY_DURATION' 
  | 'LIFE_REGEN_WAVES'
  | 'BOSS_RESIST';

export interface MetaUpgradeEffect {
  type: MetaUpgradeEffectType;
  value: number;
  techPath?: TechPath;
}

export interface MetaUpgrade {
  id: string;
  name: string;
  description: string;
  category: MetaUpgradeCategory;
  costs: number[]; // Cost per level
  maxLevel: number;
  unlockCondition?: { type: 'STAGE_CLEAR' | 'STARS', stageId?: StageId, stars?: number };
  effects: MetaUpgradeEffect[];
}

export interface AppliedMetaEffects {
  bonusStartingGold: number;
  bonusStartingLives: number;
  killGoldMultiplier: number;
  sellRatio: number;
  globalDamageMultiplier: number;
  globalRangeMultiplier: number;
  towerCostMultiplier: number;
  critChance: number;
  interestRate: number;
  lifeRegenWaves: number | null;
  bossResist: number;
  abilityDamageMultiplier: Record<TechPath, number>;
  abilityCooldownMultiplier: Record<TechPath, number>;
  abilityDurationMultiplier: Record<TechPath, number>;
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
  interval: number; // ms between bursts
  startDelay: number; // absolute ms from wave start
  burstSize?: number; // units per burst
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
  enemiesKilled: number; 
  coresEarned?: number; 
}

export type DirectorState = 'NEUTRAL' | 'PRESSURE' | 'RELIEF';
export type DirectorActionType = 'NONE' | 'ELITE' | 'SUPPLY';

export interface GameState {
  gold: number;
  lives: number;
  wave: number;
  enemies: Enemy[]; 
  towers: Tower[];
  projectiles: Projectile[];
  effects: Effect[];
  damageNumbers: DamageNumber[];
  hazards: Hazard[];
  supplyDrops: SupplyDrop[]; 
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
  metaProgress: MetaProgress; 
  metaEffects: AppliedMetaEffects; 
  activeBoss: Boss | null;
  bossAnnouncement: string | null;
  gamePhase: GamePhase;
  stats: GameStats;
  bossDeathTimer: number;

  // AI Director DDA Fields
  directorState: DirectorState;
  directorStreak: number;
  waveStats: { 
      livesLostThisWave: number; 
      waveStartTime: number; 
      waveEndTime: number; 
      consecutiveCleanWaves: number; 
  };
  pendingDirectorState?: DirectorState; 
  directorAction: DirectorActionType;
  directorScaling: number;
  directorGoldBonus: number;
  directorCooldownMult: number;
}
