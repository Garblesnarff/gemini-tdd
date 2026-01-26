
import { MetaUpgrade, TechPath, MetaProgress, AppliedMetaEffects } from './types';
import { StageId } from './types';

export const META_UPGRADES: MetaUpgrade[] = [
    // --- ECONOMIC ---
    {
        id: 'econ_starting_gold',
        name: 'Reserve Funds',
        description: 'Start operations with bonus gold.',
        category: 'ECONOMIC',
        costs: [25, 50, 100],
        maxLevel: 3,
        effects: [{ type: 'STARTING_GOLD', value: 50 }] // +50 per level
    },
    {
        id: 'econ_interest',
        name: 'Investment Protocol',
        description: 'Generate interest on unspent gold after each wave.',
        category: 'ECONOMIC',
        costs: [75, 150],
        maxLevel: 2,
        effects: [{ type: 'INTEREST_RATE', value: 0.03 }] // 3% per level
    },
    {
        id: 'econ_kill_bonus',
        name: 'Salvage Efficiency',
        description: 'Earn bonus gold from neutralizing hostiles.',
        category: 'ECONOMIC',
        costs: [40, 80, 120],
        maxLevel: 3,
        effects: [{ type: 'KILL_GOLD_MULT', value: 0.05 }] // +5% per level
    },
    {
        id: 'econ_sell_ratio',
        name: 'Liquidation Override',
        description: 'Improve tower sell value retention.',
        category: 'ECONOMIC',
        costs: [100],
        maxLevel: 1,
        effects: [{ type: 'SELL_RATIO', value: 0.1 }] // 70% -> 80%
    },
    
    // --- DEFENSIVE ---
    {
        id: 'def_extra_lives',
        name: 'Reinforced Core',
        description: 'Increase core integrity (lives).',
        category: 'DEFENSIVE',
        costs: [50, 100, 200],
        maxLevel: 3,
        effects: [{ type: 'STARTING_LIVES', value: 2 }] // +2 lives per level
    },
    {
        id: 'def_life_regen',
        name: 'Emergency Repairs',
        description: 'Regenerate 1 life every 5 waves.',
        category: 'DEFENSIVE',
        costs: [150],
        maxLevel: 1,
        effects: [{ type: 'LIFE_REGEN_WAVES', value: 5 }]
    },
    {
        id: 'def_boss_resist',
        name: 'Anti-Colossus Plating',
        description: 'Reduce damage taken from Boss abilities/leaks.',
        category: 'DEFENSIVE',
        costs: [125],
        maxLevel: 1,
        effects: [{ type: 'BOSS_RESIST', value: 0.25 }]
    },

    // --- OFFENSIVE ---
    {
        id: 'off_global_damage',
        name: 'Munitions Research',
        description: 'Increase damage of all towers.',
        category: 'OFFENSIVE',
        costs: [60, 120, 180],
        maxLevel: 3,
        effects: [{ type: 'GLOBAL_DAMAGE', value: 0.03 }] // +3% per level
    },
    {
        id: 'off_global_range',
        name: 'Sensor Array',
        description: 'Increase range of all towers.',
        category: 'OFFENSIVE',
        costs: [60, 120, 180],
        maxLevel: 3,
        effects: [{ type: 'GLOBAL_RANGE', value: 0.03 }] // +3% per level
    },
    {
        id: 'off_crit_chance',
        name: 'Precision Targeting',
        description: 'Chance to deal double damage on hit.',
        category: 'OFFENSIVE',
        costs: [100, 200],
        maxLevel: 2,
        effects: [{ type: 'CRIT_CHANCE', value: 0.05 }] // +5% per level
    },
    {
        id: 'off_tower_discount',
        name: 'Bulk Procurement',
        description: 'Reduce tower build costs.',
        category: 'OFFENSIVE',
        costs: [75, 150],
        maxLevel: 2,
        effects: [{ type: 'TOWER_COST_MULT', value: -0.05 }] // -5% per level
    },

    // --- TECH SPECIALIZATIONS ---
    {
        id: 'tech_magma_mastery',
        name: 'Magma Mastery',
        description: 'Magma path active abilities deal +20% damage.',
        category: 'TECH',
        costs: [200],
        maxLevel: 1,
        unlockCondition: { type: 'STAGE_CLEAR', stageId: StageId.STAGE_3 },
        effects: [{ type: 'ABILITY_DAMAGE', value: 0.2, techPath: TechPath.MAGMA }]
    },
    {
        id: 'tech_plasma_mastery',
        name: 'Plasma Mastery',
        description: 'Plasma path active abilities have -15% cooldown.',
        category: 'TECH',
        costs: [200],
        maxLevel: 1,
        unlockCondition: { type: 'STAGE_CLEAR', stageId: StageId.STAGE_3 },
        effects: [{ type: 'ABILITY_COOLDOWN', value: -0.15, techPath: TechPath.PLASMA }]
    },
    {
        id: 'tech_void_mastery',
        name: 'Void Mastery',
        description: 'Void path active abilities last 25% longer.',
        category: 'TECH',
        costs: [200],
        maxLevel: 1,
        unlockCondition: { type: 'STAGE_CLEAR', stageId: StageId.STAGE_3 },
        effects: [{ type: 'ABILITY_DURATION', value: 0.25, techPath: TechPath.VOID }]
    },
    
    // --- UNLOCKABLES ---
    {
        id: 'unlock_artillery_start',
        name: 'Artillery Requisition',
        description: 'Start missions with Artillery unlocked (Wave 1).',
        category: 'UNLOCKABLE',
        costs: [150],
        maxLevel: 1,
        unlockCondition: { type: 'STAGE_CLEAR', stageId: StageId.STAGE_2 },
        effects: [] // Functional effect handled in logic
    },
];

