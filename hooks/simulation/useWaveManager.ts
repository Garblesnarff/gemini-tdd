
import { Enemy, GameState } from '../../types';
import { SimulationContext, GameEvent } from './types';
import { evaluateDirectorState } from './directorSystem';

export function manageWaveState(enemies: Enemy[], waveStatus: string, lives: number, gold: number, ctx: SimulationContext) {
  let nextStatus = waveStatus;
  let nextGold = gold;
  const events: GameEvent[] = [];
  let directorUpdates: Partial<GameState> = {};

  if (waveStatus === 'CLEARING' && enemies.length === 0) {
    nextStatus = 'IDLE';
    events.push({ type: 'WAVE_COMPLETE', waveNumber: ctx.state.wave });
    
    // Economy Augments (Interest)
    const interestAug = ctx.activeAugments.find(a => a.effect && a.effect.special === 'INTEREST');
    if (interestAug && interestAug.effect) {
        nextGold += Math.floor(nextGold * (interestAug.effect.value || 0.1));
    }

    // AI Director Evaluation
    // First, update wave stats for the end of the wave
    const isClean = ctx.state.waveStats.livesLostThisWave === 0;
    const nextCleanStreak = isClean ? ctx.state.waveStats.consecutiveCleanWaves + 1 : 0;
    
    const stateForEval: GameState = {
        ...ctx.state,
        gold: nextGold,
        lives: lives,
        waveStats: {
            ...ctx.state.waveStats,
            consecutiveCleanWaves: nextCleanStreak,
            waveEndTime: Date.now()
        }
    };

    const changes = evaluateDirectorState(stateForEval);
    
    directorUpdates = {
        ...changes,
        waveStats: {
            livesLostThisWave: 0, // Reset for next wave
            waveStartTime: 0,
            waveEndTime: 0,
            consecutiveCleanWaves: nextCleanStreak
        }
    };
  }

  return { waveStatus: nextStatus, gold: nextGold, events, directorUpdates };
}
