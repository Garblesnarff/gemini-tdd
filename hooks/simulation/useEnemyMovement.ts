
import { Enemy, Tower, PassiveType } from '../../types';
import { SimulationContext } from './types';
import { getDistance2D } from './simulationUtils';
import { ABILITY_CONFIG } from '../../constants';

export function simulateEnemyMovement(enemies: Enemy[], towers: Tower[], ctx: SimulationContext) {
  let livesLost = 0;
  const nextEnemies: Enemy[] = [];

  for (let i = 0; i < enemies.length; i++) {
    const enemy = { ...enemies[i] };
    const path = ctx.paths[enemy.pathId];

    // Reset frozen state
    if (enemy.freezeTimer && enemy.freezeTimer > 0) {
      enemy.freezeTimer -= ctx.tickDelta;
      enemy.frozen = 0; // Frozen solid
    } else {
      enemy.frozen = 1; // Normal speed
    }

    // Apply Slow Auras from nearby towers
    towers.forEach(t => {
      if (t.passiveType === PassiveType.SLOW_AURA && !(t.disabledTimer && t.disabledTimer > 0)) {
        const config = ABILITY_CONFIG[PassiveType.SLOW_AURA];
        if (config && getDistance2D(enemy.position, t.position) <= (config.range || 3.5)) {
          enemy.frozen = Math.min(enemy.frozen ?? 1, config.slowFactor || 0.7);
        }
      }
    });

    // Movement
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
      livesLost += enemy.isBoss ? 20 : 1; // Boss leaks are fatal or near-fatal
    }
  }

  return { enemies: nextEnemies, livesLost };
}
