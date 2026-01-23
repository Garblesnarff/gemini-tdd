
import { Enemy, EnemyType, Effect, GameStats } from '../../types';
import { SimulationContext, GameEvent } from './types';
import { ENEMY_STATS } from '../../constants';

export function processEnemyDeaths(enemies: Enemy[], gold: number, stats: GameStats, ctx: SimulationContext) {
  const nextEnemies: Enemy[] = [];
  const newEffects: Effect[] = [];
  const events: GameEvent[] = [];
  let nextGold = gold;
  let bossDefeated = false;

  enemies.forEach(e => {
    if (e.health <= 0) {
      if (e.isBoss) {
        // Only trigger defeat if not already in death phase
        if (ctx.state.gamePhase !== 'BOSS_DEATH') {
            bossDefeated = true;
            events.push({ type: 'BOSS_DEFEATED', bossId: e.id });
        }
        nextEnemies.push(e); // Keep boss for death sequence phase
      } else {
        // Rewards with Meta Bonus
        const baseReward = ENEMY_STATS[e.type].goldReward;
        const reward = Math.floor(baseReward * ctx.directorGoldBonus * ctx.metaEffects.killGoldMultiplier);
        
        nextGold += reward;
        stats.enemiesKilled++;
        stats.totalGoldEarned += reward;

        // Splitting
        // Use type assertion to access optional splitsInto property which is only on specific enemy types
        const config = ENEMY_STATS[e.type] as any;
        if (config.splitsInto) {
          const split = config.splitsInto;
          for (let k = 0; k < split.count; k++) {
            const miniType = split.type;
            const miniStats = ENEMY_STATS[miniType];
            let miniHealth = miniStats.health;
            
            // Chain Reaction Augment
            const chainAug = ctx.activeAugments.find(a => a.id === 'chain_reaction');
            if (chainAug && chainAug.effect) miniHealth *= (1 - (chainAug.effect.value || 0.5));

            nextEnemies.push({
              id: `mini_${e.id}_${k}`,
              type: miniType,
              health: miniHealth,
              maxHealth: miniStats.health,
              speed: miniStats.speed,
              position: { 
                  x: e.position.x + (Math.random() - 0.5) * 0.5, 
                  y: e.position.y, 
                  z: e.position.z + (Math.random() - 0.5) * 0.5 
              },
              pathId: e.pathId,
              waypointIndex: e.waypointIndex,
              progress: e.progress
            });
          }
          newEffects.push({ id: Math.random().toString(), type: 'NOVA', position: e.position, color: '#14b8a6', scale: 2, lifetime: 30, maxLifetime: 30 });
        }

        newEffects.push({ id: Math.random().toString(), type: 'SPARK', position: e.position, color: ENEMY_STATS[e.type].color, scale: 1, lifetime: 20, maxLifetime: 20 });
        events.push({ type: 'ENEMY_KILLED', enemyId: e.id, enemyType: e.type, position: e.position, reward });
      }
    } else {
      nextEnemies.push(e);
    }
  });

  return { enemies: nextEnemies, gold: nextGold, stats, newEffects, events, bossDefeated };
}
