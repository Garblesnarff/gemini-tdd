
import { Enemy, GameState } from '../../types';
import { SimulationContext, GameEvent } from './types';
import { evaluateDirectorState } from './directorSystem';

export function manageWaveState(enemies: Enemy[], waveStatus: string, lives: number, gold: number, ctx: SimulationContext) {
  let nextStatus = waveStatus;
  let nextGold = gold;
  let nextLives = lives;
  const events: GameEvent[] = [];
  let directorUpdates: Partial<GameState> = {};

  if (waveStatus === 'CLEARING' && enemies.length === 0) {
    nextStatus = 'IDLE';
    events.push({ type: 'WAVE_COMPLETE', waveNumber: ctx.state.wave });
    
    // 1. Augment Interest
    const interestAug = ctx.activeAugments.find(a => a && a.effect && a.effect.special === 'INTEREST');
    let augInterest = 0;
    if (interestAug && interestAug.effect) {
        augInterest = (interestAug.effect.value || 0.1);
    }
    
    // 2. Meta Interest
    const metaInterest = ctx.metaEffects.interestRate || 0;
    const totalInterest = augInterest + metaInterest;

    if (totalInterest > 0) {
        nextGold += Math.floor(nextGold * totalInterest);
    }

    // 3. Meta Life Regen
    if (ctx.metaEffects.lifeRegenWaves && ctx.state.wave % ctx.metaEffects.lifeRegenWaves === 0) {
        const stageConfig = ctx.stageConfig;
        const maxLives = stageConfig.startingLives + ctx.metaEffects.bonusStartingLives;
        if (nextLives < maxLives) {
            nextLives++;
        }
    }

    // AI Director Evaluation
    const isClean = ctx.state.waveStats.livesLostThisWave === 0;
    const nextCleanStreak = isClean ? ctx.state.waveStats.consecutiveCleanWaves + 1 : 0;
    
    const stateForEval: GameState = {
        ...ctx.state,
        gold: nextGold,
        lives: nextLives,
        waveStats: {
            ...ctx.state.waveStats,
            consecutiveCleanWaves: nextCleanStreak,
            waveEndTime: Date.now()
        }
    };

    const changes = evaluateDirectorState(stateForEval);
    
    directorUpdates = {
        ...changes,
        lives: nextLives,
        waveStats: {
            livesLostThisWave: 0,
            waveStartTime: 0,
            waveEndTime: 0,
            consecutiveCleanWaves: nextCleanStreak
        }
    };
  }

  return { waveStatus: nextStatus, gold: nextGold, events, directorUpdates };
}
