
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Enemy, Tower, Projectile, Effect, DamageNumber, TowerType, EnemyType, Vector3Tuple, TechPath, PassiveType, ActiveAbilityType, TargetPriority, Augment, AugmentType, StageId, Boss, BossAbilityType, DirectorActionType, Hazard, MetaProgress, SupplyDrop, AchievementEvent } from './types';
import { GRID_SIZE, TOWER_STATS, ENEMY_STATS, UPGRADE_CONFIG, MAX_LEVEL, SELL_REFUND_RATIO, ABILITY_MATRIX, AUGMENT_POOL, STAGE_CONFIGS, getWaveDefinition, INITIAL_STAGE_PROGRESS, INITIAL_META_PROGRESS, TECH_PATH_INFO, TACTICAL_INTEL_POOL, STAGE_CORE_REWARDS, DIRECTOR_CONFIG } from './constants';
import HUD from './components/HUD';
import Scene from './components/Scene';
import MetaShop from './components/MetaShop';
import AchievementsPanel from './components/AchievementsPanel';
import AchievementToast from './components/AchievementToast';
import { saveGame, loadGame, clearSave, hasSaveData } from './saveSystem';
import { getWaveIntel } from './geminiService';
import { useGameLoop } from './hooks/simulation/useGameLoop';
import { getAppliedMetaEffects } from './metaUpgrades';
import { checkAchievements } from './achievements';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    gold: STAGE_CONFIGS[StageId.STAGE_1].startingGold,
    lives: STAGE_CONFIGS[StageId.STAGE_1].startingLives,
    wave: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    effects: [],
    damageNumbers: [],
    hazards: [],
    supplyDrops: [],
    gameSpeed: 1,
    isGameOver: false,
    waveStatus: 'IDLE',
    waveIntel: 'Ready for deployment, Commander.',
    selectedTowerId: null,
    activeAugments: [],
    augmentChoices: [],
    isChoosingAugment: false,
    targetingAbility: null,
    currentStage: StageId.STAGE_1,
    stageProgress: INITIAL_STAGE_PROGRESS,
    metaProgress: INITIAL_META_PROGRESS,
    metaEffects: getAppliedMetaEffects(INITIAL_META_PROGRESS),
    activeBoss: null,
    bossAnnouncement: null,
    gamePhase: 'MENU',
    stats: {
        startTime: 0,
        endTime: 0,
        totalGoldEarned: 0,
        towersBuilt: 0,
        abilitiesUsed: 0,
        enemiesKilled: 0,
        towersSold: 0,
        livesLostThisRun: 0,
        waveStreakNoLoss: 0,
        towersBuiltByType: {},
        abilitiesUsedThisRun: [],
        interestEarnedThisRun: 0,
        suppliesCollectedThisRun: 0,
        experiencedDirectorPressure: false,
        experiencedDirectorRelief: false,
        augmentsSkipped: 0,
        damageByTowerToBoss: {},
        bossSpawnTime: 0,
        resetsThisSession: 0,
        wavesOn2xSpeed: 0,
        pauseDuration: 0
    },
    bossDeathTimer: 0,
    directorState: 'NEUTRAL',
    directorStreak: 0,
    waveStats: {
        livesLostThisWave: 0,
        waveStartTime: 0,
        waveEndTime: 0,
        consecutiveCleanWaves: 0
    },
    directorAction: 'NONE',
    directorScaling: 1,
    directorGoldBonus: 1,
    directorCooldownMult: 1,
    achievementToastQueue: [],
    pendingAchievementEvents: [],
    tutorialStep: null
  });

  const [selectedTowerType, setSelectedTowerType] = useState<TowerType>(TowerType.BASIC);
  const [pendingPlacement, setPendingPlacement] = useState<Vector3Tuple | null>(null);
  const [canContinue, setCanContinue] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  
  const spawnQueueRef = useRef<{time: number, type: EnemyType, pathIndex: number, isElite?: boolean}[]>([]);
  const waveTimerRef = useRef(0);

  // Initial Load Check
  useEffect(() => {
    const loaded = loadGame();
    if (loaded) {
        setCanContinue(true);
        setGameState(prev => ({
            ...prev,
            stageProgress: loaded.stageProgress,
            metaProgress: loaded.metaProgress,
            metaEffects: getAppliedMetaEffects(loaded.metaProgress)
        }));
    }
  }, []);

  // Tutorial Trigger Logic
  useEffect(() => {
    if (gameState.gamePhase === 'PLAYING' && !gameState.metaProgress.hasSeenTutorial && gameState.tutorialStep === null) {
        setGameState(prev => ({ ...prev, tutorialStep: 1 }));
    }
  }, [gameState.gamePhase, gameState.metaProgress.hasSeenTutorial]);

  // Boss Announcement Clearer
  useEffect(() => {
    if (gameState.bossAnnouncement) {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, bossAnnouncement: null }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [gameState.bossAnnouncement]);

  // Use modularized game loop
  useGameLoop(gameState, setGameState);

  // Handle Stage Completion & Spawning
  useEffect(() => {
    if (gameState.gamePhase !== 'PLAYING' && gameState.gamePhase !== 'BOSS_FIGHT' && gameState.gamePhase !== 'BOSS_DEATH') return;
    
    const interval = setInterval(() => {
        setGameState(prev => {
            if (prev.gamePhase === 'BOSS_DEATH' && prev.bossDeathTimer <= 0) {
                 const nextStageProgress = { ...prev.stageProgress };
                 let nextMetaProgress = { ...prev.metaProgress };
                 const nextStats = { ...prev.stats };
                 nextStats.endTime = Date.now();
                 
                 const stars = prev.lives >= 15 ? 3 : prev.lives >= 10 ? 2 : 1;
                 const stages = Object.keys(STAGE_CONFIGS);
                 const currentIdx = stages.indexOf(prev.currentStage);
                 const currentProgress = nextStageProgress[prev.currentStage];
                 const isFirstClear = !currentProgress.completed;

                 nextStageProgress[prev.currentStage] = { 
                     ...currentProgress, 
                     completed: true, 
                     stars: Math.max(currentProgress.stars, stars) as 0|1|2|3 
                 };
                 
                 if (currentIdx < stages.length - 1) {
                     const nextStageId = stages[currentIdx + 1] as StageId;
                     nextStageProgress[nextStageId] = { ...nextStageProgress[nextStageId], unlocked: true };
                 }

                 const rewardConfig = STAGE_CORE_REWARDS[prev.currentStage];
                 let earnedCores = isFirstClear ? rewardConfig.firstClear : rewardConfig.replay;
                 if (stars === 3) earnedCores = Math.floor(earnedCores * 1.5);

                 nextMetaProgress.dataCores += earnedCores;
                 nextMetaProgress.totalCoresEarned += earnedCores;
                 nextMetaProgress.stats.totalEnemiesKilled += nextStats.enemiesKilled;
                 nextMetaProgress.stats.totalGoldEarned += nextStats.totalGoldEarned;
                 nextMetaProgress.stats.totalBossesDefeated += 1;
                 nextMetaProgress.stats.totalPlayTime += (nextStats.endTime - nextStats.startTime);
                 nextStats.coresEarned = earnedCores;

                 const stageCompleteEvent: AchievementEvent = {
                    type: 'STAGE_COMPLETE',
                    stageId: prev.currentStage,
                    stats: nextStats
                 };

                 const { unlocked: finalUnlocked, updatedMeta: finalMeta } = checkAchievements(
                    [stageCompleteEvent],
                    { ...prev, stats: nextStats },
                    nextMetaProgress
                 );
                 
                 nextMetaProgress = finalMeta;
                 const stageToasts = finalUnlocked.map(ach => ({ achievement: ach, timestamp: Date.now() }));

                 saveGame(nextStageProgress, nextMetaProgress);

                 return {
                     ...prev,
                     gamePhase: 'STAGE_COMPLETE',
                     waveStatus: 'IDLE',
                     enemies: [],
                     activeBoss: null,
                     stageProgress: nextStageProgress,
                     metaProgress: nextMetaProgress,
                     stats: nextStats,
                     achievementToastQueue: [...prev.achievementToastQueue, ...stageToasts]
                 };
            }

            if (prev.waveStatus === 'SPAWNING') {
                const gameDelta = 50 * prev.gameSpeed;
                waveTimerRef.current += gameDelta;
                const nextEnemies = [...prev.enemies];
                let nextStatus = prev.waveStatus;
                let nextActiveBoss = prev.activeBoss;
                let nextPhase = prev.gamePhase;
                let nextBossAnnouncement = prev.bossAnnouncement;

                while (spawnQueueRef.current.length > 0 && spawnQueueRef.current[0].time <= waveTimerRef.current) {
                    const spawnEvent = spawnQueueRef.current.shift();
                    if (spawnEvent) {
                        const stageConfig = STAGE_CONFIGS[prev.currentStage];
                        const path = stageConfig.paths[spawnEvent.pathIndex];
                        const startPos = path[0];
                        
                        // ELITE SCALING
                        const isElite = spawnEvent.isElite;
                        let hpMult = prev.directorScaling;
                        let spdMult = 1.0;
                        if (isElite) {
                            hpMult *= 2.0;
                            spdMult *= 1.5;
                        }

                        if (spawnEvent.type === EnemyType.BOSS) {
                            const bossConfig = stageConfig.bossConfig;
                            const boss: Boss = {
                                id: `boss_${Date.now()}`,
                                type: EnemyType.BOSS,
                                health: bossConfig.baseHealth * hpMult,
                                maxHealth: bossConfig.baseHealth * hpMult,
                                speed: bossConfig.speed,
                                position: { ...startPos },
                                pathId: spawnEvent.pathIndex,
                                waypointIndex: 0,
                                progress: 0,
                                isBoss: true,
                                bossConfig: bossConfig,
                                currentPhase: 0,
                                abilityCooldowns: {},
                                isShielded: false,
                                triggeredSpawnIndices: [],
                                debuffs: []
                            };
                            nextEnemies.push(boss);
                            nextActiveBoss = boss;
                            nextPhase = 'BOSS_FIGHT';
                            nextBossAnnouncement = bossConfig.phases[0].announcement;
                        } else {
                            const eStats = ENEMY_STATS[spawnEvent.type];
                            // Init specific enemy fields
                            const newEnemy: Enemy = {
                                id: `enemy_${Date.now()}_${Math.random()}`,
                                type: spawnEvent.type,
                                health: eStats.health * stageConfig.enemyScaling * hpMult,
                                maxHealth: eStats.health * stageConfig.enemyScaling * hpMult,
                                speed: eStats.speed * spdMult,
                                position: { ...startPos },
                                pathId: spawnEvent.pathIndex,
                                waypointIndex: 0,
                                progress: 0,
                                isElite: isElite,
                                debuffs: [],
                                ...(spawnEvent.type === EnemyType.SHIELDED && {
                                    shield: (eStats as any).shield * hpMult,
                                    maxShield: (eStats as any).shield * hpMult,
                                    shieldRegenTimer: 0,
                                    shieldBroken: false
                                }),
                                ...(spawnEvent.type === EnemyType.HEALER && {
                                    healCooldown: (eStats as any).healInterval || 2000
                                }),
                                ...(spawnEvent.type === EnemyType.PHASER && {
                                    isPhased: false,
                                    phaseTimer: (eStats as any).solidDuration || 3000
                                }),
                                ...(spawnEvent.type === EnemyType.ARMORED && {
                                    armor: (eStats as any).armor || 10
                                })
                            };
                            nextEnemies.push(newEnemy);
                        }
                    }
                }

                if (spawnQueueRef.current.length === 0) nextStatus = 'CLEARING';
                return { ...prev, enemies: nextEnemies, waveStatus: nextStatus, activeBoss: nextActiveBoss, gamePhase: nextPhase, bossAnnouncement: nextBossAnnouncement };
            }
            return prev;
        });
    }, 50);

    return () => clearInterval(interval);
  }, [gameState.gamePhase, gameState.gameSpeed, gameState.currentStage]);

  // --- ACTIONS ---

  const triggerSpawning = useCallback((waveNum: number, stage: StageId, directorState: string) => {
    const stageConfig = STAGE_CONFIGS[stage];
    const waveDef = getWaveDefinition(stage, waveNum);
    
    const newQueue: {time: number, type: EnemyType, pathIndex: number, isElite: boolean}[] = [];
    let pIdx = 0;
    
    waveDef.composition.forEach(g => {
        const bursts = Math.ceil(g.count / (g.burstSize || 1));
        const groupIsElite = directorState === 'PRESSURE' && Math.random() < DIRECTOR_CONFIG.ELITE_CHANCE;

        for(let b=0; b<bursts; b++) {
            const t = g.startDelay + b * g.interval;
            const count = Math.min(g.burstSize || 1, g.count - b * (g.burstSize || 1));
            for(let i=0; i<count; i++) {
                newQueue.push({
                    time: t + Math.random() * 100,
                    type: g.type,
                    pathIndex: pIdx % stageConfig.paths.length,
                    isElite: groupIsElite
                });
                pIdx++;
            }
        }
    });

    if (waveNum === stageConfig.waves) {
        newQueue.push({ time: 5000, type: EnemyType.BOSS, pathIndex: 0, isElite: false });
    }
    
    newQueue.sort((a,b) => a.time - b.time);
    spawnQueueRef.current = newQueue;
    waveTimerRef.current = 0;

    setGameState(prev => {
        const newSupplyDrops = [...prev.supplyDrops];
        if (prev.directorState === 'RELIEF' && Math.random() < DIRECTOR_CONFIG.SUPPLY_DROP_CHANCE) {
            const val = Math.floor(Math.random() * (DIRECTOR_CONFIG.SUPPLY_DROP_VALUE.MAX - DIRECTOR_CONFIG.SUPPLY_DROP_VALUE.MIN)) + DIRECTOR_CONFIG.SUPPLY_DROP_VALUE.MIN;
            let x = Math.floor((Math.random() - 0.5) * GRID_SIZE * 1.5);
            let z = Math.floor((Math.random() - 0.5) * GRID_SIZE * 1.5);
            newSupplyDrops.push({
                id: `drop_${Date.now()}_${Math.random()}`,
                position: { x, y: 0, z },
                value: val,
                lifetime: DIRECTOR_CONFIG.SUPPLY_DROP_LIFETIME,
                maxLifetime: DIRECTOR_CONFIG.SUPPLY_DROP_LIFETIME
            });
        }

        return {
            ...prev,
            waveStatus: 'SPAWNING',
            supplyDrops: newSupplyDrops,
            waveStats: {
                ...prev.waveStats,
                livesLostThisWave: 0,
                waveStartTime: Date.now(),
                waveEndTime: 0
            },
            waveIntel: prev.waveIntel || "Scanning enemy frequencies..."
        }
    });

    const stageName = stageConfig.name;
    getWaveIntel(waveNum, stageName).then(intel => {
        if (intel) setGameState(p => ({ ...p, waveIntel: intel }));
    });
  }, []);

  const handleStartWave = useCallback(() => {
    if (gameState.waveStatus !== 'IDLE' || gameState.isChoosingAugment) return;
    
    const nextWave = gameState.wave + 1;
    const isAugmentWave = nextWave > 1 && (nextWave % 5 === 0);
    
    if (isAugmentWave) {
        setGameState(prev => {
            const pool = [...AUGMENT_POOL];
            const choices: Augment[] = [];
            const count = Math.min(3, pool.length);
            for(let k=0; k<count; k++) {
                const idx = Math.floor(Math.random() * pool.length);
                const picked = pool.splice(idx, 1)[0];
                if (picked) choices.push(picked);
            }
            return {
                ...prev,
                wave: nextWave,
                isChoosingAugment: true,
                augmentChoices: choices,
                waveStatus: 'IDLE'
            };
        });
    } else {
        setGameState(prev => ({ ...prev, wave: nextWave }));
        triggerSpawning(nextWave, gameState.currentStage, gameState.directorState);
    }
  }, [gameState.wave, gameState.waveStatus, gameState.currentStage, gameState.directorState, triggerSpawning]);

  const handlePlaceTower = (pos: Vector3Tuple) => { setPendingPlacement(pos); };

  const handleConfirmPlacement = () => {
      if (!pendingPlacement) return;
      
      const stats = TOWER_STATS[selectedTowerType];
      const cost = Math.floor(stats.cost * gameState.metaEffects.towerCostMultiplier);

      if (gameState.gold >= cost) {
          const newTower: Tower = {
              id: Math.random().toString(),
              type: selectedTowerType,
              position: pendingPlacement,
              range: stats.range,
              fireRate: stats.fireRate,
              damage: stats.damage,
              baseRange: stats.range,
              baseFireRate: stats.fireRate,
              baseDamage: stats.damage,
              cooldown: 0,
              lastShotTime: 0,
              level: 1,
              techPath: TechPath.NONE,
              totalInvested: cost,
              passiveType: PassiveType.NONE,
              activeType: ActiveAbilityType.NONE,
              abilityCooldown: 0,
              abilityMaxCooldown: 0,
              abilityDuration: 0,
              targetPriority: TargetPriority.FIRST,
              activeBuffs: []
          };
          setGameState(prev => ({
              ...prev,
              gold: prev.gold - cost,
              towers: [...prev.towers, newTower],
              stats: { 
                  ...prev.stats, 
                  towersBuilt: prev.stats.towersBuilt + 1,
                  towersBuiltByType: {
                      ...prev.stats.towersBuiltByType,
                      [selectedTowerType]: (prev.stats.towersBuiltByType[selectedTowerType] || 0) + 1
                  }
              },
              pendingAchievementEvents: [
                  ...prev.pendingAchievementEvents,
                  { type: 'TOWER_PLACED', towerType: selectedTowerType }
              ]
          }));
          setPendingPlacement(null);
      }
  };

  const executeAbility = (
    prev: GameState, 
    currentEnemies: Enemy[], 
    tower: Tower, 
    type: ActiveAbilityType, 
    targetPos?: Vector3Tuple
  ): { nextEnemies: Enemy[], newEffects: Effect[], newHazards: Hazard[], modifiedTower: Tower } => {
      const config = ABILITY_MATRIX[tower.type][tower.techPath];
      if (!config) return { nextEnemies: currentEnemies, newEffects: [], newHazards: [], modifiedTower: tower };

      const newEffects: Effect[] = [];
      const newHazards: Hazard[] = [];
      let modTower = { ...tower };
      let nextEnemies = [...currentEnemies];

      // Apply Meta Multipliers
      const tech = tower.techPath;
      const dmgMult = prev.metaEffects.abilityDamageMultiplier[tech] || 1;
      const cdMult = prev.metaEffects.abilityCooldownMultiplier[tech] || 1;
      const durMult = prev.metaEffects.abilityDurationMultiplier[tech] || 1;

      modTower.abilityCooldown = config.cooldown * prev.directorCooldownMult * cdMult;
      modTower.abilityMaxCooldown = config.cooldown * prev.directorCooldownMult * cdMult;

      if (config.type === 'INSTANT_AOE') {
          // ERUPTION or TEMPORAL_ANCHOR
          const effectType = type === ActiveAbilityType.TEMPORAL_ANCHOR ? 'FREEZE_WAVE' : 'NOVA';
          newEffects.push({ id: Math.random().toString(), type: effectType, position: { ...tower.position }, color: config.color, scale: config.range || 5, lifetime: 40, maxLifetime: 40 });
          
          nextEnemies = nextEnemies.map(e => {
             const dist = Math.sqrt(Math.pow(e.position.x - tower.position.x, 2) + Math.pow(e.position.z - tower.position.z, 2));
             if (dist <= (config.range || 5)) {
                 const nextE = { ...e };
                 if (type === ActiveAbilityType.ERUPTION) nextE.health -= ((config.damage || 0) * dmgMult);
                 if (type === ActiveAbilityType.TEMPORAL_ANCHOR) {
                     nextE.freezeTimer = (config.duration || 4000) * durMult;
                     nextE.frozen = 0;
                 }
                 return nextE;
             }
             return e;
          });
      }
      else if (config.type === 'TARGETED_AOE' && targetPos) {
          // ORBITAL, NAPALM, SINGULARITY
          if (type === ActiveAbilityType.ORBITAL_STRIKE) {
              newEffects.push({ id: Math.random().toString(), type: 'ORBITAL_STRIKE', position: targetPos, color: config.color, scale: config.range || 4, lifetime: 60, maxLifetime: 60 });
              nextEnemies = nextEnemies.map(e => {
                  const d = Math.sqrt(Math.pow(e.position.x - targetPos.x, 2) + Math.pow(e.position.z - targetPos.z, 2));
                  if (d <= (config.range || 4)) {
                      return { ...e, health: e.health - ((config.damage || 0) * dmgMult) };
                  }
                  return e;
              });
          }
          else if (type === ActiveAbilityType.NAPALM || type === ActiveAbilityType.SINGULARITY) {
               newHazards.push({
                   id: Math.random().toString(),
                   type: type === ActiveAbilityType.NAPALM ? 'NAPALM' : 'SINGULARITY',
                   position: targetPos,
                   radius: config.range || 4,
                   duration: (config.duration || 5000) * durMult,
                   value: type === ActiveAbilityType.NAPALM ? ((config.value || config.damage || 0) * dmgMult) : (config.value || 0.1),
                   color: config.color
               });
          }
      }
      else if (config.type === 'SELF_BUFF' || config.type === 'PROJECTILE_MOD' || config.type === 'DEBUFF' || config.type === 'ZONE') {
          // OVERCLOCK, BARRAGE, PERFORATION, CHAIN_LIGHTNING, IGNITION, VOID_MARK, ENTROPY_FIELD
          if (!modTower.activeBuffs) modTower.activeBuffs = [];
          
          let buffType = type as string; 
          if (type === ActiveAbilityType.IGNITION_BURST) buffType = 'IGNITION';
          
          modTower.activeBuffs.push({
              type: buffType as any,
              duration: config.duration ? config.duration * durMult : undefined,
              stacks: type === ActiveAbilityType.IGNITION_BURST ? 30 : undefined
          });
          
          if (type === ActiveAbilityType.ENTROPY_FIELD) {
              newEffects.push({ id: Math.random().toString(), type: 'NOVA', position: tower.position, color: config.color, scale: config.range || 3, lifetime: 20, maxLifetime: 20 });
          }
          if (type === ActiveAbilityType.VOID_MARK) {
              modTower.activeBuffs.push({ type: 'VOID_MARK_READY' });
          }
      }

      return { nextEnemies, newEffects, newHazards, modifiedTower: modTower };
  };

  const handleBatchTrigger = useCallback((type: ActiveAbilityType) => {
      setGameState(prev => {
          const needsTarget = prev.towers.some(t => {
              const cfg = ABILITY_MATRIX[t.type][t.techPath];
              return cfg?.id === type && cfg.requiresTargeting;
          });

          if (needsTarget) {
              return { ...prev, targetingAbility: type };
          }

          let currentEnemies = [...prev.enemies];
          const newEffects: Effect[] = [...prev.effects];
          const newHazards: Hazard[] = [...prev.hazards];
          const abilityEvents: AchievementEvent[] = [];
          let abilitiesCount = 0;
          
          const newTowers = prev.towers.map(t => {
              const cfg = ABILITY_MATRIX[t.type][t.techPath];
              if (cfg?.id === type && t.abilityCooldown <= 0) {
                  const res = executeAbility(prev, currentEnemies, t, type);
                  currentEnemies = res.nextEnemies;
                  newEffects.push(...res.newEffects);
                  newHazards.push(...res.newHazards);
                  abilityEvents.push({ type: 'ABILITY_USED', abilityType: type, towerType: t.type });
                  abilitiesCount++;
                  return res.modifiedTower;
              }
              return t;
          });

          if (abilitiesCount === 0) return prev;

          return { 
              ...prev, 
              towers: newTowers, 
              enemies: currentEnemies,
              effects: newEffects, 
              hazards: newHazards,
              stats: { ...prev.stats, abilitiesUsed: prev.stats.abilitiesUsed + abilitiesCount },
              pendingAchievementEvents: [...prev.pendingAchievementEvents, ...abilityEvents]
          };
      });
  }, []);

  const handleSingleTrigger = (towerId: string) => {
      setGameState(prev => {
          const tower = prev.towers.find(t => t.id === towerId);
          if (!tower) return prev;
          
          const cfg = ABILITY_MATRIX[tower.type][tower.techPath];
          if (!cfg || tower.abilityCooldown > 0) return prev;

          if (cfg.requiresTargeting) {
               return { ...prev, targetingAbility: cfg.id as ActiveAbilityType };
          }

          const res = executeAbility(prev, prev.enemies, tower, cfg.id as ActiveAbilityType);
          const newTowers = prev.towers.map(t => t.id === towerId ? res.modifiedTower : t);
          
          return { 
              ...prev, 
              towers: newTowers, 
              enemies: res.nextEnemies,
              effects: [...prev.effects, ...res.newEffects], 
              hazards: [...prev.hazards, ...res.newHazards],
              stats: { ...prev.stats, abilitiesUsed: prev.stats.abilitiesUsed + 1 },
              pendingAchievementEvents: [
                  ...prev.pendingAchievementEvents, 
                  { type: 'ABILITY_USED', abilityType: cfg.id as ActiveAbilityType, towerType: tower.type }
              ]
          };
      });
  };

  const handleTargetedAbility = (pos: Vector3Tuple) => {
      const type = gameState.targetingAbility;
      if (!type) return;

      setGameState(prev => {
          const readyTowerIndex = prev.towers.findIndex(t => {
              const cfg = ABILITY_MATRIX[t.type][t.techPath];
              return cfg?.id === type && t.abilityCooldown <= 0;
          });

          if (readyTowerIndex === -1) return { ...prev, targetingAbility: null };

          const tower = prev.towers[readyTowerIndex];
          const res = executeAbility(prev, prev.enemies, tower, type, pos);

          const newTowers = [...prev.towers];
          newTowers[readyTowerIndex] = res.modifiedTower;

          return {
              ...prev,
              towers: newTowers,
              enemies: res.nextEnemies,
              effects: [...prev.effects, ...res.newEffects],
              hazards: [...prev.hazards, ...res.newHazards],
              targetingAbility: null,
              stats: { ...prev.stats, abilitiesUsed: prev.stats.abilitiesUsed + 1 },
              pendingAchievementEvents: [
                  ...prev.pendingAchievementEvents, 
                  { type: 'ABILITY_USED', abilityType: type, towerType: tower.type }
              ]
          };
      });
  };

  const handleStartStage = (id: StageId) => {
      const config = STAGE_CONFIGS[id];
      const effects = getAppliedMetaEffects(gameState.metaProgress);

      setGameState(prev => ({
          ...prev,
          currentStage: id,
          gold: config.startingGold + effects.bonusStartingGold,
          lives: config.startingLives + effects.bonusStartingLives,
          metaEffects: effects,
          wave: 0,
          enemies: [],
          towers: [],
          projectiles: [],
          effects: [],
          damageNumbers: [],
          hazards: [],
          supplyDrops: [],
          gamePhase: 'PLAYING',
          waveStatus: 'IDLE',
          activeBoss: null,
          bossAnnouncement: null,
          isChoosingAugment: false,
          stats: { 
              ...INITIAL_META_PROGRESS.stats, 
              startTime: Date.now(), 
              totalGoldEarned: 0, 
              towersBuilt: 0, 
              abilitiesUsed: 0, 
              enemiesKilled: 0,
              towersSold: 0,
              livesLostThisRun: 0,
              waveStreakNoLoss: 0,
              towersBuiltByType: {},
              abilitiesUsedThisRun: [],
              interestEarnedThisRun: 0,
              suppliesCollectedThisRun: 0,
              experiencedDirectorPressure: false,
              experiencedDirectorRelief: false,
              augmentsSkipped: 0,
              damageByTowerToBoss: {},
              bossSpawnTime: 0,
              resetsThisSession: prev.stats.resetsThisSession + 1,
              wavesOn2xSpeed: 0,
              pauseDuration: 0
          },
          directorState: 'NEUTRAL',
          directorStreak: 0,
          pendingDirectorState: undefined,
          directorScaling: 1,
          directorGoldBonus: 1,
          directorCooldownMult: 1,
          directorAction: 'NONE',
          waveStats: { livesLostThisWave: 0, waveStartTime: 0, waveEndTime: 0, consecutiveCleanWaves: 0 },
          pendingAchievementEvents: []
      }));
  };
  
  const handleCollectSupplyDrop = (id: string) => {
      setGameState(prev => {
          const drop = prev.supplyDrops.find(d => d.id === id);
          if (!drop) return prev;
          
          return {
              ...prev,
              gold: prev.gold + drop.value,
              supplyDrops: prev.supplyDrops.filter(d => d.id !== id),
              damageNumbers: [...prev.damageNumbers, {
                  id: Math.random().toString(),
                  position: { ...drop.position, y: 1 },
                  value: drop.value,
                  color: '#4ade80',
                  lifetime: 40,
                  maxLifetime: 40,
                  isCritical: true
              }],
              stats: {
                  ...prev.stats,
                  suppliesCollectedThisRun: prev.stats.suppliesCollectedThisRun + 1
              },
              pendingAchievementEvents: [
                  ...prev.pendingAchievementEvents,
                  { type: 'SUPPLY_COLLECTED', value: drop.value }
              ]
          };
      });
  };

  const handleBuyMetaUpgrade = (upgradeId: string, cost: number) => {
      setGameState(prev => {
          if (prev.metaProgress.dataCores < cost) return prev;
          
          const nextMeta = { ...prev.metaProgress };
          nextMeta.dataCores -= cost;
          nextMeta.upgradeLevels[upgradeId] = (nextMeta.upgradeLevels[upgradeId] || 0) + 1;
          
          saveGame(prev.stageProgress, nextMeta);
          
          return {
              ...prev,
              metaProgress: nextMeta
          };
      });
  };

  return (
    <>
      <Canvas shadows camera={{ position: [0, 15, 15], fov: 45 }}>
        <Scene 
            gameState={gameState} 
            onPlaceTower={gameState.targetingAbility ? handleTargetedAbility : handlePlaceTower} 
            onSelectTower={(id) => setGameState(p => ({ ...p, selectedTowerId: id }))}
            selectedTowerType={selectedTowerType}
            pendingPlacement={pendingPlacement}
            paths={STAGE_CONFIGS[gameState.currentStage].paths}
            environment={STAGE_CONFIGS[gameState.currentStage].environment}
            onCollectSupplyDrop={handleCollectSupplyDrop}
        />
        <OrbitControls minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 2.5} minDistance={10} maxDistance={40} />
      </Canvas>
      
      <div className="fixed top-24 right-4 z-50 flex flex-col items-end pointer-events-none">
          {gameState.achievementToastQueue.map((item) => (
              <AchievementToast 
                key={`${item.achievement.id}_${item.timestamp}`} 
                achievement={item.achievement} 
                onDismiss={() => {
                    setGameState(prev => ({
                        ...prev,
                        achievementToastQueue: prev.achievementToastQueue.filter(t => t.timestamp !== item.timestamp)
                    }));
                }} 
              />
          ))}
      </div>

      {gameState.gamePhase === 'SHOP' && (
          <MetaShop 
              metaProgress={gameState.metaProgress} 
              onPurchase={handleBuyMetaUpgrade}
              onBack={() => setGameState(p => ({ ...p, gamePhase: 'STAGE_SELECT' }))}
          />
      )}

      {showAchievements && (
          <AchievementsPanel 
              metaProgress={gameState.metaProgress} 
              onBack={() => setShowAchievements(false)} 
          />
      )}
      
      <HUD 
        gameState={gameState}
        onStartWave={handleStartWave}
        onSelectTower={setSelectedTowerType}
        selectedTowerType={selectedTowerType}
        onReset={() => handleStartStage(gameState.currentStage)}
        onUpgradeTower={(id, path) => {
            setGameState(prev => {
                const tower = prev.towers.find(t => t.id === id);
                if (!tower) return prev;
                // @ts-ignore
                const nextLvl = tower.level + 1;
                const cost = UPGRADE_CONFIG.costs[nextLvl];
                if (prev.gold < cost) return prev;

                const config = UPGRADE_CONFIG.paths[path]?.[nextLvl];
                if (!config) return prev;
                
                let activeType = tower.activeType;
                if (nextLvl === 3) {
                    const abilityConfig = ABILITY_MATRIX[tower.type][path];
                    if (abilityConfig) activeType = abilityConfig.id as ActiveAbilityType;
                }

                const towers = prev.towers.map(t => {
                    if (t.id === id) {
                        return {
                            ...t,
                            level: nextLvl,
                            techPath: path,
                            damage: config.damage ? t.baseDamage * config.damage : t.damage,
                            range: config.range ? t.baseRange * config.range : t.range,
                            fireRate: config.fireRate ? t.baseFireRate * config.fireRate : t.fireRate,
                            passiveType: config.passive || t.passiveType,
                            activeType: activeType,
                            totalInvested: t.totalInvested + cost
                        };
                    }
                    return t;
                });
                return { 
                    ...prev, 
                    gold: prev.gold - cost, 
                    towers,
                    pendingAchievementEvents: [
                        ...prev.pendingAchievementEvents,
                        { type: 'TOWER_UPGRADED', towerId: id, towerType: tower.type, newLevel: nextLvl, techPath: path }
                    ]
                };
            });
        }}
        onDeselectTower={() => setGameState(p => ({ ...p, selectedTowerId: null }))}
        onSellTower={(id) => {
            setGameState(prev => {
                const t = prev.towers.find(t => t.id === id);
                if (!t) return prev;
                const sellRatio = prev.metaEffects ? (SELL_REFUND_RATIO + (prev.metaEffects.sellRatio - 0.7)) : SELL_REFUND_RATIO;
                return {
                    ...prev,
                    gold: prev.gold + Math.floor(t.totalInvested * sellRatio),
                    towers: prev.towers.filter(t => t.id !== id),
                    selectedTowerId: null,
                    stats: { ...prev.stats, towersSold: prev.stats.towersSold + 1 },
                    pendingAchievementEvents: [
                        ...prev.pendingAchievementEvents,
                        { type: 'TOWER_SOLD', towerId: id }
                    ]
                };
            });
        }}
        onSetSpeed={(speed) => setGameState(p => ({ ...p, gameSpeed: speed }))}
        onTriggerAbility={handleSingleTrigger}
        pendingPlacement={pendingPlacement}
        onConfirmPlacement={handleConfirmPlacement}
        onCancelPlacement={() => {
            setPendingPlacement(null);
            setGameState(p => ({ ...p, targetingAbility: null }));
        }}
        onUpdatePriority={(id, priority) => {
            setGameState(prev => ({
                ...prev,
                towers: prev.towers.map(t => t.id === id ? { ...t, targetPriority: priority } : t)
            }));
        }}
        onPickAugment={(aug) => {
             setGameState(prev => {
                const nextState = {
                    ...prev,
                    activeAugments: [...prev.activeAugments, aug],
                    augmentChoices: [],
                    isChoosingAugment: false,
                    waveStatus: 'SPAWNING' as const // Flow improvement: Proceed to spawn after picking
                };
                
                // Immediately calculate and start spawning since we are now in the correct state
                return nextState;
             });
             
             // Fire-and-forget trigger for actual unit generation
             triggerSpawning(gameState.wave, gameState.currentStage, gameState.directorState);
        }}
        onBatchTrigger={handleBatchTrigger}
        onGoToMenu={() => setGameState(p => ({ ...p, gamePhase: 'MENU' }))}
        onGoToStageSelect={() => setGameState(p => ({ ...p, gamePhase: 'STAGE_SELECT' }))}
        onStartStage={handleStartStage}
        canContinue={canContinue}
        onContinue={() => {
            const loaded = loadGame();
            if (loaded) {
                setGameState(p => ({ 
                    ...p, 
                    stageProgress: loaded.stageProgress, 
                    metaProgress: loaded.metaProgress,
                    gamePhase: 'STAGE_SELECT',
                    pendingAchievementEvents: []
                }));
            }
        }}
        onNewGame={() => {
            clearSave();
            setGameState(p => ({
                ...p,
                stageProgress: INITIAL_STAGE_PROGRESS,
                metaProgress: INITIAL_META_PROGRESS,
                metaEffects: getAppliedMetaEffects(INITIAL_META_PROGRESS),
                gamePhase: 'STAGE_SELECT',
                pendingAchievementEvents: [],
                tutorialStep: null
            }));
        }}
        totalWaves={STAGE_CONFIGS[gameState.currentStage].waves}
        onOpenShop={() => setGameState(p => ({ ...p, gamePhase: 'SHOP' }))}
        onOpenAchievements={() => setShowAchievements(true)}
        setTutorialStep={(step) => setGameState(p => ({ ...p, tutorialStep: step }))}
        finishTutorial={() => setGameState(prev => {
            const nextMeta = { ...prev.metaProgress, hasSeenTutorial: true };
            saveGame(prev.stageProgress, nextMeta);
            return { ...prev, metaProgress: nextMeta, tutorialStep: null };
        })}
      />
    </>
  );
};

export default App;
