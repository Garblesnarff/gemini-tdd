
import { Enemy, EnemyType, Effect } from '../../types';
import { SimulationContext } from './types';
import { getDistance2D } from './simulationUtils';
import { ENEMY_STATS } from '../../constants';

export function simulateHealers(enemies: Enemy[], ctx: SimulationContext): { enemies: Enemy[], newEffects: Effect[] } {
    const newEffects: Effect[] = [];

    enemies.forEach(healer => {
        if (healer.type !== EnemyType.HEALER || healer.health <= 0) return;

        healer.healCooldown = (healer.healCooldown || 0) - ctx.tickDelta;

        if (healer.healCooldown <= 0) {
            healer.healCooldown = (ENEMY_STATS[EnemyType.HEALER] as any).healInterval || 2000;

            // Heal nearby non-boss, non-self enemies
            let healedAny = false;
            enemies.forEach(target => {
                if (target.id === healer.id || target.isBoss || target.health <= 0) return;
                if (target.health >= target.maxHealth) return;

                const dist = getDistance2D(healer.position, target.position);
                const healRadius = (ENEMY_STATS[EnemyType.HEALER] as any).healRadius || 3.0;

                if (dist <= healRadius) {
                    const healAmt = (ENEMY_STATS[EnemyType.HEALER] as any).healAmount || 15;
                    target.health = Math.min(target.maxHealth, target.health + healAmt);
                    healedAny = true;

                    // Green + effect on healed target
                    if (Math.random() < 0.3) {
                        newEffects.push({
                            id: Math.random().toString(),
                            type: 'HEAL',
                            position: { ...target.position, y: 1.5 },
                            color: '#4ade80',
                            scale: 0.5,
                            lifetime: 15,
                            maxLifetime: 15
                        });
                    }
                }
            });

            if (healedAny) {
                // Green ring effect on healer
                newEffects.push({
                    id: Math.random().toString(),
                    type: 'HEAL_PULSE',
                    position: healer.position,
                    color: '#4ade80',
                    scale: (ENEMY_STATS[EnemyType.HEALER] as any).healRadius || 3.0,
                    lifetime: 20,
                    maxLifetime: 20
                });
            }
        }
    });

    return { enemies, newEffects };
}