export const getAppliedMetaEffects = (progress: MetaProgress): AppliedMetaEffects => {
    const effects: AppliedMetaEffects = {
        bonusStartingGold: 0,
        bonusStartingLives: 0,
        killGoldMultiplier: 1.0,
        sellRatio: 0.7, // Base
        globalDamageMultiplier: 1.0,
        globalRangeMultiplier: 1.0,
        towerCostMultiplier: 1.0,
        critChance: 0,
        interestRate: 0,
        lifeRegenWaves: null,
        bossResist: 0,
        abilityDamageMultiplier: { [TechPath.MAGMA]: 1, [TechPath.PLASMA]: 1, [TechPath.VOID]: 1, [TechPath.NONE]: 1 },
        abilityCooldownMultiplier: { [TechPath.MAGMA]: 1, [TechPath.PLASMA]: 1, [TechPath.VOID]: 1, [TechPath.NONE]: 1 },
        abilityDurationMultiplier: { [TechPath.MAGMA]: 1, [TechPath.PLASMA]: 1, [TechPath.VOID]: 1, [TechPath.NONE]: 1 },
    };

    META_UPGRADES.forEach(upgrade => {
        const level = progress.upgradeLevels[upgrade.id] || 0;
        if (level === 0) return;

        // Apply effects level times (assuming linear scaling for now)
        upgrade.effects.forEach(e => {
            if (!e) return;
            const totalValue = (e.value || 0) * level;

            switch (e.type) {
                case 'STARTING_GOLD': effects.bonusStartingGold += totalValue; break;
                case 'STARTING_LIVES': effects.bonusStartingLives += totalValue; break;
                case 'KILL_GOLD_MULT': effects.killGoldMultiplier += totalValue; break;
                case 'SELL_RATIO': effects.sellRatio += totalValue; break;
                case 'GLOBAL_DAMAGE': effects.globalDamageMultiplier += totalValue; break;
                case 'GLOBAL_RANGE': effects.globalRangeMultiplier += totalValue; break;
                case 'TOWER_COST_MULT': effects.towerCostMultiplier += totalValue; break;
                case 'CRIT_CHANCE': effects.critChance += totalValue; break;
                case 'INTEREST_RATE': effects.interestRate += totalValue; break;
                case 'BOSS_RESIST': effects.bossResist += totalValue; break;
                case 'LIFE_REGEN_WAVES': 
                     // Non-linear: just set the value if level > 0
                     effects.lifeRegenWaves = e.value; 
                     break;
                case 'ABILITY_DAMAGE':
                    if (e.techPath) effects.abilityDamageMultiplier[e.techPath] += totalValue;
                    break;
                case 'ABILITY_COOLDOWN':
                    if (e.techPath) effects.abilityCooldownMultiplier[e.techPath] += totalValue;
                    break;
                case 'ABILITY_DURATION':
                    if (e.techPath) effects.abilityDurationMultiplier[e.techPath] += totalValue;
                    break;
            }
        });
    });

    return effects;
}
