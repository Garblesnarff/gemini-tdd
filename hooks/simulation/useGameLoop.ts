
import React, { useEffect, useRef } from 'react';
import { GameState } from '../../types';
import { buildSimulationContext } from './simulationUtils';
import { calculateTowerStats } from './useTowerStatCalculation';
import { simulateHazards } from './useHazardSimulation';
import { simulateEnemyMovement } from './useEnemyMovement';
import { simulateTowerCombat } from './useTowerCombat';
import { simulateProjectiles } from './useProjectileSimulation';
import { processEnemyDeaths } from './useEnemyDeath';
import { simulateBoss } from './useBossSimulation';
import { manageWaveState } from './useWaveManager';
import { DIRECTOR_CONFIG, GRID_SIZE } from '../../constants';

const TICK_RATE = 50;

export function useGameLoop(gameState: GameState, setGameState: React.Dispatch<React.SetStateAction<GameState>>) {
  const lastTickRef = useRef(Date.now());
  const supplyDropTimerRef = useRef(0);

  useEffect(() => {
    if (gameState.gamePhase !== 'PLAYING' && 
        gameState.gamePhase !== 'BOSS_FIGHT' && 
        gameState.gamePhase !== 'BOSS_DEATH') return;
    if (gameState.isGameOver || gameState.isChoosingAugment) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        if (prev.gameSpeed === 0) return prev;
        
        const ctx = buildSimulationContext(prev, TICK_RATE);
        const gameDelta = ctx.tickDelta;

        // Clone state for mutation
        let enemies = [...prev.enemies];
        let towers = [...prev.towers];
        let projectiles = [...prev.projectiles];
        let effects = [...prev.effects];
        let damageNumbers = [...prev.damageNumbers];
        let hazards = [...prev.hazards];
        let supplyDrops = [...prev.supplyDrops];
        let gold = prev.gold;
        let lives = prev.lives;
        let stats = { ...prev.stats };
        let bossAnnouncement = prev.bossAnnouncement;
        let gamePhase = prev.gamePhase;
        let activeBoss = prev.activeBoss;
        let waveStats = { ...prev.waveStats };
        let directorUpdates: Partial<GameState> = {};
        let currentBossDeathTimer = prev.bossDeathTimer;

        // BOSS_DEATH logic: Decrement timer but allow loop to proceed for visuals
        if (gamePhase === 'BOSS_DEATH') {
            currentBossDeathTimer -= gameDelta;
            // Update boss ref for death animation context
            const deadBoss = enemies.find(e => e.isBoss);
            activeBoss = deadBoss || null;
        }

        // Supply Drop Expiration
        supplyDrops = supplyDrops.filter(sd => {
            sd.lifetime -= gameDelta;
            return sd.lifetime > 0;
        });

        // Periodic Supply Drop Spawning (Director RELIEF state)
        if ((prev.waveStatus === 'SPAWNING' || prev.waveStatus === 'CLEARING') && prev.directorState === 'RELIEF') {
            supplyDropTimerRef.current += gameDelta;
            // Spawn approx every 9 seconds
            if (supplyDropTimerRef.current >= 9000) {
                if (supplyDrops.length < 3) {
                    const val = Math.floor(Math.random() * (DIRECTOR_CONFIG.SUPPLY_DROP_VALUE.MAX - DIRECTOR_CONFIG.SUPPLY_DROP_VALUE.MIN)) + DIRECTOR_CONFIG.SUPPLY_DROP_VALUE.MIN;
                    // Random position logic matches App.tsx
                    const x = Math.floor((Math.random() - 0.5) * GRID_SIZE * 1.5);
                    const z = Math.floor((Math.random() - 0.5) * GRID_SIZE * 1.5);
                    
                    supplyDrops.push({
                        id: `drop_${Date.now()}_${Math.random()}`,
                        position: { x, y: 0, z },
                        value: val,
                        lifetime: DIRECTOR_CONFIG.SUPPLY_DROP_LIFETIME,
                        maxLifetime: DIRECTOR_CONFIG.SUPPLY_DROP_LIFETIME
                    });
                }
                supplyDropTimerRef.current = 0;
            }
        } else if (prev.waveStatus === 'IDLE') {
            supplyDropTimerRef.current = 0;
        }

        // 1. Tower Stats Calculation
        towers = calculateTowerStats(towers, prev.activeAugments, ctx);

        // 2. Hazards Simulation
        const hazRes = simulateHazards(hazards, enemies, ctx);
        hazards = hazRes.hazards;
        enemies = hazRes.enemies;

        // 3. Enemy Movement
        // This creates NEW enemy objects, breaking references to 'activeBoss'
        const moveRes = simulateEnemyMovement(enemies, towers, ctx);
        enemies = moveRes.enemies;
        lives -= moveRes.livesLost;
        
        if (moveRes.livesLost > 0) {
            waveStats.livesLostThisWave += moveRes.livesLost;
        }

        // 4. Tower Combat
        const combatRes = simulateTowerCombat(towers, enemies, ctx);
        towers = combatRes.towers;
        projectiles.push(...combatRes.newProjectiles);
        damageNumbers.push(...combatRes.newDamageNumbers); // Capture hitscan damage

        // 5. Projectiles
        const projRes = simulateProjectiles(projectiles, enemies, ctx);
        projectiles = projRes.projectiles;
        enemies = projRes.enemies;
        effects.push(...projRes.newEffects);
        damageNumbers.push(...projRes.newDamageNumbers);

        // 6. Enemy Death
        const deathRes = processEnemyDeaths(enemies, gold, stats, ctx);
        enemies = deathRes.enemies;
        gold = deathRes.gold;
        stats = deathRes.stats;
        effects.push(...deathRes.newEffects);
        if (deathRes.bossDefeated) {
             gamePhase = 'BOSS_DEATH';
        }

        // 7. Boss Simulation
        // We must re-find the boss in the updated 'enemies' array to ensure we are simulating the current state
        const currentBossRef = enemies.find(e => e.isBoss);
        if (currentBossRef) {
            const bossRes = simulateBoss(enemies, towers, hazards, ctx);
            enemies = bossRes.enemies;
            towers = bossRes.towers;
            hazards = bossRes.hazards;
            effects.push(...bossRes.newEffects);
            if (bossRes.announcement) bossAnnouncement = bossRes.announcement;
        }

        // 8. Effects Cleanup
        effects = effects.filter(e => {
            e.lifetime -= 1 * prev.gameSpeed;
            return e.lifetime > 0;
        });
        damageNumbers = damageNumbers.filter(dn => {
            dn.lifetime -= 1 * prev.gameSpeed;
            return dn.lifetime > 0;
        });

        // 9. Wave Manager
        const waveRes = manageWaveState(enemies, prev.waveStatus, lives, gold, ctx);
        const waveStatus = waveRes.waveStatus;
        gold = waveRes.gold;
        directorUpdates = waveRes.directorUpdates || {};

        let isGameOver = prev.isGameOver;
        if (lives <= 0) {
            isGameOver = true;
            gamePhase = 'GAME_OVER';
        }

        // CRITICAL: Find the updated boss object to store in state, so HUD reflects damage
        const updatedBoss = enemies.find(e => e.isBoss) || null;

        return {
          ...prev,
          enemies, towers, projectiles, effects, damageNumbers, hazards, supplyDrops,
          gold, lives, stats, waveStatus, isGameOver, gamePhase, bossAnnouncement, waveStats,
          bossDeathTimer: deathRes.bossDefeated ? 5000 : currentBossDeathTimer,
          activeBoss: updatedBoss, // Update reference
          ...directorUpdates
        };
      });
    }, TICK_RATE);

    return () => clearInterval(interval);
  }, [gameState.gamePhase, gameState.isGameOver, gameState.isChoosingAugment, gameState.gameSpeed]);
}
