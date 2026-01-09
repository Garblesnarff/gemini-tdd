
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

export enum StageId {
  STAGE_1 = 'STAGE_1',
  STAGE_2 = 'STAGE_2',
  STAGE_3 = 'STAGE_3',
  STAGE_4 = 'STAGE_4',
  STAGE_5 = 'STAGE_5'
}

export interface EnvironmentConfig {
  skyPreset: 'night' | 'sunset' | 'storm' | 'void' | 'inferno';
  gridColor: string;
  pathColor: string;
  ambientIntensity: number;
  fogColor?: string;
  fogDensity?: number;
}

export interface BossPhase {
  healthThreshold: number; // 0.75, 0.5, 0.25
  speedMultiplier: number;
  damageResistance: number; // 0-1 percentage reduction
  abilityUnlock?: string;
  announcement: string;
  visualChange?: 'enraged' | 'shielded' | 'unstable';
}

export interface BossAbility {
  id: string;
  name: string;
  type: 'DISABLE_ZONE' | 'SPAWN_MINIONS' | 'SHIELD_PULSE' | 'SPEED_BURST' | 'REGEN';
  cooldown: number;
  duration?: number;
  radius?: number;
  value?: number;
}

export interface MinionSpawn {
  triggerHealth: number; // 0-1
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
  unlockRequirement: StageId | null;
  environment: EnvironmentConfig;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  position: Vector3Tuple;
  pathIndex: number;
  progress: number;
  frozen?: number;
  freezeTimer?: number;
  isBoss?: boolean;
  bossConfig?: BossConfig;
  currentPhase?: number;
  abilityCooldowns?: Record<string, number>;
  isShielded?: boolean;
}

export enum TowerType {
  BASIC = 'BASIC',
  SNIPER = 'SNIPER',
  FAST = 'FAST'
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
  ERUPTION = 'ERUPTION',
  ORBITAL_STRIKE = 'ORBITAL_STRIKE',
  OVERCLOCK = 'OVERCLOCK',
  FREEZE = 'FREEZE'
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
  type: 'EXPLOSION' | 'SPARK' | 'TEXT' | 'NOVA' | 'FREEZE_WAVE' | 'ORBITAL_STRIKE';
  position: Vector3Tuple;
  color: string;
  scale: number;
  lifetime: number;
  maxLifetime: number;
}

export type GamePhase = 'MENU' | 'STAGE_SELECT' | 'PLAYING' | 'BOSS_INTRO' | 'BOSS_FIGHT' | 'STAGE_COMPLETE' | 'GAME_OVER';

export interface StageProgress {
  unlocked: boolean;
  completed: boolean;
  bestWave: number;
  stars: 0 | 1 | 2 | 3;
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
  // New Stage System Fields
  currentStage: StageId;
  stageProgress: Record<StageId, StageProgress>;
  gamePhase: GamePhase;
  activeBoss: Enemy | null;
  bossAnnouncement: string | null;
}
