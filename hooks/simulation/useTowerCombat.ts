
import { Tower, Enemy, Projectile, TowerType, TargetPriority, DamageNumber, ActiveAbilityType } from '../../types';
import { SimulationContext } from './types';
import { sortByPriority, getDistance2D } from './simulationUtils';
import { TOWER_STATS, ABILITY_MATRIX } from '../../constants';

export function simulateTowerCombat(towers: Tower[], enemies: Enemy[], ctx: SimulationContext) {
  const newProjectiles: Projectile[] = [];
  const newDamageNumbers: DamageNumber[] = [];

  // Stop combat during boss death sequence
  if (ctx.state.gamePhase === 'BOSS_DEATH') {
      return { towers, newProjectiles, newDamageNumbers };
  }

  towers.forEach(tower => {
    // Check if tower is ready to fire
    if (tower.cooldown <= 0 && !(tower.disabledTimer && tower.disabledTimer > 0)) {
      
      // Find valid enemies in range
      const candidates = enemies.filter(e => {
        const hitbox = e.isBoss ? (e.bossConfig?.size || 1) * 0.5 : 0;
        const d = getDistance2D(e.position, tower.position);
        return d <= tower.range + hitbox;
      });

      if (candidates.length > 0) {
        const sorted = sortByPriority(candidates, tower.targetPriority);
        const target = sorted[0];

        // Handle Void Mark Ability (Sniper/Void)
        const voidMarkReady = tower.activeBuffs?.find(b => b.type === 'VOID_MARK_READY');
        
        // Reset cooldown
        tower.cooldown = (1000 / tower.fireRate);
        tower.lastShotTime = Date.now();

        // Projectile Towers or Hitscan
        if (tower.type === TowerType.SNIPER || tower.type === TowerType.ARTILLERY || tower.type === TowerType.FAST) {
            // NOTE: Fast towers now use projectiles to support Ignition/Chain FX better visually, 
            // OR we can keep Hitscan but spawn "fake" projectiles for FX. 
            // Let's use Hitscan for FAST unless it's Chain Lightning.
            // Actually, let's treat FAST as Hitscan generally, but spawn visual trail for Chain.
            // Wait, TOWER_STATS define projectileSpeed for all. Let's use projectiles for all for consistent mechanics (Pierce, Chain).
            
            const stats = TOWER_STATS[tower.type];
          
            // Special Logic Checks
            let blastRadius = tower.type === TowerType.ARTILLERY ? (stats as any).blastRadius : undefined;
            const isPerforating = tower.activeBuffs?.some(b => b.type === 'PERFORATION');
            const isChainLightning = tower.activeBuffs?.some(b => b.type === 'CHAIN_LIGHTNING');
            const ignitionBuff = tower.activeBuffs?.find(b => b.type === 'IGNITION');

            let isIgnition = false;
            if (ignitionBuff && ignitionBuff.stacks && ignitionBuff.stacks > 0) {
                isIgnition = true;
                ignitionBuff.stacks--; // Consume stack
            }
          
            // Apply Augments
            ctx.activeAugments.forEach(aug => {
                if (aug.id === 'cluster_munitions' && tower.type === TowerType.ARTILLERY) {
                    if (blastRadius) blastRadius *= 1.5;
                }
            });

            // Consume Void Mark Buff
            let isVoidMark = false;
            if (voidMarkReady) {
                 isVoidMark = true;
                 tower.activeBuffs = tower.activeBuffs.filter(b => b.type !== 'VOID_MARK_READY');
            }

            const pColor = isIgnition ? '#f97316' : 
                           isChainLightning ? '#22d3ee' :
                           isPerforating ? '#38bdf8' :
                           isVoidMark ? '#c084fc' :
                           tower.type === TowerType.ARTILLERY ? '#f59e0b' : 
                           tower.type === TowerType.FAST ? '#10b981' : '#ef4444';

            newProjectiles.push({
                id: Math.random().toString(),
                position: { ...tower.position, y: 0.5 },
                targetId: target.id,
                damage: tower.damage,
                speed: stats.projectileSpeed * ctx.gameSpeed,
                color: pColor,
                sourceType: tower.type,
                blastRadius: blastRadius,
                isPerforating,
                isChainLightning,
                isIgnition,
                isVoidMark,
                perforationHitList: []
            });

        } else {
          // BASIC Tower (Hitscan)
          const dmg = applyDamage(target, tower.damage, ctx);
          if (dmg > 0) {
             newDamageNumbers.push({
                 id: Math.random().toString(),
                 position: { ...target.position, y: 1 },
                 value: dmg,
                 color: '#3b82f6',
                 lifetime: 20,
                 maxLifetime: 20,
                 isCritical: false
             });
          }
        }
      }
    }
  });

  return { towers, newProjectiles, newDamageNumbers };
}

function applyDamage(target: Enemy, rawDamage: number, ctx: SimulationContext): number {
    let damage = rawDamage;
    
    // Check for Void Mark on Enemy
    const mark = target.debuffs?.find(d => d.type === 'VOID_MARK');
    if (mark) {
        damage *= (mark.value || 1.5);
    }

    // Boss Resistances
    if (target.isBoss && target.bossConfig) {
        const phase = target.bossConfig.phases[target.currentPhase || 0];
        if (phase) damage *= (1 - (phase.damageResistance || 0));
        if (target.isShielded) damage = 0;
    }

    target.health -= damage;
    return damage;
}
