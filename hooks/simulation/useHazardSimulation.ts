
import { Hazard, Enemy } from '../../types';
import { SimulationContext } from './types';
import { getDistance2D } from './simulationUtils';

export function simulateHazards(hazards: Hazard[], enemies: Enemy[], ctx: SimulationContext) {
  const nextHazards = hazards.filter(h => {
    h.duration -= ctx.tickDelta;
    return h.duration > 0;
  });

  const nextEnemies = enemies.map(enemy => {
    const nextEnemy = { ...enemy };
    
    nextHazards.forEach(h => {
      const dx = h.position.x - enemy.position.x;
      const dz = h.position.z - enemy.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= h.radius) {
        if (h.type === 'NAPALM') {
          nextEnemy.health -= ((h.value || 0) * ctx.tickDelta / 1000);
        } else if (h.type === 'SINGULARITY') {
          const pullFactor = (h.value || 0.1) * ctx.tickDelta;
          nextEnemy.position.x += dx * pullFactor;
          nextEnemy.position.z += dz * pullFactor;
          nextEnemy.frozen = 0.5; // Shared "slowed" state
        }
      }
    });

    return nextEnemy;
  });

  return { hazards: nextHazards, enemies: nextEnemies };
}
