
import { TowerType, EnemyType, TechPath, PassiveType, ActiveAbilityType, Augment, AugmentType, StageId, StageConfig, BossConfig, BossAbilityType, Vector3Tuple, WaveDefinition, WaveGroup, StageProgress } from './types';

export const GRID_SIZE = 12;

// DEPRECATED - Use STAGE_CONFIGS[currentStage].path instead
export const PATH_WAYPOINTS = [
  { x: -5, y: 0.2, z: -5 },
  { x: 5, y: 0.2, z: -5 },
  { x: 5, y: 0.2, z: 0 },
  { x: -5, y: 0.2, z: 0 },
  { x: -5, y: 0.2, z: 5 },
  { x: 5, y: 0.2, z: 5 },
];

const STAGE_1_PATH: Vector3Tuple[] = [
  { x: -6, y: 0.2, z: -6 },
  { x: -6, y: 0.2, z: -2 },
  { x: 0, y: 0.2, z: -2 },
  { x: 0, y: 0.2, z: 2 },
  { x: 6, y: 0.2, z: 2 },
  { x: 6, y: 0.2, z: 6 }
];

const STAGE_1_BOSS: BossConfig = {
  id: 'sentinel_prime',
  name: 'SENTINEL PRIME',
  title: 'Guardian of the Forward Base',
  baseHealth: 5000,
  speed: 0.5,
  size: 2.5,
  color: '#f97316', // Orange
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

export const STAGE_CONFIGS: Record<StageId, StageConfig> = {
  [StageId.STAGE_1]: {
    id: StageId.STAGE_1,
    name: "Forward Base",
    description: "The outer perimeter of the Gemini sector. Enemy resistance is expected to be linear but persistent.",
    waves: 26, // 25 Normal + 1 Boss
    path: STAGE_1_PATH,
    startingGold: 400,
    startingLives: 20,
    enemyScaling: 1.0,
    bossConfig: STAGE_1_BOSS,
    environment: {
      skyPreset: "night",
      gridColor: "#0f172a",
      pathColor: "#334155",
      ambientIntensity: 0.5
    }
  },
  [StageId.STAGE_2]: { id: StageId.STAGE_2, name: "Locked", description: "Complete Stage 1 to unlock.", waves: 0, path: [], startingGold: 0, startingLives: 0, enemyScaling: 0, bossConfig: STAGE_1_BOSS, environment: { skyPreset: "sunset", gridColor: "#000", pathColor: "#fff", ambientIntensity: 1 }},
  [StageId.STAGE_3]: { id: StageId.STAGE_3, name: "Locked", description: "Complete Stage 2 to unlock.", waves: 0, path: [], startingGold: 0, startingLives: 0, enemyScaling: 0, bossConfig: STAGE_1_BOSS, environment: { skyPreset: "sunset", gridColor: "#000", pathColor: "#fff", ambientIntensity: 1 }},
  [StageId.STAGE_4]: { id: StageId.STAGE_4, name: "Locked", description: "Complete Stage 3 to unlock.", waves: 0, path: [], startingGold: 0, startingLives: 0, enemyScaling: 0, bossConfig: STAGE_1_BOSS, environment: { skyPreset: "sunset", gridColor: "#000", pathColor: "#fff", ambientIntensity: 1 }},
  [StageId.STAGE_5]: { id: StageId.STAGE_5, name: "Locked", description: "Complete Stage 4 to unlock.", waves: 0, path: [], startingGold: 0, startingLives: 0, enemyScaling: 0, bossConfig: STAGE_1_BOSS, environment: { skyPreset: "sunset", gridColor: "#000", pathColor: "#fff", ambientIntensity: 1 }},
};

export const INITIAL_STAGE_PROGRESS: Record<StageId, StageProgress> = {
  [StageId.STAGE_1]: { unlocked: true, completed: false, bestWave: 0, stars: 0 },
  [StageId.STAGE_2]: { unlocked: false, completed: false, bestWave: 0, stars: 0 },
  [StageId.STAGE_3]: { unlocked: false, completed: false, bestWave: 0, stars: 0 },
  [StageId.STAGE_4]: { unlocked: false, completed: false, bestWave: 0, stars: 0 },
  [StageId.STAGE_5]: { unlocked: false, completed: false, bestWave: 0, stars: 0 },
};

export const MAX_LEVEL = 3;
export const SELL_REFUND_RATIO = 0.7; 

// --- WAVE DEFINITIONS ---

export const getWaveDefinition = (stageId: StageId, waveNumber: number): WaveDefinition => {
    // Stage 1 Specific Definitions
    if (stageId === StageId.STAGE_1) {
        const groups: WaveGroup[] = [];
        let intel = "";

        // Waves 1-5: Introduction (Basic)
        if (waveNumber <= 5) {
            const count = waveNumber === 1 ? 5 : waveNumber === 2 ? 7 : waveNumber === 3 ? 8 : waveNumber === 4 ? 10 : 12;
            groups.push({ type: EnemyType.BASIC, count, interval: 1000 - (waveNumber * 50) });
            if (waveNumber === 1) intel = "Small scout group detected. Test your defenses.";
            else if (waveNumber === 5) intel = "Large group of basic units. Augment protocol available after this wave.";
        }
        // Waves 6-10: Fast Enemies Introduced
        else if (waveNumber <= 10) {
            const basicCount = 8 + (waveNumber - 6); // 8, 9, 10, 11, 12... 
            const fastCount = waveNumber === 6 ? 3 : waveNumber === 7 ? 4 : waveNumber === 8 ? 6 : waveNumber === 9 ? 5 : 8;
            groups.push({ type: EnemyType.BASIC, count: basicCount, interval: 900 });
            groups.push({ type: EnemyType.FAST, count: fastCount, interval: 600, wait: 2000 });
            
            if (waveNumber === 6) intel = "Fast movers incoming. High fire rate recommended.";
            else if (waveNumber === 10) intel = "Mixed unit tactics detected. Hold the line for reinforcements.";
        }
        // Waves 11-15: Tanks Introduced
        else if (waveNumber <= 15) {
            const basicCount = waveNumber === 14 ? 15 : 10 + (waveNumber % 2) * 2; 
            const fastCount = waveNumber === 13 ? 10 : 5 + (waveNumber - 10);
            const tankCount = waveNumber === 11 ? 1 : waveNumber === 12 ? 2 : waveNumber === 13 ? 2 : waveNumber === 14 ? 3 : 3;
            
            groups.push({ type: EnemyType.BASIC, count: basicCount, interval: 800 });
            groups.push({ type: EnemyType.FAST, count: fastCount, interval: 500, wait: 2000 });
            groups.push({ type: EnemyType.TANK, count: tankCount, interval: 3000, wait: 5000 });
            
            if (waveNumber === 11) intel = "Heavy armor signature confirmed. Tank unit approaching.";
            else if (waveNumber === 15) intel = "Multiple heavy units detected. Prepare for sustained fire.";
        }
        // Waves 16-20: Escalation
        else if (waveNumber <= 20) {
            groups.push({ type: EnemyType.BASIC, count: 15 + (waveNumber - 15) * 2, interval: 700 });
            groups.push({ type: EnemyType.FAST, count: 5 + (waveNumber - 15), interval: 400, wait: 2000 });
            groups.push({ type: EnemyType.TANK, count: 2 + Math.floor((waveNumber - 15)/2), interval: 2500, wait: 4000 });
            
            if (waveNumber === 20) {
                // Mini-boss wave
                groups.push({ type: EnemyType.TANK, count: 5, interval: 1500, wait: 10000 });
                intel = "Armored column detected. High damage output required.";
            } else {
                 intel = "Enemy intensity increasing. Check your upgrade paths.";
            }
        }
        // Waves 21-25: Gauntlet
        else if (waveNumber <= 25) {
            const scale = waveNumber - 20; // 1 to 5
            groups.push({ type: EnemyType.BASIC, count: 20 + scale * 5, interval: 500 });
            groups.push({ type: EnemyType.FAST, count: 10 + scale * 2, interval: 300, wait: 3000 });
            groups.push({ type: EnemyType.TANK, count: scale * 2, interval: 2000, wait: 5000 });
            
            if (waveNumber === 25) intel = "MASSIVE WAVE DETECTED. Prepare for the Guardian.";
            else intel = "They are throwing everything at us. Hold fast!";
        }
        else {
             // Fallback
             groups.push({ type: EnemyType.BASIC, count: 5, interval: 1000 });
        }
        
        // If no specific intel, pick random
        if (!intel) {
            intel = TACTICAL_INTEL_POOL[Math.floor(Math.random() * TACTICAL_INTEL_POOL.length)];
        }

        return { composition: groups, intel };
    }
    
    // Fallback for other stages (random gen for now)
    const baseCount = 5 + waveNumber * 2;
    return {
        composition: [{ type: EnemyType.BASIC, count: baseCount, interval: 800 }],
        intel: "Standard resistance expected."
    };
};

export const TACTICAL_INTEL_POOL = [
  "Massive heat signatures detected in the sub-sector. Prepare for heavy resistance.",
  "Enemy cloaking tech detected. Scanners are struggling to lock on target.",
  "Scout reports indicate high-speed units approaching from the North-East gate.",
  "Atmospheric interference is high. Tower target acquisition might be sluggish.",
  "Energy readings spiking. A high-priority target is leading this assault.",
  "Sub-space ripples detected. Expect unconventional movement patterns.",
  "Armor plating on incoming units is reinforced. Focus on high-damage output.",
  "Intercepted comms suggest a multi-pronged attack. Watch the mid-path.",
  "Power grid fluctuating. Keep a reserve of gold for emergency deployments.",
  "Biological signatures mixed with cybernetics. The swarm is evolving.",
  "Void readings are off the charts. Void Tech towers will perform well here.",
  "Magma Tech is recommended for this wave's heavy armor configuration.",
  "Plasma Tech overclocking is advised to handle the upcoming swarm density.",
  "Enemy formations are tightly packed. Splash damage will be highly effective.",
  "Long-range scanners show a breach in the outer perimeter. They're coming.",
  "Strategic tip: Neighboring towers benefit most from Magma and Plasma auras.",
  "Warning: Incoming 'Fast' class units. Ensure fire rate is optimized.",
  "Intelligence reports a 'Tank' unit leading the column. Prepare for a slog.",
  "Gravity fields are weakening. Void Tech fields may be necessary to compensate.",
  "Sensors picking up residual radiation. Shielding systems are at 80%.",
  "The enemy is using recursive logic. Expect sudden speed bursts.",
  "Target the leader. Breaking their formation will slow the remaining units.",
  "Don't forget to sell underperforming towers. 70% refund is guaranteed.",
  "System patch event approaching. Strategize for long-term enhancements.",
  "Aura stacking is the key to holding this sector. Place towers in clusters.",
  "Incoming transmission: 'The core must not fall. Hold the line at all costs.'",
  "Seismic activity detected. Ground-based enemies are moving in force.",
  "Optical sensors are blinded by solar flare. Rely on automated tracking.",
  "Enemy shields are tuned to high frequencies. Plasma rounds might struggle.",
  "A heavy boss unit is being assembled at the jump-point. Prepare.",
  "Low-orbit satellite shows a massive influx of 'Basic' class drones.",
  "Tactical oversight: Sniper towers are wasted on fast, low-health units.",
  "Deploy Fast towers at the chokepoints to maximize their fire rate.",
  "The Magma Eruption protocol is ready. Use it when the path is crowded.",
  "Time Stop protocol detected in Void Tech. Save it for the fastest units.",
  "Overclock protocol will drain local heat sinks. Use it during peak waves.",
  "Scanners indicate a weakness in enemy rear-guard plating.",
  "Maintain defensive depth. Don't put all your firepower at the start.",
  "Economic update: Interest rates are high. Save gold if you can afford to.",
  "The enemy has mapped our static defenses. Consider repositioning.",
  "Biological swarms are weak to rapid-fire plasma bursts.",
  "Heavy machinery detected. Kinetic impact (Magma) is the most efficient counter.",
  "Void resonance is high. Sniper towers gain additional focus here.",
  "Intercepted: 'Protocol X is in effect. Move all units to the target zone.'",
  "Sensors are failing. We're going in blind, Commander. Good luck.",
  "The swarm is learning. They've adjusted their pathing slightly.",
  "Energy spikes detected in the perimeter towers. Augments are active.",
  "Intelligence suggests a 'Boss' unit will appear in wave 5 and multiples of 5.",
  "The final line of defense is holding, but only just. Reinforce the back.",
  "Tactical Tip: Prioritize 'Strongest' targets with your heavy hitters."
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