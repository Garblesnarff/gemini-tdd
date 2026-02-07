
import { Achievement, AchievementEvent, GameState, MetaProgress, StageId, TowerType, TechPath } from './types';
import { STAGE_CONFIGS, ABILITY_MATRIX } from './constants';

type CheckCondition = (state: GameState, meta: MetaProgress, event?: AchievementEvent) => boolean;

interface AchievementDef extends Achievement {
  checkCondition: CheckCondition;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- CAMPAIGN ---
  {
    id: 'camp_stage1',
    name: 'First Contact',
    description: 'Complete Stage 1',
    category: 'CAMPAIGN',
    reward: 10,
    checkCondition: (_, __, event) => event?.type === 'STAGE_COMPLETE' && event.stageId === StageId.STAGE_1
  },
  {
    id: 'camp_stage2',
    name: 'Into the Gauntlet',
    description: 'Complete Stage 2',
    category: 'CAMPAIGN',
    reward: 15,
    checkCondition: (_, __, event) => event?.type === 'STAGE_COMPLETE' && event.stageId === StageId.STAGE_2
  },
  {
    id: 'camp_stage3',
    name: 'Crossroads Survivor',
    description: 'Complete Stage 3',
    category: 'CAMPAIGN',
    reward: 20,
    checkCondition: (_, __, event) => event?.type === 'STAGE_COMPLETE' && event.stageId === StageId.STAGE_3
  },
  {
    id: 'camp_stage4',
    name: 'Spiral Conquered',
    description: 'Complete Stage 4',
    category: 'CAMPAIGN',
    reward: 25,
    checkCondition: (_, __, event) => event?.type === 'STAGE_COMPLETE' && event.stageId === StageId.STAGE_4
  },
  {
    id: 'camp_stage5',
    name: 'Void Closed',
    description: 'Complete Stage 5',
    category: 'CAMPAIGN',
    reward: 50,
    checkCondition: (_, __, event) => event?.type === 'STAGE_COMPLETE' && event.stageId === StageId.STAGE_5
  },
  {
    id: 'camp_first_boss',
    name: 'Giant Slayer',
    description: 'Defeat your first boss',
    category: 'CAMPAIGN',
    reward: 15,
    checkCondition: (_, __, event) => event?.type === 'BOSS_KILLED'
  },
  {
    id: 'camp_all_bosses',
    name: 'Nemesis',
    description: 'Defeat all 5 unique bosses',
    category: 'CAMPAIGN',
    reward: 75,
    checkCondition: (_, meta) => meta.achievementProgress.bossesDefeated.length >= 5
  },

  // --- MASTERY ---
  {
    id: 'mast_no_leak',
    name: 'Airtight Defense',
    description: 'Complete any stage without losing a life',
    category: 'MASTERY',
    reward: 30,
    checkCondition: (_, __, event) => event?.type === 'STAGE_COMPLETE' && event.stats.livesLostThisRun === 0
  },
  {
    id: 'mast_no_sell',
    name: 'Committed',
    description: 'Complete any stage without selling a tower',
    category: 'MASTERY',
    reward: 20,
    checkCondition: (_, __, event) => event?.type === 'STAGE_COMPLETE' && event.stats.towersSold === 0
  },
  {
    id: 'mast_min_towers',
    name: 'Minimalist',
    description: 'Complete any stage with 5 or fewer towers',
    category: 'MASTERY',
    reward: 35,
    checkCondition: (state, __, event) => event?.type === 'STAGE_COMPLETE' && state.towers.length <= 5
  },
  {
      id: 'mast_speed_clear',
      name: 'Blitz Commander',
      description: 'Complete Stage 1 in under 10 minutes',
      category: 'MASTERY',
      reward: 25,
      checkCondition: (_, __, event) => event?.type === 'STAGE_COMPLETE' && event.stageId === StageId.STAGE_1 && (event.stats.endTime - event.stats.startTime) < 600000
  },

  // --- ARSENAL ---
  {
    id: 'ars_first_upgrade',
    name: 'Prototype',
    description: 'Upgrade a tower to Level 2',
    category: 'ARSENAL',
    reward: 5,
    checkCondition: (_, __, event) => event?.type === 'TOWER_UPGRADED' && event.newLevel === 2
  },
  {
    id: 'ars_max_tower',
    name: 'Perfected',
    description: 'Upgrade a tower to Level 3',
    category: 'ARSENAL',
    reward: 10,
    checkCondition: (_, __, event) => event?.type === 'TOWER_UPGRADED' && event.newLevel === 3
  },
  {
    id: 'ars_all_types',
    name: 'Full Arsenal',
    description: 'Build at least one of each tower type in a single game',
    category: 'ARSENAL',
    reward: 15,
    checkCondition: (_, __, event) => {
        if (!event || event.type !== 'TOWER_PLACED') return false;
        return false; // Handled by complex logic below in checkAchievements
    }
  },
  {
    id: 'ars_tower_hoard',
    name: 'Urban Sprawl',
    description: 'Have 15 towers placed simultaneously',
    category: 'ARSENAL',
    reward: 15,
    checkCondition: (state) => state.towers.length >= 15
  },

