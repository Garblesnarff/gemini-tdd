
import { Projectile, Enemy, Effect, DamageNumber, TowerType } from '../../types';
import { SimulationContext, GameEvent } from './types';
import { getDistance2D } from './simulationUtils';
import { ABILITY_MATRIX } from '../../constants';

export function simulateProjectiles(projectiles: Projectile[], enemies: Enemy[], ctx: SimulationContext) {
  const nextProjectiles: Projectile[] = [];
  const newEffects: Effect[] = [];
  const newDamageNumbers: DamageNumber[] = [];
  const events: GameEvent[] = [];

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const target = enemies.find(e => e.id === p.targetId);

    // If target dead/gone and NOT artillery/perforating, discard
    if (!target) {
      if (p.sourceType === TowerType.ARTILLERY) {
        processArtilleryHit(p.position, p, enemies, newEffects, newDamageNumbers, ctx);
      } else if (p.isPerforating) {
         // Perforating shots continue without a target to guide them
         moveProjectile(p, null, nextProjectiles, enemies, newEffects, newDamageNumbers, events, ctx);
      }
      continue;
    }

    const dx = target.position.x - p.position.x;
    const dz = target.position.z - p.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const speed = p.speed * 1.5;

    if (dist < speed) {
      // IMPACT
      if (p.sourceType === TowerType.ARTILLERY) {
        processArtilleryHit(target.position, p, enemies, newEffects, newDamageNumbers, ctx);
      } else {
        // Direct Hit Logic
        processDirectHit(target, p, enemies, newEffects, newDamageNumbers, events, ctx);
      }

      // Projectile Continuation Logic
      if (p.isPerforating) {
         p.perforationHitList?.push(target.id); // Add to ignore list for this frame/pass
         // Continue moving through
         moveProjectile(p, target, nextProjectiles, enemies, newEffects, newDamageNumbers, events, ctx);
      } 
      // Non-perforating projectiles are consumed on hit
    } else {
      moveProjectile(p, target, nextProjectiles, enemies, newEffects, newDamageNumbers, events, ctx);
    }
  }

  return { projectiles: nextProjectiles, enemies, newEffects, newDamageNumbers, events };
}

function moveProjectile(
    p: Projectile, 
    target: Enemy | null, 
    nextProjectiles: Projectile[],
    allEnemies: Enemy[],
    newEffects: Effect[],
    newDamageNumbers: DamageNumber[],
    events: GameEvent[],
    ctx: SimulationContext
) {
    // If perforating and no target (or hit target), keep going in current vector
    // For simplicity, if Perforating, we need a direction vector. 
    // If we have a target, we update direction. If not, we persist?
    // Simplified: Just use last known vector or delete if off screen.
    // To properly support linear pierce without target, we'd need a velocity vector in Projectile.
    // For MVP, we will only perforate IF there is a target to move towards, or if we hit, we jump to just past it.
    // Actually, Perforation without vector persistence is tricky. 
    // Let's cheat: If perforating, we look for a new target behind the current one? 
    // No, let's just delete if target is null for MVP to avoid complexity overload, 
    // BUT since we want to pierce LINES, we should try to keep moving.
    // Fallback: If target is valid, move. If not, delete (limit of this MVP implementation).
    
    if (target) {
        const dx = target.position.x - p.position.x;
        const dz = target.position.z - p.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const speed = p.speed * 1.5;
        
        // Perforation hit check while moving
        if (p.isPerforating) {
            // Check all enemies along path? Or just collision check all enemies near point?
            allEnemies.forEach(e => {
                if (!p.perforationHitList?.includes(e.id) && getDistance2D(p.position, e.position) < 0.5) {
                    processDirectHit(e, p, allEnemies, newEffects, newDamageNumbers, events, ctx);
                    p.perforationHitList?.push(e.id);
                }
            });
        }

        p.position.x += (dx / dist) * speed;
        p.position.z += (dz / dist) * speed;
        p.position.y = 0.5 + Math.sin(Date.now() / 200) * 0.2;
        nextProjectiles.push(p);
    } else if (p.isPerforating) {
        // Just move forward in arbitrary z? No, delete to prevent bugs.
    }
}

