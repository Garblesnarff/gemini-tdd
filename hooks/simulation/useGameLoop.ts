import React, { useEffect, useRef } from 'react';
import { GameState, AchievementEvent } from '../../types';
import { buildSimulationContext } from './simulationUtils';
import { calculateTowerStats } from './useTowerStatCalculation';
import { simulateHazards } from './useHazardSimulation';
import { simulateEnemyMovement } from './useEnemyMovement';
import { simulateTowerCombat } from './useTowerCombat';
import { simulateProjectiles } from './useProjectileSimulation';
import { processEnemyDeaths } from './useEnemyDeath';
import { simulateBoss } from './useBossSimulation';
import { manageWaveState } from './useWaveManager';
import { simulateHealers } from './useHealerSimulation';
import { checkAchievements } from '../../achievements';
import { saveGame } from '../../saveSystem';
import { DIRECTOR_CONFIG, GRID_SIZE } from '../../constants';

const TICK_RATE = 50;

export function useGameLoop(gameState: GameState, setGameState: React.Dispatch<React.SetStateAction<GameState>>) {
  const lastTickRef = useRef(Date.now());
  const supplyDropTimerRef = useRef(0);

  useEffect(() => {
    if (gameState.gamePhase !== 'PLAYING' && 
        gameState.gamePhase !== 'BOSS_FIGHT' && 
        gameState.gamePhase !== 'BOSS_DEATH') {
        lastTickRef.current = Date.now();
        return;
    }
    
    if (gameState.isGameOver || gameState.isChoosingAugment) {
        lastTickRef.current = Date.now();
        return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const actualDelta = now - lastTickRef.current;
      lastTickRef.current = now;

      setGameState(prev => {
        if (prev.gameSpeed === 0) {
            return { 
                ...prev, 
                stats: { ...prev.stats, pauseDuration: prev.stats.pauseDuration + actualDelta } 
            };
        }
        
        const ctx = buildSimulationContext(prev, TICK_RATE);
        const gameDelta = ctx.tickDelta;
        
        const achievementEvents: AchievementEvent[] = [...prev.pendingAchievementEvents];

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

        if (gamePhase === 'BOSS_DEATH') {
            currentBossDeathTimer -= gameDelta;
            const deadBoss = enemies.find(e => e.isBoss);
            activeBoss = deadBoss || null;
        }

        supplyDrops = supplyDrops.filter(sd => {
            sd.lifetime -= gameDelta;
            return sd.lifetime > 0;
        });

        if ((prev.waveStatus === 'SPAWNING' || prev.waveStatus === 'CLEARING') && prev.directorState === 'RELIEF') {
            supplyDropTimerRef.current += gameDelta;
            if (supplyDropTimerRef.current >= 9000) {
                if (supplyDrops.length < 3) {
                    const val = Math.floor(Math.random() * (DIRECTOR_CONFIG.SUPPLY_DROP_VALUE.MAX - DIRECTOR_CONFIG.SUPPLY_DROP_VALUE.MIN)) + DIRECTOR_CONFIG.SUPPLY_DROP_VALUE.MIN;
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

        // 1. Tower Stats
        towers = calculateTowerStats(towers, prev.activeAugments, ctx);

        // 2. Movement
        const moveRes = simulateEnemyMovement(enemies, towers, ctx);
        enemies = moveRes.enemies;
        effects.push(...moveRes.newEffects);
        if (moveRes.livesLost > 0) {
            lives -= moveRes.livesLost;
            stats.livesLostThisRun += moveRes.livesLost;
            waveStats.livesLostThisWave += moveRes.livesLost;
            stats.waveStreakNoLoss = 0;
        }

        // 3. Healer Simulation
        const healerRes = simulateHealers(enemies, ctx);
        enemies = healerRes.enemies;
        effects.push(...healerRes.newEffects);

        // 4. Hazards
        const hazRes = simulateHazards(hazards, enemies, ctx);
        hazards = hazRes.hazards;
        enemies = hazRes.enemies;

        // 5. Combat
        const combatRes = simulateTowerCombat(towers, enemies, ctx);
        towers = combatRes.towers;
        projectiles.push(...combatRes.newProjectiles);
        damageNumbers.push(...combatRes.newDamageNumbers);
        
        // 6. Projectiles
        const projRes = simulateProjectiles(projectiles, enemies, ctx);
        projectiles = projRes.projectiles;
        enemies = projRes.enemies;
        effects.push(...projRes.newEffects);
        damageNumbers.push(...projRes.newDamageNumbers);

        // 7. Deaths
        const deathRes = processEnemyDeaths(enemies, towers, gold, stats, ctx);
        enemies = deathRes.enemies;
        gold = deathRes.gold;
        stats = deathRes.stats;
        effects.push(...deathRes.newEffects);
        
        deathRes.events.forEach(e => {
            if (e.type === 'ENEMY_KILLED') {
                achievementEvents.push({ 
                    type: 'ENEMY_KILLED', 
                    enemyType: e.enemyType as any, 
                    damage: 0, 
                    overkill: 0, 
                    source: 'TOWER'
                });
            }
            if (e.type === 'BOSS_DEFEATED') {
                gamePhase = 'BOSS_DEATH';
                achievementEvents.push({ type: 'BOSS_KILLED', bossId: e.bossId, bossType: e.bossType });
            }
        });

        // 8. Boss
        const currentBossRef = enemies.find(e => e.isBoss);
        if (currentBossRef) {
            const bossRes = simulateBoss(enemies, towers, hazards, ctx);
            enemies = bossRes.enemies;
            towers = bossRes.towers;
            hazards = bossRes.hazards;
            effects.push(...bossRes.newEffects);
            if (bossRes.announcement) bossAnnouncement = bossRes.announcement;
        }

        // 9. Cleanup
        effects = effects.filter(e => { e.lifetime -= 1 * prev.gameSpeed; return e.lifetime > 0; });
        damageNumbers = damageNumbers.filter(dn => { dn.lifetime -= 1 * prev.gameSpeed; return dn.lifetime > 0; });

        // 10. Wave Manager
        const waveRes = manageWaveState(enemies, prev.waveStatus, lives, gold, ctx);
        const waveStatus = waveRes.waveStatus;
        gold = waveRes.gold;
        directorUpdates = waveRes.directorUpdates || {};
        
        waveRes.events.forEach(e => {
            if (e.type === 'WAVE_COMPLETE') {
                achievementEvents.push({ 
                    type: 'WAVE_COMPLETE', 
                    waveNumber: e.waveNumber, 
                    livesLost: waveStats.livesLostThisWave 
                });
            }
        });

        let isGameOver = prev.isGameOver;
        if (lives <= 0) {
            isGameOver = true;
            gamePhase = 'GAME_OVER';
        }

        // 11. Achievements & Persistence
        achievementEvents.push({ type: 'GAME_TICK' });
        const { unlocked, updatedMeta } = checkAchievements(achievementEvents, { ...prev, gold, lives, stats, towers }, prev.metaProgress);
        
        if (unlocked.length > 0) {
            saveGame(prev.stageProgress, updatedMeta);
        }
        
        const newToasts = unlocked.map(ach => ({ achievement: ach, timestamp: Date.now() }));

        const updatedBoss = enemies.find(e => e.isBoss) || null;

        return {
          ...prev,
          enemies, towers, projectiles, effects, damageNumbers, hazards, supplyDrops,
          gold, lives, stats, waveStatus, isGameOver, gamePhase, bossAnnouncement, waveStats,
          bossDeathTimer: deathRes.bossDefeated ? 5000 : currentBossDeathTimer,
          activeBoss: updatedBoss,
          ...directorUpdates,
          metaProgress: updatedMeta,
          achievementToastQueue: [...prev.achievementToastQueue, ...newToasts],
          pendingAchievementEvents: []
        };
      });
    }, TICK_RATE);

    return () => clearInterval(interval);
  }, [gameState.gamePhase, gameState.isGameOver, gameState.isChoosingAugment, gameState.gameSpeed]);
}