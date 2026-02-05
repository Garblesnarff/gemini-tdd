
import { Enemy, Tower, PassiveType, EnemyType } from '../../types';
import { SimulationContext } from './types';
import { getDistance2D } from './simulationUtils';
import { PASSIVE_CONFIG, ENEMY_STATS } from '../../constants';

export function simulateEnemyMovement(enemies: Enemy[], towers: Tower[], ctx: SimulationContext) {
  // Freeze all movement during boss death
  if (ctx.state.gamePhase === 'BOSS_DEATH') {
      return { enemies, livesLost: 0, newEffects: [] }; // Added newEffects return
  }

  let livesLost = 0;
  const nextEnemies: Enemy[] = [];
  const newEffects: any[] = [];

  for (let i = 0; i < enemies.length; i++) {
    const enemy = { ...enemies[i] };
    const path = ctx.paths[enemy.pathId];

    // --- Shield Regeneration ---
    if (enemy.type === EnemyType.SHIELDED) {
        if (enemy.shield !== undefined && enemy.shield < (enemy.maxShield || ENEMY_STATS[EnemyType.SHIELDED].shield || 60)) {
            const regenDelay = ENEMY_STATS[EnemyType.SHIELDED].shieldRegenDelay || 3000;
            enemy.shieldRegenDelay = (enemy.shieldRegenDelay || 0) + ctx.tickDelta;
            
            if (enemy.shieldRegenDelay >= regenDelay) {
                const regenRate = ENEMY_STATS[EnemyType.SHIELDED].shieldRegen || 10;
                enemy.shield = Math.min(enemy.maxShield || 60, enemy.shield + (regenRate * ctx.tickDelta / 1000));
            }
        }
    }

    // Process Debuffs
    if (enemy.debuffs && enemy.debuffs.length > 0) {
        enemy.debuffs = enemy.debuffs.filter(db => {
            db.duration -= ctx.tickDelta;
            if (db.type === 'BURN') {
                const tickDamage = (db.value || 0) * (ctx.tickDelta / 1000);
                // Burn bypasses armor? Usually DOTs do in this design.
                // Assuming raw health reduction here. 
                // For armored enemies, we usually handle this in direct damage application,
                // but DOTs are typically "true damage" in this context.
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

    // --- Phaser Teleportation Logic ---
    let phased = false;
    if (enemy.type === EnemyType.PHASER && enemy.health > 0) {
         if (enemy.phaseCharging) {
             enemy.phaseProgress = (enemy.phaseProgress || 0) + (ctx.tickDelta / 1000); // 1s charge time hardcoded for now or use stat
             if (enemy.phaseProgress >= 1) {
                 // Teleport
                 const distToTeleport = ENEMY_STATS[EnemyType.PHASER].phaseDistance || 4;
                 let distRemaining = distToTeleport;
                 
                 // Advance along path
                 let currWp = enemy.waypointIndex;
                 let currPos = { ...enemy.position };
                 let currProg = enemy.progress;

                 while (distRemaining > 0 && currWp < path.length - 1) {
                     const nextNode = path[currWp + 1];
                     const dx = nextNode.x - currPos.x;
                     const dz = nextNode.z - currPos.z;
                     const segLen = Math.sqrt(dx * dx + dz * dz);
                     const distOnSeg = segLen - currProg; // Distance left on this segment
                     
                     if (distRemaining <= distOnSeg) {
                         const ratio = (currProg + distRemaining) / segLen;
                         // Interpolate
                         const p1 = path[currWp];
                         const p2 = path[currWp+1];
                         currPos.x = p1.x + (p2.x - p1.x) * ratio;
                         currPos.z = p1.z + (p2.z - p1.z) * ratio;
                         currProg += distRemaining;
                         distRemaining = 0;
                     } else {
                         distRemaining -= distOnSeg;
                         currWp++;
                         currProg = 0;
                         currPos = { ...path[currWp] };
                     }
                 }
                 
                 newEffects.push({ id: Math.random().toString(), type: 'PHASE_BLINK', position: enemy.position, color: '#a855f7', scale: 1, lifetime: 20, maxLifetime: 20 });
                 newEffects.push({ id: Math.random().toString(), type: 'PHASE_BLINK', position: currPos, color: '#a855f7', scale: 1, lifetime: 20, maxLifetime: 20 });

                 enemy.position = currPos;
                 enemy.waypointIndex = currWp;
                 enemy.progress = currProg;
                 enemy.phaseCharging = false;
                 enemy.phaseCooldown = ENEMY_STATS[EnemyType.PHASER].phaseCooldown || 5000;
                 phased = true;
             }
         } else {
             enemy.phaseCooldown = (enemy.phaseCooldown || 0) - ctx.tickDelta;
             if ((enemy.phaseCooldown || 0) <= 0) {
                 enemy.phaseCharging = true;
                 enemy.phaseProgress = 0;
             }
         }
    }

    // Movement (Standard)
    // If phased this tick, we skip standard movement to simulate the "blink" replacing the move
    if (enemy.health > 0 && !phased && (!enemy.phaseCharging || enemy.phaseCharging)) { 
        // Note: Phasers stop moving while charging? Let's say yes for effect.
        if (enemy.type === EnemyType.PHASER && enemy.phaseCharging) {
            // Charging... no move
        } else {
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
        }
    } 
    else if (enemy.health > 0 && phased) {
        nextEnemies.push(enemy); // Pushed after phase update
    }
    else if (enemy.health <= 0) {
        // Died from DOT
        nextEnemies.push(enemy); // Let death handler process it
    }
  }

  return { enemies: nextEnemies, livesLost, newEffects };
}
