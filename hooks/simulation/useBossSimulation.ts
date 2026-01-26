
import { Enemy, Tower, Hazard, Effect, BossAbilityType, EnemyType } from '../../types';
import { SimulationContext, GameEvent } from './types';
import { ENEMY_STATS } from '../../constants';

export function simulateBoss(enemies: Enemy[], towers: Tower[], hazards: Hazard[], ctx: SimulationContext) {
  const boss = enemies.find(e => e.isBoss) as Enemy | undefined;
  if (!boss || boss.health <= 0) return { enemies, towers, hazards, newEffects: [], events: [], announcement: null };

  const config = boss.bossConfig!;
  const nextEnemies = [...enemies];
  const nextTowers = [...towers];
  const nextHazards = [...hazards];
  const newEffects: Effect[] = [];
  const events: GameEvent[] = [];
  let announcement: string | null = null;

  const healthPct = boss.health / boss.maxHealth;
  const currentPhaseIdx = boss.currentPhase || 0;

  // Phase Transition
  const nextPhaseIdx = currentPhaseIdx + 1;
  if (config.phases[nextPhaseIdx] && healthPct <= config.phases[nextPhaseIdx].healthThreshold) {
    boss.currentPhase = nextPhaseIdx;
    announcement = config.phases[nextPhaseIdx].announcement;
    newEffects.push({ id: Math.random().toString(), type: 'NOVA', position: boss.position, color: boss.bossConfig?.color || '#fff', scale: 5, lifetime: 60, maxLifetime: 60 });
    events.push({ type: 'BOSS_PHASE_CHANGED', bossId: boss.id, newPhase: nextPhaseIdx, announcement });
  }

  // Handle Active Buffs (Speed, Regen)
  if (boss.activeBuffs) {
      boss.activeBuffs = boss.activeBuffs.filter(buff => {
          buff.duration -= ctx.tickDelta;
          
          if (buff.type === 'REGEN') {
              const val = buff.value || 0.1;
              boss.health = Math.min(boss.maxHealth, boss.health + (val * boss.maxHealth * ctx.tickDelta / 5000));
          }
          // Speed buff handled in movement logic implicitly or requires state update
          
          return buff.duration > 0;
      });
  }

  // Cooldowns and Timers
  if (boss.isShielded && boss.shieldTimer) {
    boss.shieldTimer -= ctx.tickDelta;
    if (boss.shieldTimer <= 0) boss.isShielded = false;
  }

  // Abilities
  config.abilities.forEach(ability => {
    if (!boss.abilityCooldowns) boss.abilityCooldowns = {};
    const cd = boss.abilityCooldowns[ability.id] || 0;

    if (cd > 0) {
      boss.abilityCooldowns[ability.id] -= ctx.tickDelta;
    } else if (ctx.state.gamePhase === 'BOSS_FIGHT') {
      // Trigger Logic
      let triggered = false;

      if (ability.type === BossAbilityType.SHIELD_PULSE) {
        boss.isShielded = true;
        boss.shieldTimer = ability.duration || 3000;
        announcement = "BOSS SHIELD ACTIVE";
        triggered = true;
      } 
      else if (ability.type === BossAbilityType.SPAWN_MINIONS) {
        for (let k = 0; k < 3; k++) {
          nextEnemies.push({
            id: `boss_sum_${Date.now()}_${k}`,
            type: EnemyType.BASIC,
            health: ENEMY_STATS[EnemyType.BASIC].health * ctx.directorScaling,
            maxHealth: ENEMY_STATS[EnemyType.BASIC].health * ctx.directorScaling,
            speed: 2,
            position: { x: boss.position.x + (Math.random() - 0.5), y: 0.2, z: boss.position.z + (Math.random() - 0.5) },
            pathId: boss.pathId,
            waypointIndex: boss.waypointIndex,
            progress: 0,
            debuffs: []
          });
        }
        triggered = true;
      } 
      else if (ability.type === BossAbilityType.DISABLE_ZONE) {
        const radius = ability.radius || 4;
        const duration = ability.duration || 5000;
        newEffects.push({ id: Math.random().toString(), type: 'DISABLE_FIELD', position: boss.position, color: '#ef4444', scale: radius, lifetime: 40, maxLifetime: 40 });
        
        nextTowers.forEach(t => {
          const dx = t.position.x - boss.position.x;
          const dz = t.position.z - boss.position.z;
          if (Math.sqrt(dx * dx + dz * dz) <= radius) {
            t.disabledTimer = duration;
          }
        });
        announcement = "TOWERS DISABLED";
        triggered = true;
      }
      else if (ability.type === BossAbilityType.SPEED_BURST) {
         if (!boss.activeBuffs) boss.activeBuffs = [];
         boss.activeBuffs.push({ type: 'SPEED', duration: ability.duration || 3000, value: ability.value || 1.5 });
         // Visual effect
         newEffects.push({ id: Math.random().toString(), type: 'SPARK', position: boss.position, color: '#facc15', scale: 2, lifetime: 30, maxLifetime: 30 });
         announcement = "SPEED SURGE";
         triggered = true;
      }
      else if (ability.type === BossAbilityType.REGEN) {
         if (!boss.activeBuffs) boss.activeBuffs = [];
         boss.activeBuffs.push({ type: 'REGEN', duration: ability.duration || 5000, value: ability.value || 0.1 }); 
         announcement = "REGENERATING";
         triggered = true;
      }

      if (triggered) {
          boss.abilityCooldowns[ability.id] = ability.cooldown;
      }
    }
  });

  // HP Spawns
  config.minionSpawns.forEach((spawn, idx) => {
    if (!boss.triggeredSpawnIndices?.includes(idx) && healthPct <= spawn.triggerHealth) {
      if (!boss.triggeredSpawnIndices) boss.triggeredSpawnIndices = [];
      boss.triggeredSpawnIndices.push(idx);
      announcement = spawn.announcement || "Reinforcements!";
      for (let k = 0; k < spawn.count; k++) {
        nextEnemies.push({
          id: `boss_hp_spawn_${idx}_${k}`,
          type: spawn.enemyType,
          health: ENEMY_STATS[spawn.enemyType].health * ctx.directorScaling,
          maxHealth: ENEMY_STATS[spawn.enemyType].health * ctx.directorScaling,
          speed: ENEMY_STATS[spawn.enemyType].speed,
          position: { x: boss.position.x + (Math.random() - 0.5) * 2, y: 0.2, z: boss.position.z + (Math.random() - 0.5) * 2 },
          pathId: boss.pathId,
          waypointIndex: boss.waypointIndex,
          progress: 0,
          debuffs: []
        });
      }
    }
  });

  return { enemies: nextEnemies, towers: nextTowers, hazards: nextHazards, newEffects, events, announcement };
}
