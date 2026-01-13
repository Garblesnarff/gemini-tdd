import { Tower, Enemy, Projectile, TowerType, TargetPriority } from '../../types';
import { SimulationContext } from './types';
import { sortByPriority, getDistance2D } from './simulationUtils';
import { TOWER_STATS } from '../../constants';

export function simulateTowerCombat(towers: Tower[], enemies: Enemy[], ctx: SimulationContext) {
  const newProjectiles: Projectile[] = [];

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

        // Reset cooldown
        tower.cooldown = (1000 / tower.fireRate);
        tower.lastShotTime = Date.now();

        if (tower.type === TowerType.SNIPER || tower.type === TowerType.ARTILLERY) {
          const stats = TOWER_STATS[tower.type];
          
          // Use type assertion to access blastRadius safely for Artillery towers
          let blastRadius = tower.type === TowerType.ARTILLERY ? (stats as any).blastRadius : undefined;
          
          // Apply Augments to projectiles
          ctx.activeAugments.forEach(aug => {
              if (aug.id === 'cluster_munitions' && tower.type === TowerType.ARTILLERY) {
                  if (blastRadius) blastRadius *= 1.5;
              }
          });

          newProjectiles.push({
            id: Math.random().toString(),
            position: { ...tower.position, y: 0.5 },
            targetId: target.id,
            damage: tower.damage,
            speed: stats.projectileSpeed * ctx.gameSpeed,
            color: tower.type === TowerType.ARTILLERY ? '#f59e0b' : '#ef4444',
            sourceType: tower.type,
            blastRadius: blastRadius
          });
        } else {
          // Instant Hitscan (Basic/Fast)
          applyDamage(target, tower.damage, ctx);
        }
      }
    }
  });

  return { towers, newProjectiles };
}

function applyDamage(target: Enemy, rawDamage: number, ctx: SimulationContext) {
    let damage = rawDamage;
    
    // Boss Resistances
    if (target.isBoss && target.bossConfig) {
        const phase = target.bossConfig.phases[target.currentPhase || 0];
        if (phase) damage *= (1 - (phase.damageResistance || 0));
        if (target.isShielded) damage = 0;
    }

    target.health -= damage;
}