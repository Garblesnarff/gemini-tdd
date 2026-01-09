
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Sky, Environment, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Enemy, Tower, Projectile, Effect, TowerType, EnemyType, Vector3Tuple, TechPath, PassiveType, ActiveAbilityType, TargetPriority, Augment, AugmentType } from './types';
import { GRID_SIZE, PATH_WAYPOINTS, TOWER_STATS, ENEMY_STATS, UPGRADE_CONFIG, MAX_LEVEL, SELL_REFUND_RATIO, ABILITY_CONFIG, AUGMENT_POOL, TACTICAL_INTEL_POOL } from './constants';
import HUD from './components/HUD';
import Scene from './components/Scene';

const TICK_RATE = 50; 

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    gold: 400,
    lives: 20,
    wave: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    effects: [],
    gameSpeed: 1,
    isGameOver: false,
    waveStatus: 'IDLE',
    waveIntel: 'Ready for deployment, Commander.',
    selectedTowerId: null,
    activeAugments: [],
    augmentChoices: [],
    isChoosingAugment: false,
    targetingAbility: null
  });

  const [selectedTowerType, setSelectedTowerType] = useState<TowerType>(TowerType.BASIC);
  const [pendingPlacement, setPendingPlacement] = useState<Vector3Tuple | null>(null);
  
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Main Game Loop Logic
  useEffect(() => {
    if (gameState.isGameOver) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        if (prev.gameSpeed === 0 || prev.isGameOver || prev.isChoosingAugment) return prev;
        
        const tickDelta = TICK_RATE * prev.gameSpeed;

        const nextEnemies = [...prev.enemies];
        const nextProjectiles = [...prev.projectiles];
        const nextTowers = [...prev.towers];
        const nextEffects = [...prev.effects];
        let nextGold = prev.gold;
        let nextLives = prev.lives;
        let nextStatus = prev.waveStatus;

        // --- STEP 1: CALCULATE TOWER STATS (PASSIVES, ACTIVES, AUGMENTS) ---
        nextTowers.forEach(t => {
            t.damage = t.baseDamage;
            t.fireRate = t.baseFireRate;
            t.range = t.baseRange;
        });

        // Apply Passive Auras
        nextTowers.forEach(source => {
            if (source.passiveType !== PassiveType.NONE) {
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
            if (t.abilityCooldown > 0) t.abilityCooldown = Math.max(0, t.abilityCooldown - tickDelta);
            if (t.abilityDuration > 0) t.abilityDuration = Math.max(0, t.abilityDuration - tickDelta);
            if (t.abilityDuration > 0 && t.activeType === ActiveAbilityType.OVERCLOCK) {
                const config = ABILITY_CONFIG[ActiveAbilityType.OVERCLOCK];
                t.fireRate *= config.multiplier;
            }
        });

        // Apply Global System Patches (Augments)
        prev.activeAugments.forEach(aug => {
          if (aug.type === AugmentType.STAT_BUFF) {
             nextTowers.forEach(t => {
                const typeMatches = aug.effect.target === 'ALL' || aug.effect.target === t.type;
                const pathMatches = !aug.effect.techTarget || aug.effect.techTarget === t.techPath;
                
                if (typeMatches && pathMatches) {
                   if (aug.effect.stat === 'damage') t.damage *= (1 + aug.effect.value);
                   if (aug.effect.stat === 'range') t.range *= (1 + aug.effect.value);
                   if (aug.effect.stat === 'fireRate') t.fireRate *= (1 + aug.effect.value);
                }
             });
          }
        });


        // --- STEP 2: MOVE ENEMIES ---
        for (let i = nextEnemies.length - 1; i >= 0; i--) {
          const enemy = nextEnemies[i];
          let speedMultiplier = 1;
          if (enemy.freezeTimer && enemy.freezeTimer > 0) {
              enemy.freezeTimer -= tickDelta;
              speedMultiplier = 0;
          } else {
             nextTowers.forEach(t => {
                 if (t.passiveType === PassiveType.SLOW_AURA) {
                     const dist = Math.sqrt(Math.pow(t.position.x - enemy.position.x, 2) + Math.pow(t.position.z - enemy.position.z, 2));
                     const config = ABILITY_CONFIG[PassiveType.SLOW_AURA];
                     if (dist <= config.range) speedMultiplier = Math.min(speedMultiplier, config.slowFactor);
                 }
             });
          }
          if (speedMultiplier === 0) continue;
          const currentWaypoint = PATH_WAYPOINTS[enemy.pathIndex];
          const nextWaypoint = PATH_WAYPOINTS[enemy.pathIndex + 1];
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
            enemy.pathIndex += 1;
            enemy.progress = 0;
          }
          enemy.position = { x: currentWaypoint.x + dx * enemy.progress, y: enemy.position.y, z: currentWaypoint.z + dz * enemy.progress };
        }

        // --- STEP 3: TOWER SHOOTING ---
        const now = Date.now();
        nextTowers.forEach(tower => {
          tower.cooldown -= tickDelta;
          if (tower.cooldown > 0) return;
          let candidates = nextEnemies.filter(enemy => {
             const dist = Math.sqrt(Math.pow(enemy.position.x - tower.position.x, 2) + Math.pow(enemy.position.z - tower.position.z, 2));
             return dist <= tower.range;
          });
          if (candidates.length > 0) {
              if (tower.targetPriority === TargetPriority.FIRST) {
                  candidates.sort((a, b) => a.pathIndex !== b.pathIndex ? b.pathIndex - a.pathIndex : b.progress - a.progress);
              } else if (tower.targetPriority === TargetPriority.STRONGEST) {
                  candidates.sort((a, b) => b.health - a.health);
              } else if (tower.targetPriority === TargetPriority.WEAKEST) {
                  candidates.sort((a, b) => a.health - b.health);
              }
              const target = candidates[0];
              tower.cooldown = 1000 / tower.fireRate;
              tower.lastShotTime = now; 
              nextProjectiles.push({
                id: Math.random().toString(),
                position: { ...tower.position, y: 0.8 },
                targetId: target.id,
                damage: tower.damage,
                speed: 0.5,
                color: TOWER_STATS[tower.type].color,
                sourceType: tower.type
              });
          }
        });

        // --- STEP 4: PROJECTILES ---
        for (let i = nextProjectiles.length - 1; i >= 0; i--) {
          const p = nextProjectiles[i];
          const target = nextEnemies.find(e => e.id === p.targetId);
          if (!target) { nextProjectiles.splice(i, 1); continue; }
          const dx = target.position.x - p.position.x;
          const dy = target.position.y - p.position.y;
          const dz = target.position.z - p.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const moveDist = p.speed * prev.gameSpeed; 
          if (dist < moveDist) {
            target.health -= p.damage;
            nextProjectiles.splice(i, 1);
            nextEffects.push({
                id: Math.random().toString(), type: 'SPARK', position: { ...target.position, y: target.position.y + 0.5 },
                color: p.color, scale: 0.5, lifetime: 10, maxLifetime: 10
            });
            
            prev.activeAugments.forEach(aug => {
              if (aug.type === AugmentType.ON_HIT && aug.effect.special === 'SPLASH_DAMAGE' && aug.effect.target === p.sourceType) {
                 nextEffects.push({
                    id: Math.random().toString(), type: 'EXPLOSION', position: target.position,
                    color: p.color, scale: 1.5, lifetime: 15, maxLifetime: 15
                 });
                 nextEnemies.forEach(e => {
                    if (e.id === target.id) return;
                    const splashDist = Math.sqrt(Math.pow(e.position.x - target.position.x, 2) + Math.pow(e.position.z - target.position.z, 2));
                    if (splashDist < 2) e.health -= p.damage * aug.effect.value;
                 });
              }
            });

            if (target.health <= 0) {
              const enemyIdx = nextEnemies.indexOf(target);
              if (enemyIdx > -1) {
                const stats = ENEMY_STATS[target.type];
                nextGold += stats.goldReward;
                nextEnemies.splice(enemyIdx, 1);
                nextEffects.push({
                    id: Math.random().toString(), type: 'EXPLOSION', position: { ...target.position, y: 0.5 },
                    color: stats.color, scale: 1, lifetime: 20, maxLifetime: 20
                });
              }
            }
          } else {
            p.position.x += (dx / dist) * moveDist;
            p.position.y += (dy / dist) * moveDist;
            p.position.z += (dz / dist) * moveDist;
          }
        }

        // --- STEP 5: EFFECTS CLEANUP ---
        for (let i = nextEffects.length - 1; i >= 0; i--) {
            nextEffects[i].lifetime -= 1 * prev.gameSpeed;
            if (nextEffects[i].lifetime <= 0) nextEffects.splice(i, 1);
        }

        // --- STEP 6: WAVE COMPLETE (Economy Augments) ---
        if (nextStatus === 'CLEARING' && nextEnemies.length === 0) {
          nextStatus = 'IDLE';
          prev.activeAugments.forEach(aug => {
             if (aug.type === AugmentType.ECONOMY && aug.effect.special === 'INTEREST') {
                nextGold += Math.floor(nextGold * aug.effect.value);
             }
          });
        }

        let nextGameOver = prev.isGameOver;
        if (nextLives <= 0) nextGameOver = true;

        return {
          ...prev, enemies: nextEnemies, projectiles: nextProjectiles, towers: nextTowers,
          effects: nextEffects, gold: nextGold, lives: nextLives, waveStatus: nextStatus, isGameOver: nextGameOver
        };
      });
    }, TICK_RATE);
    return () => clearInterval(interval);
  }, [gameState.isGameOver]);

  const startNextWave = async () => {
    if (gameState.waveStatus !== 'IDLE' || gameState.isChoosingAugment) return;
    
    setGameState(prev => ({ ...prev, selectedTowerId: null }));
    setPendingPlacement(null);

    const nextWaveNum = gameState.wave + 1;

    if (nextWaveNum % 5 === 0 && nextWaveNum > 0) {
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

    performWaveStart(nextWaveNum);
  };

  const performWaveStart = (waveNum: number) => {
    // 1. Instantly pick a message from the local pool
    const randomMsg = TACTICAL_INTEL_POOL[Math.floor(Math.random() * TACTICAL_INTEL_POOL.length)];

    // 2. Immediately update state to start the wave visually
    setGameState(prev => ({ 
      ...prev, 
      wave: waveNum, 
      waveStatus: 'SPAWNING', 
      waveIntel: randomMsg 
    }));

    // 3. Start enemy spawning sequence immediately
    const spawnCount = 5 + waveNum * 2;
    const baseInterval = 1000 - Math.min(waveNum * 50, 600);
    
    for (let i = 0; i < spawnCount; i++) {
      setTimeout(() => {
        if (gameStateRef.current.isGameOver) return;
        setGameState(prev => {
          const enemyType = waveNum % 5 === 0 && i === spawnCount - 1 ? EnemyType.BOSS :
                          waveNum > 3 && Math.random() > 0.7 ? EnemyType.FAST :
                          waveNum > 6 && Math.random() > 0.8 ? EnemyType.TANK : EnemyType.BASIC;
          const stats = ENEMY_STATS[enemyType];
          const newEnemy: Enemy = {
            id: Math.random().toString(), type: enemyType, health: stats.health * (1 + waveNum * 0.1),
            maxHealth: stats.health * (1 + waveNum * 0.1), speed: stats.speed, position: { ...PATH_WAYPOINTS[0] },
            pathIndex: 0, progress: 0
          };
          return { ...prev, enemies: [...prev.enemies, newEnemy], waveStatus: i === spawnCount - 1 ? 'CLEARING' : 'SPAWNING' };
        });
      }, i * baseInterval);
    }
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
      performWaveStart(nextWaveToStart);
  };

  // Generic trigger logic for one or many towers
  const executeAbilityOnTowers = (towerIds: string[]) => {
    setGameState(prev => {
        const nextTowers = [...prev.towers];
        const nextEffects = [...prev.effects];
        const nextEnemies = prev.enemies.map(e => ({ ...e })); // Shallow copy for health updates
        let nextGold = prev.gold;

        towerIds.forEach(towerId => {
            const towerIndex = nextTowers.findIndex(t => t.id === towerId);
            if (towerIndex === -1) return;
            const tower = nextTowers[towerIndex];
            if (tower.abilityCooldown > 0) return;

            const config = ABILITY_CONFIG[tower.activeType];
            // @ts-ignore
            if (!config) return;

            nextTowers[towerIndex] = { ...tower, abilityCooldown: config.cooldown };

            if (tower.activeType === ActiveAbilityType.ERUPTION) {
                // Self-centered explosion (old NUKE logic)
                nextEffects.push({ id: Math.random().toString(), type: 'NOVA', position: tower.position, color: config.color, scale: 0.1, lifetime: 30, maxLifetime: 30 });
                nextEnemies.forEach(e => {
                    const dist = Math.sqrt(Math.pow(e.position.x - tower.position.x, 2) + Math.pow(e.position.z - tower.position.z, 2));
                    // @ts-ignore
                    if (dist <= config.range) { 
                        e.health -= config.damage; 
                        if (e.health <= 0) { const stats = ENEMY_STATS[e.type]; nextGold += stats.goldReward; } 
                    }
                });
            }
            if (tower.activeType === ActiveAbilityType.FREEZE) {
                 nextEffects.push({ id: Math.random().toString(), type: 'FREEZE_WAVE', position: tower.position, color: config.color, scale: 0.1, lifetime: 30, maxLifetime: 30 });
                 nextEnemies.forEach(e => { const dist = Math.sqrt(Math.pow(e.position.x - tower.position.x, 2) + Math.pow(e.position.z - tower.position.z, 2)); if (dist <= config.range) e.freezeTimer = config.duration; });
            }
            if (tower.activeType === ActiveAbilityType.OVERCLOCK) nextTowers[towerIndex].abilityDuration = config.duration;
        });

        const survivingEnemies = nextEnemies.filter(e => e.health > 0);
        return { ...prev, towers: nextTowers, enemies: survivingEnemies, effects: nextEffects, gold: nextGold };
    });
  };

  // Triggering global Nuke at specific position
  const executeGlobalAbility = (pos: Vector3Tuple, type: ActiveAbilityType) => {
      if (type !== ActiveAbilityType.ORBITAL_STRIKE) return;

      setGameState(prev => {
          const nextTowers = [...prev.towers];
          const nextEffects = [...prev.effects];
          const nextEnemies = prev.enemies.map(e => ({ ...e }));
          let nextGold = prev.gold;
          
          // Find all available towers of this type
          const availableTowers = nextTowers.filter(t => t.activeType === type && t.abilityCooldown <= 0);
          
          if (availableTowers.length === 0) return prev;

          const config = ABILITY_CONFIG[type];
          // Use cooldowns
          availableTowers.forEach(t => {
             const idx = nextTowers.findIndex(nt => nt.id === t.id);
             if (idx > -1) {
                 nextTowers[idx] = { ...nextTowers[idx], abilityCooldown: config.cooldown };
             }
          });

          // Scale damage based on number of towers? Or just fire one big blast.
          // Let's do: Damage = Base Damage * Number of Ready Towers (Simulating a volley)
          const totalDamage = config.damage * availableTowers.length;
          const radius = 4; // Blast radius

          // Visuals
          nextEffects.push({
             id: Math.random().toString(),
             type: 'ORBITAL_STRIKE',
             position: pos,
             color: config.color,
             scale: radius,
             lifetime: 40,
             maxLifetime: 40
          });

          // Logic
          nextEnemies.forEach(e => {
             const dist = Math.sqrt(Math.pow(e.position.x - pos.x, 2) + Math.pow(e.position.z - pos.z, 2));
             if (dist <= radius) {
                 e.health -= totalDamage;
                 if (e.health <= 0) {
                     const stats = ENEMY_STATS[e.type];
                     nextGold += stats.goldReward;
                 }
             }
          });

          const survivingEnemies = nextEnemies.filter(e => e.health > 0);
          return { ...prev, towers: nextTowers, enemies: survivingEnemies, effects: nextEffects, gold: nextGold, targetingAbility: null };
      });
  };

  const handleTriggerAbility = (towerId: string) => {
      // Legacy check for button clicking a specific tower
      const tower = gameState.towers.find(t => t.id === towerId);
      if (tower?.activeType === ActiveAbilityType.ORBITAL_STRIKE) {
          // If a user clicks 'Activate' on a specific tower, we enter global targeting mode for NUKE
          setGameState(prev => ({ ...prev, targetingAbility: ActiveAbilityType.ORBITAL_STRIKE, selectedTowerId: null }));
      } else {
          executeAbilityOnTowers([towerId]);
      }
  };

  const handleBatchTriggerAbility = (activeType: ActiveAbilityType) => {
      const currentGameState = gameStateRef.current;
      
      // If Targeting type, enter targeting mode instead of firing instantly
      if (activeType === ActiveAbilityType.ORBITAL_STRIKE) {
          setGameState(prev => ({ 
              ...prev, 
              targetingAbility: prev.targetingAbility === ActiveAbilityType.ORBITAL_STRIKE ? null : ActiveAbilityType.ORBITAL_STRIKE,
              selectedTowerId: null,
              pendingPlacement: null
          }));
          return;
      }

      // Standard behavior for other abilities
      const towersToTrigger = currentGameState.towers.filter(t => {
          if (t.activeType !== activeType || t.abilityCooldown > 0) return false;
          return currentGameState.enemies.some(enemy => {
              const dist = Math.sqrt(
                  Math.pow(enemy.position.x - t.position.x, 2) +
                  Math.pow(enemy.position.z - t.position.z, 2)
              );
              return dist <= t.range;
          });
      });

      if (towersToTrigger.length === 0) return;
      executeAbilityOnTowers(towersToTrigger.map(t => t.id));
  };

  // Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameStateRef.current.isChoosingAugment) return;
        if (e.key === '1') handleBatchTriggerAbility(ActiveAbilityType.ERUPTION);
        if (e.key === '2') handleBatchTriggerAbility(ActiveAbilityType.OVERCLOCK);
        if (e.key === '3') handleBatchTriggerAbility(ActiveAbilityType.FREEZE);
        if (e.key === '4') handleBatchTriggerAbility(ActiveAbilityType.ORBITAL_STRIKE);
        if (e.key === 'Escape') {
             setPendingPlacement(null);
             setGameState(prev => ({ ...prev, selectedTowerId: null, targetingAbility: null }));
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGridClick = (pos: Vector3Tuple) => {
      if (gameState.isGameOver || gameState.gameSpeed === 0 || gameState.isChoosingAugment) return;
      
      // Handle Targeting Mode Click
      if (gameState.targetingAbility) {
          executeGlobalAbility(pos, gameState.targetingAbility);
          return;
      }

      if (gameState.selectedTowerId) setGameState(prev => ({ ...prev, selectedTowerId: null }));
      const stats = TOWER_STATS[selectedTowerType];
      if (gameState.gold < stats.cost) return;
      const exists = gameState.towers.some(t => Math.abs(t.position.x - pos.x) < 0.5 && Math.abs(t.position.z - pos.z) < 0.5);
      if (exists) return;
      const onPath = PATH_WAYPOINTS.some((wp, idx) => {
        if (idx === PATH_WAYPOINTS.length - 1) return false;
        const next = PATH_WAYPOINTS[idx + 1];
        const minX = Math.min(wp.x, next.x) - 0.8; const maxX = Math.max(wp.x, next.x) + 0.8;
        const minZ = Math.min(wp.z, next.z) - 0.8; const maxZ = Math.max(wp.z, next.z) + 0.8;
        return pos.x >= minX && pos.x <= maxX && pos.z >= minZ && pos.z <= maxZ;
      });
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
      setGameState(prev => ({ ...prev, gold: prev.gold - stats.cost, towers: [...prev.towers, newTower] }));
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
        
        // --- LOGIC TO SPLIT ABILITIES BASED ON TOWER TYPE ---
        let newActive = modifiers.active || tower.activeType;
        if (newActive === ActiveAbilityType.ERUPTION) {
           // If it's a sniper, upgrade to Orbital Strike instead of base Eruption
           if (tower.type === TowerType.SNIPER) {
               newActive = ActiveAbilityType.ORBITAL_STRIKE;
           }
        }
        // ----------------------------------------------------

        let maxCd = 0; if (newActive !== ActiveAbilityType.NONE) {
            // @ts-ignore
            maxCd = ABILITY_CONFIG[newActive].cooldown;
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

  const resetGame = () => {
    setGameState({
      gold: 400, lives: 20, wave: 0, enemies: [], towers: [], projectiles: [], effects: [],
      gameSpeed: 1, isGameOver: false, waveStatus: 'IDLE', waveIntel: 'Ready for deployment, Commander.',
      selectedTowerId: null, activeAugments: [], augmentChoices: [], isChoosingAugment: false,
      targetingAbility: null
    });
    setPendingPlacement(null);
  };

  return (
    <div className="w-full h-full bg-slate-900 text-white font-sans overflow-hidden">
      <Canvas shadows camera={{ position: [10, 15, 10], fov: 45 }}>
        <Scene 
            gameState={gameState} 
            onPlaceTower={handleGridClick} 
            onSelectTower={handleSelectTower} 
            selectedTowerType={selectedTowerType} 
            pendingPlacement={pendingPlacement} 
        />
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.2} minDistance={5} maxDistance={30} />
      </Canvas>

      <HUD 
        gameState={gameState} onStartWave={startNextWave} onSelectTower={(type) => { setSelectedTowerType(type); setPendingPlacement(null); }}
        selectedTowerType={selectedTowerType} onReset={resetGame} onUpgradeTower={handleUpgradeTower} onDeselectTower={() => handleSelectTower(null)}
        onSellTower={handleSellTower} onSetSpeed={setGameSpeed} onTriggerAbility={handleTriggerAbility} pendingPlacement={pendingPlacement}
        onConfirmPlacement={handleConfirmPlacement} onCancelPlacement={handleCancelPlacement} onUpdatePriority={handleUpdatePriority}
        onPickAugment={handlePickAugment}
        onBatchTrigger={handleBatchTriggerAbility}
      />

      {gameState.isGameOver && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <h1 className="text-6xl font-bold text-red-500 mb-4 tracking-tighter">DEFEAT</h1>
          <p className="text-xl text-slate-400 mb-8">Wave reached: {gameState.wave}</p>
          <button onClick={resetGame} className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold transition-all transform hover:scale-105">REDEPLOY</button>
        </div>
      )}
    </div>
  );
};

export default App;
