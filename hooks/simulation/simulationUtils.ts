
import { Vector3Tuple, Enemy, TargetPriority, GameState, StageId } from '../../types';
import { STAGE_CONFIGS } from '../../constants';
import { SimulationContext } from './types';
import { getAppliedMetaEffects } from '../../metaUpgrades';
import { INITIAL_META_PROGRESS } from '../../constants';

export function getDistance2D(a: Vector3Tuple, b: Vector3Tuple): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function getDistance3D(a: Vector3Tuple, b: Vector3Tuple): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function isInRange(
  source: Vector3Tuple, 
  target: Vector3Tuple, 
  range: number, 
  targetHitbox: number = 0
): boolean {
  return getDistance2D(source, target) <= range + targetHitbox;
}

export function getEnemiesInRange(
  position: Vector3Tuple,
  enemies: Enemy[],
  range: number
): Enemy[] {
  return enemies.filter(e => {
    const hitbox = e.isBoss ? (e.bossConfig?.size || 1) * 0.5 : 0;
    return isInRange(position, e.position, range, hitbox);
  });
}

export function sortByPriority(enemies: Enemy[], priority: TargetPriority): Enemy[] {
  const sorted = [...enemies];
  switch (priority) {
    case TargetPriority.FIRST:
      sorted.sort((a, b) => 
        a.waypointIndex !== b.waypointIndex 
          ? b.waypointIndex - a.waypointIndex 
          : b.progress - a.progress
      );
      break;
    case TargetPriority.STRONGEST:
      sorted.sort((a, b) => b.health - a.health);
      break;
    case TargetPriority.WEAKEST:
      sorted.sort((a, b) => a.health - b.health);
      break;
  }
  return sorted;
}

export function buildSimulationContext(state: GameState, tickRate: number): SimulationContext {
  const stageConfig = STAGE_CONFIGS[state.currentStage];
  
  // Fallback to initial effects if undefined (migration safety)
  const metaEffects = state.metaEffects || getAppliedMetaEffects(INITIAL_META_PROGRESS);

  return {
    state,
    tickDelta: tickRate * state.gameSpeed,
    gameSpeed: state.gameSpeed,
    stageConfig,
    paths: stageConfig.paths,
    activeAugments: state.activeAugments,
    directorScaling: state.directorScaling,
    directorGoldBonus: state.directorGoldBonus,
    directorCooldownMult: state.directorCooldownMult,
    metaEffects
  };
}
