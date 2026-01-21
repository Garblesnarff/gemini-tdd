
import { TowerType, EnemyType, TechPath, PassiveType, ActiveAbilityType, Augment, AugmentType, StageId, StageConfig, BossConfig, BossAbilityType, Vector3Tuple, WaveDefinition, WaveGroup, StageProgress, MetaProgress } from './types';

export const GRID_SIZE = 12;

export const DIRECTOR_CONFIG = {
    // Thresholds
    PRESSURE: {
        CLEAN_WAVES: 3,
        GOLD: 400,
        LIVES_PCT: 0.8
    },
    RELIEF: {
        LIVES_PCT: 0.4,
        LIVES_LOST_WAVE: 2
    },
    // Multipliers
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
        PRESSURE: 0.85, // Faster boss ability cooldowns
        RELIEF: 1.15,   // Slower boss ability cooldowns
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

// Crossroads - Path A (Left)
const STAGE_3_PATH_A: Vector3Tuple[] = [
    { x: -6, y: 0.2, z: -6 }, { x: -4, y: 0.2, z: -4 },
    { x: -4, y: 0.2, z: 4 }, { x: 0, y: 0.2, z: 4 },
    { x: 0, y: 0.2, z: 0 }, { x: 6, y: 0.2, z: 6 }
];
// Crossroads - Path B (Right)
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
    color: '#991b1b', // Deep Red
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
    color: '#84cc16', // Lime/Green
    phases: [
        { healthThreshold: 1.0, speedMultiplier: 1.0, damageResistance: 0.1, announcement: "THE HIVE AWAKENS", visualChange: 'unstable' },
        { healthThreshold: 0.75, speedMultiplier: 1.1, damageResistance: 0.1, announcement: "BROOD ACCELERATION", visualChange: 'enraged', abilityUnlock: 'regen' },
        { healthThreshold: 0.5, speedMultiplier: 1.2, damageResistance: 0.1, announcement: "ELITE GUARD DEPLOYED", visualChange: 'charged' },
        { healthThreshold: 0.25, speedMultiplier: 1.3, damageResistance: 0.1, announcement: "HIVE MIND CRITICAL", visualChange: 'unstable' }
    ],
    abilities: [
        { id: 'spawn_swarm', name: 'Swarm', type: BossAbilityType.SPAWN_MINIONS, cooldown: 10000 },
        { id: 'regen', name: 'Biomass Recovery', type: BossAbilityType.REGEN, cooldown: 15000, duration: 5000, value: 0.05 } // 5% heal
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
    color: '#475569', // Slate Gray
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
    color: '#3b0764', // Deep Purple
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
        fogDensity: 0.08, // Heavy fog
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
  achievements: {},
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
    
    // Helper for creating wave groups with parallel logic
    const grp = (type: EnemyType, count: number, startDelay: number, interval: number, burstSize: number = 1): WaveGroup => 
        ({ type, count, startDelay, interval, burstSize });

    // Multipliers for difficulty
    const multipliers = {
        [StageId.STAGE_1]: 1.0,
        [StageId.STAGE_2]: 1.2,
        [StageId.STAGE_3]: 1.5,
        [StageId.STAGE_4]: 2.0,
        [StageId.STAGE_5]: 2.5
    };
    const scale = multipliers[stageId] || 1.0;
    const c = (base: number) => Math.floor(base * scale); // Count scaler

    const groups: WaveGroup[] = [];
    let intel = "";

    // --- PHASE 1: EARLY GAME (Waves 1-5) ---
    // Single push, teaching mechanics.
    if (waveNumber <= 5) {
        const p1 = 500;
        if (waveNumber === 1) {
            groups.push(grp(EnemyType.BASIC, c(5), p1, 1000));
            intel = "Scout party detected. Single formation.";
        } else if (waveNumber === 2) {
            groups.push(grp(EnemyType.BASIC, c(8), p1, 800));
        } else if (waveNumber === 3) {
            // Intro Splitter
            groups.push(grp(EnemyType.BASIC, c(5), p1, 800));
            groups.push(grp(EnemyType.SPLITTER, c(2), p1 + 2000, 2000));
            intel = "Splitter units carry mini-drones. Area damage recommended.";
        } else if (waveNumber === 4) {
            // Intro Fast
            groups.push(grp(EnemyType.BASIC, c(8), p1, 800));
            groups.push(grp(EnemyType.FAST, c(3), p1 + 1000, 1000));
        } else { // Wave 5
            // Swarm test
            groups.push(grp(EnemyType.BASIC, c(15), p1, 400, 2)); // Burst size 2
            intel = "High density signature. Swarm incoming.";
        }
    } 
    // --- PHASE 2: MID GAME (Waves 6-15) ---
    // Two pushes: Initial contact + Reinforcement wave
    else if (waveNumber <= 15) {
        const p1 = 0;
        const p2 = 4000; // 4s gap
        
        if (waveNumber <= 10) {
            // Speed & Basics
            groups.push(grp(EnemyType.BASIC, c(10 + waveNumber), p1, 600)); 
            groups.push(grp(EnemyType.FAST, c(5 + (waveNumber-5)), p1 + 500, 300));
            
            // Push 2: Blitz
            groups.push(grp(EnemyType.FAST, c(4 + (waveNumber-5)), p2, 150, 1));
            
            if (waveNumber === 6) intel = "Multiple contacts. Fast movers leading the charge.";
        } else {
            // Heavy armor intro (11-15)
            // Push 1: Screening force
            groups.push(grp(EnemyType.BASIC, c(15), p1, 500));
            groups.push(grp(EnemyType.SPLITTER, c(3), p1 + 1000, 1500));
            
            // Push 2: Tank Escort
            const tanks = 1 + Math.floor((waveNumber - 10) / 2);
            groups.push(grp(EnemyType.TANK, c(tanks), p2, 3000)); // Tank
            groups.push(grp(EnemyType.FAST, c(tanks * 3), p2, 200, 3)); // Escort burst
            
            if (waveNumber === 11) intel = "Heavy armor detected. Escort configuration.";
        }
    }
    // --- PHASE 3: LATE GAME (Waves 16-25) ---
    // Three pushes: Constant pressure
    else if (waveNumber <= 25) {
        const p1 = 0;
        const p2 = 3000;
        const p3 = 7000;
        
        const difficulty = waveNumber - 15;
        
        // Push 1: Mixed Swarm
        groups.push(grp(EnemyType.BASIC, c(15 + difficulty), p1, 300, 2));
        groups.push(grp(EnemyType.FAST, c(8 + difficulty), p1 + 500, 200));
        
        // Push 2: Heavy Assault
        groups.push(grp(EnemyType.TANK, c(2 + Math.floor(difficulty/3)), p2, 2000));
        groups.push(grp(EnemyType.SPLITTER, c(4 + Math.floor(difficulty/2)), p2 + 500, 800));
        
        // Push 3: Final Blitz
        groups.push(grp(EnemyType.FAST, c(10 + difficulty), p3, 100, 2));
        groups.push(grp(EnemyType.BASIC, c(10), p3 + 1000, 200, 5)); // Clumps of 5
        
        if (waveNumber === 25) intel = "MAXIMUM THREAT. Multiple heavy columns inbound.";
    } 
    // --- ENDLESS / LOOP (Waves 26+) ---
    else {
        // Just throw everything
        const loop = waveNumber - 25;
        groups.push(grp(EnemyType.TANK, c(2 + loop), 0, 1000));
        groups.push(grp(EnemyType.FAST, c(20 + loop * 2), 1000, 100, 2));
        groups.push(grp(EnemyType.SPLITTER, c(10 + loop), 3000, 500));
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
  "Artillery recommended for dense clusters."
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
    damage: 1000, // Higher damage for snipers
    range: 4, 
    cooldown: 25000, 
    color: '#fb7185' // Lighter red
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
  },
  [ActiveAbilityType.NAPALM]: {
      damage: 100, // Per tick
      duration: 5000,
      range: 4,
      cooldown: 25000,
      color: '#f97316'
  },
  [ActiveAbilityType.BARRAGE]: {
      count: 3,
      interval: 200,
      cooldown: 15000,
      color: '#22d3ee'
  },
  [ActiveAbilityType.SINGULARITY]: {
      range: 6,
      duration: 3000,
      cooldown: 30000,
      value: 0.1, // Pull strength
      color: '#7c3aed'
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
      3: { damage: 4.0, range: 1.1, fireRate: 0.8, active: ActiveAbilityType.ERUPTION } // Defaults to Eruption
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
        'Active: Eruption / Orbital Strike / Napalm'
    ]
  },
  [TechPath.PLASMA]: { 
    name: 'Plasma Tech', 
    description: 'Overclocks servos for extreme fire rates.', 
    color: '#06b6d4',
    icon: 'Zap',
    abilities: [
        'Passive: Flux Network (Neighbors +25% Fire Rate)',
        'Active: Overclock / Barrage'
    ]
  },
  [TechPath.VOID]: { 
    name: 'Void Tech', 
    description: 'Advanced optics for superior range coverage.', 
    color: '#8b5cf6',
    icon: 'Eye',
    abilities: [
        'Passive: Gravity Field (Slows Enemies)',
        'Active: Time Stop / Singularity'
    ]
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
  }
};
