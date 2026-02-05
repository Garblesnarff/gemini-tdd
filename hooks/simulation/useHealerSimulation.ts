
import { Enemy, EnemyType, Effect } from '../../types';
import { SimulationContext } from './types';
import { getDistance2D } from './simulationUtils';

export function simulateHealers(enemies: Enemy[], ctx: SimulationContext) {
    const nextEnemies = [...enemies];
    const healers = nextEnemies.filter(e => e.type === EnemyType.HEALER && e.health > 0);
    const newEffects: Effect[] = [];

    healers.forEach(healer => {
        const range = healer.healRange || 3;
        const rate = healer.healRate || 15;
        const amount = rate * (ctx.tickDelta / 1000);

        nextEnemies.forEach(target => {
            if (target.id !== healer.id && !target.isBoss && target.health > 0 && target.health < target.maxHealth) {
                const dist = getDistance2D(healer.position, target.position);
                if (dist <= range) {
                    target.health = Math.min(target.maxHealth, target.health + amount);
                    
                    // Visual throttle to prevent spamming effects
                    if (Math.random() < 0.05 * ctx.gameSpeed) { 
                         newEffects.push({
                             id: Math.random().toString(),
                             type: 'HEAL_BEAM',
                             position: healer.position,
                             targetPosition: target.position,
                             color: '#22c55e',
                             scale: 0.5,
                             lifetime: 10,
                             maxLifetime: 10
                         });
                    }
                }
            }
        });
    });

    return { enemies: nextEnemies, newEffects };
}
