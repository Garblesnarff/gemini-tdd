
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Sky, Environment, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Enemy, Tower, Projectile, Effect, DamageNumber, TowerType, EnemyType, Vector3Tuple, TechPath, PassiveType, ActiveAbilityType, TargetPriority, Augment, AugmentType, StageId, Boss, BossAbilityType, DirectorActionType, Hazard, MetaProgress } from './types';
import { GRID_SIZE, TOWER_STATS, ENEMY_STATS, UPGRADE_CONFIG, MAX_LEVEL, SELL_REFUND_RATIO, ABILITY_CONFIG, AUGMENT_POOL, STAGE_CONFIGS, getWaveDefinition, INITIAL_STAGE_PROGRESS, INITIAL_META_PROGRESS, TECH_PATH_INFO, TACTICAL_INTEL_POOL, STAGE_CORE_REWARDS } from './constants';
import HUD from './components/HUD';
import Scene from './components/Scene';
import { saveGame, loadGame, clearSave, hasSaveData } from './saveSystem';

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
  
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Initial Save Check
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

  // Main Game Loop Logic
  useEffect(() => {
    // Run loop in PLAYING, BOSS_FIGHT, and BOSS_DEATH phases
    if (gameState.gamePhase !== 'PLAYING' && gameState.gamePhase !== 'BOSS_FIGHT' && gameState.gamePhase !== 'BOSS_DEATH') return;
    if (gameState.isGameOver) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        if (prev.gameSpeed === 0 || prev.isGameOver || prev.isChoosingAugment) return prev;
        
        const tickDelta = TICK_RATE * prev.gameSpeed;
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

        // --- BOSS DEATH SEQUENCE HANDLER ---
        if (prev.gamePhase === 'BOSS_DEATH') {
            nextBossDeathTimer -= tickDelta;
            
            // Random explosions around boss position
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

            // Cleanup effects even during death
            for (let i = nextEffects.length - 1; i >= 0; i--) {
                nextEffects[i].lifetime -= 1 * prev.gameSpeed;
                if (nextEffects[i].lifetime <= 0) nextEffects.splice(i, 1);
            }

            if (nextBossDeathTimer <= 0) {
                // TRANSITION TO STAGE COMPLETE
                nextPhase = 'STAGE_COMPLETE';
                nextStatus = 'IDLE';
                nextStats.endTime = Date.now();
                nextEnemies = []; // Clear boss
                
                const stars = nextLives >= 15 ? 3 : nextLives >= 10 ? 2 : 1;
                
                // Update Stage Progress
                const stages = Object.keys(STAGE_CONFIGS);
                const currentIdx = stages.indexOf(prev.currentStage);
                const currentProgress = nextStageProgress[prev.currentStage];
                const isFirstClear = !currentProgress.completed;

                nextStageProgress[prev.currentStage] = { 
                    ...currentProgress, 
                    completed: true, 
                    stars: Math.max(currentProgress.stars, stars) as 0|1|2|3 
                };
                
                // Unlock Next
                if (currentIdx < stages.length - 1) {
                    const nextStageId = stages[currentIdx + 1] as StageId;
                    nextStageProgress[nextStageId] = { ...nextStageProgress[nextStageId], unlocked: true };
                }

                // --- META PROGRESSION CALCULATIONS ---
                const rewardConfig = STAGE_CORE_REWARDS[prev.currentStage];
                let earnedCores = isFirstClear ? rewardConfig.firstClear : rewardConfig.replay;
                
                // 3-Star Bonus (50%)
                if (stars === 3) {
                    earnedCores = Math.floor(earnedCores * 1.5);
                }

                nextMetaProgress.dataCores += earnedCores;
                nextMetaProgress.totalCoresEarned += earnedCores;
                
                // Update Lifetime Stats
                nextMetaProgress.stats.totalEnemiesKilled += nextStats.enemiesKilled;
                nextMetaProgress.stats.totalGoldEarned += nextStats.totalGoldEarned;
                nextMetaProgress.stats.totalBossesDefeated += 1;
                nextMetaProgress.stats.totalPlayTime += (nextStats.endTime - nextStats.startTime);

                // Set ephemeral stats for results screen
                nextStats.coresEarned = earnedCores;

                // SAVE GAME ON COMPLETION
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
                stats: nextStats,
                waveStatus: nextStatus,
                hazards: []
            };
        }

        // --- STEP 1: CALCULATE TOWER STATS (PASSIVES, ACTIVES, AUGMENTS) ---
        nextTowers.forEach(t => {
            t.damage = t.baseDamage;
            t.fireRate = t.baseFireRate;
            t.range = t.baseRange;
            if (t.disabledTimer && t.disabledTimer > 0) {
                t.disabledTimer -= tickDelta;
            }
        });

        // Apply Passive Auras
        nextTowers.forEach(source => {
            if (source.passiveType !== PassiveType.NONE && (source.disabledTimer || 0) <= 0) {
                // @ts-ignore
                const config = ABILITY_CONFIG[source.passiveType];
                if (!config) return;

                if (source.passiveType === PassiveType.DAMAGE_AURA || source.passiveType === PassiveType.RATE_AURA) {
                    nextTowers.forEach(target => {
                        if (source.id === target.id) return;
                        const dist = Math.sqrt(Math.pow(source.position.x - target.position.x, 2) + Math.pow(source.position.z - target.position.z, 2));
                        if (dist <= config.range) {
                            if (source.passiveType === PassiveType.DAMAGE_AURA) target.damage *= config.multiplier;
                            if (source.passiveType === PassiveType.RATE_AURA) target.fireRate *= config.multiplier;
                        }
                    });
                }
            }
        });

        // Apply Active Self-Buffs (Overclock)
        nextTowers.forEach(t => {
            // APPLY DIRECTOR COOLDOWN MULT
            const cdTick = tickDelta * (1 / (prev.directorCooldownMult || 1));
            if (t.abilityCooldown > 0) t.abilityCooldown = Math.max(0, t.abilityCooldown - cdTick);
            if (t.abilityDuration > 0) t.abilityDuration = Math.max(0, t.abilityDuration - tickDelta);
            if (t.abilityDuration > 0 && t.activeType === ActiveAbilityType.OVERCLOCK && (t.disabledTimer || 0) <= 0) {
                const config = ABILITY_CONFIG[ActiveAbilityType.OVERCLOCK];
                t.fireRate *= config.multiplier;
            }
        });

        // Apply Global System Patches (Augments)
        prev.activeAugments.forEach(aug => {
          if (aug.type === AugmentType.STAT_BUFF && aug.effect) {
             if (aug.effect.special === 'BOMBARDMENT') {
                 nextTowers.forEach(t => {
                    if (t.type === TowerType.ARTILLERY) {
                        t.damage *= 1.3;
                        t.fireRate *= 0.8;
                    }
                 });
             } else {
                 nextTowers.forEach(t => {
                    const typeMatches = aug.effect.target === 'ALL' || aug.effect.target === t.type;
                    const pathMatches = !aug.effect.techTarget || aug.effect.techTarget === t.techPath;
                    
                    if (typeMatches && pathMatches) {
                       if (aug.effect.stat === 'damage') t.damage *= (1 + (aug.effect.value || 0));
                       if (aug.effect.stat === 'range') t.range *= (1 + (aug.effect.value || 0));
                       if (aug.effect.stat === 'fireRate') t.fireRate *= (1 + (aug.effect.value || 0));
                    }
                 });
             }
          }
        });


        // --- STEP 1.5: PROCESS HAZARDS ---
        for (let i = nextHazards.length - 1; i >= 0; i--) {
            const hazard = nextHazards[i];
            hazard.duration -= tickDelta;
            if (hazard.duration <= 0) {
                nextHazards.splice(i, 1);
                continue;
            }
            
            // Effect logic
            if (hazard.type === 'NAPALM') {
                // Damage per tick
                const damagePerTick = ((hazard.value || 0) * tickDelta) / 1000;
                nextEnemies.forEach(e => {
                    const dist = Math.sqrt(Math.pow(e.position.x - hazard.position.x, 2) + Math.pow(e.position.z - hazard.position.z, 2));
                    if (dist <= hazard.radius) {
                        e.health -= damagePerTick;
                    }
                });
            } else if (hazard.type === 'SINGULARITY') {
                // Pull enemies
                 nextEnemies.forEach(e => {
                    const dist = Math.sqrt(Math.pow(e.position.x - hazard.position.x, 2) + Math.pow(e.position.z - hazard.position.z, 2));
                    if (dist <= hazard.radius && dist > 0.5) {
                        const pullFactor = (hazard.value || 0) * (tickDelta / 1000);
                        const dx = hazard.position.x - e.position.x;
                        const dz = hazard.position.z - e.position.z;
                        e.position.x += dx * pullFactor;
                        e.position.z += dz * pullFactor;
                    }
                });
            }
        }

        // --- STEP 2: MOVE ENEMIES ---
        for (let i = nextEnemies.length - 1; i >= 0; i--) {
          const enemy = nextEnemies[i];
          if (enemy.health <= 0) {
              // Should be caught by hazard logic, but double check
              // We handle death logic below in projectiles primarily, but if hazards kill them:
              // For now, let hazards just reduce health, we do a cleanup pass for death later if needed.
              // Actually, let's do a death check pass after projectile loop to handle hazard deaths.
          }
          
          let speedMultiplier = 1;
          
          // Apply Boss Buffs
          if (enemy.isBoss && enemy.bossConfig) {
             const boss = enemy as Boss;
             const phase = enemy.bossConfig.phases[enemy.currentPhase || 0];
             speedMultiplier *= phase.speedMultiplier;
             if (boss.isShielded) speedMultiplier *= 0.5;
             
             // Check for active speed buffs
             if (boss.activeBuffs) {
                 const speedBuff = boss.activeBuffs.find(b => b.type === 'SPEED');
                 if (speedBuff) speedMultiplier *= (speedBuff.value || 1);
                 
                 // Expire buffs
                 boss.activeBuffs.forEach(b => b.duration -= tickDelta);
                 boss.activeBuffs = boss.activeBuffs.filter(b => b.duration > 0);
             }
             
             // Regen Logic
             if (boss.activeBuffs) {
                 const regenBuff = boss.activeBuffs.find(b => b.type === 'REGEN');
                 if (regenBuff) {
                     // value is fraction of max health per second (e.g. 0.05)
                     const healAmount = boss.maxHealth * (regenBuff.value || 0) * (tickDelta / 1000);
                     boss.health = Math.min(boss.maxHealth, boss.health + healAmount);
                     if (Math.random() < 0.1) {
                        nextEffects.push({
                             id: Math.random().toString(), type: 'SPARK', position: { ...boss.position, y: 2 },
                             color: '#22c55e', scale: 0.5, lifetime: 10, maxLifetime: 10
                        });
                     }
                 }
             }
          }

          if (enemy.freezeTimer && enemy.freezeTimer > 0) {
              enemy.freezeTimer -= tickDelta;
              speedMultiplier = 0;
          } else {
             nextTowers.forEach(t => {
                 if (t.passiveType === PassiveType.SLOW_AURA && (t.disabledTimer || 0) <= 0) {
                     const dist = Math.sqrt(Math.pow(t.position.x - enemy.position.x, 2) + Math.pow(t.position.z - enemy.position.z, 2));
                     const config = ABILITY_CONFIG[PassiveType.SLOW_AURA];
                     if (dist <= config.range) speedMultiplier = Math.min(speedMultiplier, config.slowFactor);
                 }
             });
          }
          if (speedMultiplier === 0) continue;
          
          const activePath = allPaths[enemy.pathId || 0];
          const currentWaypoint = activePath[enemy.waypointIndex];
          const nextWaypoint = activePath[enemy.waypointIndex + 1];
          
          if (!nextWaypoint) {
            nextLives -= 1;
            nextEnemies.splice(i, 1);
            continue;
          }
          const dx = nextWaypoint.x - currentWaypoint.x;
          const dz = nextWaypoint.z - currentWaypoint.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          enemy.progress += (enemy.speed * speedMultiplier * 0.05 * prev.gameSpeed) / dist;
          if (enemy.progress >= 1) {
            enemy.waypointIndex += 1;
            enemy.progress = 0;
          }
          enemy.position = { x: currentWaypoint.x + dx * enemy.progress, y: enemy.position.y, z: currentWaypoint.z + dz * enemy.progress };
        }

        // --- STEP 3: TOWER SHOOTING ---
        const now = Date.now();
        nextTowers.forEach(tower => {
          // DIRECTOR COOLDOWN MULT applied to shooting rate logic too? 
          // Re-calculated: if cooldown is 1000ms. tickDelta is 50ms.
          // tower.cooldown -= tickDelta * (1 / directorCooldownMult)
          const cdTick = tickDelta * (1 / (prev.directorCooldownMult || 1));
          tower.cooldown -= cdTick;
          
          // Check for Disable Status
          if (tower.disabledTimer && tower.disabledTimer > 0) return;

          if (tower.cooldown > 0) return;
          let candidates = nextEnemies.filter(enemy => {
             const dist = Math.sqrt(Math.pow(enemy.position.x - tower.position.x, 2) + Math.pow(enemy.position.z - tower.position.z, 2));
             const hitRadius = enemy.isBoss ? (enemy.bossConfig?.size || 1) * 0.5 : 0;
             return dist <= tower.range + hitRadius;
          });
          if (candidates.length > 0) {
              if (tower.targetPriority === TargetPriority.FIRST) {
                  candidates.sort((a, b) => a.waypointIndex !== b.waypointIndex ? b.waypointIndex - a.waypointIndex : b.progress - a.progress);
              } else if (tower.targetPriority === TargetPriority.STRONGEST) {
                  candidates.sort((a, b) => b.health - a.health);
              } else if (tower.targetPriority === TargetPriority.WEAKEST) {
                  candidates.sort((a, b) => a.health - b.health);
              }
              const target = candidates[0];
              tower.cooldown = 1000 / tower.fireRate;
              tower.lastShotTime = now; 
              
              const tStats = TOWER_STATS[tower.type];
              // Apply Augment for Artillery radius
              let blastRadius = tStats.blastRadius || 0;
              if (tower.type === TowerType.ARTILLERY) {
                  prev.activeAugments.forEach(aug => {
                      if (aug.type === AugmentType.STAT_BUFF && aug.effect.special === 'CLUSTER_MUNITIONS') {
                          blastRadius *= (1 + (aug.effect.value || 0));
                      }
                  });
              }

              nextProjectiles.push({
                id: Math.random().toString(),
                position: { ...tower.position, y: 0.8 },
                targetId: target.id,
                damage: tower.damage,
                speed: tStats.projectileSpeed || 0.5,
                color: tStats.color,
                sourceType: tower.type,
                blastRadius
              });
          }
        });

        // --- STEP 4: PROJECTILES ---
        for (let i = nextProjectiles.length - 1; i >= 0; i--) {
          const p = nextProjectiles[i];
          const target = nextEnemies.find(e => e.id === p.targetId);
          
          // Projectile cleanup if target lost (except Artillery which hits ground)
          if (!target && p.sourceType !== TowerType.ARTILLERY) { nextProjectiles.splice(i, 1); continue; }
          
          // Target pos (or last known for artillery if target died? Simplified: just aim at where target IS currently)
          // If target is gone for artillery, maybe just remove projectile or let it hit last known? 
          // Simplified: Artillery needs target to track, if target dies, remove projectile.
          if (!target) { nextProjectiles.splice(i, 1); continue; }

          const dx = target.position.x - p.position.x;
          const dy = target.position.y - p.position.y;
          const dz = target.position.z - p.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const moveDist = p.speed * prev.gameSpeed; 
          
          const hitRadius = target.isBoss ? 1 : 0.2;

          if (dist < moveDist || dist < hitRadius) {
            
            // --- HIT LOGIC ---
            
            if (p.sourceType === TowerType.ARTILLERY) {
                // EXPLOSION EFFECT
                nextEffects.push({
                    id: Math.random().toString(), type: 'EXPLOSION', position: { ...target.position, y: 0.2 },
                    color: p.color, scale: (p.blastRadius || 2) * 2, lifetime: 20, maxLifetime: 20
                });
                
                // AOE DAMAGE
                nextEnemies.forEach(e => {
                    const blastDist = Math.sqrt(Math.pow(e.position.x - target.position.x, 2) + Math.pow(e.position.z - target.position.z, 2));
                    if (blastDist <= (p.blastRadius || 0)) {
                        let damageDealt = p.damage;
                         if (e.isBoss) {
                              const b = e as Boss;
                              if (!b.isShielded) {
                                  const phase = b.bossConfig.phases[b.currentPhase || 0];
                                  damageDealt *= (1 - phase.damageResistance);
                                  e.health -= damageDealt;
                              }
                          } else {
                              e.health -= damageDealt;
                          }
                          // Damage Number
                          if (nextDamageNumbers.length < MAX_DAMAGE_NUMBERS) {
                             nextDamageNumbers.push({
                                id: Math.random().toString(), position: { x: e.position.x, y: e.position.y + 1, z: e.position.z },
                                value: damageDealt, color: '#f59e0b', lifetime: 800, maxLifetime: 800, isCritical: false
                             });
                          }
                    }
                });

            } else {
                // SINGLE TARGET HIT
                let damageDealt = 0;
                let isImmune = false;

                if (target.isBoss) {
                    const boss = target as Boss;
                    if (boss.isShielded) {
                        isImmune = true;
                        nextEffects.push({
                            id: Math.random().toString(), type: 'BLOCKED', position: { ...target.position, y: target.position.y + 1 },
                            color: '#3b82f6', scale: 1, lifetime: 20, maxLifetime: 20, text: "BLOCKED"
                        });
                    } else {
                        let finalDamage = p.damage;
                        const phase = boss.bossConfig.phases[boss.currentPhase || 0];
                        finalDamage *= (1 - phase.damageResistance);
                        damageDealt = finalDamage;
                    }
                } else {
                    damageDealt = p.damage;
                }

                if (!isImmune) {
                    target.health -= damageDealt;

                    // --- SPAWN DAMAGE NUMBER ---
                    if (nextDamageNumbers.length < MAX_DAMAGE_NUMBERS) {
                    const sourceTowerType = p.sourceType;
                    let textColor = '#ffffff';
                    if (sourceTowerType === TowerType.SNIPER) textColor = '#ef4444';
                    else if (sourceTowerType === TowerType.FAST) textColor = '#10b981';
                    
                    // Jitter
                    const jitterX = (Math.random() - 0.5) * 0.8;
                    const jitterZ = (Math.random() - 0.5) * 0.8;

                    nextDamageNumbers.push({
                        id: Math.random().toString(),
                        position: { x: target.position.x + jitterX, y: target.position.y + 0.8, z: target.position.z + jitterZ },
                        value: damageDealt,
                        color: textColor,
                        lifetime: 1000,
                        maxLifetime: 1000,
                        isCritical: sourceTowerType === TowerType.SNIPER || damageDealt > 50
                    });
                    }

                    nextEffects.push({
                        id: Math.random().toString(), type: 'SPARK', position: { ...target.position, y: target.position.y + 0.5 },
                        color: p.color, scale: 0.5, lifetime: 10, maxLifetime: 10
                    });

                    // Splash Augment (Sniper)
                    prev.activeAugments.forEach(aug => {
                        if (aug.type === AugmentType.ON_HIT && aug.effect.special === 'SPLASH_DAMAGE' && aug.effect.target === p.sourceType) {
                        nextEffects.push({
                            id: Math.random().toString(), type: 'EXPLOSION', position: target.position,
                            color: p.color, scale: 1.5, lifetime: 15, maxLifetime: 15
                        });
                        nextEnemies.forEach(e => {
                            if (e.id === target.id) return;
                            const splashDist = Math.sqrt(Math.pow(e.position.x - target.position.x, 2) + Math.pow(e.position.z - target.position.z, 2));
                            if (splashDist < 2) {
                                let splashDmg = p.damage * (aug.effect.value || 0);
                                e.health -= splashDmg;
                                if (nextDamageNumbers.length < MAX_DAMAGE_NUMBERS) {
                                        nextDamageNumbers.push({
                                        id: Math.random().toString(),
                                        position: { x: e.position.x + (Math.random()-0.5), y: e.position.y + 1, z: e.position.z + (Math.random()-0.5) },
                                        value: splashDmg,
                                        color: p.color,
                                        lifetime: 800, maxLifetime: 800, isCritical: false
                                        });
                                    }
                            }
                        });
                        }
                    });
                }
            }
            
            nextProjectiles.splice(i, 1);
          } else {
            p.position.x += (dx / dist) * moveDist;
            p.position.y += (dy / dist) * moveDist;
            p.position.z += (dz / dist) * moveDist;
          }
        }

        // --- STEP 4.5: ENEMY DEATH & SPLIT LOGIC ---
        // Clean up dead enemies and handle splitting
        for (let i = nextEnemies.length - 1; i >= 0; i--) {
            const e = nextEnemies[i];
            if (e.health <= 0) {
                 if (e.isBoss) {
                   // Trigger Boss Death Sequence
                   nextPhase = 'BOSS_DEATH';
                   nextBossDeathTimer = 3500; // 3.5 seconds for animation
                   nextBossAnnouncement = "TARGET DESTROYED";
                   // Do not remove boss from array yet
                 } else {
                    const stats = ENEMY_STATS[e.type];
                    
                    // SPLITTING LOGIC
                    // @ts-ignore
                    if (stats.splitsInto) {
                        // @ts-ignore
                        const splitConfig = stats.splitsInto;
                        let damageToMinis = 0;
                        // Chain Reaction Augment
                        prev.activeAugments.forEach(aug => {
                            if (aug.type === AugmentType.ON_HIT && aug.effect.special === 'CHAIN_REACTION') {
                                // Hard to track exact killing blow dmg here, assuming 50% max HP dmg for now or flat
                                // Let's use 50% max HP of mini
                                damageToMinis = ENEMY_STATS[splitConfig.type as EnemyType].health * 0.5;
                            }
                        });

                        for (let k = 0; k < splitConfig.count; k++) {
                            const miniStats = ENEMY_STATS[splitConfig.type as EnemyType];
                            const offsetX = (Math.random() - 0.5) * 0.5;
                            const offsetZ = (Math.random() - 0.5) * 0.5;
                            
                            nextEnemies.push({
                                id: Math.random().toString(),
                                type: splitConfig.type,
                                health: miniStats.health - damageToMinis,
                                maxHealth: miniStats.health,
                                speed: miniStats.speed,
                                position: { x: e.position.x + offsetX, y: e.position.y, z: e.position.z + offsetZ },
                                pathId: e.pathId,
                                waypointIndex: e.waypointIndex,
                                progress: e.progress
                            });
                        }
                        
                        nextEffects.push({
                            id: Math.random().toString(), type: 'NOVA', position: e.position,
                            color: '#2dd4bf', scale: 1.0, lifetime: 20, maxLifetime: 20
                        });
                    }

                    const reward = Math.floor(stats.goldReward * prev.directorGoldBonus);
                    nextGold += reward;
                    nextStats.totalGoldEarned += reward; 
                    nextStats.enemiesKilled += 1; // Increment kills
                    nextEnemies.splice(i, 1);
                    nextEffects.push({
                        id: Math.random().toString(), type: 'EXPLOSION', position: { ...e.position, y: 0.5 },
                        color: stats.color, scale: 1, lifetime: 20, maxLifetime: 20
                    });
                 }
            }
        }


        // --- STEP 5: EFFECTS & DAMAGE NUMBERS CLEANUP ---
        for (let i = nextEffects.length - 1; i >= 0; i--) {
            nextEffects[i].lifetime -= 1 * prev.gameSpeed;
            if (nextEffects[i].lifetime <= 0) nextEffects.splice(i, 1);
        }
        for (let i = nextDamageNumbers.length - 1; i >= 0; i--) {
            nextDamageNumbers[i].lifetime -= tickDelta;
            if (nextDamageNumbers[i].lifetime <= 0) nextDamageNumbers.splice(i, 1);
        }

        // --- BOSS LOGIC ---
        const bossIndex = nextEnemies.findIndex(e => e.isBoss);
        let currentBoss = bossIndex > -1 ? (nextEnemies[bossIndex] as Boss) : null;
        
        if (currentBoss && currentBoss.health > 0 && nextPhase !== 'BOSS_DEATH') {
            const updatedBoss = { ...currentBoss };
            updatedBoss.abilityCooldowns = { ...currentBoss.abilityCooldowns }; 
            
            const healthPct = updatedBoss.health / updatedBoss.maxHealth;
            const config = updatedBoss.bossConfig;
            
            let newPhaseIdx = updatedBoss.currentPhase || 0;
            for (let i = 0; i < config.phases.length; i++) {
                if (healthPct <= config.phases[i].healthThreshold) {
                    newPhaseIdx = i;
                }
            }
            if (newPhaseIdx !== (updatedBoss.currentPhase || 0)) {
                updatedBoss.currentPhase = newPhaseIdx;
                nextBossAnnouncement = config.phases[newPhaseIdx].announcement;
                nextEffects.push({
                    id: Math.random().toString(), type: 'NOVA', position: updatedBoss.position,
                    color: config.phases[newPhaseIdx].visualChange === 'enraged' ? '#ef4444' : '#3b82f6',
                    scale: 3, lifetime: 40, maxLifetime: 40
                });
            }

            config.minionSpawns.forEach((spawn, idx) => {
                if (!updatedBoss.triggeredSpawnIndices.includes(idx) && healthPct <= spawn.triggerHealth) {
                    updatedBoss.triggeredSpawnIndices = [...updatedBoss.triggeredSpawnIndices, idx];
                    nextBossAnnouncement = spawn.announcement || "REINFORCEMENTS INCOMING";
                    nextEffects.push({
                        id: Math.random().toString(), type: 'PORTAL', position: updatedBoss.position,
                        color: '#f97316', scale: 2, lifetime: 60, maxLifetime: 60
                    });
                    for (let k = 0; k < spawn.count; k++) {
                         const stats = ENEMY_STATS[spawn.enemyType];
                         const offsetX = (Math.random() - 0.5) * 1;
                         const offsetZ = (Math.random() - 0.5) * 1;
                         const spawnPos = { x: updatedBoss.position.x + offsetX, y: updatedBoss.position.y, z: updatedBoss.position.z + offsetZ };
                         nextEnemies.push({
                            id: Math.random().toString(), type: spawn.enemyType,
                            health: stats.health * 1.2, maxHealth: stats.health * 1.2,
                            speed: stats.speed, position: spawnPos,
                            pathId: updatedBoss.pathId, waypointIndex: updatedBoss.waypointIndex, progress: updatedBoss.progress
                         });
                    }
                }
            });

            // Cooldowns
            Object.keys(updatedBoss.abilityCooldowns).forEach(key => {
                if (updatedBoss.abilityCooldowns[key] > 0) {
                    updatedBoss.abilityCooldowns[key] -= tickDelta;
                }
            });

            // Shield Logic
            if (updatedBoss.isShielded) {
                if ((updatedBoss.shieldTimer || 0) > 0) {
                    updatedBoss.shieldTimer = (updatedBoss.shieldTimer || 0) - tickDelta;
                } else {
                    updatedBoss.isShielded = false;
                    nextEffects.push({
                         id: Math.random().toString(), type: 'NOVA', position: updatedBoss.position,
                         color: '#3b82f6', scale: 2, lifetime: 20, maxLifetime: 20
                    });
                }
            }

            // Disable Zone Logic (Expiration)
            if (updatedBoss.disabledZone) {
                updatedBoss.disabledZone.duration -= tickDelta;
                if (updatedBoss.disabledZone.duration <= 0) {
                    updatedBoss.disabledZone = undefined;
                } else {
                    // Apply disable to towers
                    const zone = updatedBoss.disabledZone;
                    nextTowers.forEach(t => {
                        const dist = Math.sqrt(Math.pow(t.position.x - zone.position.x, 2) + Math.pow(t.position.z - zone.position.z, 2));
                        if (dist <= zone.radius) {
                            t.disabledTimer = 500; // Keep disabling while active
                        }
                    });
                }
            }

            config.abilities.forEach(ability => {
                 let unlocked = true; 
                 const isRestricted = config.phases.some(p => p.abilityUnlock === ability.id);
                 if (isRestricted) {
                     unlocked = false;
                     for (let p = 0; p <= (updatedBoss.currentPhase || 0); p++) {
                         if (config.phases[p].abilityUnlock === ability.id) unlocked = true;
                     }
                 }

                 if (unlocked && (updatedBoss.abilityCooldowns[ability.id] || 0) <= 0 && !updatedBoss.isShielded) {
                     updatedBoss.abilityCooldowns[ability.id] = ability.cooldown;
                     
                     if (ability.type === BossAbilityType.SPAWN_MINIONS) {
                         nextBossAnnouncement = "DEPLOYING DEFENSE DRONES";
                         nextEffects.push({
                            id: Math.random().toString(), type: 'PORTAL', position: updatedBoss.position,
                            color: '#fbbf24', scale: 2, lifetime: 50, maxLifetime: 50
                        });
                        const count = 3 + Math.floor(updatedBoss.currentPhase * 2); 
                        for (let k = 0; k < count; k++) {
                            const stats = ENEMY_STATS[EnemyType.BASIC];
                            const offsetX = (Math.random() - 0.5) * 2;
                            const offsetZ = (Math.random() - 0.5) * 2;
                            nextEnemies.push({
                               id: Math.random().toString(), type: EnemyType.BASIC,
                               health: stats.health, maxHealth: stats.health,
                               speed: stats.speed, position: { x: updatedBoss.position.x + offsetX, y: updatedBoss.position.y, z: updatedBoss.position.z + offsetZ },
                               pathId: updatedBoss.pathId, waypointIndex: updatedBoss.waypointIndex, progress: updatedBoss.progress
                            });
                       }
                     } else if (ability.type === BossAbilityType.SHIELD_PULSE) {
                         updatedBoss.isShielded = true;
                         updatedBoss.shieldTimer = ability.duration || 3000;
                         nextBossAnnouncement = "EMERGENCY SHIELDS ACTIVE";
                     } else if (ability.type === BossAbilityType.SPEED_BURST) {
                         updatedBoss.activeBuffs = updatedBoss.activeBuffs || [];
                         updatedBoss.activeBuffs.push({ type: 'SPEED', duration: ability.duration || 3000, value: ability.value || 2 });
                         nextBossAnnouncement = "SPEED SURGE DETECTED";
                         nextEffects.push({
                             id: Math.random().toString(), type: 'SPARK', position: updatedBoss.position, color: '#06b6d4', scale: 2, lifetime: 30, maxLifetime: 30
                         });
                     } else if (ability.type === BossAbilityType.REGEN) {
                         updatedBoss.activeBuffs = updatedBoss.activeBuffs || [];
                         updatedBoss.activeBuffs.push({ type: 'REGEN', duration: ability.duration || 5000, value: ability.value || 0.05 });
                         nextBossAnnouncement = "SELF-REPAIR INITIATED";
                     } else if (ability.type === BossAbilityType.DISABLE_ZONE) {
                         updatedBoss.disabledZone = { position: { ...updatedBoss.position }, radius: ability.radius || 4, duration: ability.duration || 5000 };
                         nextBossAnnouncement = "EMP DISCHARGE";
                         nextEffects.push({
                             id: Math.random().toString(), type: 'DISABLE_FIELD', position: updatedBoss.position, color: '#dc2626', scale: (ability.radius || 4) * 2, lifetime: (ability.duration || 5000) / (tickDelta * 2) * 60 /* Approx frames */, maxLifetime: (ability.duration || 5000) / (tickDelta * 2) * 60
                         });
                     }
                 }
            });
            nextEnemies[bossIndex] = updatedBoss;
            currentBoss = updatedBoss;
        }


        // --- STEP 6: WAVE COMPLETE (Economy Augments) ---
        if (nextStatus === 'CLEARING' && nextEnemies.length === 0) {
           nextStatus = 'IDLE';
           prev.activeAugments.forEach(aug => {
               if (aug.type === AugmentType.ECONOMY && aug.effect.special === 'INTEREST') {
                   const interest = Math.floor(nextGold * (aug.effect.value || 0));
                   nextGold += interest;
                   nextStats.totalGoldEarned += interest; // Track interest
               }
           });
        }

        let nextGameOver = prev.isGameOver;
        if (nextLives <= 0) {
            nextGameOver = true;
            nextPhase = 'GAME_OVER';
            
            // Save on Game Over to preserve bestWave progress and accrued lifetime stats
            const currentProg = nextStageProgress[prev.currentStage];
            nextStageProgress[prev.currentStage] = {
                ...currentProg,
                bestWave: Math.max(currentProg.bestWave, prev.wave)
            };
            
            // Accrue partial stats
            nextMetaProgress.stats.totalEnemiesKilled += nextStats.enemiesKilled;
            nextMetaProgress.stats.totalGoldEarned += nextStats.totalGoldEarned;
            nextMetaProgress.stats.totalPlayTime += (Date.now() - nextStats.startTime);

            saveGame(nextStageProgress, nextMetaProgress);
        }

        return {
          ...prev, enemies: nextEnemies, projectiles: nextProjectiles, towers: nextTowers,
          effects: nextEffects, damageNumbers: nextDamageNumbers, gold: nextGold, lives: nextLives, waveStatus: nextStatus, isGameOver: nextGameOver,
          gamePhase: nextPhase, stageProgress: nextStageProgress, metaProgress: nextMetaProgress, activeBoss: currentBoss || null, bossAnnouncement: nextBossAnnouncement,
          stats: nextStats, hazards: nextHazards
        };
      });
    }, TICK_RATE);
    return () => clearInterval(interval);
  }, [gameState.isGameOver, gameState.gamePhase]);

  // AI DIRECTOR LOGIC
  const assessDirectorAction = useCallback(() => {
    const currentState = gameStateRef.current;
    const towerValue = currentState.towers.reduce((sum, t) => sum + t.totalInvested, 0);
    const powerScore = currentState.gold + towerValue + (currentState.lives * 10);
    const config = STAGE_CONFIGS[currentState.currentStage];
    
    // Wave 1 power score is just starting gold. 
    // We expect player power to grow by ~250 per wave.
    const expectedPower = config.startingGold + (currentState.wave * 300);

    let action: DirectorActionType = 'NONE';
    let scaling = 1.0;
    let goldBonus = 1.0;
    let cooldownMult = 1.0;
    let intel = "";

    if (powerScore > expectedPower * 1.5) {
        action = 'ELITE';
        scaling = 1.2;
        goldBonus = 1.25;
        intel = "DIRECTOR: High threat level detected. Elite units deployed.";
    } else if (powerScore < expectedPower * 0.7 || currentState.lives < 5) {
        action = 'SUPPLY';
        cooldownMult = 0.9; // 10% faster cooldowns
        intel = "DIRECTOR: Reinforcements authorized. Hold the line.";
        // Immediate gold bonus in startNextWave
    } else {
        action = 'NONE';
        const randomTip = TACTICAL_INTEL_POOL[Math.floor(Math.random() * TACTICAL_INTEL_POOL.length)];
        intel = randomTip;
    }

    return { action, scaling, goldBonus, cooldownMult, intel };
  }, []);

  const startNextWave = async () => {
    if (gameState.waveStatus !== 'IDLE' || gameState.isChoosingAugment) return;
    
    setGameState(prev => ({ ...prev, selectedTowerId: null }));
    setPendingPlacement(null);

    const nextWaveNum = gameState.wave + 1;
    const stageConfig = STAGE_CONFIGS[gameState.currentStage];

    // Check for Final Boss Wave
    if (nextWaveNum === stageConfig.waves) {
        triggerBossIntro();
        return;
    }
    
    if ((nextWaveNum - 1) % 5 === 0 && (nextWaveNum - 1) > 0) {
        const shuffled = [...AUGMENT_POOL].sort(() => 0.5 - Math.random());
        const choices = shuffled.slice(0, 3);
        setGameState(prev => ({
            ...prev,
            augmentChoices: choices,
            isChoosingAugment: true,
            gameSpeed: 0
        }));
        return;
    }

    // AI Director Assessment
    const dda = assessDirectorAction();
    let supplyGold = 0;
    if (dda.action === 'SUPPLY') {
        supplyGold = 150;
    }

    setGameState(prev => ({
        ...prev,
        directorAction: dda.action,
        directorScaling: dda.scaling,
        directorGoldBonus: dda.goldBonus,
        directorCooldownMult: dda.cooldownMult,
        waveIntel: dda.intel,
        gold: prev.gold + supplyGold,
        stats: { ...prev.stats, totalGoldEarned: prev.stats.totalGoldEarned + supplyGold }
    }));

    performWaveStart(nextWaveNum, dda.scaling);
  };

  const performWaveStart = (waveNum: number, ddaScaling: number = 1.0) => {
    const stageId = gameState.currentStage;
    const waveDefinition = getWaveDefinition(stageId, waveNum);
    const stageConfig = STAGE_CONFIGS[stageId];
    
    setGameState(prev => ({ 
      ...prev, 
      wave: waveNum, 
      waveStatus: 'SPAWNING'
    }));

    let globalDelayOffset = 0;

    waveDefinition.composition.forEach(group => {
        const { type, count, interval, wait } = group;
        if (wait) globalDelayOffset += wait;
        
        for (let i = 0; i < count; i++) {
            const spawnDelay = globalDelayOffset + (i * interval);
            
            setTimeout(() => {
                const currentGS = gameStateRef.current;
                if (currentGS.isGameOver) return;
                
                setGameState(prev => {
                    const stats = ENEMY_STATS[type];
                    
                    // Path Selection Logic
                    let pathId = 0;
                    if (stageConfig.paths.length > 1) {
                         pathId = Math.floor(Math.random() * stageConfig.paths.length);
                    }
                    
                    const startPos = stageConfig.paths[pathId][0];
                    // USE DIRECTOR SCALING HERE
                    const scaledHealth = stats.health * (1 + (waveNum * 0.1)) * stageConfig.enemyScaling * ddaScaling;
                    
                    const newEnemy: Enemy = {
                        id: Math.random().toString(), 
                        type: type, 
                        health: scaledHealth,
                        maxHealth: scaledHealth, 
                        speed: stats.speed, 
                        position: { ...startPos },
                        pathId: pathId,
                        waypointIndex: 0, 
                        progress: 0
                    };
                    return { ...prev, enemies: [...prev.enemies, newEnemy] };
                });
            }, spawnDelay);
        }
        globalDelayOffset += (count * interval);
    });

    setTimeout(() => {
         if (!gameStateRef.current.isGameOver) {
             setGameState(prev => ({ ...prev, waveStatus: 'CLEARING' }));
         }
    }, globalDelayOffset);
  };

  const triggerBossIntro = () => {
      const config = STAGE_CONFIGS[gameStateRef.current.currentStage].bossConfig;
      setGameState(prev => ({
          ...prev,
          gamePhase: 'BOSS_INTRO',
          bossAnnouncement: config.name,
          wave: prev.wave + 1,
          selectedTowerId: null,
          targetingAbility: null,
          gameSpeed: 0 // Pause speed during intro
      }));
      setPendingPlacement(null);
      
      setTimeout(() => startBossFight(), 4000); // Increased to 4s for drama
  };

  const startBossFight = () => {
      const config = STAGE_CONFIGS[gameStateRef.current.currentStage].bossConfig;
      const paths = STAGE_CONFIGS[gameStateRef.current.currentStage].paths;
      const pathId = 0; // Boss always takes primary path for now
      const startPos = paths[pathId][0];
      
      const boss: Boss = {
          id: 'BOSS_PRIME',
          type: EnemyType.BOSS,
          health: config.baseHealth,
          maxHealth: config.baseHealth,
          speed: config.speed,
          position: { ...startPos },
          pathId: pathId,
          waypointIndex: 0,
          progress: 0,
          isBoss: true,
          bossConfig: config,
          currentPhase: 0,
          abilityCooldowns: {},
          isShielded: false,
          shieldTimer: 0,
          triggeredSpawnIndices: []
      };

      setGameState(prev => ({
          ...prev,
          gamePhase: 'BOSS_FIGHT',
          enemies: [boss],
          activeBoss: boss,
          waveStatus: 'CLEARING',
          gameSpeed: 1, // Resume speed
          waveIntel: `WARNING: ${config.title} detected!`
      }));
  };

  const handlePickAugment = (augment: Augment) => {
      if (!gameStateRef.current.isChoosingAugment) return;
      const nextWaveToStart = gameStateRef.current.wave + 1;
      setGameState(prev => ({
          ...prev,
          activeAugments: [...prev.activeAugments, augment],
          isChoosingAugment: false,
          augmentChoices: [],
          gameSpeed: 1
      }));
      
      // Perform Director DDA for wave starting after augment
      const dda = assessDirectorAction();
      let supplyGold = 0;
      if (dda.action === 'SUPPLY') supplyGold = 150;

      setGameState(prev => ({
        ...prev,
        directorAction: dda.action,
        directorScaling: dda.scaling,
        directorGoldBonus: dda.goldBonus,
        directorCooldownMult: dda.cooldownMult,
        waveIntel: dda.intel,
        gold: prev.gold + supplyGold
      }));

      performWaveStart(nextWaveToStart, dda.scaling);
  };

  const executeAbilityOnTowers = (towerIds: string[]) => {
    setGameState(prev => {
        const nextTowers = [...prev.towers];
        const nextEffects = [...prev.effects];
        const nextHazards = [...prev.hazards];
        const nextEnemies = prev.enemies.map(e => ({ ...e }));
        const nextDamageNumbers = [...prev.damageNumbers];
        let nextGold = prev.gold;
        let nextStats = { ...prev.stats };

        let abilityTriggered = false;

        towerIds.forEach(towerId => {
            const towerIndex = nextTowers.findIndex(t => t.id === towerId);
            if (towerIndex === -1) return;
            const tower = nextTowers[towerIndex];
            if (tower.abilityCooldown > 0) return;
            if (tower.disabledTimer && tower.disabledTimer > 0) return; // Cannot use ability if disabled

            const config = ABILITY_CONFIG[tower.activeType];
            // @ts-ignore
            if (!config) return;

            nextTowers[towerIndex] = { ...tower, abilityCooldown: config.cooldown };
            abilityTriggered = true;

            if (tower.activeType === ActiveAbilityType.ERUPTION) {
                nextEffects.push({ id: Math.random().toString(), type: 'NOVA', position: tower.position, color: config.color, scale: 0.1, lifetime: 30, maxLifetime: 30 });
                nextEnemies.forEach(e => {
                    const dist = Math.sqrt(Math.pow(e.position.x - tower.position.x, 2) + Math.pow(e.position.z - tower.position.z, 2));
                    // @ts-ignore
                    if (dist <= config.range) { 
                        e.health -= config.damage; 

                        // Damage Number for Eruption
                        if (nextDamageNumbers.length < MAX_DAMAGE_NUMBERS) {
                          nextDamageNumbers.push({
                            id: Math.random().toString(),
                            position: { x: e.position.x + (Math.random()-0.5), y: e.position.y + 1, z: e.position.z + (Math.random()-0.5) },
                            value: config.damage, color: config.color, lifetime: 1200, maxLifetime: 1200, isCritical: true
                          });
                        }
                    }
                });
            }
            if (tower.activeType === ActiveAbilityType.FREEZE) {
                 nextEffects.push({ id: Math.random().toString(), type: 'FREEZE_WAVE', position: tower.position, color: config.color, scale: 0.1, lifetime: 30, maxLifetime: 30 });
                 nextEnemies.forEach(e => { const dist = Math.sqrt(Math.pow(e.position.x - tower.position.x, 2) + Math.pow(e.position.z - tower.position.z, 2)); if (dist <= config.range) e.freezeTimer = config.duration; });
            }
            if (tower.activeType === ActiveAbilityType.NAPALM) {
                nextHazards.push({
                    id: Math.random().toString(), type: 'NAPALM', position: tower.position, radius: config.range || 4, duration: config.duration || 5000, value: config.damage || 50, color: config.color || '#f97316'
                });
                nextEffects.push({ id: Math.random().toString(), type: 'NOVA', position: tower.position, color: config.color, scale: 0.1, lifetime: 30, maxLifetime: 30 });
            }
            if (tower.activeType === ActiveAbilityType.SINGULARITY) {
                nextHazards.push({
                    id: Math.random().toString(), type: 'SINGULARITY', position: tower.position, radius: config.range || 5, duration: config.duration || 4000, value: config.value || 0.1, color: config.color || '#7c3aed'
                });
                nextEffects.push({ id: Math.random().toString(), type: 'NOVA', position: tower.position, color: config.color, scale: 0.1, lifetime: 30, maxLifetime: 30 });
            }
            if (tower.activeType === ActiveAbilityType.BARRAGE) {
                // Should fire multiple shots. Simplification: Instantly fire count projectiles.
                const count = config.count || 3;
                const interval = config.interval || 200;
                // Since this function is sync, we can't easily schedule state updates for future ticks cleanly inside setState.
                // Workaround: Instant spread shots. Or just spawn them all now.
                // Let's spawn projectiles directly.
                const tStats = TOWER_STATS[tower.type];
                 const candidates = nextEnemies.filter(enemy => {
                     const dist = Math.sqrt(Math.pow(enemy.position.x - tower.position.x, 2) + Math.pow(enemy.position.z - tower.position.z, 2));
                     return dist <= tower.range;
                 });
                 if (candidates.length > 0) {
                     for (let k=0; k<count; k++) {
                         // Pick random target or same
                         const target = candidates[k % candidates.length];
                          // Apply Augment for Artillery radius
                        let blastRadius = tStats.blastRadius || 0;
                        if (tower.type === TowerType.ARTILLERY) {
                            prev.activeAugments.forEach(aug => {
                                if (aug.type === AugmentType.STAT_BUFF && aug.effect.special === 'CLUSTER_MUNITIONS') {
                                    blastRadius *= (1 + (aug.effect.value || 0));
                                }
                            });
                        }
                        
                         prev.projectiles.push({
                            id: Math.random().toString(),
                            position: { ...tower.position, y: 0.8 },
                            targetId: target.id,
                            damage: tower.damage,
                            speed: tStats.projectileSpeed || 0.5,
                            color: tStats.color,
                            sourceType: tower.type,
                            blastRadius
                        });
                     }
                 }
            }
            
            if (tower.activeType === ActiveAbilityType.OVERCLOCK) nextTowers[towerIndex].abilityDuration = config.duration;
        });

        if (abilityTriggered) nextStats.abilitiesUsed++;

        return { ...prev, towers: nextTowers, enemies: nextEnemies, effects: nextEffects, damageNumbers: nextDamageNumbers, gold: nextGold, stats: nextStats, hazards: nextHazards };
    });
  };

  const executeGlobalAbility = (pos: Vector3Tuple, type: ActiveAbilityType) => {
      if (type !== ActiveAbilityType.ORBITAL_STRIKE) return;

      setGameState(prev => {
          const nextTowers = [...prev.towers];
          const nextEffects = [...prev.effects];
          const nextEnemies = prev.enemies.map(e => ({ ...e }));
          const nextDamageNumbers = [...prev.damageNumbers];
          let nextGold = prev.gold;
          let nextStats = { ...prev.stats };
          
          const availableTowers = nextTowers.filter(t => t.activeType === type && t.abilityCooldown <= 0 && (!t.disabledTimer || t.disabledTimer <= 0));
          if (availableTowers.length === 0) return prev;

          const config = ABILITY_CONFIG[type];
          availableTowers.forEach(t => {
             const idx = nextTowers.findIndex(nt => nt.id === t.id);
             if (idx > -1) {
                 nextTowers[idx] = { ...nextTowers[idx], abilityCooldown: config.cooldown };
             }
          });

          nextStats.abilitiesUsed++;
          const totalDamage = config.damage * availableTowers.length;
          const radius = 4;

          nextEffects.push({ id: Math.random().toString(), type: 'ORBITAL_STRIKE', position: pos, color: config.color, scale: radius, lifetime: 40, maxLifetime: 40 });

          nextEnemies.forEach(e => {
             const dist = Math.sqrt(Math.pow(e.position.x - pos.x, 2) + Math.pow(e.position.z - pos.z, 2));
             if (dist <= radius) {
                 e.health -= totalDamage;

                 // Damage Number for Orbital Strike
                 if (nextDamageNumbers.length < MAX_DAMAGE_NUMBERS) {
                    nextDamageNumbers.push({
                      id: Math.random().toString(),
                      position: { x: e.position.x + (Math.random()-0.5), y: e.position.y + 1, z: e.position.z + (Math.random()-0.5) },
                      value: totalDamage, color: config.color, lifetime: 1500, maxLifetime: 1500, isCritical: true
                    });
                 }

                 if (e.health <= 0 && !e.isBoss) {
                     const stats = ENEMY_STATS[e.type];
                     const reward = Math.floor(stats.goldReward * prev.directorGoldBonus);
                     nextGold += reward;
                     nextStats.totalGoldEarned += reward;
                     nextStats.enemiesKilled += 1;
                 }
             }
          });

          // Cleanup handled by loop
          return { ...prev, towers: nextTowers, enemies: nextEnemies, effects: nextEffects, damageNumbers: nextDamageNumbers, gold: nextGold, targetingAbility: null, stats: nextStats };
      });
  };

  const handleTriggerAbility = (towerId: string) => {
      const tower = gameState.towers.find(t => t.id === towerId);
      if (tower?.activeType === ActiveAbilityType.ORBITAL_STRIKE) {
          setGameState(prev => ({ ...prev, targetingAbility: ActiveAbilityType.ORBITAL_STRIKE, selectedTowerId: null }));
      } else {
          executeAbilityOnTowers([towerId]);
      }
  };

  const handleBatchTriggerAbility = (activeType: ActiveAbilityType) => {
      const currentGameState = gameStateRef.current;
      if (activeType === ActiveAbilityType.ORBITAL_STRIKE) {
          setGameState(prev => ({ 
              ...prev, 
              targetingAbility: prev.targetingAbility === ActiveAbilityType.ORBITAL_STRIKE ? null : ActiveAbilityType.ORBITAL_STRIKE,
              selectedTowerId: null,
              pendingPlacement: null
          }));
          return;
      }

      const towersToTrigger = currentGameState.towers.filter(t => {
          if (t.activeType !== activeType || t.abilityCooldown > 0 || (t.disabledTimer && t.disabledTimer > 0)) return false;
          // For self-centered AOE abilities like Napalm/Singularity, check if enemies are in range
          if (activeType === ActiveAbilityType.NAPALM || activeType === ActiveAbilityType.SINGULARITY || activeType === ActiveAbilityType.BARRAGE || activeType === ActiveAbilityType.ERUPTION || activeType === ActiveAbilityType.FREEZE) {
                return currentGameState.enemies.some(enemy => {
                    const dist = Math.sqrt(Math.pow(enemy.position.x - t.position.x, 2) + Math.pow(enemy.position.z - t.position.z, 2));
                    return dist <= t.range; // Use tower range or ability range
                });
          }
          return true; // Overclock always triggers
      });

      if (towersToTrigger.length === 0) return;
      executeAbilityOnTowers(towersToTrigger.map(t => t.id));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameStateRef.current.isChoosingAugment) return;
        if (e.key === '1') handleBatchTriggerAbility(ActiveAbilityType.ERUPTION);
        if (e.key === '2') handleBatchTriggerAbility(ActiveAbilityType.OVERCLOCK);
        if (e.key === '3') handleBatchTriggerAbility(ActiveAbilityType.FREEZE);
        if (e.key === '4') handleBatchTriggerAbility(ActiveAbilityType.ORBITAL_STRIKE);
        
        // New hotkeys for Artillery Abilities? Reusing slots for now or adding more.
        // Let's map them to same slots if they are analogous?
        // ERUPTION slot -> NAPALM
        // OVERCLOCK slot -> BARRAGE
        // FREEZE slot -> SINGULARITY
        if (e.key === '1') handleBatchTriggerAbility(ActiveAbilityType.NAPALM);
        if (e.key === '2') handleBatchTriggerAbility(ActiveAbilityType.BARRAGE);
        if (e.key === '3') handleBatchTriggerAbility(ActiveAbilityType.SINGULARITY);

        if (e.key === 'Escape') {
             setPendingPlacement(null);
             setGameState(prev => ({ ...prev, selectedTowerId: null, targetingAbility: null }));
        }
        if (e.code === 'Space') {
            const currentPhase = gameStateRef.current.gamePhase;
            const currentStatus = gameStateRef.current.waveStatus;
            if (currentPhase === 'PLAYING' && currentStatus === 'IDLE') {
                startNextWave();
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGridClick = (pos: Vector3Tuple) => {
      if (gameState.isGameOver || gameState.gameSpeed === 0 || gameState.isChoosingAugment) return;
      if (gameState.targetingAbility) {
          executeGlobalAbility(pos, gameState.targetingAbility);
          return;
      }

      if (gameState.selectedTowerId) setGameState(prev => ({ ...prev, selectedTowerId: null }));
      const stats = TOWER_STATS[selectedTowerType];
      if (gameState.gold < stats.cost) return;
      const exists = gameState.towers.some(t => Math.abs(t.position.x - pos.x) < 0.5 && Math.abs(t.position.z - pos.z) < 0.5);
      if (exists) return;
      
      const currentStageConfig = STAGE_CONFIGS[gameState.currentStage];
      const allPaths = currentStageConfig.paths;
      
      // Check collision against ALL paths
      let onPath = false;
      for (const path of allPaths) {
          const pathCollision = path.some((wp, idx) => {
            if (idx === path.length - 1) return false;
            const next = path[idx + 1];
            const minX = Math.min(wp.x, next.x) - 0.8; const maxX = Math.max(wp.x, next.x) + 0.8;
            const minZ = Math.min(wp.z, next.z) - 0.8; const maxZ = Math.max(wp.z, next.z) + 0.8;
            return pos.x >= minX && pos.x <= maxX && pos.z >= minZ && pos.z <= maxZ;
          });
          if (pathCollision) {
              onPath = true;
              break;
          }
      }
      
      if (onPath) return;
      
      setPendingPlacement(pos);
  };

  const handleConfirmPlacement = () => {
      if (!pendingPlacement) return;
      const stats = TOWER_STATS[selectedTowerType];
      if (gameState.gold < stats.cost) { setPendingPlacement(null); return; }
      const newTower: Tower = {
        id: Math.random().toString(), type: selectedTowerType, position: { ...pendingPlacement, y: 0.5 },
        range: stats.range, fireRate: stats.fireRate, damage: stats.damage, baseRange: stats.range, baseFireRate: stats.fireRate,
        baseDamage: stats.damage, cooldown: 0, lastShotTime: 0, level: 1, techPath: TechPath.NONE, totalInvested: stats.cost,
        passiveType: PassiveType.NONE, activeType: ActiveAbilityType.NONE, abilityCooldown: 0, abilityMaxCooldown: 0,
        abilityDuration: 0, targetPriority: TargetPriority.FIRST
      };
      setGameState(prev => ({ 
          ...prev, 
          gold: prev.gold - stats.cost, 
          towers: [...prev.towers, newTower],
          stats: { ...prev.stats, towersBuilt: prev.stats.towersBuilt + 1 }
      }));
      setPendingPlacement(null);
  };

  const handleCancelPlacement = () => {
      setPendingPlacement(null);
      setGameState(prev => ({ ...prev, targetingAbility: null }));
  };
  
  const handleSelectTower = (towerId: string | null) => { 
      if (gameState.targetingAbility) return;
      setGameState(prev => ({ ...prev, selectedTowerId: towerId })); 
      setPendingPlacement(null); 
  };

  const handleUpgradeTower = (towerId: string, path: TechPath) => {
    setGameState(prev => {
        const towerIndex = prev.towers.findIndex(t => t.id === towerId);
        if (towerIndex === -1) return prev;
        const tower = prev.towers[towerIndex];
        const nextLevel = tower.level + 1;
        if (nextLevel > MAX_LEVEL) return prev;
        // @ts-ignore
        const cost = UPGRADE_CONFIG.costs[nextLevel];
        if (prev.gold < cost) return prev;
        const baseStats = TOWER_STATS[tower.type];
        const targetPath = nextLevel === 2 ? path : tower.techPath;
        // @ts-ignore
        const modifiers = UPGRADE_CONFIG.paths[targetPath][nextLevel];
        const newBaseDamage = baseStats.damage * modifiers.damage;
        const newBaseFireRate = baseStats.fireRate * modifiers.fireRate;
        const newBaseRange = baseStats.range * modifiers.range;
        const newPassive = modifiers.passive || tower.passiveType;
        
        let newActive = modifiers.active || tower.activeType;
        // Overrides based on Tower Type
        if (tower.type === TowerType.SNIPER) {
             if (newActive === ActiveAbilityType.ERUPTION) newActive = ActiveAbilityType.ORBITAL_STRIKE;
             // Plasma/Void defaults ok
        } else if (tower.type === TowerType.ARTILLERY) {
             if (newActive === ActiveAbilityType.ERUPTION) newActive = ActiveAbilityType.NAPALM;
             if (newActive === ActiveAbilityType.OVERCLOCK) newActive = ActiveAbilityType.BARRAGE;
             if (newActive === ActiveAbilityType.FREEZE) newActive = ActiveAbilityType.SINGULARITY;
        }

        let maxCd = 0; if (newActive !== ActiveAbilityType.NONE) {
            // @ts-ignore
            maxCd = ABILITY_CONFIG[newActive]?.cooldown || 20000;
        }
        const newTower: Tower = {
            ...tower, level: nextLevel, techPath: targetPath, baseDamage: newBaseDamage, baseFireRate: newBaseFireRate,
            baseRange: newBaseRange, damage: newBaseDamage, fireRate: newBaseFireRate, range: newBaseRange,
            totalInvested: tower.totalInvested + cost, passiveType: newPassive, activeType: newActive,
            abilityMaxCooldown: maxCd, abilityCooldown: 0 
        };
        const newTowers = [...prev.towers]; newTowers[towerIndex] = newTower;
        return { ...prev, gold: prev.gold - cost, towers: newTowers };
    });
  };
  
  const handleUpdatePriority = (towerId: string, priority: TargetPriority) => {
      setGameState(prev => {
          const newTowers = prev.towers.map(t => t.id === towerId ? { ...t, targetPriority: priority } : t);
          return { ...prev, towers: newTowers };
      });
  };

  const handleSellTower = (towerId: string) => {
      setGameState(prev => {
          const tower = prev.towers.find(t => t.id === towerId);
          if (!tower) return prev;
          const refund = Math.floor(tower.totalInvested * SELL_REFUND_RATIO);
          return { ...prev, gold: prev.gold + refund, towers: prev.towers.filter(t => t.id !== towerId), selectedTowerId: null };
      });
  };

  const setGameSpeed = (speed: number) => setGameState(prev => ({ ...prev, gameSpeed: speed }));

  const goToMenu = () => setGameState(prev => ({ ...prev, gamePhase: 'MENU' }));
  
  const handleContinue = () => {
    const data = loadGame();
    if (data) {
        setGameState(prev => ({
            ...prev,
            stageProgress: data.stageProgress,
            metaProgress: data.metaProgress,
            gamePhase: 'STAGE_SELECT'
        }));
    } else {
        // Fallback if save corrupted or missing
        setCanContinue(false);
    }
  };

  const handleNewGame = () => {
    clearSave();
    setCanContinue(false);
    setGameState(prev => ({
        ...prev,
        stageProgress: INITIAL_STAGE_PROGRESS,
        metaProgress: INITIAL_META_PROGRESS,
        gamePhase: 'STAGE_SELECT'
    }));
  };
  
  const goToStageSelect = () => {
      // Just switch phase, keeping current progress (useful if returning from failure)
      setGameState(prev => ({ ...prev, gamePhase: 'STAGE_SELECT' }));
  };

  const startStage = (stageId: StageId) => {
    const config = STAGE_CONFIGS[stageId];
    // Keep metaProgress from current state or reload it to ensure we have latest if modified elsewhere
    setGameState(prev => ({
      ...prev,
      gold: config.startingGold,
      lives: config.startingLives,
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
      currentStage: stageId,
      gamePhase: 'PLAYING',
      activeBoss: null,
      bossAnnouncement: null,
      stats: {
          startTime: Date.now(),
          endTime: 0,
          totalGoldEarned: config.startingGold,
          towersBuilt: 0,
          abilitiesUsed: 0,
          enemiesKilled: 0
      },
      bossDeathTimer: 0,
      directorAction: 'NONE',
      directorScaling: 1,
      directorGoldBonus: 1,
      directorCooldownMult: 1,
      // metaProgress: prev.metaProgress // Already in prev spread but explicit for clarity that we don't reset it
    }));
    setPendingPlacement(null);
  };

  const resetGame = () => startStage(gameState.currentStage);

  const currentStageConfig = STAGE_CONFIGS[gameState.currentStage];

  return (
    <div className="w-full h-full bg-slate-900 text-white font-sans overflow-hidden">
      <Canvas shadows camera={{ position: [10, 15, 10], fov: 45 }}>
        <Scene 
            gameState={gameState} 
            onPlaceTower={handleGridClick} 
            onSelectTower={handleSelectTower} 
            selectedTowerType={selectedTowerType} 
            pendingPlacement={pendingPlacement}
            paths={currentStageConfig.paths}
            environment={currentStageConfig.environment}
        />
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.2} minDistance={5} maxDistance={30} enabled={gameState.gamePhase === 'PLAYING' || gameState.gamePhase === 'BOSS_FIGHT' || gameState.gamePhase === 'BOSS_DEATH'} />
      </Canvas>

      <HUD 
        gameState={gameState} onStartWave={startNextWave} onSelectTower={(type) => { setSelectedTowerType(type); setPendingPlacement(null); }}
        selectedTowerType={selectedTowerType} onReset={resetGame} onUpgradeTower={handleUpgradeTower} onDeselectTower={() => handleSelectTower(null)}
        onSellTower={handleSellTower} onSetSpeed={setGameSpeed} onTriggerAbility={handleTriggerAbility} pendingPlacement={pendingPlacement}
        onConfirmPlacement={handleConfirmPlacement} onCancelPlacement={handleCancelPlacement} onUpdatePriority={handleUpdatePriority}
        onPickAugment={handlePickAugment}
        onBatchTrigger={handleBatchTriggerAbility}
        onGoToMenu={goToMenu}
        onGoToStageSelect={goToStageSelect}
        onStartStage={startStage}
        canContinue={canContinue}
        onContinue={handleContinue}
        onNewGame={handleNewGame}
        totalWaves={currentStageConfig.waves}
      />
    </div>
  );
};

export default App;