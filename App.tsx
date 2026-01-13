
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Enemy, Tower, Projectile, Effect, DamageNumber, TowerType, EnemyType, Vector3Tuple, TechPath, PassiveType, ActiveAbilityType, TargetPriority, Augment, AugmentType, StageId, Boss, BossAbilityType, DirectorActionType, Hazard, MetaProgress } from './types';
import { GRID_SIZE, TOWER_STATS, ENEMY_STATS, UPGRADE_CONFIG, MAX_LEVEL, SELL_REFUND_RATIO, ABILITY_CONFIG, AUGMENT_POOL, STAGE_CONFIGS, getWaveDefinition, INITIAL_STAGE_PROGRESS, INITIAL_META_PROGRESS, TECH_PATH_INFO, TACTICAL_INTEL_POOL, STAGE_CORE_REWARDS } from './constants';
import HUD from './components/HUD';
import Scene from './components/Scene';
import { saveGame, loadGame, clearSave, hasSaveData } from './saveSystem';
import { getWaveIntel } from './geminiService';

const TICK_RATE = 50; 
const MAX_DAMAGE_NUMBERS = 60;

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
    directorAction: 'NONE',
    directorScaling: 1,
    directorGoldBonus: 1,
    directorCooldownMult: 1
  });

  const [selectedTowerType, setSelectedTowerType] = useState<TowerType>(TowerType.BASIC);
  const [pendingPlacement, setPendingPlacement] = useState<Vector3Tuple | null>(null);
  const [canContinue, setCanContinue] = useState(false);
  
  // Refs for game loop efficiency
  const gameStateRef = useRef(gameState);
  const spawnQueueRef = useRef<{time: number, type: EnemyType, pathIndex: number}[]>([]);
  const waveTimerRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

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

  // --- GAME LOOP ---
  useEffect(() => {
    if (gameState.gamePhase !== 'PLAYING' && gameState.gamePhase !== 'BOSS_FIGHT' && gameState.gamePhase !== 'BOSS_DEATH') return;
    if (gameState.isGameOver) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      // Skip processing if paused, but keep tick updated
      if (gameState.gameSpeed === 0 || gameState.isChoosingAugment) return;

      setGameState(prev => {
        const gameDelta = TICK_RATE * prev.gameSpeed; // Use fixed time step logic scaled by speed
        const currentStageConfig = STAGE_CONFIGS[prev.currentStage];
        const allPaths = currentStageConfig.paths;

        let nextEnemies = [...prev.enemies];
        const nextProjectiles = [...prev.projectiles];
        const nextTowers = [...prev.towers];
        const nextEffects = [...prev.effects];
        const nextDamageNumbers = [...prev.damageNumbers];
        let nextHazards = [...prev.hazards];
        let nextGold = prev.gold;
        let nextLives = prev.lives;
        let nextStatus = prev.waveStatus;
        let nextPhase = prev.gamePhase;
        let nextStageProgress = { ...prev.stageProgress };
        let nextMetaProgress = { ...prev.metaProgress };
        let nextBossAnnouncement = prev.bossAnnouncement;
        let nextStats = { ...prev.stats };
        let nextBossDeathTimer = prev.bossDeathTimer;
        let nextActiveBoss = prev.activeBoss;

        // --- BOSS DEATH SEQUENCE ---
        if (prev.gamePhase === 'BOSS_DEATH') {
            nextBossDeathTimer -= gameDelta;
            
            // Random explosions around boss
            if (prev.activeBoss && Math.random() < 0.3 * prev.gameSpeed) {
                nextEffects.push({
                    id: Math.random().toString(), 
                    type: 'EXPLOSION', 
                    position: { 
                        x: prev.activeBoss.position.x + (Math.random() - 0.5) * 3, 
                        y: prev.activeBoss.position.y + (Math.random() - 0.5) * 2, 
                        z: prev.activeBoss.position.z + (Math.random() - 0.5) * 3 
                    },
                    color: Math.random() > 0.5 ? '#f97316' : '#ef4444',
                    scale: 2 + Math.random() * 2,
                    lifetime: 30,
                    maxLifetime: 30
                });
            }

            // Cleanup effects
            for (let i = nextEffects.length - 1; i >= 0; i--) {
                nextEffects[i].lifetime -= 1 * prev.gameSpeed;
                if (nextEffects[i].lifetime <= 0) nextEffects.splice(i, 1);
            }

            if (nextBossDeathTimer <= 0) {
                // COMPLETE STAGE
                nextPhase = 'STAGE_COMPLETE';
                nextStatus = 'IDLE';
                nextStats.endTime = Date.now();
                nextEnemies = []; 
                nextActiveBoss = null;
                
                const stars = nextLives >= 15 ? 3 : nextLives >= 10 ? 2 : 1;
                
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
            }

            return {
                ...prev, 
                effects: nextEffects, 
                gamePhase: nextPhase, 
                bossDeathTimer: nextBossDeathTimer, 
                stageProgress: nextStageProgress, 
                metaProgress: nextMetaProgress,
                enemies: nextEnemies,
                activeBoss: nextActiveBoss,
                stats: nextStats,
                waveStatus: nextStatus,
                hazards: []
            };
        }

        // --- WAVE SPAWNING ---
        if (nextStatus === 'SPAWNING') {
            waveTimerRef.current += gameDelta;
            
            // Process Queue
            while (spawnQueueRef.current.length > 0 && spawnQueueRef.current[0].time <= waveTimerRef.current) {
                const spawnEvent = spawnQueueRef.current.shift();
                if (spawnEvent) {
                    const path = allPaths[spawnEvent.pathIndex];
                    const startPos = path[0];
                    const stats = ENEMY_STATS[spawnEvent.type];
                    
                    if (spawnEvent.type === EnemyType.BOSS) {
                        // Boss Spawn
                        const bossConfig = currentStageConfig.bossConfig;
                        const boss: Boss = {
                            id: `boss_${Date.now()}`,
                            type: EnemyType.BOSS,
                            health: bossConfig.baseHealth * prev.directorScaling,
                            maxHealth: bossConfig.baseHealth * prev.directorScaling,
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
                        // Regular Spawn
                        nextEnemies.push({
                            id: `enemy_${Date.now()}_${Math.random()}`,
                            type: spawnEvent.type,
                            health: stats.health * currentStageConfig.enemyScaling * prev.directorScaling,
                            maxHealth: stats.health * currentStageConfig.enemyScaling * prev.directorScaling,
                            speed: stats.speed,
                            position: { ...startPos },
                            pathId: spawnEvent.pathIndex,
                            waypointIndex: 0,
                            progress: 0
                        });
                    }
                }
            }

            if (spawnQueueRef.current.length === 0) {
                nextStatus = 'CLEARING';
            }
        }

        // --- UPDATE ENEMIES ---
        for (let i = nextEnemies.length - 1; i >= 0; i--) {
            const enemy = nextEnemies[i];
            const path = allPaths[enemy.pathId];
            
            // Freeze/Slow Logic
            if (enemy.freezeTimer && enemy.freezeTimer > 0) {
                enemy.freezeTimer -= gameDelta;
                enemy.frozen = 0; // Frozen solid
            } else {
                enemy.frozen = 1; // Normal speed
            }
            
            // Hazards Effect (Napalm/Singularity)
            nextHazards.forEach(h => {
                const dx = h.position.x - enemy.position.x;
                const dz = h.position.z - enemy.position.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                if (dist <= h.radius) {
                    if (h.type === 'NAPALM') {
                        enemy.health -= (h.value * gameDelta / 1000);
                    } else if (h.type === 'SINGULARITY') {
                        // Pull towards center
                        const pullFactor = h.value * gameDelta;
                        enemy.position.x += dx * pullFactor;
                        enemy.position.z += dz * pullFactor;
                        enemy.frozen = 0.5; // Slowed by gravity
                    }
                }
            });

            // Movement
            const speed = enemy.speed * (enemy.frozen ?? 1) * (0.05 * prev.gameSpeed);
            const targetNode = path[enemy.waypointIndex + 1];
            
            if (targetNode) {
                const dx = targetNode.x - enemy.position.x;
                const dz = targetNode.z - enemy.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                
                if (dist < speed) {
                    // Reached waypoint
                    enemy.waypointIndex++;
                    enemy.position = { ...targetNode }; // Snap
                    enemy.progress = 0;
                } else {
                    // Move towards
                    const angle = Math.atan2(dx, dz);
                    enemy.position.x += Math.sin(angle) * speed;
                    enemy.position.z += Math.cos(angle) * speed;
                    enemy.progress += speed;
                }
            } else {
                // Reached end
                nextLives -= 1;
                nextEnemies.splice(i, 1);
                if (enemy.isBoss) {
                     // Boss leaked? Game over immediately? Or massive damage?
                     nextLives = 0;
                }
                continue;
            }

            // --- BOSS AI ---
            if (enemy.isBoss && nextActiveBoss) {
                const boss = nextActiveBoss;
                const config = boss.bossConfig;
                
                // Phase Transition
                const healthPct = boss.health / boss.maxHealth;
                const nextPhaseIdx = boss.currentPhase + 1;
                if (config.phases[nextPhaseIdx] && healthPct <= config.phases[nextPhaseIdx].healthThreshold) {
                    boss.currentPhase = nextPhaseIdx;
                    nextBossAnnouncement = config.phases[nextPhaseIdx].announcement;
                    
                    // Visual Effect for phase change
                    nextEffects.push({
                        id: Math.random().toString(),
                        type: 'NOVA',
                        position: { ...boss.position },
                        color: boss.bossConfig.color,
                        scale: 5,
                        lifetime: 60,
                        maxLifetime: 60
                    });
                }

                // Abilities
                config.abilities.forEach(ability => {
                     // Cooldown management
                     if (boss.abilityCooldowns[ability.id] > 0) {
                         boss.abilityCooldowns[ability.id] -= gameDelta;
                     } else if (prev.gamePhase === 'BOSS_FIGHT') {
                         // Trigger Ability
                         if (ability.type === BossAbilityType.SHIELD_PULSE) {
                             boss.isShielded = true;
                             boss.shieldTimer = ability.duration || 3000;
                             boss.abilityCooldowns[ability.id] = ability.cooldown;
                             nextBossAnnouncement = "BOSS SHIELD ACTIVE";
                         } else if (ability.type === BossAbilityType.SPAWN_MINIONS) {
                             // Handled by minionSpawns usually, but this is a periodic summon
                             // Spawn minions around boss
                             for(let k=0; k<3; k++) {
                                 nextEnemies.push({
                                     id: `boss_minion_${Date.now()}_${k}`,
                                     type: EnemyType.BASIC,
                                     health: 50 * prev.directorScaling,
                                     maxHealth: 50 * prev.directorScaling,
                                     speed: 2,
                                     position: { x: boss.position.x + (Math.random()-0.5), y:0.2, z: boss.position.z + (Math.random()-0.5) },
                                     pathId: boss.pathId,
                                     waypointIndex: boss.waypointIndex,
                                     progress: 0
                                 });
                             }
                             boss.abilityCooldowns[ability.id] = ability.cooldown;
                         } else if (ability.type === BossAbilityType.DISABLE_ZONE) {
                             // Disable towers in radius
                             const radius = ability.radius || 4;
                             const duration = ability.duration || 5000;
                             nextEffects.push({
                                 id: Math.random().toString(),
                                 type: 'DISABLE_FIELD',
                                 position: { ...boss.position },
                                 color: '#ef4444',
                                 scale: radius * 2,
                                 lifetime: duration / (TICK_RATE/1000 * 50), // Approx conversion
                                 maxLifetime: duration / (TICK_RATE/1000 * 50)
                             });
                             nextTowers.forEach(t => {
                                 const dist = Math.sqrt(Math.pow(t.position.x - boss.position.x, 2) + Math.pow(t.position.z - boss.position.z, 2));
                                 if (dist <= radius) {
                                     t.disabledTimer = duration;
                                 }
                             });
                             boss.abilityCooldowns[ability.id] = ability.cooldown;
                             nextBossAnnouncement = "TOWERS DISABLED";
                         }
                     }
                });

                if (boss.isShielded && boss.shieldTimer) {
                    boss.shieldTimer -= gameDelta;
                    if (boss.shieldTimer <= 0) boss.isShielded = false;
                }

                // Minion Spawns based on HP
                config.minionSpawns.forEach((spawn, idx) => {
                    if (!boss.triggeredSpawnIndices.includes(idx) && healthPct <= spawn.triggerHealth) {
                        boss.triggeredSpawnIndices.push(idx);
                        nextBossAnnouncement = spawn.announcement || "Reinforcements!";
                        for(let k=0; k<spawn.count; k++) {
                             nextEnemies.push({
                                 id: `boss_trigger_${idx}_${k}`,
                                 type: spawn.enemyType,
                                 health: ENEMY_STATS[spawn.enemyType].health * prev.directorScaling,
                                 maxHealth: ENEMY_STATS[spawn.enemyType].health * prev.directorScaling,
                                 speed: ENEMY_STATS[spawn.enemyType].speed,
                                 position: { x: boss.position.x + (Math.random()-0.5)*2, y:0.2, z: boss.position.z + (Math.random()-0.5)*2 },
                                 pathId: boss.pathId,
                                 waypointIndex: boss.waypointIndex,
                                 progress: 0
                             });
                        }
                    }
                });
            }
        }

        // --- TOWER LOGIC ---
        // (Simplified re-implementation of original logic, assuming pure functions)
        // ... (See full implementation in Scene/Types logic, here we just tick cooldowns)
        nextTowers.forEach(tower => {
            if (tower.cooldown > 0) tower.cooldown -= gameDelta;
            
            if (tower.cooldown <= 0 && !tower.disabledTimer) {
                // Find Target
                let target: Enemy | null = null;
                let candidates = nextEnemies.filter(e => {
                    const d = Math.sqrt(Math.pow(e.position.x - tower.position.x, 2) + Math.pow(e.position.z - tower.position.z, 2));
                    return d <= tower.range;
                });

                if (candidates.length > 0) {
                    if (tower.targetPriority === TargetPriority.FIRST) candidates.sort((a,b) => (b.waypointIndex + b.progress) - (a.waypointIndex + a.progress));
                    else if (tower.targetPriority === TargetPriority.STRONGEST) candidates.sort((a,b) => b.health - a.health);
                    else if (tower.targetPriority === TargetPriority.WEAKEST) candidates.sort((a,b) => a.health - b.health);
                    target = candidates[0];
                }

                if (target) {
                    // Fire
                    tower.cooldown = (1000 / tower.fireRate);
                    tower.lastShotTime = now;
                    
                    if (tower.type === TowerType.SNIPER || tower.type === TowerType.ARTILLERY) {
                        // Projectile
                        nextProjectiles.push({
                            id: Math.random().toString(),
                            position: { ...tower.position, y: 0.5 },
                            targetId: target.id,
                            damage: tower.damage,
                            speed: TOWER_STATS[tower.type].projectileSpeed * (prev.gameSpeed),
                            color: tower.type === TowerType.ARTILLERY ? '#f59e0b' : '#ef4444',
                            sourceType: tower.type,
                            blastRadius: tower.type === TowerType.ARTILLERY ? TOWER_STATS[tower.type].blastRadius : undefined
                        });
                    } else {
                        // Hitscan / Instant
                        // Determine damage (Check resistance)
                        let dmg = tower.damage;
                        if (target.isBoss && target.bossConfig.phases[target.currentPhase].damageResistance) {
                            dmg *= (1 - target.bossConfig.phases[target.currentPhase].damageResistance);
                        }
                        if (target.isBoss && target.isShielded) dmg = 0; // Shield blocks all

                        target.health -= dmg;
                        
                        nextDamageNumbers.push({
                            id: Math.random().toString(),
                            position: { ...target.position },
                            value: dmg,
                            color: dmg > 0 ? '#ffffff' : '#94a3b8',
                            lifetime: 30,
                            maxLifetime: 30,
                            isCritical: false
                        });
                    }
                }
            }
        });

        // --- PROJECTILES ---
        for (let i = nextProjectiles.length - 1; i >= 0; i--) {
            const p = nextProjectiles[i];
            const target = nextEnemies.find(e => e.id === p.targetId);
            
            if (!target) {
                // Target dead, explode at last known pos or remove?
                // For simplicity, remove or explode at current pos
                if (p.sourceType === TowerType.ARTILLERY) {
                     // Explode anyway
                     nextEffects.push({
                        id: Math.random().toString(),
                        type: 'EXPLOSION',
                        position: p.position,
                        color: p.color,
                        scale: p.blastRadius || 2,
                        lifetime: 20,
                        maxLifetime: 20
                     });
                     // Deal Area Damage
                     nextEnemies.forEach(e => {
                         const d = Math.sqrt(Math.pow(e.position.x - p.position.x, 2) + Math.pow(e.position.z - p.position.z, 2));
                         if (d <= (p.blastRadius || 2)) {
                             e.health -= p.damage;
                             nextDamageNumbers.push({ id: Math.random().toString(), position: { ...e.position }, value: p.damage, color: '#f59e0b', lifetime: 30, maxLifetime: 30, isCritical: true });
                         }
                     });
                }
                nextProjectiles.splice(i, 1);
                continue;
            }

            const dx = target.position.x - p.position.x;
            const dz = target.position.z - p.position.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            const speed = p.speed * 1.5; // Projectile speed factor

            if (dist < speed) {
                // Hit
                let dmg = p.damage;
                if (target.isBoss && target.bossConfig.phases[target.currentPhase].damageResistance) {
                    dmg *= (1 - target.bossConfig.phases[target.currentPhase].damageResistance);
                }
                if (target.isBoss && target.isShielded) dmg = 0;

                if (p.sourceType === TowerType.ARTILLERY) {
                     nextEffects.push({ id: Math.random().toString(), type: 'EXPLOSION', position: target.position, color: p.color, scale: p.blastRadius || 2, lifetime: 20, maxLifetime: 20 });
                     nextEnemies.forEach(e => {
                         const d = Math.sqrt(Math.pow(e.position.x - target.position.x, 2) + Math.pow(e.position.z - target.position.z, 2));
                         if (d <= (p.blastRadius || 2)) {
                             e.health -= dmg;
                             nextDamageNumbers.push({ id: Math.random().toString(), position: { ...e.position }, value: dmg, color: '#f59e0b', lifetime: 30, maxLifetime: 30, isCritical: true });
                         }
                     });
                } else {
                    target.health -= dmg;
                    nextDamageNumbers.push({ id: Math.random().toString(), position: { ...target.position }, value: dmg, color: '#ef4444', lifetime: 30, maxLifetime: 30, isCritical: true });
                }
                nextProjectiles.splice(i, 1);
            } else {
                p.position.x += (dx / dist) * speed;
                p.position.y = 0.5 + Math.sin(now / 100) * 0.2; // Arc?
                p.position.z += (dz / dist) * speed;
            }
        }

        // --- CLEANUP ---
        // Damage Numbers
        for (let i = nextDamageNumbers.length - 1; i >= 0; i--) {
            nextDamageNumbers[i].lifetime -= 1 * prev.gameSpeed;
            if (nextDamageNumbers[i].lifetime <= 0) nextDamageNumbers.splice(i, 1);
        }
        // Effects
        for (let i = nextEffects.length - 1; i >= 0; i--) {
            nextEffects[i].lifetime -= 1 * prev.gameSpeed;
            if (nextEffects[i].lifetime <= 0) nextEffects.splice(i, 1);
        }
        // Hazards
        for (let i = nextHazards.length - 1; i >= 0; i--) {
            nextHazards[i].duration -= gameDelta;
            if (nextHazards[i].duration <= 0) nextHazards.splice(i, 1);
        }

        // Check Deaths
        for (let i = nextEnemies.length - 1; i >= 0; i--) {
            if (nextEnemies[i].health <= 0) {
                const e = nextEnemies[i];
                if (e.isBoss) {
                     // Boss Death Trigger
                     nextPhase = 'BOSS_DEATH';
                     nextBossDeathTimer = 5000; // 5s death animation
                     nextBossAnnouncement = "BOSS DEFEATED";
                     nextStats.totalGoldEarned += e.bossConfig.baseHealth / 10; // Bonus gold
                     // Don't remove yet, handled in BOSS_DEATH logic
                } else {
                    nextStats.enemiesKilled++;
                    nextGold += ENEMY_STATS[e.type].goldReward * prev.directorGoldBonus;
                    nextStats.totalGoldEarned += ENEMY_STATS[e.type].goldReward * prev.directorGoldBonus;
                    
                    // Splitter logic
                    if (e.type === EnemyType.SPLITTER) {
                        const miniStats = ENEMY_STATS[EnemyType.SPLITTER];
                        // @ts-ignore
                        if (miniStats.splitsInto) {
                            // @ts-ignore
                            const count = miniStats.splitsInto.count;
                            for(let k=0; k<count; k++) {
                                nextEnemies.push({
                                    id: `mini_${e.id}_${k}`,
                                    type: EnemyType.SPLITTER_MINI,
                                    health: ENEMY_STATS[EnemyType.SPLITTER_MINI].health,
                                    maxHealth: ENEMY_STATS[EnemyType.SPLITTER_MINI].health,
                                    speed: ENEMY_STATS[EnemyType.SPLITTER_MINI].speed,
                                    position: { ...e.position },
                                    pathId: e.pathId,
                                    waypointIndex: e.waypointIndex,
                                    progress: e.progress
                                });
                            }
                        }
                    }

                    nextEnemies.splice(i, 1);
                }
            }
        }

        // Wave Clear Check
        if (nextStatus === 'CLEARING' && nextEnemies.length === 0 && nextPhase !== 'BOSS_DEATH' && nextPhase !== 'STAGE_COMPLETE') {
            nextStatus = 'IDLE';
            nextPhase = 'PLAYING';
            // Augment Selection Logic (every 5 waves?)
            if (prev.wave % 5 === 0) {
                 // Trigger Augment Selection
                 // Pick 3 random
                 const choices = [];
                 for(let k=0; k<3; k++) choices.push(AUGMENT_POOL[Math.floor(Math.random()*AUGMENT_POOL.length)]);
                 // set isChoosingAugment
                 // (Need to handle in return)
            }
            
            // Interest
            const interest = prev.activeAugments.find(a => a.effect.special === 'INTEREST');
            if (interest) {
                const bonus = Math.floor(nextGold * interest.effect.value);
                nextGold += bonus;
                nextDamageNumbers.push({ id: Math.random().toString(), position: {x:0,y:2,z:0}, value: bonus, color: '#facc15', lifetime: 60, maxLifetime: 60, isCritical: false });
            }
        }

        if (nextLives <= 0) {
            nextPhase = 'GAME_OVER';
            nextStatus = 'IDLE';
        }

        return {
            ...prev,
            gold: nextGold,
            lives: nextLives,
            enemies: nextEnemies,
            towers: nextTowers,
            projectiles: nextProjectiles,
            effects: nextEffects,
            damageNumbers: nextDamageNumbers,
            hazards: nextHazards,
            waveStatus: nextStatus,
            gamePhase: nextPhase,
            bossAnnouncement: nextBossAnnouncement,
            stats: nextStats,
            bossDeathTimer: nextBossDeathTimer,
            activeBoss: nextActiveBoss,
            activeAugments: prev.activeAugments, // TODO: handle updates
        };
      });
    }, 1000 / TICK_RATE); // Run interval faster to ensure smoothness, but rely on delta

    return () => clearInterval(interval);
  }, [gameState.gamePhase, gameState.isGameOver, gameState.gameSpeed, gameState.isChoosingAugment]);

  // --- ACTIONS ---

  const handleStartWave = useCallback(() => {
    if (gameState.waveStatus !== 'IDLE' || gameState.isChoosingAugment) return;
    
    const nextWave = gameState.wave + 1;
    const stageConfig = STAGE_CONFIGS[gameState.currentStage];
    
    // Wave Generation
    const waveDef = getWaveDefinition(gameState.currentStage, nextWave);
    
    // Build Queue
    const newQueue: {time: number, type: EnemyType, pathIndex: number}[] = [];
    let pIdx = 0;
    
    waveDef.composition.forEach(g => {
        const bursts = Math.ceil(g.count / (g.burstSize || 1));
        for(let b=0; b<bursts; b++) {
            const t = g.startDelay + b * g.interval;
            const count = Math.min(g.burstSize || 1, g.count - b * (g.burstSize || 1));
            for(let i=0; i<count; i++) {
                newQueue.push({
                    time: t + Math.random() * 100, // Slight jitter
                    type: g.type,
                    pathIndex: pIdx % stageConfig.paths.length
                });
                pIdx++;
            }
        }
    });

    // Check if Boss Wave (Final Wave)
    if (nextWave === stageConfig.waves) {
        newQueue.push({
            time: 5000, 
            type: EnemyType.BOSS,
            pathIndex: 0 
        });
    }
    
    newQueue.sort((a,b) => a.time - b.time);
    spawnQueueRef.current = newQueue;
    waveTimerRef.current = 0;
    
    setGameState(prev => ({
        ...prev,
        wave: nextWave,
        waveStatus: 'SPAWNING',
        waveIntel: "Scanning enemy frequencies..."
    }));
    
    getWaveIntel(nextWave).then(intel => {
        setGameState(p => ({ ...p, waveIntel: intel }));
    });

  }, [gameState.wave, gameState.waveStatus, gameState.currentStage]);

  const handlePlaceTower = (pos: Vector3Tuple) => {
      setPendingPlacement(pos);
  };

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

  const handleAbility = (towerId: string) => {
      setGameState(prev => {
          const towers = prev.towers.map(t => {
              if (t.id === towerId && t.activeType !== ActiveAbilityType.NONE && t.abilityCooldown <= 0) {
                  // Activate Logic
                  const config = ABILITY_CONFIG[t.activeType];
                  let cooldown = config.cooldown * prev.directorCooldownMult;
                  let duration = 0;
                  
                  if (t.activeType === ActiveAbilityType.OVERCLOCK) {
                      duration = config.duration || 5000;
                  }
                  
                  // For targeted abilities (Orbital Strike), we need a target.
                  // If triggered here, assuming standard "center of map" or "random"?
                  // Better: UI should handle targeting mode.
                  
                  return { ...t, abilityCooldown: cooldown, abilityMaxCooldown: cooldown, abilityDuration: duration };
              }
              return t;
          });
          return { ...prev, towers, stats: { ...prev.stats, abilitiesUsed: prev.stats.abilitiesUsed + 1 } };
      });
  };

  const handleBatchTrigger = (type: ActiveAbilityType) => {
      if (type === ActiveAbilityType.ORBITAL_STRIKE || type === ActiveAbilityType.SINGULARITY || type === ActiveAbilityType.NAPALM) {
          // Enter targeting mode
          setGameState(prev => ({ ...prev, targetingAbility: type }));
      } else {
          // Instant Global Trigger (e.g. Overclock, Eruption centered on tower)
          setGameState(prev => {
              const towers = prev.towers.map(t => {
                  if (t.activeType === type && t.abilityCooldown <= 0) {
                      // Trigger Logic for self-centered or global
                      const config = ABILITY_CONFIG[type];
                      
                      // Eruption: Damage around tower
                      if (type === ActiveAbilityType.ERUPTION) {
                           prev.effects.push({
                               id: Math.random().toString(),
                               type: 'NOVA',
                               position: { ...t.position },
                               color: config.color,
                               scale: config.range,
                               lifetime: 40,
                               maxLifetime: 40
                           });
                           prev.enemies.forEach(e => {
                               const dist = Math.sqrt(Math.pow(e.position.x - t.position.x, 2) + Math.pow(e.position.z - t.position.z, 2));
                               if (dist <= config.range) {
                                   e.health -= config.damage;
                                   prev.damageNumbers.push({ id: Math.random().toString(), position: {...e.position}, value: config.damage, color: '#ef4444', lifetime: 30, maxLifetime: 30, isCritical: true });
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
  };

  const handleTargetedAbility = (pos: Vector3Tuple) => {
      const type = gameState.targetingAbility;
      if (!type) return;
      const config = ABILITY_CONFIG[type];
      
      setGameState(prev => {
          // Consume ONE charge? Or ALL ready towers of that type?
          // Let's consume ONE ready tower's cooldown.
          const readyTowerIndex = prev.towers.findIndex(t => t.activeType === type && t.abilityCooldown <= 0);
          
          if (readyTowerIndex === -1) return { ...prev, targetingAbility: null }; // Should check before click
          
          const newTowers = [...prev.towers];
          const t = newTowers[readyTowerIndex];
          t.abilityCooldown = config.cooldown * prev.directorCooldownMult;
          t.abilityMaxCooldown = config.cooldown * prev.directorCooldownMult;
          
          // Execute Effect
          if (type === ActiveAbilityType.ORBITAL_STRIKE) {
              prev.effects.push({
                   id: Math.random().toString(),
                   type: 'ORBITAL_STRIKE',
                   position: pos,
                   color: config.color,
                   scale: config.range,
                   lifetime: 60,
                   maxLifetime: 60
              });
              setTimeout(() => {
                  // Delayed damage
                  setGameState(curr => {
                      const hits = curr.enemies.filter(e => {
                          const d = Math.sqrt(Math.pow(e.position.x - pos.x, 2) + Math.pow(e.position.z - pos.z, 2));
                          return d <= config.range;
                      });
                      hits.forEach(h => {
                          h.health -= config.damage;
                          curr.damageNumbers.push({ id: Math.random().toString(), position: {...h.position}, value: config.damage, color: '#fb7185', lifetime: 30, maxLifetime: 30, isCritical: true });
                      });
                      return { ...curr }; // Force update
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

          // If more towers ready, keep targeting? No, one click one shot usually better.
          return { ...prev, towers: newTowers, targetingAbility: null, stats: { ...prev.stats, abilitiesUsed: prev.stats.abilitiesUsed + 1 } };
      });
  };

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
          gamePhase: 'PLAYING',
          waveStatus: 'IDLE',
          stats: { ...INITIAL_META_PROGRESS.stats, startTime: Date.now() }
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
        />
        <OrbitControls 
            minPolarAngle={Math.PI / 4} 
            maxPolarAngle={Math.PI / 2.5}
            minDistance={10}
            maxDistance={40}
        />
      </Canvas>
      
      <HUD 
        gameState={gameState}
        onStartWave={handleStartWave}
        onSelectTower={setSelectedTowerType}
        selectedTowerType={selectedTowerType}
        onReset={() => handleStartStage(gameState.currentStage)}
        onUpgradeTower={(id, path) => {
            setGameState(prev => {
                const towers = prev.towers.map(t => {
                    if (t.id === id) {
                        const nextLevel = t.level + 1;
                        // @ts-ignore
                        const cost = UPGRADE_CONFIG.costs[nextLevel];
                        if (prev.gold >= cost) {
                            const config = UPGRADE_CONFIG.paths[path][nextLevel];
                            return {
                                ...t,
                                level: nextLevel,
                                techPath: path === TechPath.NONE ? t.techPath : path, // Stick to path if already chosen
                                totalInvested: t.totalInvested + cost,
                                damage: t.baseDamage * (config.damage || 1), // Apply multiplier to base
                                baseDamage: t.baseDamage * (config.damage || 1),
                                fireRate: t.baseFireRate * (config.fireRate || 1),
                                baseFireRate: t.baseFireRate * (config.fireRate || 1),
                                range: t.baseRange * (config.range || 1),
                                baseRange: t.baseRange * (config.range || 1),
                                passiveType: config.passive || t.passiveType,
                                activeType: config.active || t.activeType,
                                abilityMaxCooldown: config.active ? ABILITY_CONFIG[config.active].cooldown : 0
                            };
                        }
                    }
                    return t;
                });
                // Deduct gold handled in component check usually, but safely here too
                // For brevity, assuming HUD checks cost. 
                // Wait, need to deduct gold here.
                const tower = prev.towers.find(t => t.id === id);
                // @ts-ignore
                const cost = UPGRADE_CONFIG.costs[tower.level + 1];
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
        onTriggerAbility={handleAbility}
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
            if (data) {
                setGameState(p => ({ 
                    ...p, 
                    stageProgress: data.stageProgress, 
                    metaProgress: data.metaProgress,
                    gamePhase: 'STAGE_SELECT'
                }));
            }
        }}
        onNewGame={() => {
            clearSave();
            setGameState(p => ({
                ...p,
                stageProgress: INITIAL_STAGE_PROGRESS,
                metaProgress: INITIAL_META_PROGRESS,
                gamePhase: 'STAGE_SELECT'
            }));
        }}
        totalWaves={STAGE_CONFIGS[gameState.currentStage].waves}
      />
    </>
  );
};

export default App;
