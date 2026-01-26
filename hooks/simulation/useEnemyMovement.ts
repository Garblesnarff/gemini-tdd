
import { Enemy, Tower, PassiveType } from '../../types';
import { SimulationContext } from './types';
import { getDistance2D } from './simulationUtils';
import { PASSIVE_CONFIG } from '../../constants';

export function simulateEnemyMovement(enemies: Enemy[], towers: Tower[], ctx: SimulationContext) {
  // Freeze all movement during boss death
  if (ctx.state.gamePhase === 'BOSS_DEATH') {
      return { enemies, livesLost: 0 };
  }

  let livesLost = 0;
  const nextEnemies: Enemy[] = [];

  for (let i = 0; i < enemies.length; i++) {
    const enemy = { ...enemies[i] };
    const path = ctx.paths[enemy.pathId];

    // Process Debuffs
    if (enemy.debuffs && enemy.debuffs.length > 0) {
        enemy.debuffs = enemy.debuffs.filter(db => {
            db.duration -= ctx.tickDelta;
            if (db.type === 'BURN') {
                const tickDamage = (db.value || 0) * (ctx.tickDelta / 1000);
                enemy.health -= tickDamage;
            }
            return db.duration > 0;
        });
    }

    // Reset frozen state
    if (enemy.freezeTimer && enemy.freezeTimer > 0) {
      enemy.freezeTimer -= ctx.tickDelta;
      enemy.frozen = 0; // Frozen solid
    } else {
      enemy.frozen = 1; // Normal speed
    }

    // Apply Slow Auras & Entropy Field from nearby towers
    towers.forEach(t => {
      if (t.passiveType === PassiveType.SLOW_AURA && !(t.disabledTimer && t.disabledTimer > 0)) {
        const config = PASSIVE_CONFIG[PassiveType.SLOW_AURA];
        const dist = getDistance2D(enemy.position, t.position);
        
        if (config && dist <= (config.range || 3.5)) {
          // Check for Entropy Field Buff
          const entropyBuff = t.activeBuffs?.find(b => b.type === 'ENTROPY_FIELD');
          if (entropyBuff) {
              enemy.frozen = 0; // Rooted
          } else {
              enemy.frozen = Math.min(enemy.frozen ?? 1, config.slowFactor || 0.7);
          }
        }
      }
    });

    // Movement
    if (enemy.health > 0) {
        const speed = enemy.speed * (enemy.frozen ?? 1) * (0.05 * ctx.gameSpeed);
        const targetNode = path[enemy.waypointIndex + 1];

        if (targetNode) {
          const dx = targetNode.x - enemy.position.x;
          const dz = targetNode.z - enemy.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist < speed) {
            enemy.waypointIndex++;
            enemy.position = { ...targetNode };
            enemy.progress = 0;
            nextEnemies.push(enemy);
          } else {
            const angle = Math.atan2(dx, dz);
            enemy.position.x += Math.sin(angle) * speed;
            enemy.position.z += Math.cos(angle) * speed;
            enemy.progress += speed;
            nextEnemies.push(enemy);
          }
        } else {
          livesLost += enemy.isBoss ? 20 : 1; 
        }
    } else {
        // Died from DOT
        nextEnemies.push(enemy); // Let death handler process it
    }
  }

  return { enemies: nextEnemies, livesLost };
}
