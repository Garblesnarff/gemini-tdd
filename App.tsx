
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Enemy, Tower, Projectile, Effect, DamageNumber, TowerType, EnemyType, Vector3Tuple, TechPath, PassiveType, ActiveAbilityType, TargetPriority, Augment, AugmentType, StageId, Boss, BossAbilityType, DirectorActionType, Hazard, MetaProgress, SupplyDrop } from './types';
import { GRID_SIZE, TOWER_STATS, ENEMY_STATS, UPGRADE_CONFIG, MAX_LEVEL, SELL_REFUND_RATIO, ABILITY_CONFIG, AUGMENT_POOL, STAGE_CONFIGS, getWaveDefinition, INITIAL_STAGE_PROGRESS, INITIAL_META_PROGRESS, TECH_PATH_INFO, TACTICAL_INTEL_POOL, STAGE_CORE_REWARDS, DIRECTOR_CONFIG } from './constants';
import HUD from './components/HUD';
import Scene from './components/Scene';
import { saveGame, loadGame, clearSave, hasSaveData } from './saveSystem';
import { getWaveIntel } from './geminiService';
import { useGameLoop } from './hooks/simulation/useGameLoop';

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
    activeBoss: null,
    bossAnnouncement: null,
    gamePhase: 'MENU',
    stats: {
        startTime: 0,
        endTime: 0,
        totalGoldEarned: 0,
        towersBuilt: 0,
        abilitiesUsed: 0,
        enemiesKilled: 0
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
    directorCooldownMult: 1
  });

  const [selectedTowerType, setSelectedTowerType] = useState<TowerType>(TowerType.BASIC);
  const [pendingPlacement, setPendingPlacement] = useState<Vector3Tuple | null>(null);
  const [canContinue, setCanContinue] = useState(false);
  
  const spawnQueueRef = useRef<{time: number, type: EnemyType, pathIndex: number, isElite?: boolean}[]>([]);
  const waveTimerRef = useRef(0);

  // Initial Load Check
  useEffect(() => {
    setCanContinue(hasSaveData());
  }, []);

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

  // Handle Stage Completion & Spawning (Higher level orchestration)
  useEffect(() => {
    if (gameState.gamePhase !== 'PLAYING' && gameState.gamePhase !== 'BOSS_FIGHT' && gameState.gamePhase !== 'BOSS_DEATH') return;
    
    const interval = setInterval(() => {
        setGameState(prev => {
            if (prev.gamePhase === 'BOSS_DEATH' && prev.bossDeathTimer <= 0) {
                 // Transition to COMPLETE STAGE
                 const nextStageProgress = { ...prev.stageProgress };
                 const nextMetaProgress = { ...prev.metaProgress };
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

                 saveGame(nextStageProgress, nextMetaProgress);

                 return {
                     ...prev,
                     gamePhase: 'STAGE_COMPLETE',
                     waveStatus: 'IDLE',
                     enemies: [],
                     activeBoss: null,
                     stageProgress: nextStageProgress,
                     metaProgress: nextMetaProgress,
                     stats: nextStats
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
                                triggeredSpawnIndices: []
                            };
                            nextEnemies.push(boss);
                            nextActiveBoss = boss;
                            nextPhase = 'BOSS_FIGHT';
                            nextBossAnnouncement = bossConfig.phases[0].announcement;
                        } else {
                            const eStats = ENEMY_STATS[spawnEvent.type];
                            nextEnemies.push({
                                id: `enemy_${Date.now()}_${Math.random()}`,
                                type: spawnEvent.type,
                                health: eStats.health * stageConfig.enemyScaling * hpMult,
                                maxHealth: eStats.health * stageConfig.enemyScaling * hpMult,
                                speed: eStats.speed * spdMult,
                                position: { ...startPos },
                                pathId: spawnEvent.pathIndex,
                                waypointIndex: 0,
                                progress: 0,
                                isElite: isElite
                            });
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

  const handleStartWave = useCallback(() => {
    if (gameState.waveStatus !== 'IDLE' || gameState.isChoosingAugment) return;
    
    const nextWave = gameState.wave + 1;
    const stageConfig = STAGE_CONFIGS[gameState.currentStage];
    const waveDef = getWaveDefinition(gameState.currentStage, nextWave);
    
    const newQueue: {time: number, type: EnemyType, pathIndex: number, isElite: boolean}[] = [];
    let pIdx = 0;
    
    waveDef.composition.forEach(g => {
        const bursts = Math.ceil(g.count / (g.burstSize || 1));
        const groupIsElite = gameState.directorState === 'PRESSURE' && Math.random() < DIRECTOR_CONFIG.ELITE_CHANCE;

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

    if (nextWave === stageConfig.waves) {
        newQueue.push({ time: 5000, type: EnemyType.BOSS, pathIndex: 0, isElite: false });
    }
    
    newQueue.sort((a,b) => a.time - b.time);
    spawnQueueRef.current = newQueue;
    waveTimerRef.current = 0;
    
    setGameState(prev => {
        const isAugmentWave = nextWave > 1 && (nextWave % 5 === 0);
        let choices: Augment[] = [];
        if (isAugmentWave) {
             const pool = [...AUGMENT_POOL];
             for(let k=0; k<3; k++) {
                 const idx = Math.floor(Math.random() * pool.length);
                 choices.push(pool.splice(idx, 1)[0]);
             }
        }

        const newSupplyDrops = [...prev.supplyDrops];
        if (prev.directorState === 'RELIEF' && Math.random() < DIRECTOR_CONFIG.SUPPLY_DROP_CHANCE) {
            const val = Math.floor(Math.random() * (DIRECTOR_CONFIG.SUPPLY_DROP_VALUE.MAX - DIRECTOR_CONFIG.SUPPLY_DROP_VALUE.MIN)) + DIRECTOR_CONFIG.SUPPLY_DROP_VALUE.MIN;
            let x = Math.floor((Math.random() - 0.5) * GRID_SIZE * 1.5);
            let z = Math.floor((Math.random() - 0.5) * GRID_SIZE * 1.5);
            newSupplyDrops.push({
                id: Math.random().toString(),
                position: { x, y: 0, z },
                value: val,
                lifetime: DIRECTOR_CONFIG.SUPPLY_DROP_LIFETIME,
                maxLifetime: DIRECTOR_CONFIG.SUPPLY_DROP_LIFETIME
            });
        }

        return {
            ...prev,
            wave: nextWave,
            waveStatus: 'SPAWNING',
            isChoosingAugment: isAugmentWave,
            augmentChoices: choices,
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
    
    if (gameState.directorState === 'NEUTRAL') {
        getWaveIntel(nextWave).then(intel => {
            setGameState(p => ({ ...p, waveIntel: intel }));
        });
    }
  }, [gameState.wave, gameState.waveStatus, gameState.currentStage, gameState.directorState]);

  const handlePlaceTower = (pos: Vector3Tuple) => { setPendingPlacement(pos); };

  const handleConfirmPlacement = () => {
      if (!pendingPlacement) return;
      const stats = TOWER_STATS[selectedTowerType];
      if (gameState.gold >= stats.cost) {
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
              totalInvested: stats.cost,
              passiveType: PassiveType.NONE,
              activeType: ActiveAbilityType.NONE,
              abilityCooldown: 0,
              abilityMaxCooldown: 0,
              abilityDuration: 0,
              targetPriority: TargetPriority.FIRST
          };
          setGameState(prev => ({
              ...prev,
              gold: prev.gold - stats.cost,
              towers: [...prev.towers, newTower],
              stats: { ...prev.stats, towersBuilt: prev.stats.towersBuilt + 1 }
          }));
          setPendingPlacement(null);
      }
  };

  const handleBatchTrigger = useCallback((type: ActiveAbilityType) => {
      if (type === ActiveAbilityType.ORBITAL_STRIKE || type === ActiveAbilityType.SINGULARITY || type === ActiveAbilityType.NAPALM) {
          setGameState(prev => ({ ...prev, targetingAbility: type }));
      } else {
          setGameState(prev => {
              const towers = prev.towers.map(t => {
                  if (t.activeType === type && t.abilityCooldown <= 0) {
                      const config = ABILITY_CONFIG[type];
                      if (!config) return t;

                      if (type === ActiveAbilityType.ERUPTION) {
                           prev.effects.push({ id: Math.random().toString(), type: 'NOVA', position: { ...t.position }, color: config.color, scale: config.range, lifetime: 40, maxLifetime: 40 });
                           prev.enemies.forEach(e => {
                               const dist = Math.sqrt(Math.pow(e.position.x - t.position.x, 2) + Math.pow(e.position.z - t.position.z, 2));
                               if (dist <= config.range) {
                                   e.health -= config.damage;
                               }
                           });
                      }

                      if (type === ActiveAbilityType.FREEZE) {
                          prev.effects.push({ id: Math.random().toString(), type: 'FREEZE_WAVE', position: { ...t.position }, color: config.color, scale: config.range, lifetime: 40, maxLifetime: 40 });
                          prev.enemies.forEach(e => {
                              const dist = Math.sqrt(Math.pow(e.position.x - t.position.x, 2) + Math.pow(e.position.z - t.position.z, 2));
                              if (dist <= config.range) {
                                  e.freezeTimer = config.duration;
                                  e.frozen = 0;
                              }
                          });
                      }

                      return { 
                          ...t, 
                          abilityCooldown: config.cooldown * prev.directorCooldownMult, 
                          abilityMaxCooldown: config.cooldown * prev.directorCooldownMult,
                          abilityDuration: config.duration || 0
                      };
                  }
                  return t;
              });
              return { ...prev, towers };
          });
      }
  }, []);

  const handleSingleTrigger = (towerId: string) => {
      setGameState(prev => {
          const tower = prev.towers.find(t => t.id === towerId);
          if (!tower || tower.activeType === ActiveAbilityType.NONE || tower.abilityCooldown > 0) return prev;

          const type = tower.activeType;
          const config = ABILITY_CONFIG[type];
          if (!config) return prev;

          // Targeted Abilities -> Enter Targeting Mode
          if (type === ActiveAbilityType.ORBITAL_STRIKE || type === ActiveAbilityType.NAPALM || type === ActiveAbilityType.SINGULARITY) {
               return { ...prev, targetingAbility: type };
          }

          // Immediate Abilities -> Fire just this tower
          if (type === ActiveAbilityType.ERUPTION) {
               prev.effects.push({ id: Math.random().toString(), type: 'NOVA', position: { ...tower.position }, color: config.color, scale: config.range, lifetime: 40, maxLifetime: 40 });
               prev.enemies.forEach(e => {
                   const dist = Math.sqrt(Math.pow(e.position.x - tower.position.x, 2) + Math.pow(e.position.z - tower.position.z, 2));
                   if (dist <= config.range) {
                       e.health -= config.damage;
                   }
               });
          }

          if (type === ActiveAbilityType.FREEZE) {
              prev.effects.push({ id: Math.random().toString(), type: 'FREEZE_WAVE', position: { ...tower.position }, color: config.color, scale: config.range, lifetime: 40, maxLifetime: 40 });
              prev.enemies.forEach(e => {
                  const dist = Math.sqrt(Math.pow(e.position.x - tower.position.x, 2) + Math.pow(e.position.z - tower.position.z, 2));
                  if (dist <= config.range) {
                      e.freezeTimer = config.duration;
                      e.frozen = 0;
                  }
              });
          }

          const newTowers = prev.towers.map(t => {
               if (t.id === towerId) {
                   return {
                       ...t,
                       abilityCooldown: config.cooldown * prev.directorCooldownMult,
                       abilityMaxCooldown: config.cooldown * prev.directorCooldownMult,
                       abilityDuration: config.duration || 0
                   };
               }
               return t;
          });

          return { ...prev, towers: newTowers, stats: { ...prev.stats, abilitiesUsed: prev.stats.abilitiesUsed + 1 } };
      });
  };

  const handleTargetedAbility = (pos: Vector3Tuple) => {
      const type = gameState.targetingAbility;
      if (!type) return;
      const config = ABILITY_CONFIG[type];
      if (!config) return;
      
      setGameState(prev => {
          // Prioritize selected tower if it matches the ability and is ready
          let readyTowerIndex = -1;
          
          if (prev.selectedTowerId) {
              const selectedIdx = prev.towers.findIndex(t => t.id === prev.selectedTowerId && t.activeType === type && t.abilityCooldown <= 0);
              if (selectedIdx !== -1) readyTowerIndex = selectedIdx;
          }
          
          // Fallback to finding any ready tower of that type
          if (readyTowerIndex === -1) {
              readyTowerIndex = prev.towers.findIndex(t => t.activeType === type && t.abilityCooldown <= 0);
          }

          if (readyTowerIndex === -1) return { ...prev, targetingAbility: null };
          
          const newTowers = [...prev.towers];
          const t = newTowers[readyTowerIndex];
          t.abilityCooldown = config.cooldown * prev.directorCooldownMult;
          t.abilityMaxCooldown = config.cooldown * prev.directorCooldownMult;
          
          if (type === ActiveAbilityType.ORBITAL_STRIKE) {
              prev.effects.push({ id: Math.random().toString(), type: 'ORBITAL_STRIKE', position: pos, color: config.color, scale: config.range, lifetime: 60, maxLifetime: 60 });
              setTimeout(() => {
                  setGameState(curr => {
                      curr.enemies.forEach(e => {
                          const d = Math.sqrt(Math.pow(e.position.x - pos.x, 2) + Math.pow(e.position.z - pos.z, 2));
                          if (d <= config.range) e.health -= config.damage;
                      });
                      return { ...curr };
                  });
              }, 1000);
          } else if (type === ActiveAbilityType.NAPALM || type === ActiveAbilityType.SINGULARITY) {
               prev.hazards.push({
                   id: Math.random().toString(),
                   type: type === ActiveAbilityType.NAPALM ? 'NAPALM' : 'SINGULARITY',
                   position: pos,
                   radius: config.range,
                   duration: config.duration,
                   value: config.value || (type === ActiveAbilityType.NAPALM ? config.damage : 0),
                   color: config.color
               });
          }
          return { ...prev, towers: newTowers, targetingAbility: null, stats: { ...prev.stats, abilitiesUsed: prev.stats.abilitiesUsed + 1 } };
      });
  };

  // Keyboard Hotkeys
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (gameState.gamePhase !== 'PLAYING' && gameState.gamePhase !== 'BOSS_FIGHT') return;
          // Ignore if typing in an input (not currently used but good practice)
          if (e.target instanceof HTMLInputElement) return;

          switch(e.key) {
              case '1': 
                  handleBatchTrigger(ActiveAbilityType.ERUPTION); 
                  handleBatchTrigger(ActiveAbilityType.NAPALM); 
                  break;
              case '2': 
                  handleBatchTrigger(ActiveAbilityType.OVERCLOCK); 
                  handleBatchTrigger(ActiveAbilityType.BARRAGE); 
                  break;
              case '3': 
                  handleBatchTrigger(ActiveAbilityType.FREEZE); 
                  handleBatchTrigger(ActiveAbilityType.SINGULARITY); 
                  break;
              case '4': 
                  handleBatchTrigger(ActiveAbilityType.ORBITAL_STRIKE); 
                  break;
              case 'Escape':
                  if (gameState.targetingAbility) setGameState(p => ({ ...p, targetingAbility: null }));
                  else if (pendingPlacement) setPendingPlacement(null);
                  else if (gameState.selectedTowerId) setGameState(p => ({ ...p, selectedTowerId: null }));
                  break;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.gamePhase, gameState.targetingAbility, pendingPlacement, gameState.selectedTowerId, handleBatchTrigger]);

  const handleStartStage = (id: StageId) => {
      const config = STAGE_CONFIGS[id];
      setGameState({
          ...gameState,
          currentStage: id,
          gold: config.startingGold,
          lives: config.startingLives,
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
          stats: { ...INITIAL_META_PROGRESS.stats, startTime: Date.now(), totalGoldEarned: 0, towersBuilt: 0, abilitiesUsed: 0, enemiesKilled: 0 },
          directorState: 'NEUTRAL',
          directorStreak: 0,
          pendingDirectorState: undefined,
          directorScaling: 1,
          directorGoldBonus: 1,
          directorCooldownMult: 1,
          directorAction: 'NONE',
          waveStats: { livesLostThisWave: 0, waveStartTime: 0, waveEndTime: 0, consecutiveCleanWaves: 0 }
      });
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
              }]
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
                const nextLevel = tower.level + 1;
                // @ts-ignore
                const cost = UPGRADE_CONFIG.costs[nextLevel];
                if (prev.gold < cost) return prev;

                const config = UPGRADE_CONFIG.paths[path]?.[nextLevel];
                if (!config) return prev;
                
                // Determine Correct Active Ability for Tower Type + Tech Combo
                let activeType = config.active || tower.activeType;
                if (nextLevel === 3) {
                    if (path === TechPath.MAGMA) {
                        if (tower.type === TowerType.SNIPER) activeType = ActiveAbilityType.ORBITAL_STRIKE;
                        if (tower.type === TowerType.ARTILLERY) activeType = ActiveAbilityType.NAPALM;
                    }
                    if (path === TechPath.PLASMA && tower.type === TowerType.ARTILLERY) activeType = ActiveAbilityType.BARRAGE;
                    if (path === TechPath.VOID && tower.type === TowerType.ARTILLERY) activeType = ActiveAbilityType.SINGULARITY;
                }

                const towers = prev.towers.map(t => {
                    if (t.id === id) {
                        return {
                            ...t,
                            level: nextLevel,
                            techPath: path === TechPath.NONE ? t.techPath : path,
                            totalInvested: t.totalInvested + cost,
                            damage: t.baseDamage * (config.damage || 1),
                            baseDamage: t.baseDamage * (config.damage || 1),
                            fireRate: t.baseFireRate * (config.fireRate || 1),
                            baseFireRate: t.baseFireRate * (config.fireRate || 1),
                            range: t.baseRange * (config.range || 1),
                            baseRange: t.baseRange * (config.range || 1),
                            passiveType: config.passive || t.passiveType,
                            activeType: activeType,
                            abilityMaxCooldown: activeType !== ActiveAbilityType.NONE ? (ABILITY_CONFIG[activeType]?.cooldown || 0) : 0
                        };
                    }
                    return t;
                });
                return { ...prev, towers, gold: prev.gold - cost };
            })
        }}
        onDeselectTower={() => setGameState(p => ({ ...p, selectedTowerId: null }))}
        onSellTower={(id) => {
            const t = gameState.towers.find(t => t.id === id);
            if (t) {
                setGameState(p => ({
                    ...p,
                    gold: p.gold + Math.floor(t.totalInvested * SELL_REFUND_RATIO),
                    towers: p.towers.filter(tw => tw.id !== id),
                    selectedTowerId: null
                }));
            }
        }}
        onSetSpeed={(s) => setGameState(p => ({ ...p, gameSpeed: s }))}
        onTriggerAbility={handleSingleTrigger}
        pendingPlacement={pendingPlacement}
        onConfirmPlacement={handleConfirmPlacement}
        onCancelPlacement={() => { setPendingPlacement(null); setGameState(p => ({ ...p, targetingAbility: null })); }}
        onUpdatePriority={(id, p) => setGameState(pr => ({ ...pr, towers: pr.towers.map(t => t.id === id ? { ...t, targetPriority: p } : t) }))}
        onPickAugment={(aug) => {
            setGameState(p => ({
                ...p,
                activeAugments: [...p.activeAugments, aug],
                isChoosingAugment: false,
                augmentChoices: []
            }));
        }}
        onBatchTrigger={handleBatchTrigger}
        onGoToMenu={() => setGameState(p => ({ ...p, gamePhase: 'MENU' }))}
        onGoToStageSelect={() => setGameState(p => ({ ...p, gamePhase: 'STAGE_SELECT' }))}
        onStartStage={handleStartStage}
        canContinue={canContinue}
        onContinue={() => {
            const data = loadGame();
            if (data) { setGameState(p => ({ ...p, stageProgress: data.stageProgress, metaProgress: data.metaProgress, gamePhase: 'STAGE_SELECT' })); }
        }}
        onNewGame={() => {
            clearSave();
            setGameState(p => ({ ...p, stageProgress: INITIAL_STAGE_PROGRESS, metaProgress: INITIAL_META_PROGRESS, gamePhase: 'STAGE_SELECT' }));
        }}
        totalWaves={STAGE_CONFIGS[gameState.currentStage].waves}
      />
    </>
  );
};

export default App;
