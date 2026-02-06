
import { Projectile, Enemy, Effect, DamageNumber, TowerType, EnemyType } from '../../types';
import { SimulationContext, GameEvent } from './types';
import { getDistance2D } from './simulationUtils';
import { ABILITY_MATRIX, ENEMY_STATS } from '../../constants';

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
        processDirectHit(target, p, enemies, newEffects, newDamageNumbers, events, ctx);
      }

      if (p.isPerforating) {
         p.perforationHitList?.push(target.id);
         moveProjectile(p, target, nextProjectiles, enemies, newEffects, newDamageNumbers, events, ctx);
      } 
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
    if (target) {
        const dx = target.position.x - p.position.x;
        const dz = target.position.z - p.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const speed = p.speed * 1.5;
        
        if (p.isPerforating) {
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
    // --- Phaser Immunity ---
    if (target.type === EnemyType.PHASER && target.isPhased) return;

    let damage = p.damage;
    let color = p.color;
    let isBlocked = false;
    let isArmorHit = false;
    let shieldHit = false;
    
    // Critical Hit
    const isCrit = Math.random() < ctx.metaEffects.critChance;
    if (isCrit) {
        damage *= 2;
        color = '#fbbf24'; 
    }

    // Void Mark
    if (p.isVoidMark) {
        if (!target.debuffs) target.debuffs = [];
        target.debuffs.push({
            id: Math.random().toString(),
            type: 'VOID_MARK',
            duration: 8000,
            value: 1.5
        });
        newEffects.push({ id: Math.random().toString(), type: 'VOID_SIGIL', position: { ...target.position, y: 1.5 }, color: '#c084fc', scale: 1, lifetime: 40, maxLifetime: 40 });
        damage = 0; 
    }

    // Ignition
    if (p.isIgnition) {
        if (!target.debuffs) target.debuffs = [];
        target.debuffs.push({
            id: Math.random().toString(),
            type: 'BURN',
            duration: 3000,
            value: 50 
        });
        newEffects.push({ id: Math.random().toString(), type: 'SPARK', position: target.position, color: '#f97316', scale: 0.5, lifetime: 20, maxLifetime: 20 });
    }

    // Chain Lightning
    if (p.isChainLightning) {
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

    // --- Damage Modifiers ---
    const mark = target.debuffs?.find(d => d.type === 'VOID_MARK');
    if (mark && !p.isVoidMark) {
        damage *= (mark.value || 1.5);
    }

    // --- Armored Reduction ---
    if (target.type === EnemyType.ARMORED && p.sourceType !== TowerType.ARTILLERY && !p.isIgnition) {
        const armor = (ENEMY_STATS[EnemyType.ARMORED] as any).armor || 10;
        damage = Math.max(1, damage - armor);
        isArmorHit = true;
    }

    // --- Boss Resistances ---
    if (target.isBoss) {
        if (target.isShielded) {
            damage = 0;
            isBlocked = true;
        } else {
            const phase = target.bossConfig?.phases[target.currentPhase || 0];
            if (phase) damage *= (1 - (phase.damageResistance || 0));
        }
    }

    // --- Shield Logic (Shielded Enemy Type) ---
    if (target.shield !== undefined && target.shield > 0 && !target.shieldBroken) {
        target.shieldTimer = 0; // Reset regen timer
        shieldHit = true;
        if (damage >= target.shield) {
            damage -= target.shield;
            target.shield = 0;
            target.shieldBroken = true;
            newEffects.push({ id: Math.random().toString(), type: 'SHIELD_BREAK', position: target.position, color: '#60a5fa', scale: 1.5, lifetime: 25, maxLifetime: 25 });
        } else {
            target.shield -= damage;
            damage = 0;
        }
    }

    if (isBlocked) {
        newEffects.push({ id: Math.random().toString(), type: 'BLOCKED', position: { ...target.position }, color: '#3b82f6', scale: 1, lifetime: 20, maxLifetime: 20, text: 'BLOCKED' });
    } else if (damage > 0 || shieldHit) {
        if (damage > 0) target.health -= damage;
        
        if (isArmorHit) {
             newEffects.push({ id: Math.random().toString(), type: 'ARMOR_SPARK', position: target.position, color: '#94a3b8', scale: 0.8, lifetime: 15, maxLifetime: 15 });
             color = '#94a3b8'; 
        }

        newDamageNumbers.push({ 
            id: Math.random().toString(), 
            position: { ...target.position }, 
            value: damage, 
            color: shieldHit ? '#60a5fa' : color, 
            lifetime: 30, 
            maxLifetime: 30, 
            isCritical: isCrit 
        });
        
        // Sniper Splash Augment
        const splashAug = ctx.activeAugments.find(a => a.id === 'splash_sniper_1');
        if (splashAug && splashAug.effect && p.sourceType === TowerType.SNIPER) {
            const val = splashAug.effect.value !== undefined ? splashAug.effect.value : 0.5;
            const splashDmg = damage * val;
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
    // Phase immunity
    if (e.type === EnemyType.PHASER && e.isPhased) return;

    const d = getDistance2D(e.position, pos);
    const hitbox = e.isBoss ? (e.bossConfig?.size || 1) * 0.5 : 0;
    if (d <= radius + hitbox) {
      let dmg = p.damage * damageMult;
      
      const mark = e.debuffs?.find(db => db.type === 'VOID_MARK');
      if (mark) dmg *= (mark.value || 1.5);

      // Artillery Ignores Armor
      
      // Boss
      if (e.isBoss && e.bossConfig) {
        if (e.isShielded) dmg = 0;
        else {
            const phase = e.bossConfig.phases[e.currentPhase || 0];
            if (phase) dmg *= (1 - (phase.damageResistance || 0));
        }
      }

      // Shielded
      let shieldHit = false;
      if (e.shield !== undefined && e.shield > 0 && !e.shieldBroken) {
          e.shieldTimer = 0;
          shieldHit = true;
          if (dmg >= e.shield) {
              dmg -= e.shield;
              e.shield = 0;
              e.shieldBroken = true;
              nextEffects.push({ id: Math.random().toString(), type: 'SHIELD_BREAK', position: e.position, color: '#60a5fa', scale: 1.5, lifetime: 25, maxLifetime: 25 });
          } else {
              e.shield -= dmg;
              dmg = 0;
          }
      }

      if (dmg > 0 || shieldHit) {
          if (dmg > 0) e.health -= dmg;
          nextDamageNumbers.push({ id: Math.random().toString(), position: { ...e.position }, value: dmg, color: shieldHit ? '#60a5fa' : color, lifetime: 30, maxLifetime: 30, isCritical: isCrit });
      }
    }
  });
}
