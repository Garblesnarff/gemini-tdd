
import { GameState, DirectorState, StageConfig, DirectorActionType } from '../../types';
import { DIRECTOR_CONFIG, STAGE_CONFIGS } from '../../constants';

// Returns the new partial state after evaluation
export function evaluateDirectorState(currentState: GameState): Partial<GameState> {
    const { waveStats, lives, gold, currentStage, directorState, pendingDirectorState, directorStreak } = currentState;
    const stageConfig = STAGE_CONFIGS[currentStage];
    
    // Director never activates during boss waves
    if (currentState.wave >= stageConfig.waves) {
         return {
             directorState: 'NEUTRAL',
             directorAction: 'NONE',
             directorScaling: 1,
             directorGoldBonus: 1,
             directorCooldownMult: 1
         };
    }

    const startingLives = stageConfig.startingLives;
    const livesPct = lives / startingLives;
    const { consecutiveCleanWaves, livesLostThisWave } = waveStats;

    let targetState: DirectorState = 'NEUTRAL';

    // Check Pressure Conditions
    if (
        consecutiveCleanWaves >= DIRECTOR_CONFIG.PRESSURE.CLEAN_WAVES &&
        gold > DIRECTOR_CONFIG.PRESSURE.GOLD &&
        livesPct > DIRECTOR_CONFIG.PRESSURE.LIVES_PCT
    ) {
        targetState = 'PRESSURE';
    }
    // Check Relief Conditions (Higher priority override)
    else if (
        livesPct < DIRECTOR_CONFIG.RELIEF.LIVES_PCT ||
        livesLostThisWave >= DIRECTOR_CONFIG.RELIEF.LIVES_LOST_WAVE
    ) {
        targetState = 'RELIEF';
    }

    let nextState = directorState;
    let nextPendingState = pendingDirectorState;
    let nextStreak = directorStreak;

    // Transition Logic: Require 2 consecutive qualifying waves to switch
    // If we are already in the target state, just maintain/increment streak
    if (targetState === directorState) {
        nextStreak++;
        nextPendingState = undefined; // Clear pending if we are stable
    } else {
        // We are drifting from current state.
        if (pendingDirectorState === targetState) {
            // Confirm switch
            nextState = targetState;
            nextStreak = 1;
            nextPendingState = undefined;
        } else {
            // First sign of drift, set pending
            nextPendingState = targetState;
            // Streak of current state continues until switch happens? 
            // Or pauses? Let's just keep current state active.
        }
    }
    
    // Apply Effects based on (potentially new) nextState
    let scaling = DIRECTOR_CONFIG.SCALING.NEUTRAL;
    let goldBonus = DIRECTOR_CONFIG.GOLD_BONUS.NEUTRAL;
    let cooldownMult = DIRECTOR_CONFIG.COOLDOWN.NEUTRAL;
    let action: DirectorActionType = 'NONE';
    let intel = currentState.waveIntel;

    if (nextState === 'PRESSURE') {
        // Escalate scaling with streak
        const escalation = Math.min((nextStreak - 1) * 0.05, 0.15); // Cap extra scaling
        scaling = DIRECTOR_CONFIG.SCALING.PRESSURE + escalation;
        goldBonus = DIRECTOR_CONFIG.GOLD_BONUS.PRESSURE;
        cooldownMult = DIRECTOR_CONFIG.COOLDOWN.PRESSURE;
        action = 'ELITE';
        intel = "High-value targets detected. Threat level elevated.";
    } else if (nextState === 'RELIEF') {
        scaling = DIRECTOR_CONFIG.SCALING.RELIEF;
        goldBonus = DIRECTOR_CONFIG.GOLD_BONUS.RELIEF;
        cooldownMult = DIRECTOR_CONFIG.COOLDOWN.RELIEF;
        action = 'SUPPLY';
        intel = "Logistics support inbound. Reinforcement window detected.";
    } else {
        // Neutral
        intel = "Enemy activity nominal. Standard engagement rules.";
    }

    return {
        directorState: nextState,
        directorStreak: nextStreak,
        pendingDirectorState: nextPendingState,
        directorScaling: scaling,
        directorGoldBonus: goldBonus,
        directorCooldownMult: cooldownMult,
        directorAction: action,
        waveIntel: intel
    };
}
