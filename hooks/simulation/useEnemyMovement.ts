
import { Enemy, Tower, PassiveType, EnemyType } from '../../types';
import { SimulationContext } from './types';
import { getDistance2D } from './simulationUtils';
import { PASSIVE_CONFIG, ENEMY_STATS } from '../../constants';

export function simulateEnemyMovement(enemies: Enemy[], towers: Tower[], ctx: SimulationContext) {
  // Freeze all movement during boss death
  if (ctx.state.gamePhase === 'BOSS_DEATH') {
      return { enemies, livesLost: 0, newEffects: [] }; 
  }

  let livesLost = 0;
  const nextEnemies: Enemy[] = [];
  const newEffects: any[] = [];

  for (let i = 0; i < enemies.length; i++) {
    const enemy = { ...enemies[i] };
    const path = ctx.paths[enemy.pathId];

    // --- Phase Toggle (Phaser) ---
    if (enemy.type === EnemyType.PHASER) {
        const stats = ENEMY_STATS[EnemyType.PHASER] as any;
        enemy.phaseTimer = (enemy.phaseTimer || stats.solidDuration) - ctx.tickDelta;
        if (enemy.phaseTimer <= 0) {
            enemy.isPhased = !enemy.isPhased;
            enemy.phaseTimer = enemy.isPhased
                ? stats.phaseDuration
                : stats.solidDuration;
        }
    }

    // --- Shield Regeneration ---
    // PRD: Regen 5/sec after 3s of no hit
    if (enemy.type === EnemyType.SHIELDED && !enemy.shieldBroken && enemy.shield !== undefined) {
        enemy.shieldTimer = (enemy.shieldTimer || 0) + ctx.tickDelta;
        if (enemy.shieldTimer >= 3000) {
            const regenRate = (ENEMY_STATS[EnemyType.SHIELDED] as any).shieldRegen || 5;
            const regenAmt = regenRate * (ctx.tickDelta / 1000);
            enemy.shield = Math.min(enemy.maxShield || 60, enemy.shield + regenAmt);
        }
    }

    // --- Debuffs (DOT) ---
    if (enemy.debuffs && enemy.debuffs.length > 0) {
        enemy.debuffs = enemy.debuffs.filter(db => {
            db.duration -= ctx.tickDelta;
            if (db.type === 'BURN') {
                let tickDamage = (db.value || 0) * (ctx.tickDelta / 1000);
                // Armor reduces DOT per tick, minimum 1 if armored but typically we check type
                if (enemy.type === EnemyType.ARMORED) {
                     const armor = (ENEMY_STATS[EnemyType.ARMORED] as any).armor || 10;
                     // For small ticks this makes them immune often, but that's per design of flat armor vs DOTs
                     // Let's assume minimum 1 damage per full second equivalent, 
                     // or actually strictly apply armor per tick calc.
                     // If tick is small (e.g. 2.5dmg), armor 10 reduces to <0. 
                     // Let's clamp at a small fraction to prevent total immunity or stick to design.
                     // Design says: "Burn DOT ticks are also reduced by armor per tick."
                     // Assuming 'tick' here means the damage applied in this frame.
                     // If frame damage is < armor, it does 1 damage (if we follow flat armor rules strictly).
                     tickDamage = Math.max(0.1, tickDamage - (armor * (ctx.tickDelta/1000))); 
                     // Scaling armor by time delta to make it 'per second' reduction? 
                     // No, armor is usually per hit. A DOT tick is a hit.
                     // If armor is 10 flat, and burn is 50/sec. In 50ms tick, dmg is 2.5. Armor 10 blocks it fully.
                     // This makes Armored immune to burn. Let's assume armor applies to the 'value' before time scaling? 
                     // No, "armor reduction per hit". 
                     // Let's stick to: effective_damage = max(0, raw - armor). 
                     // Since DOT is continuous, we might want to just reduce the DOT rate.
                     // Let's reduce the effective Burn Rate by armor/sec.
                }
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

    // Apply Slow Auras & Entropy Field
    towers.forEach(t => {
      if (t.passiveType === PassiveType.SLOW_AURA && !(t.disabledTimer && t.disabledTimer > 0)) {
        const config = PASSIVE_CONFIG[PassiveType.SLOW_AURA];
        const dist = getDistance2D(enemy.position, t.position);
        
        if (config && dist <= (config.range || 3.5)) {
          const entropyBuff = t.activeBuffs?.find(b => b.type === 'ENTROPY_FIELD');
          if (entropyBuff) {
              enemy.frozen = 0; // Rooted
          } else {
              enemy.frozen = Math.min(enemy.frozen ?? 1, config.slowFactor || 0.7);
          }
        }
      }
    });

    // Movement (Standard)
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
            const bossLeakDmg = Math.max(1, Math.floor(20 * (1 - (ctx.metaEffects.bossResist || 0))));
            livesLost += enemy.isBoss ? bossLeakDmg : 1; 
        }
    } else {
        nextEnemies.push(enemy); // Keep for death handler
    }
  }

  return { enemies: nextEnemies, livesLost, newEffects };
}
