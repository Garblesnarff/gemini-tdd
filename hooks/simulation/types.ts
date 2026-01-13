
import { GameState, Enemy, Tower, Projectile, Effect, DamageNumber, Hazard, Augment, StageConfig, Vector3Tuple, TowerType, ActiveAbilityType } from '../../types';

export interface SimulationContext {
  state: GameState;
  tickDelta: number;
  gameSpeed: number;
  stageConfig: StageConfig;
  paths: Vector3Tuple[][];
  activeAugments: Augment[];
  directorScaling: number;
  directorGoldBonus: number;
  directorCooldownMult: number;
}

export type GameEvent = 
  | { type: 'ENEMY_KILLED'; enemyId: string; enemyType: string; position: Vector3Tuple; reward: number }
  | { type: 'ENEMY_LEAKED'; enemyId: string }
  | { type: 'TOWER_FIRED'; towerId: string; targetId: string }
  | { type: 'ABILITY_USED'; towerId: string; abilityType: ActiveAbilityType }
  | { type: 'BOSS_PHASE_CHANGED'; bossId: string; newPhase: number; announcement: string }
  | { type: 'PROJECTILE_HIT'; targetId: string; damage: number; sourceType: TowerType }
  | { type: 'WAVE_COMPLETE'; waveNumber: number }
  | { type: 'BOSS_DEFEATED'; bossId: string };

export interface SimulationResult {
  stateUpdates: Partial<GameState>;
  events: GameEvent[];
}
