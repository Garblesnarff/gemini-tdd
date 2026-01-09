
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Enemy, Tower, Projectile, Effect, TowerType, EnemyType, Vector3Tuple, TechPath, PassiveType, ActiveAbilityType, TargetPriority, Augment, StageId, StageProgress } from './types';
import { STAGE_CONFIGS, TOWER_STATS, ENEMY_STATS, UPGRADE_CONFIG, MAX_LEVEL, SELL_REFUND_RATIO, ABILITY_CONFIG, TACTICAL_INTEL_POOL, TECH_PATH_INFO } from './constants';
import HUD from './components/HUD';
import Scene from './components/Scene';

const TICK_RATE = 50;
const STORAGE_KEY = 'geminiStrikeSave';

const INITIAL_PROGRESS: Record<StageId, StageProgress> = {
  [StageId.STAGE_1]: { unlocked: true, completed: false, bestWave: 0, stars: 0 },
  [StageId.STAGE_2]: { unlocked: false, completed: false, bestWave: 0, stars: 0 },
  [StageId.STAGE_3]: { unlocked: false, completed: false, bestWave: 0, stars: 0 },
  [StageId.STAGE_4]: { unlocked: false, completed: false, bestWave: 0, stars: 0 },
  [StageId.STAGE_5]: { unlocked: false, completed: false, bestWave: 0, stars: 0 }
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const progress = saved ? JSON.parse(saved).stageProgress : INITIAL_PROGRESS;
    return {
      gold: 400, lives: 20, wave: 0, enemies: [], towers: [], projectiles: [], effects: [],
      gameSpeed: 1, isGameOver: false, waveStatus: 'IDLE', waveIntel: 'Ready for deployment, Commander.',
      selectedTowerId: null, activeAugments: [], augmentChoices: [], isChoosingAugment: false,
      targetingAbility: null, currentStage: StageId.STAGE_1, stageProgress: progress, gamePhase: 'MENU',
      activeBoss: null, bossAnnouncement: null
    };
  });

  const [selectedTowerType, setSelectedTowerType] = useState<TowerType>(TowerType.BASIC);
  const [pendingPlacement, setPendingPlacement] = useState<Vector3Tuple | null>(null);
  
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stageProgress: gameState.stageProgress }));
  }, [gameState.stageProgress]);

  // Main Game Loop
  useEffect(() => {
    if (gameState.isGameOver || gameState.gamePhase === 'MENU' || gameState.gamePhase === 'STAGE_SELECT') return;

    const interval = setInterval(() => {
      setGameState(prev => {
        if (prev.gameSpeed === 0 || prev.isGameOver || prev.isChoosingAugment || prev.gamePhase === 'BOSS_INTRO') return prev;
        
        const tickDelta = TICK_RATE * prev.gameSpeed;
        const currentStage = STAGE_CONFIGS[prev.currentStage];

        const nextEnemies = [...prev.enemies];
        const nextProjectiles = [...prev.projectiles];
        const nextTowers = [...prev.towers];
        const nextEffects = [...prev.effects];
        let nextGold = prev.gold;
        let nextLives = prev.lives;
        let nextStatus = prev.waveStatus;
        let nextPhase = prev.gamePhase;
        let nextActiveBoss = prev.activeBoss;
        let nextGameOver = prev.isGameOver;

        // TOWER STATS
        nextTowers.forEach(t => { t.damage = t.baseDamage; t.fireRate = t.baseFireRate; t.range = t.baseRange; });

        // Passives (Auras)
        nextTowers.forEach(source => {
            if (source.passiveType !== PassiveType.NONE) {
                const config = ABILITY_CONFIG[source.passiveType];
                if (config && (source.passiveType === PassiveType.DAMAGE_AURA || source.passiveType === PassiveType.RATE_AURA)) {
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

        // Actives Cooldowns & Durations
        nextTowers.forEach(t => {
            if (t.abilityCooldown > 0) t.abilityCooldown = Math.max(0, t.abilityCooldown - tickDelta);
            if (t.abilityDuration > 0) t.abilityDuration = Math.max(0, t.abilityDuration - tickDelta);
            if (t.abilityDuration > 0 && t.activeType === ActiveAbilityType.OVERCLOCK) t.fireRate *= ABILITY_CONFIG[ActiveAbilityType.OVERCLOCK].multiplier;
        });

        // MOVE ENEMIES
        for (let i = nextEnemies.length - 1; i >= 0; i--) {
          const enemy = nextEnemies[i];
          let speedMultiplier = currentStage.enemyScaling;
          if (enemy.freezeTimer && enemy.freezeTimer > 0) {
              enemy.freezeTimer -= tickDelta; speedMultiplier = 0;
          } else {
             nextTowers.forEach(t => {
                 if (t.passiveType === PassiveType.SLOW_AURA) {
                     const dist = Math.sqrt(Math.pow(t.position.x - enemy.position.x, 2) + Math.pow(t.position.z - enemy.position.z, 2));
                     if (dist <= ABILITY_CONFIG[PassiveType.SLOW_AURA].range) speedMultiplier *= ABILITY_CONFIG[PassiveType.SLOW_AURA].slowFactor;
                 }
             });
          }

          if (enemy.isBoss && enemy.bossConfig) {
             const hpRatio = enemy.health / enemy.maxHealth;
             const phaseIndex = enemy.currentPhase ?? 0;
             const nextPhaseDef = enemy.bossConfig.phases[phaseIndex + 1];
             if (nextPhaseDef && hpRatio <= nextPhaseDef.healthThreshold) {
                 enemy.currentPhase = phaseIndex + 1;
                 speedMultiplier *= nextPhaseDef.speedMultiplier;
                 prev.bossAnnouncement = nextPhaseDef.announcement;
             }
          }

          if (speedMultiplier === 0) continue;
          const currentWaypoint = currentStage.path[enemy.pathIndex];
          const nextWaypoint = currentStage.path[enemy.pathIndex + 1];
          if (!nextWaypoint) {
            nextLives -= enemy.isBoss ? 10 : 1;
            if (enemy.isBoss) nextActiveBoss = null;
            nextEnemies.splice(i, 1);
            continue;
          }
          const dx = nextWaypoint.x - currentWaypoint.x; const dz = nextWaypoint.z - currentWaypoint.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          enemy.progress += (enemy.speed * speedMultiplier * 0.05 * prev.gameSpeed) / dist;
          if (enemy.progress >= 1) { enemy.pathIndex += 1; enemy.progress = 0; }
          enemy.position = { x: currentWaypoint.x + dx * enemy.progress, y: enemy.position.y, z: currentWaypoint.z + dz * enemy.progress };
        }

        // SHOOTING
        const now = Date.now();
        nextTowers.forEach(tower => {
          tower.cooldown -= tickDelta;
          if (tower.cooldown > 0) return;
          let candidates = nextEnemies.filter(e => Math.sqrt(Math.pow(e.position.x - tower.position.x, 2) + Math.pow(e.position.z - tower.position.z, 2)) <= tower.range);
          if (candidates.length > 0) {
              if (tower.targetPriority === TargetPriority.FIRST) candidates.sort((a, b) => a.pathIndex !== b.pathIndex ? b.pathIndex - a.pathIndex : b.progress - a.progress);
              else if (tower.targetPriority === TargetPriority.STRONGEST) candidates.sort((a, b) => b.health - a.health);
              else if (tower.targetPriority === TargetPriority.WEAKEST) candidates.sort((a, b) => a.health - b.health);
              const target = candidates[0];
              tower.cooldown = 1000 / tower.fireRate;
              tower.lastShotTime = now;
              nextProjectiles.push({
                id: Math.random().toString(), position: { ...tower.position, y: 1 + (tower.level * 0.5) }, targetId: target.id,
                damage: tower.damage, speed: 0.8, color: TOWER_STATS[tower.type].color, sourceType: tower.type
              });
          }
        });

        // PROJECTILES
        for (let i = nextProjectiles.length - 1; i >= 0; i--) {
          const p = nextProjectiles[i];
          const target = nextEnemies.find(e => e.id === p.targetId);
          if (!target) { nextProjectiles.splice(i, 1); continue; }
          const dx = target.position.x - p.position.x; const dy = target.position.y - p.position.y; const dz = target.position.z - p.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const moveDist = p.speed * prev.gameSpeed;
          if (dist < moveDist) {
            target.health -= p.damage;
            nextProjectiles.splice(i, 1);
            if (target.health <= 0) {
              if (target.isBoss) { nextActiveBoss = null; nextPhase = 'STAGE_COMPLETE'; }
              nextGold += ENEMY_STATS[target.type].goldReward;
              nextEnemies.splice(nextEnemies.indexOf(target), 1);
              nextEffects.push({ id: Math.random().toString(), type: 'EXPLOSION', position: { ...target.position, y: 0.5 }, color: ENEMY_STATS[target.type].color, scale: 2, lifetime: 20, maxLifetime: 20 });
            }
          } else { p.position.x += (dx / dist) * moveDist; p.position.y += (dy / dist) * moveDist; p.position.z += (dz / dist) * moveDist; }
        }

        // WAVE PROGRESS
        if (nextStatus === 'CLEARING' && nextEnemies.length === 0 && nextPhase !== 'STAGE_COMPLETE') {
          nextStatus = 'IDLE';
          if (prev.wave >= currentStage.waves) nextPhase = 'BOSS_INTRO';
        }

        // EFFECTS CLEANUP
        for (let i = nextEffects.length - 1; i >= 0; i--) {
            nextEffects[i].lifetime -= 1 * prev.gameSpeed;
            if (nextEffects[i].lifetime <= 0) nextEffects.splice(i, 1);
        }

        if (nextLives <= 0) { nextGameOver = true; nextPhase = 'GAME_OVER'; }

        return { ...prev, enemies: nextEnemies, projectiles: nextProjectiles, towers: nextTowers, effects: nextEffects, gold: nextGold, lives: nextLives, waveStatus: nextStatus, isGameOver: nextGameOver, gamePhase: nextPhase, activeBoss: nextActiveBoss };
      });
    }, TICK_RATE);
    return () => clearInterval(interval);
  }, [gameState.isGameOver, gameState.gamePhase]);

  const handleGridClick = (pos: Vector3Tuple) => {
      const snapped = { x: Math.round(pos.x), y: 0, z: Math.round(pos.z) };
      if (gameState.targetingAbility) { executeGlobalAbility(snapped, gameState.targetingAbility); return; }
      if (gameState.gamePhase !== 'PLAYING' && gameState.gamePhase !== 'BOSS_FIGHT') return;
      
      const stats = TOWER_STATS[selectedTowerType];
      if (gameState.gold < stats.cost) return;
      
      const exists = gameState.towers.some(t => Math.abs(t.position.x - snapped.x) < 0.5 && Math.abs(t.position.z - snapped.z) < 0.5);
      if (exists) return;

      const path = STAGE_CONFIGS[gameState.currentStage].path;
      const onPath = path.some((wp, idx) => {
        if (idx === path.length - 1) return false;
        const next = path[idx + 1];
        const minX = Math.min(wp.x, next.x) - 1.2; const maxX = Math.max(wp.x, next.x) + 1.2;
        const minZ = Math.min(wp.z, next.z) - 1.2; const maxZ = Math.max(wp.z, next.z) + 1.2;
        return snapped.x >= minX && snapped.x <= maxX && snapped.z >= minZ && snapped.z <= maxZ;
      });
      if (onPath) return;

      setPendingPlacement(snapped);
  };

  const handleConfirmPlacement = () => {
      if (!pendingPlacement) return;
      const stats = TOWER_STATS[selectedTowerType];
      const newTower: Tower = {
        id: Math.random().toString(), type: selectedTowerType, position: { ...pendingPlacement, y: 0.5 },
        range: stats.range, fireRate: stats.fireRate, damage: stats.damage, baseRange: stats.range, baseFireRate: stats.fireRate,
        baseDamage: stats.damage, cooldown: 0, lastShotTime: 0, level: 1, techPath: TechPath.NONE, totalInvested: stats.cost,
        passiveType: PassiveType.NONE, activeType: ActiveAbilityType.NONE, abilityCooldown: 0, abilityMaxCooldown: 0,
        abilityDuration: 0, targetPriority: TargetPriority.FIRST
      };
      setGameState(prev => ({ ...prev, gold: prev.gold - stats.cost, towers: [...prev.towers, newTower], selectedTowerId: null }));
      setPendingPlacement(null);
  };

  const handleUpgradeTower = (towerId: string, path: TechPath) => {
    setGameState(prev => {
        const towerIndex = prev.towers.findIndex(t => t.id === towerId);
        if (towerIndex === -1) return prev;
        const tower = prev.towers[towerIndex];
        const nextLevel = tower.level + 1;
        if (nextLevel > MAX_LEVEL) return prev;
        const cost = UPGRADE_CONFIG.costs[nextLevel as 2|3];
        if (prev.gold < cost) return prev;
        const targetPath = nextLevel === 2 ? path : tower.techPath;
        const modifiers = UPGRADE_CONFIG.paths[targetPath][nextLevel as 2|3];
        const baseStats = TOWER_STATS[tower.type];

        let active = modifiers.active || tower.activeType;
        if (active === ActiveAbilityType.ERUPTION && tower.type === TowerType.SNIPER) {
            active = ActiveAbilityType.ORBITAL_STRIKE;
        }
        
        const newTower: Tower = {
            ...tower, level: nextLevel, techPath: targetPath, baseDamage: baseStats.damage * modifiers.damage, 
            baseFireRate: baseStats.fireRate * modifiers.fireRate, baseRange: baseStats.range * modifiers.range,
            passiveType: modifiers.passive || tower.passiveType, activeType: active,
            totalInvested: tower.totalInvested + cost, abilityCooldown: 0, abilityMaxCooldown: active !== ActiveAbilityType.NONE ? (ABILITY_CONFIG[active as ActiveAbilityType].cooldown) : 0
        };
        const newTowers = [...prev.towers]; newTowers[towerIndex] = newTower;
        return { ...prev, gold: prev.gold - cost, towers: newTowers };
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

  const handleBatchTriggerAbility = (type: ActiveAbilityType) => {
    const readyTowerIds = gameState.towers
      .filter(t => t.activeType === type && t.abilityCooldown <= 0)
      .map(t => t.id);
    if (readyTowerIds.length > 0) {
      if (type === ActiveAbilityType.ORBITAL_STRIKE) {
        setGameState(prev => ({ ...prev, targetingAbility: ActiveAbilityType.ORBITAL_STRIKE, selectedTowerId: null }));
      } else {
        executeAbilityOnTowers(readyTowerIds);
      }
    }
  };

  const executeAbilityOnTowers = (towerIds: string[]) => {
      setGameState(prev => {
          const nextTowers = [...prev.towers];
          const nextEffects = [...prev.effects];
          const nextEnemies = prev.enemies.map(e => ({ ...e }));
          let nextGold = prev.gold;
          towerIds.forEach(id => {
              const idx = nextTowers.findIndex(t => t.id === id);
              if (idx === -1) return;
              const t = nextTowers[idx];
              const cfg = ABILITY_CONFIG[t.activeType as ActiveAbilityType];
              nextTowers[idx] = { ...t, abilityCooldown: cfg.cooldown };
              if (t.activeType === ActiveAbilityType.ERUPTION) {
                  nextEffects.push({ id: Math.random().toString(), type: 'NOVA', position: t.position, color: cfg.color, scale: 0.1, lifetime: 30, maxLifetime: 30 });
                  nextEnemies.forEach(e => { if (Math.sqrt(Math.pow(e.position.x - t.position.x, 2) + Math.pow(e.position.z - t.position.z, 2)) <= cfg.range!) { e.health -= cfg.damage!; if (e.health <= 0) nextGold += ENEMY_STATS[e.type].goldReward; } });
              }
              if (t.activeType === ActiveAbilityType.FREEZE) {
                  nextEffects.push({ id: Math.random().toString(), type: 'FREEZE_WAVE', position: t.position, color: cfg.color, scale: 0.1, lifetime: 30, maxLifetime: 30 });
                  nextEnemies.forEach(e => { if (Math.sqrt(Math.pow(e.position.x - t.position.x, 2) + Math.pow(e.position.z - t.position.z, 2)) <= cfg.range!) e.freezeTimer = cfg.duration; });
              }
              if (t.activeType === ActiveAbilityType.OVERCLOCK) t.abilityDuration = cfg.duration!;
          });
          return { ...prev, towers: nextTowers, enemies: nextEnemies.filter(e => e.health > 0), effects: nextEffects, gold: nextGold };
      });
  };

  const executeGlobalAbility = (pos: Vector3Tuple, type: ActiveAbilityType) => {
      setGameState(prev => {
          const available = prev.towers.filter(t => t.activeType === type && t.abilityCooldown <= 0);
          if (available.length === 0) return prev;
          const nextTowers = [...prev.towers]; const nextEffects = [...prev.effects]; const nextEnemies = prev.enemies.map(e => ({ ...e }));
          let nextGold = prev.gold; const cfg = ABILITY_CONFIG[type];
          available.forEach(t => { const idx = nextTowers.findIndex(nt => nt.id === t.id); if (idx > -1) nextTowers[idx] = { ...nextTowers[idx], abilityCooldown: cfg.cooldown }; });
          nextEffects.push({ id: Math.random().toString(), type: 'ORBITAL_STRIKE', position: pos, color: cfg.color, scale: 4, lifetime: 40, maxLifetime: 40 });
          nextEnemies.forEach(e => { if (Math.sqrt(Math.pow(e.position.x - pos.x, 2) + Math.pow(e.position.z - pos.z, 2)) <= 4) { e.health -= cfg.damage! * available.length; if (e.health <= 0) nextGold += ENEMY_STATS[e.type].goldReward; } });
          return { ...prev, towers: nextTowers, enemies: nextEnemies.filter(e => e.health > 0), effects: nextEffects, gold: nextGold, targetingAbility: null };
      });
  };

  const handleUpdatePriority = (towerId: string, priority: TargetPriority) => {
    setGameState(prev => ({
        ...prev,
        towers: prev.towers.map(t => t.id === towerId ? { ...t, targetPriority: priority } : t)
    }));
  };

  const startNextWave = () => {
    if (gameStateRef.current.wave >= STAGE_CONFIGS[gameStateRef.current.currentStage].waves) {
        spawnBoss();
    } else {
        const nextWave = gameStateRef.current.wave + 1;
        setGameState(prev => ({ ...prev, waveIntel: TACTICAL_INTEL_POOL[Math.floor(Math.random() * TACTICAL_INTEL_POOL.length)] }));
        performWaveStart(nextWave);
    }
  };

  function performWaveStart(waveNum: number) {
    const stage = STAGE_CONFIGS[gameStateRef.current.currentStage];
    setGameState(prev => ({ ...prev, wave: waveNum, waveStatus: 'SPAWNING' }));
    const spawnCount = 5 + waveNum * 2;
    for (let i = 0; i < spawnCount; i++) {
      setTimeout(() => {
        setGameState(prev => {
          if (prev.gamePhase !== 'PLAYING') return prev;
          const enemyType = waveNum % 5 === 0 && i === spawnCount - 1 ? EnemyType.TANK : waveNum > 3 && Math.random() > 0.7 ? EnemyType.FAST : EnemyType.BASIC;
          const stats = ENEMY_STATS[enemyType];
          const newEnemy: Enemy = { id: Math.random().toString(), type: enemyType, health: stats.health * stage.enemyScaling * (1 + waveNum * 0.1), maxHealth: stats.health * stage.enemyScaling * (1 + waveNum * 0.1), speed: stats.speed, position: { ...stage.path[0] }, pathIndex: 0, progress: 0 };
          return { ...prev, enemies: [...prev.enemies, newEnemy], waveStatus: i === spawnCount - 1 ? 'CLEARING' : 'SPAWNING' };
        });
      }, i * (1000 - Math.min(waveNum * 50, 600)));
    }
  }

  function spawnBoss() {
      const stage = STAGE_CONFIGS[gameStateRef.current.currentStage];
      const bc = stage.bossConfig;
      const boss: Enemy = { id: 'boss_' + Math.random(), type: EnemyType.BOSS, health: bc.baseHealth, maxHealth: bc.baseHealth, speed: bc.speed, position: { ...stage.path[0] }, pathIndex: 0, progress: 0, isBoss: true, bossConfig: bc, currentPhase: 0, abilityCooldowns: {} };
      setGameState(prev => ({ ...prev, activeBoss: boss, enemies: [...prev.enemies, boss], gamePhase: 'BOSS_FIGHT', waveStatus: 'CLEARING' }));
  }

  function handleCompleteStage() {
      setGameState(prev => {
          const curId = prev.currentStage;
          const stars = prev.lives >= 15 ? 3 : prev.lives >= 10 ? 2 : 1;
          const nextProg = { ...prev.stageProgress };
          nextProg[curId] = { unlocked: true, completed: true, bestWave: prev.wave, stars: stars as any };
          const keys = Object.keys(STAGE_CONFIGS) as StageId[];
          const nextIdx = keys.indexOf(curId) + 1;
          if (nextIdx < keys.length) nextProg[keys[nextIdx]].unlocked = true;
          return { ...prev, stageProgress: nextProg, gamePhase: 'STAGE_SELECT' };
      });
  }

  return (
    <div className="w-full h-full bg-slate-900 text-white overflow-hidden">
      <Canvas shadows camera={{ position: [12, 18, 12], fov: 40 }}>
        <Scene gameState={gameState} onPlaceTower={handleGridClick} onSelectTower={(id) => setGameState(prev => ({...prev, selectedTowerId: id, targetingAbility: null}))} selectedTowerType={selectedTowerType} pendingPlacement={pendingPlacement} />
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.2} />
      </Canvas>
      <HUD 
        gameState={gameState} 
        onStartWave={startNextWave} 
        onSelectTower={setSelectedTowerType} 
        selectedTowerType={selectedTowerType} 
        onReset={() => {
          const s = STAGE_CONFIGS[gameState.currentStage];
          setGameState(prev => ({ ...prev, gold: s.startingGold, lives: s.startingLives, wave: 0, enemies: [], towers: [], projectiles: [], effects: [], waveStatus: 'IDLE', activeBoss: null, isGameOver: false, gamePhase: 'PLAYING' }));
        }} 
        onUpgradeTower={handleUpgradeTower} 
        onDeselectTower={() => setGameState(prev => ({...prev, selectedTowerId: null}))}
        onSellTower={(id) => setGameState(prev => {
            const t = prev.towers.find(t => t.id === id);
            if (!t) return prev;
            return { ...prev, gold: prev.gold + Math.floor(t.totalInvested * SELL_REFUND_RATIO), towers: prev.towers.filter(t => t.id !== id), selectedTowerId: null };
        })} 
        onSetSpeed={(s) => setGameState(prev => ({...prev, gameSpeed: s}))} 
        onTriggerAbility={handleTriggerAbility} 
        pendingPlacement={pendingPlacement} 
        onConfirmPlacement={handleConfirmPlacement} 
        onCancelPlacement={() => setPendingPlacement(null)} 
        onUpdatePriority={handleUpdatePriority} 
        onPickAugment={() => {}} 
        onBatchTrigger={handleBatchTriggerAbility} 
        onEnterStageSelect={() => setGameState(prev => ({...prev, gamePhase: 'STAGE_SELECT'}))}
        onSelectStage={(id) => { const s = STAGE_CONFIGS[id]; setGameState(prev => ({ ...prev, currentStage: id, gamePhase: 'PLAYING', wave: 0, gold: s.startingGold, lives: s.startingLives, enemies: [], towers: [], projectiles: [], effects: [], waveStatus: 'IDLE', activeBoss: null, isGameOver: false })); }} 
        onCompleteStage={handleCompleteStage}
      />
    </div>
  );
};

export default App;
