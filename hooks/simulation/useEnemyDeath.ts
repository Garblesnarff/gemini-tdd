
import { Enemy, EnemyType, Effect, GameStats, Tower } from '../../types';
import { SimulationContext, GameEvent } from './types';
import { ENEMY_STATS } from '../../constants';
import { getDistance2D } from './simulationUtils';

export function processEnemyDeaths(enemies: Enemy[], towers: Tower[], gold: number, stats: GameStats, ctx: SimulationContext) {
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
              progress: e.progress,
              debuffs: []
            });
          }
          newEffects.push({ id: Math.random().toString(), type: 'NOVA', position: e.position, color: '#14b8a6', scale: 2, lifetime: 30, maxLifetime: 30 });
        }

        // BOMBER LOGIC
        if (e.type === EnemyType.BOMBER) {
            const blastRadius = ENEMY_STATS[EnemyType.BOMBER].explosionRadius || 2.5;
            newEffects.push({ id: Math.random().toString(), type: 'BOMBER_EXPLOSION', position: e.position, color: '#f97316', scale: blastRadius, lifetime: 30, maxLifetime: 30 });
            
            // Disable Towers
            towers.forEach(t => {
                if (getDistance2D(e.position, t.position) <= blastRadius) {
                    t.disabledTimer = ENEMY_STATS[EnemyType.BOMBER].explosionDisableDuration || 4000;
                    newEffects.push({ id: Math.random().toString(), type: 'DISABLE_FIELD', position: t.position, color: '#ef4444', scale: 1, lifetime: 40, maxLifetime: 40 });
                }
            });

            // Damage other enemies
            const dmg = ENEMY_STATS[EnemyType.BOMBER].explosionDamageToEnemies || 30;
            // Iterate remaining enemies in this list AND nextEnemies so far? 
            // Better to apply in next frame or just apply to current list instance reference?
            // Since we are iterating `enemies`, modifying objects in `enemies` array is tricky if we don't process them later.
            // Let's modify `enemies` directly for simplicity as they are objects.
            enemies.forEach(other => {
                if (other.id !== e.id && other.health > 0 && getDistance2D(e.position, other.position) <= blastRadius) {
                    other.health -= dmg;
                }
            });
        } else {
            newEffects.push({ id: Math.random().toString(), type: 'SPARK', position: e.position, color: ENEMY_STATS[e.type].color, scale: 1, lifetime: 20, maxLifetime: 20 });
        }

        events.push({ type: 'ENEMY_KILLED', enemyId: e.id, enemyType: e.type, position: e.position, reward });
      }
    } else {
      nextEnemies.push(e);
    }
  });

  return { enemies: nextEnemies, gold: nextGold, stats, newEffects, events, bossDefeated };
}