function processDirectHit(
    target: Enemy, 
    p: Projectile, 
    enemies: Enemy[],
    newEffects: Effect[], 
    newDamageNumbers: DamageNumber[], 
    events: GameEvent[],
    ctx: SimulationContext
) {
    let damage = p.damage;
    let color = p.color;
    let isBlocked = false;
    
    // Critical Hit
    const isCrit = Math.random() < ctx.metaEffects.critChance;
    if (isCrit) {
        damage *= 2;
        color = '#fbbf24'; 
    }

    // Void Mark Debuff Application (No damage, just mark)
    if (p.isVoidMark) {
        if (!target.debuffs) target.debuffs = [];
        target.debuffs.push({
            id: Math.random().toString(),
            type: 'VOID_MARK',
            duration: 8000,
            value: 1.5
        });
        newEffects.push({ id: Math.random().toString(), type: 'VOID_SIGIL', position: { ...target.position, y: 1.5 }, color: '#c084fc', scale: 1, lifetime: 40, maxLifetime: 40 });
        damage = 0; // The mark shot itself deals no damage? Spec says "instead of damage".
    }

    // Ignition Burn Application
    if (p.isIgnition) {
        if (!target.debuffs) target.debuffs = [];
        // Stack burn? Spec says stacks.
        target.debuffs.push({
            id: Math.random().toString(),
            type: 'BURN',
            duration: 3000,
            value: 50 // 50 total damage over 3s = 16.6 DPS
        });
        newEffects.push({ id: Math.random().toString(), type: 'SPARK', position: target.position, color: '#f97316', scale: 0.5, lifetime: 20, maxLifetime: 20 });
    }

    // Chain Lightning Logic
    if (p.isChainLightning) {
        // Find 3 nearest
        const neighbors = enemies
            .filter(e => e.id !== target.id && getDistance2D(e.position, target.position) <= 3)
            .sort((a,b) => getDistance2D(a.position, target.position) - getDistance2D(b.position, target.position))
            .slice(0, 3);
            
        neighbors.forEach(n => {
            const chainDmg = damage * 0.5;
            n.health -= chainDmg;
            newEffects.push({ 
                id: Math.random().toString(), 
                type: 'CHAIN_ARC', 
                position: target.position, 
                targetPosition: n.position, 
                color: '#22d3ee', 
                scale: 1, 
                lifetime: 10, 
                maxLifetime: 10 
            });
            newDamageNumbers.push({ id: Math.random().toString(), position: { ...n.position }, value: chainDmg, color: '#22d3ee', lifetime: 20, maxLifetime: 20, isCritical: false });
        });
    }

    // Apply Damage Modifiers (Boss/Mark)
    // Check for existing Void Mark
    const mark = target.debuffs?.find(d => d.type === 'VOID_MARK');
    if (mark && !p.isVoidMark) {
        damage *= (mark.value || 1.5);
    }

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
    } else if (damage > 0) {
        target.health -= damage;
        newDamageNumbers.push({ 
            id: Math.random().toString(), 
            position: { ...target.position }, 
            value: damage, 
            color: color, 
            lifetime: 30, 
            maxLifetime: 30, 
            isCritical: isCrit 
        });
        
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
    
    events.push({ type: 'PROJECTILE_HIT', targetId: target.id, damage: p.damage, sourceType: p.sourceType });
}

function processArtilleryHit(pos: {x:number, y:number, z:number}, p: Projectile, enemies: Enemy[], nextEffects: Effect[], nextDamageNumbers: DamageNumber[], ctx: SimulationContext) {
  const radius = p.blastRadius || 2.5;
  nextEffects.push({ id: Math.random().toString(), type: 'EXPLOSION', position: pos, color: p.color, scale: radius, lifetime: 20, maxLifetime: 20 });
  
  const isCrit = Math.random() < ctx.metaEffects.critChance;
  const damageMult = isCrit ? 2 : 1;
  const color = isCrit ? '#fbbf24' : '#f59e0b';

  enemies.forEach(e => {
    const d = getDistance2D(e.position, pos);
    const hitbox = e.isBoss ? (e.bossConfig?.size || 1) * 0.5 : 0;
    if (d <= radius + hitbox) {
      let dmg = p.damage * damageMult;
      
      const mark = e.debuffs?.find(db => db.type === 'VOID_MARK');
      if (mark) dmg *= (mark.value || 1.5);

      if (e.isBoss && e.bossConfig) {
        if (e.isShielded) dmg = 0;
        else {
            const phase = e.bossConfig.phases[e.currentPhase || 0];
            if (phase) dmg *= (1 - (phase.damageResistance || 0));
        }
      }
      e.health -= dmg;
      if (dmg > 0) {
          nextDamageNumbers.push({ id: Math.random().toString(), position: { ...e.position }, value: dmg, color: color, lifetime: 30, maxLifetime: 30, isCritical: isCrit });
      }
    }
  });
}
