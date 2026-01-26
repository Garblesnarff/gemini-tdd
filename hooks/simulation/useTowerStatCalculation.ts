
import { Tower, Augment, PassiveType, TowerType, ActiveAbilityType } from '../../types';
import { SimulationContext } from './types';
import { PASSIVE_CONFIG, ABILITY_MATRIX } from '../../constants';
import { getDistance2D } from './simulationUtils';

export function calculateTowerStats(towers: Tower[], augments: Augment[], ctx: SimulationContext): Tower[] {
  return towers.map(tower => {
    const nextTower = { ...tower };

    // Reset to base stats first
    nextTower.damage = tower.baseDamage;
    nextTower.range = tower.baseRange;
    nextTower.fireRate = tower.baseFireRate;

    // Tick down disabled timer
    if (nextTower.disabledTimer && nextTower.disabledTimer > 0) {
      nextTower.disabledTimer -= ctx.tickDelta;
    }

    // Tick down ability duration
    if (nextTower.abilityDuration > 0) {
      nextTower.abilityDuration -= ctx.tickDelta;
    }

    // Tick down active buffs
    if (nextTower.activeBuffs && nextTower.activeBuffs.length > 0) {
      nextTower.activeBuffs = nextTower.activeBuffs.filter(buff => {
        if (buff.duration) {
          buff.duration -= ctx.tickDelta;
          return buff.duration > 0;
        }
        if (buff.stacks !== undefined) {
          return buff.stacks > 0;
        }
        return false;
      });
    }

    // Tick down ability cooldown
    if (nextTower.abilityCooldown > 0) {
      nextTower.abilityCooldown -= ctx.tickDelta;
    }

    // Tick down firing cooldown
    if (nextTower.cooldown > 0) {
      nextTower.cooldown -= ctx.tickDelta;
    }

    if (nextTower.disabledTimer && nextTower.disabledTimer > 0) return nextTower;
    
    // --- META UPGRADE APPLICATION (Base Stats) ---
    nextTower.damage *= ctx.metaEffects.globalDamageMultiplier;
    nextTower.range *= ctx.metaEffects.globalRangeMultiplier;

    // Apply Passive Auras from nearby towers
    towers.forEach(other => {
      if (other.id === tower.id || (other.disabledTimer && other.disabledTimer > 0)) return;
      
      const dist = getDistance2D(tower.position, other.position);
      
      if (other.passiveType === PassiveType.DAMAGE_AURA) {
        const config = PASSIVE_CONFIG[PassiveType.DAMAGE_AURA];
        if (config && dist <= (config.range || 2.5)) {
          nextTower.damage *= (config.multiplier || 1.25);
        }
      } else if (other.passiveType === PassiveType.RATE_AURA) {
        const config = PASSIVE_CONFIG[PassiveType.RATE_AURA];
        if (config && dist <= (config.range || 2.5)) {
          nextTower.fireRate *= (config.multiplier || 1.25);
        }
      }
    });

    // Apply Active Buffs (Overclock / Barrage)
    if (nextTower.activeBuffs) {
        const overclock = nextTower.activeBuffs.find(b => b.type === 'OVERCLOCK');
        if (overclock) {
             const config = ABILITY_MATRIX[TowerType.BASIC][tower.techPath];
             if (config && config.id === ActiveAbilityType.OVERCLOCK) {
                 nextTower.fireRate *= (config.value || 3);
             }
        }
        const barrage = nextTower.activeBuffs.find(b => b.type === 'BARRAGE');
        if (barrage) {
            const config = ABILITY_MATRIX[TowerType.ARTILLERY][tower.techPath];
            if (config && config.id === ActiveAbilityType.BARRAGE) {
                nextTower.fireRate *= (config.value || 10);
            }
        }
    }

    // Apply Global Augments
    augments.forEach(aug => {
      const e = aug.effect;
      if (!e) return;
      
      const isTargeted = e.target === 'ALL' || e.target === tower.type;
      const isTechMatch = !e.techTarget || e.techTarget === tower.techPath;

      if (isTargeted && isTechMatch && e.stat) {
        if (e.stat === 'damage') nextTower.damage *= (1 + (e.value || 0));
        if (e.stat === 'range') nextTower.range *= (1 + (e.value || 0));
        if (e.stat === 'fireRate') nextTower.fireRate *= (1 + (e.value || 0));
      }
      
      // Special Augment: Bombardment Protocol
      if (aug.id === 'bombardment_protocol' && tower.type === TowerType.ARTILLERY) {
          nextTower.damage *= 1.3;
          nextTower.fireRate *= 0.8;
      }
    });

    return nextTower;
  });
}