  // --- EXTERMINATION ---
  {
    id: 'ext_kills_100',
    name: 'Centurion',
    description: 'Kill 100 enemies',
    category: 'EXTERMINATION',
    reward: 10,
    checkCondition: (_, meta) => meta.stats.totalEnemiesKilled >= 100
  },
  {
    id: 'ext_kills_1000',
    name: 'Veteran',
    description: 'Kill 1,000 enemies',
    category: 'EXTERMINATION',
    reward: 25,
    checkCondition: (_, meta) => meta.stats.totalEnemiesKilled >= 1000
  },
  {
      id: 'ext_burn_kill',
      name: 'Immolation',
      description: 'Kill 50 enemies with burn damage',
      category: 'EXTERMINATION',
      reward: 20,
      checkCondition: (_, meta) => meta.achievementProgress.totalBurnKills >= 50
  },

  // --- ECONOMIC ---
  {
    id: 'econ_hoard_1000',
    name: 'Dragon\'s Hoard',
    description: 'Have 1000+ gold at once',
    category: 'ECONOMIC',
    reward: 20,
    checkCondition: (state) => state.gold >= 1000
  },
  {
    id: 'econ_supply_grab',
    name: 'Opportunist',
    description: 'Collect a Supply Drop',
    category: 'ECONOMIC',
    reward: 10,
    checkCondition: (_, __, event) => event?.type === 'SUPPLY_COLLECTED'
  },
  
  // --- SECRET ---
  {
      id: 'sec_afk',
      name: '???',
      description: 'Patience is a virtue',
      hiddenDescription: 'Pause the game for 5+ minutes',
      category: 'SECRET',
      isSecret: true,
      reward: 5,
      checkCondition: (state) => state.stats.pauseDuration >= 300000
  }
];

export function checkAchievements(
    events: AchievementEvent[], 
    currentState: GameState, 
    currentMeta: MetaProgress
): { unlocked: Achievement[], updatedMeta: MetaProgress } {
    
    const nextMeta = { 
        ...currentMeta, 
        stats: { ...currentMeta.stats }, 
        achievementProgress: { ...currentMeta.achievementProgress } 
    };
    const unlocked: Achievement[] = [];

    // Pre-process events to update cumulative meta stats
    events.forEach(e => {
        if (e.type === 'ENEMY_KILLED') {
            nextMeta.stats.totalEnemiesKilled++;
            if (e.source === 'BURN') nextMeta.achievementProgress.totalBurnKills++;
        }
        if (e.type === 'BOSS_KILLED') {
            nextMeta.stats.totalBossesDefeated++;
            // Unique boss tracking for 'camp_all_bosses'
            if (!nextMeta.achievementProgress.bossesDefeated.includes(e.bossType)) {
                nextMeta.achievementProgress.bossesDefeated.push(e.bossType);
            }
        }
        if (e.type === 'SUPPLY_COLLECTED') {
            nextMeta.achievementProgress.totalSuppliesCollected++;
        }
        if (e.type === 'ABILITY_USED') {
            if (!nextMeta.achievementProgress.abilitiesEverUsed.includes(e.abilityType)) {
                nextMeta.achievementProgress.abilitiesEverUsed.push(e.abilityType);
            }
        }
    });

    // Check all locked achievements
    ACHIEVEMENTS.forEach(ach => {
        if (nextMeta.achievements[ach.id]) return; // Already unlocked

        let conditionMet = false;
        
        // Check against state (generic)
        if (ach.checkCondition(currentState, nextMeta)) {
            conditionMet = true;
        }

        // Check against specific events
        if (!conditionMet) {
            for (const event of events) {
                if (ach.checkCondition(currentState, nextMeta, event)) {
                    conditionMet = true;
                    break;
                }
            }
        }
        
        // Special logic for "Full Arsenal" since checking state inside definition is tricky with array logic
        if (ach.id === 'ars_all_types') {
             const uniqueBuilt = Object.keys(currentState.stats.towersBuiltByType).length;
             if (uniqueBuilt >= 4) conditionMet = true;
        }

        if (conditionMet) {
            nextMeta.achievements[ach.id] = true;
            nextMeta.dataCores += ach.reward;
            nextMeta.totalCoresEarned += ach.reward;
            unlocked.push(ach);
        }
    });

    return { unlocked, updatedMeta: nextMeta };
}
