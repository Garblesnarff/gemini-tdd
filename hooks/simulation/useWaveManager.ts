
import { Enemy, GameState } from '../../types';
import { SimulationContext, GameEvent } from './types';

export function manageWaveState(enemies: Enemy[], waveStatus: string, lives: number, gold: number, ctx: SimulationContext) {
  let nextStatus = waveStatus;
  let nextGold = gold;
  const events: GameEvent[] = [];

  if (waveStatus === 'CLEARING' && enemies.length === 0) {
    nextStatus = 'IDLE';
    events.push({ type: 'WAVE_COMPLETE', waveNumber: ctx.state.wave });
    
    // Economy Augments (Interest)
    const interestAug = ctx.activeAugments.find(a => a.effect.special === 'INTEREST');
    if (interestAug) {
        nextGold += Math.floor(nextGold * (interestAug.effect.value || 0.1));
    }
  }

  return { waveStatus: nextStatus, gold: nextGold, events };
}
