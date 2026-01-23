
import { Projectile, Enemy, Effect, DamageNumber, TowerType } from '../../types';
import { SimulationContext, GameEvent } from './types';
import { getDistance2D } from './simulationUtils';

export function simulateProjectiles(projectiles: Projectile[], enemies: Enemy[], ctx: SimulationContext) {
  const nextProjectiles: Projectile[] = [];
  const newEffects: Effect[] = [];
  const newDamageNumbers: DamageNumber[] = [];
  const events: GameEvent[] = [];

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const target = enemies.find(e => e.id === p.targetId);

    if (!target) {
      if (p.sourceType === TowerType.ARTILLERY) {
        // Explode at last position anyway
        processArtilleryHit(p.position, p, enemies, newEffects, newDamageNumbers);
      }
      continue;
    }

    const dx = target.position.x - p.position.x;
    const dz = target.position.z - p.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const speed = p.speed * 1.5;

    if (dist < speed) {
      // Impact
      if (p.sourceType === TowerType.ARTILLERY) {
        processArtilleryHit(target.position, p, enemies, newEffects, newDamageNumbers);
      } else {
        let damage = p.damage;
        let color = '#ef4444';
        let isBlocked = false;

        if (target.isBoss) {
            if (target.isShielded) {
                damage = 0;
                isBlocked = true;
            } else {
                const phase = target.bossConfig?.phases[target.currentPhase || 0];
                if (phase) damage *= (1 - (phase.damageResistance || 0));
            }
        }

        if (isBlocked) {
            newEffects.push({ id: Math.random().toString(), type: 'BLOCKED', position: { ...target.position }, color: '#3b82f6', scale: 1, lifetime: 20, maxLifetime: 20, text: 'BLOCKED' });
        } else {
            target.health -= damage;
            newDamageNumbers.push({ id: Math.random().toString(), position: { ...target.position }, value: damage, color: '#ef4444', lifetime: 30, maxLifetime: 30, isCritical: true });
            
            // Sniper Splash Augment
            const splashAug = ctx.activeAugments.find(a => a.id === 'splash_sniper_1');
            if (splashAug && splashAug.effect && p.sourceType === TowerType.SNIPER) {
                const splashDmg = damage * (splashAug.effect.value || 0.5);
                enemies.forEach(e => {
                    if (e.id === target.id) return;
                    if (getDistance2D(e.position, target.position) <= 2) {
                        e.health -= splashDmg;
                        newDamageNumbers.push({ id: Math.random().toString(), position: { ...e.position }, value: splashDmg, color: '#fb7185', lifetime: 25, maxLifetime: 25, isCritical: false });
                    }
                });
            }
        }
      }
      events.push({ type: 'PROJECTILE_HIT', targetId: target.id, damage: p.damage, sourceType: p.sourceType });
    } else {
      p.position.x += (dx / dist) * speed;
      p.position.z += (dz / dist) * speed;
      p.position.y = 0.5 + Math.sin(Date.now() / 200) * 0.2;
      nextProjectiles.push(p);
    }
  }

  return { projectiles: nextProjectiles, enemies, newEffects, newDamageNumbers, events };
}

function processArtilleryHit(pos: {x:number, y:number, z:number}, p: Projectile, enemies: Enemy[], nextEffects: Effect[], nextDamageNumbers: DamageNumber[]) {
  const radius = p.blastRadius || 2.5;
  nextEffects.push({ id: Math.random().toString(), type: 'EXPLOSION', position: pos, color: p.color, scale: radius, lifetime: 20, maxLifetime: 20 });
  
  enemies.forEach(e => {
    const d = getDistance2D(e.position, pos);
    const hitbox = e.isBoss ? (e.bossConfig?.size || 1) * 0.5 : 0;
    if (d <= radius + hitbox) {
      let dmg = p.damage;
      if (e.isBoss && e.bossConfig) {
        if (e.isShielded) dmg = 0;
        else {
            const phase = e.bossConfig.phases[e.currentPhase || 0];
            if (phase) dmg *= (1 - (phase.damageResistance || 0));
        }
      }
      e.health -= dmg;
      if (dmg > 0) {
          nextDamageNumbers.push({ id: Math.random().toString(), position: { ...e.position }, value: dmg, color: '#f59e0b', lifetime: 30, maxLifetime: 30, isCritical: true });
      }
    }
  });
}
