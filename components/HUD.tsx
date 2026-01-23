
import React, { useMemo } from 'react';
import { GameState, TowerType, TechPath, ActiveAbilityType, TargetPriority, Vector3Tuple, Augment, StageId, BossAbilityType } from '../types';
import { TOWER_STATS, TECH_PATH_INFO, UPGRADE_CONFIG, MAX_LEVEL, SELL_REFUND_RATIO, ABILITY_CONFIG, STAGE_CONFIGS } from '../constants';
import { Heart, Coins, Swords, Shield, Zap, Info, ChevronRight, RefreshCcw, Radio, Eye, X, ArrowUpCircle, Check, Play, Pause, FastForward, Trash2, Crosshair, Target, Cpu, Flame, Snowflake, Ghost, Bomb, Lock, Star, Map, Skull, Timer, Medal, AlertCircle, Package, Database } from 'lucide-react';

interface HUDProps {
  gameState: GameState;
  onStartWave: () => void;
  onSelectTower: (type: TowerType) => void;
  selectedTowerType: TowerType;
  onReset: () => void;
  onUpgradeTower: (towerId: string, path: TechPath) => void;
  onDeselectTower: () => void;
  onSellTower: (towerId: string) => void;
  onSetSpeed: (speed: number) => void;
  onTriggerAbility: (towerId: string) => void;
  pendingPlacement: Vector3Tuple | null;
  onConfirmPlacement: () => void;
  onCancelPlacement: () => void;
  onUpdatePriority: (towerId: string, priority: TargetPriority) => void;
  onPickAugment: (aug: Augment) => void;
  onBatchTrigger: (type: ActiveAbilityType) => void;
  onGoToMenu: () => void;
  onGoToStageSelect: () => void;
  onStartStage: (id: StageId) => void;
  canContinue: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  totalWaves: number;
  onOpenShop: () => void;
}

interface AbilityStat {
  count: number;
  ready: number;
  maxCd: number;
  currentCd: number;
  label: string;
  key: string;
  color: string;
}

const AbilityHotbar: React.FC<{ 
    gameState: GameState, 
    onBatchTrigger: (type: ActiveAbilityType) => void 
}> = ({ gameState, onBatchTrigger }) => {
    
    // Group abilities into slots
    const abilityGroups = useMemo(() => {
        const groups = [
            { 
                types: [ActiveAbilityType.ERUPTION, ActiveAbilityType.NAPALM],
                label: 'PWR-1', key: '1', color: 'red', icon: Flame 
            },
            {
                types: [ActiveAbilityType.OVERCLOCK, ActiveAbilityType.BARRAGE],
                label: 'PWR-2', key: '2', color: 'cyan', icon: Zap
            },
            {
                types: [ActiveAbilityType.FREEZE, ActiveAbilityType.SINGULARITY],
                label: 'PWR-3', key: '3', color: 'purple', icon: Snowflake
            },
            {
                types: [ActiveAbilityType.ORBITAL_STRIKE],
                label: 'ULT', key: '4', color: 'rose', icon: Bomb
            }
        ];
        
        return groups.map(group => {
            let count = 0;
            let ready = 0;
            let currentCd = 0;
            let maxCd = 0;
            
            // Iterate all towers to aggregate stats for this group
            gameState.towers.forEach(t => {
                if (group.types.includes(t.activeType)) {
                    count++;
                    if (t.abilityCooldown <= 0) {
                        // Check readiness
                        if (t.activeType === ActiveAbilityType.ORBITAL_STRIKE) {
                            ready++;
                        } else {
                            // Basic readiness check (enemies in range)
                            const hasTarget = gameState.enemies.some(enemy => {
                                const dist = Math.sqrt(
                                    Math.pow(enemy.position.x - t.position.x, 2) +
                                    Math.pow(enemy.position.z - t.position.z, 2)
                                );
                                return dist <= t.range;
                            });
                            // Overclock always ready if no CD
                            if (t.activeType === ActiveAbilityType.OVERCLOCK || hasTarget) {
                                ready++;
                            }
                        }
                    } else {
                        // Aggregate Cooldowns: Show the longest wait or average? 
                        // Let's show the *first available* cooldown or max if none available
                        if (currentCd === 0 || t.abilityCooldown > currentCd) {
                             currentCd = t.abilityCooldown;
                             maxCd = t.abilityMaxCooldown;
                        }
                    }
                }
            });
            
            return { ...group, count, ready, currentCd, maxCd };
        });
    }, [gameState.towers, gameState.enemies]);

    return (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto">
            {abilityGroups.map((group) => {
                const hasTech = group.count > 0;
                const progress = group.currentCd > 0 ? (group.currentCd / group.maxCd) * 100 : 0;
                // Determine if we are targeting the ULT
                const isTargeting = group.types.includes(ActiveAbilityType.ORBITAL_STRIKE) && gameState.targetingAbility === ActiveAbilityType.ORBITAL_STRIKE;
                
                // Trigger action for the group
                const handleClick = () => {
                    if (!hasTech) return;
                    group.types.forEach(type => onBatchTrigger(type));
                };

                return (
                    <button
                        key={group.key}
                        onClick={handleClick}
                        disabled={!hasTech || (group.ready === 0 && group.currentCd > 0)}
                        className={`
                            group relative w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200 overflow-hidden
                            ${!hasTech ? 'opacity-20 bg-slate-900 border-slate-800 grayscale cursor-not-allowed' : 
                              isTargeting 
                                ? `bg-red-500/20 border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]` 
                                : group.ready > 0 
                                    ? `bg-slate-900/80 border-${group.color}-500/50 hover:border-${group.color}-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] active:scale-95` 
                                    : 'bg-slate-950/90 border-slate-800 cursor-not-allowed grayscale'}
                        `}
                    >
                        {group.currentCd > 0 && !isTargeting && group.ready === 0 && (
                            <div 
                                className="absolute bottom-0 left-0 right-0 bg-slate-800/80 origin-bottom z-0"
                                style={{ height: `${progress}%` }}
                            />
                        )}

                        <div className="relative z-10 flex flex-col items-center">
                            <group.icon size={24} className={isTargeting ? 'text-red-400' : group.ready > 0 ? `text-${group.color}-400` : 'text-slate-500'} />
                            <span className={`text-[9px] font-black uppercase tracking-tighter mt-1 ${isTargeting ? 'text-red-400' : 'opacity-70'}`}>
                                {isTargeting ? 'TARGETING' : group.label}
                            </span>
                        </div>

                        {hasTech && (
                            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-slate-800 shadow-lg z-20
                                ${group.ready > 0 ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}
                            `}>
                                {group.ready}
                            </div>
                        )}

                        <div className="absolute bottom-0.5 left-1 text-[8px] font-bold text-slate-500 uppercase">{group.key}</div>
                    </button>
                );
            })}
        </div>
    );
};

const BossHealthBar: React.FC<{ gameState: GameState }> = ({ gameState }) => {
    const boss = gameState.activeBoss;
    if (!boss || boss.health <= 0) return null;

    const healthPct = (boss.health / boss.maxHealth) * 100;
    const config = boss.bossConfig;
    const phase = boss.currentPhase || 0;
    
    const markers = config.phases
        .filter(p => p.healthThreshold < 1.0)
        .map(p => p.healthThreshold * 100);

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-2xl flex flex-col items-center pointer-events-none animate-in slide-in-from-top-4 duration-500 z-50">
             <div className="flex flex-col items-center mb-2">
                 <div className="flex items-center gap-2">
                     <Skull className="text-red-500 animate-pulse" />
                     <h2 className="text-2xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">{config.name}</h2>
                     <Skull className="text-red-500 animate-pulse" />
                 </div>
                 <span className="text-xs font-bold text-red-400 tracking-[0.3em] uppercase">{config.title}</span>
             </div>
             
             <div className="relative w-full h-8 bg-slate-950 border-2 border-red-900/50 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                 <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,0,0,0.1)_25%,rgba(255,0,0,0.1)_50%,transparent_50%,transparent_75%,rgba(255,0,0,0.1)_75%,rgba(255,0,0,0.1)_100%)] bg-[length:20px_20px] animate-[pulse_2s_infinite]" />
                 <div 
                    className="absolute inset-0 bg-gradient-to-r from-red-700 via-red-600 to-red-500 transition-all duration-300 ease-out" 
                    style={{ width: `${healthPct}%` }}
                 />
                 {markers.map(m => (
                     <div key={m} className="absolute top-0 bottom-0 w-0.5 bg-black/70 z-10 flex flex-col justify-end pb-1 items-center" style={{ left: `${m}%` }}>
                        <div className="w-2 h-2 rounded-full bg-red-900 border border-black/50" />
                     </div>
                 ))}
                 <div className="absolute inset-0 flex items-center justify-center">
                     <span className="text-xs font-bold text-white drop-shadow-md">{Math.ceil(boss.health)} / {boss.maxHealth}</span>
                 </div>
             </div>

             <div className="flex items-center justify-between w-full px-2 mt-2">
                <div className="flex items-center gap-2">
                    {config.phases.map((p, i) => (
                        <div 
                            key={i} 
                            className={`
                                h-1.5 w-6 rounded-full transition-all duration-300
                                ${i <= phase 
                                    ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' 
                                    : 'bg-slate-800'}
                            `}
                        />
                    ))}
                    <span className="text-[10px] font-bold text-red-400 ml-1 uppercase">PHASE {phase + 1}</span>
                </div>

                <div className="flex gap-2">
                    {config.abilities.map(ability => {
                        const cooldown = boss.abilityCooldowns[ability.id] || 0;
                        const isReady = cooldown <= 0;
                        let Icon = Zap;
                        if (ability.type === BossAbilityType.SHIELD_PULSE) Icon = Shield;
                        if (ability.type === BossAbilityType.SPAWN_MINIONS) Icon = Ghost;

                        return (
                            <div key={ability.id} className="relative group">
                                <div className={`
                                    w-6 h-6 rounded flex items-center justify-center border transition-colors
                                    ${isReady ? 'bg-red-900/80 border-red-500 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-slate-900 border-slate-700 text-slate-600'}
                                `}>
                                    <Icon size={14} />
                                </div>
                                {cooldown > 0 && (
                                    <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center text-[8px] text-white font-mono">
                                        {(cooldown / 1000).toFixed(0)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
             </div>
        </div>
    );
};

const HUD: React.FC<HUDProps> = ({ 
  gameState, 
  onStartWave, 
  onSelectTower, 
  selectedTowerType, 
  onReset,
  onUpgradeTower,
  onDeselectTower,
  onSellTower,
  onSetSpeed,
  onTriggerAbility,
  pendingPlacement,
  onConfirmPlacement,
  onCancelPlacement,
  onUpdatePriority,
  onPickAugment,
  onBatchTrigger,
  onGoToMenu,
  onGoToStageSelect,
  onStartStage,
  canContinue,
  onContinue,
  onNewGame,
  totalWaves,
  onOpenShop
}) => {
  const selectedTower = gameState.selectedTowerId 
    ? gameState.towers.find(t => t.id === gameState.selectedTowerId) 
    : null;

  const baseStats = selectedTower ? TOWER_STATS[selectedTower.type] : null;
  const isPlaying = gameState.gamePhase === 'PLAYING' || gameState.gamePhase === 'BOSS_FIGHT' || gameState.gamePhase === 'BOSS_DEATH';

  const directorBorderClass = useMemo(() => {
    if (gameState.directorAction === 'ELITE') return 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
    if (gameState.directorAction === 'SUPPLY') return 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
    return 'border-blue-500/50';
  }, [gameState.directorAction]);

  const directorIcon = useMemo(() => {
    if (gameState.directorAction === 'ELITE') return <AlertCircle size={14} className="animate-pulse text-red-400" />;
    if (gameState.directorAction === 'SUPPLY') return <Package size={14} className="animate-bounce text-green-400" />;
    return <Radio size={14} className="animate-pulse" />;
  }, [gameState.directorAction]);

  const directorHeader = useMemo(() => {
    if (gameState.directorAction === 'ELITE') return 'High Threat Alert';
    if (gameState.directorAction === 'SUPPLY') return 'Logistics Support';
    return 'Incoming Transmission';
  }, [gameState.directorAction]);

  const directorHeaderColor = useMemo(() => {
    if (gameState.directorAction === 'ELITE') return 'text-red-400';
    if (gameState.directorAction === 'SUPPLY') return 'text-green-400';
    return 'text-blue-400';
  }, [gameState.directorAction]);

  // Apply Meta Cost Reduction for Tower Buttons
  const getTowerCost = (baseCost: number) => {
      if (!gameState.metaEffects) return baseCost;
      return Math.floor(baseCost * gameState.metaEffects.towerCostMultiplier);
  };

  const getSellValue = (towerInvested: number) => {
      const ratio = gameState.metaEffects ? (SELL_REFUND_RATIO + (gameState.metaEffects.sellRatio - 0.7)) : SELL_REFUND_RATIO;
      return Math.floor(towerInvested * ratio);
  };

  return (
    <div className="fixed inset-0 pointer-events-none p-4 md:p-6 select-none font-sans z-10">
      
      {/* --- MENU OVERLAY --- */}
      {gameState.gamePhase === 'MENU' && (
         <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 pointer-events-auto">
             <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
                 <div className="text-center">
                    <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-500 tracking-tighter drop-shadow-2xl">GEMINI STRIKE</h1>
                    <p className="text-slate-400 font-mono tracking-widest text-sm mt-2">TACTICAL DEFENSE SIMULATION</p>
                 </div>
                 
                 <div className="flex flex-col gap-4 w-64">
                    {canContinue && (
                        <button onClick={onContinue} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-105 flex items-center justify-center gap-2">
                            <Play size={20} fill="currentColor" />
                            CONTINUE
                        </button>
                    )}
                    <button onClick={onNewGame} className="bg-transparent border border-slate-600 hover:border-white text-slate-300 hover:text-white font-bold py-4 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2">
                        {canContinue ? 'NEW OPERATION' : 'INITIATE'}
                    </button>
                 </div>
             </div>
         </div>
      )}

      {/* --- STAGE SELECT OVERLAY --- */}
      {gameState.gamePhase === 'STAGE_SELECT' && (
         <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center z-50 pointer-events-auto p-10 overflow-y-auto">
             <div className="w-full max-w-6xl">
                 <div className="flex justify-between items-center mb-10">
                     <button onClick={onGoToMenu} className="text-slate-400 hover:text-white flex items-center gap-2 font-bold uppercase tracking-wider text-xs"><ChevronRight className="rotate-180" size={16}/> Return to Menu</button>
                     <div className="flex items-center gap-4">
                        <button onClick={onOpenShop} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 hover:scale-105 transition-all px-4 py-2 rounded-xl border border-slate-600 shadow-lg">
                             <Swords size={18} className="text-blue-400" />
                             <span className="text-white font-bold uppercase text-sm tracking-wider">Armory</span>
                        </button>
                        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                            <Database size={18} className="text-emerald-400" />
                            <span className="text-emerald-400 font-black text-lg">{gameState.metaProgress.dataCores}</span>
                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">DATA CORES</span>
                        </div>
                     </div>
                 </div>
                 
                 <h2 className="text-4xl font-black text-white mb-10 tracking-tight flex items-center gap-3"><Map size={32} className="text-blue-500" /> SECTOR SELECTION</h2>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.values(STAGE_CONFIGS).map((stage) => {
                        const progress = gameState.stageProgress[stage.id];
                        const isUnlocked = progress.unlocked;

                        return (
                            <button 
                                key={stage.id} 
                                disabled={!isUnlocked}
                                onClick={() => onStartStage(stage.id)}
                                className={`
                                    group relative p-6 rounded-2xl border-2 text-left transition-all overflow-hidden flex flex-col
                                    ${isUnlocked 
                                        ? 'bg-slate-800 border-slate-700 hover:border-blue-500 hover:bg-slate-750 hover:-translate-y-1 shadow-lg' 
                                        : 'bg-slate-950 border-slate-900 opacity-50 cursor-not-allowed'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl ${isUnlocked ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-600'}`}>
                                        {isUnlocked ? <Target size={24} /> : <Lock size={24} />}
                                    </div>
                                    {isUnlocked && (
                                        <div className="flex gap-1">
                                            {[1, 2, 3].map(i => (
                                                <Star key={i} size={16} className={`${i <= progress.stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mb-auto">
                                    <h3 className="text-2xl font-black text-white mb-1">{stage.name}</h3>
                                    <p className="text-sm text-slate-400 mb-4 min-h-[40px] leading-snug">{stage.description}</p>
                                </div>
                                
                                <div className="bg-slate-900/50 -mx-6 -mb-6 p-4 mt-4 border-t border-slate-700/50">
                                    <div className="flex items-center justify-between mb-2">
                                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">BOSS THREAT</span>
                                         <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{stage.bossConfig.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Swords size={12}/> {stage.waves} WAVES</span>
                                        {isUnlocked ? (
                                            <span className="text-blue-400 font-bold text-sm group-hover:translate-x-1 transition-transform flex items-center gap-1">DEPLOY <ChevronRight size={14} /></span>
                                        ) : (
                                            <span className="text-slate-600 font-bold text-xs uppercase"><Lock size={12} className="inline mr-1"/> LOCKED</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                 </div>
             </div>
         </div>
      )}

      {/* --- BOSS INTRO OVERLAY --- */}
      {gameState.gamePhase === 'BOSS_INTRO' && (
          <div className="absolute inset-0 z-50 bg-black flex items-center justify-center animate-in fade-in duration-1000">
              <div className="absolute inset-0 bg-red-900/20 radial-gradient" />
              <div className="relative flex flex-col items-center justify-center text-center p-12 w-full">
                  <div className="text-9xl text-red-600/10 font-black absolute scale-150 blur-sm uppercase tracking-tighter select-none">{gameState.bossAnnouncement}</div>
                  
                  <div className="flex items-center gap-6 text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-6 text-white drop-shadow-[0_0_25px_rgba(220,38,38,0.8)] animate-in slide-in-from-bottom-10 duration-700">
                      <Bomb size={64} className="text-red-500 animate-pulse" />
                      WARNING
                      <Bomb size={64} className="text-red-500 animate-pulse" />
                  </div>
                  
                  <div className="h-px w-64 bg-red-500/50 mb-6" />

                  <div className="text-3xl md:text-5xl font-bold uppercase tracking-[0.2em] text-red-500 animate-in zoom-in duration-500 delay-300">
                      {gameState.bossAnnouncement}
                  </div>
                  <div className="text-slate-400 mt-4 font-mono tracking-widest text-sm animate-in fade-in duration-1000 delay-500">
                      THREAT LEVEL: EXTREME
                  </div>
              </div>
          </div>
      )}
      
      {/* --- BOSS ANNOUNCEMENT OVERLAY (IN-GAME) --- */}
      {gameState.gamePhase === 'BOSS_FIGHT' && gameState.bossAnnouncement && (
          <div className="absolute top-32 left-0 right-0 z-40 flex justify-center pointer-events-none">
              <div className="bg-red-600/90 text-white px-8 py-2 rounded-full font-black uppercase tracking-widest text-lg shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-in slide-in-from-top-4 fade-in duration-300">
                  {gameState.bossAnnouncement}
              </div>
          </div>
      )}

      {/* --- STAGE COMPLETE OVERLAY --- */}
      {gameState.gamePhase === 'STAGE_COMPLETE' && (
          <div className="absolute inset-0 bg-blue-950/90 backdrop-blur-md flex flex-col items-center justify-center z-50 pointer-events-auto">
              <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500 max-w-2xl w-full p-8 rounded-3xl border border-blue-500/20 bg-slate-950/50 shadow-2xl">
                  <div className="text-center">
                      <div className="text-blue-400 font-bold tracking-[0.5em] uppercase text-sm mb-2 animate-pulse">Operation Successful</div>
                      <h1 className="text-6xl font-black text-white tracking-tighter mb-6 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">SECTOR SECURED</h1>
                      
                      {/* Star Rating Animation */}
                      <div className="flex justify-center gap-4 mb-6">
                          {[1, 2, 3].map(i => {
                              const earned = gameState.stageProgress[gameState.currentStage].stars >= i;
                              return (
                                  <div key={i} className={`transform transition-all duration-1000 ${earned ? 'scale-100' : 'scale-90 grayscale opacity-30'}`} style={{ transitionDelay: `${i * 200}ms` }}>
                                      <Star size={64} className={`${earned ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-in zoom-in spin-in-3' : 'text-slate-700'}`} />
                                  </div>
                              )
                          })}
                      </div>

                      {/* Data Cores Earned Animation */}
                      <div className="bg-emerald-900/30 border border-emerald-500/30 px-8 py-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-700 delay-500">
                          <Database size={48} className="text-emerald-400 animate-pulse" />
                          <div className="flex flex-col items-start">
                              <span className="text-sm font-bold text-emerald-300 uppercase tracking-widest">Data Cores Extracted</span>
                              <span className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">+{gameState.stats.coresEarned}</span>
                          </div>
                      </div>
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8 mt-6">
                      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
                          <Timer className="text-blue-400 mb-2" />
                          <div className="text-2xl font-black text-white">{((gameState.stats.endTime - gameState.stats.startTime) / 1000).toFixed(0)}s</div>
                          <div className="text-[10px] uppercase font-bold text-slate-500">Duration</div>
                      </div>
                      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
                          <Coins className="text-yellow-400 mb-2" />
                          <div className="text-2xl font-black text-white">{gameState.stats.totalGoldEarned}</div>
                          <div className="text-[10px] uppercase font-bold text-slate-500">Gold Earned</div>
                      </div>
                      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
                          <Swords className="text-red-400 mb-2" />
                          <div className="text-2xl font-black text-white">{gameState.stats.towersBuilt}</div>
                          <div className="text-[10px] uppercase font-bold text-slate-500">Systems Built</div>
                      </div>
                      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
                          <Zap className="text-purple-400 mb-2" />
                          <div className="text-2xl font-black text-white">{gameState.stats.abilitiesUsed}</div>
                          <div className="text-[10px] uppercase font-bold text-slate-500">Abilities Used</div>
                      </div>
                  </div>
                  
                  <div className="flex gap-4 w-full justify-center">
                      <button onClick={onGoToStageSelect} className="bg-transparent border border-slate-600 hover:border-white text-slate-300 hover:text-white px-8 py-4 rounded-xl font-bold transition-all uppercase tracking-wider flex items-center gap-2">
                          <Map size={18} /> Sector Map
                      </button>
                      <button onClick={onReset} className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold transition-all border border-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <RefreshCcw size={18} /> Replay
                      </button>
                      
                      {/* Next Stage Button */}
                      {(() => {
                          const stages = Object.keys(STAGE_CONFIGS);
                          const currentIdx = stages.indexOf(gameState.currentStage);
                          if (currentIdx < stages.length - 1) {
                              const nextStageId = stages[currentIdx + 1] as StageId;
                              return (
                                  <button onClick={() => onStartStage(nextStageId)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 uppercase tracking-wider flex items-center gap-2 hover:scale-105">
                                      Next Mission <ChevronRight size={18} />
                                  </button>
                              );
                          }
                          return (
                              <div className="bg-yellow-600/20 border border-yellow-500/50 text-yellow-500 px-8 py-4 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2">
                                  <Medal size={18} /> Campaign Complete
                              </div>
                          );
                      })()}
                  </div>
              </div>
          </div>
      )}

      {/* --- GAME OVER OVERLAY (Integrated) --- */}
      {gameState.gamePhase === 'GAME_OVER' && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 pointer-events-auto">
          <h1 className="text-6xl font-bold text-red-600 mb-2 tracking-tighter uppercase drop-shadow-[0_0_25px_rgba(220,38,38,0.5)]">Mission Failed</h1>
          <p className="text-xl text-slate-400 mb-8 font-mono">SECTOR LOST AT WAVE {gameState.wave}</p>
          <div className="flex gap-4">
            <button onClick={onReset} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg shadow-red-600/30">RETRY MISSION</button>
            <button onClick={onGoToStageSelect} className="px-8 py-3 bg-transparent border border-slate-600 text-slate-400 hover:text-white hover:border-white rounded-xl font-bold transition-all">ABORT</button>
          </div>
        </div>
      )}
      
      {/* --- MAIN HUD (Only Visible in Playing/Boss Phases) --- */}
      {isPlaying && (
        <>
            <BossHealthBar gameState={gameState} />
            <AbilityHotbar gameState={gameState} onBatchTrigger={onBatchTrigger} />

            {/* Top Left: Resources & Active Augments */}
            <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-col gap-3 pointer-events-auto">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl flex items-center gap-4 shadow-xl shadow-black/20">
                    <div className="flex items-center gap-2">
                        <div className="bg-yellow-500/20 p-1.5 rounded-lg"><Coins className="text-yellow-400" size={18} /></div>
                        <span className="text-2xl font-black tracking-tight text-white">{gameState.gold}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-700/50" />
                    <div className="flex items-center gap-2">
                        <div className="bg-red-500/20 p-1.5 rounded-lg"><Heart className="text-red-500" size={18} /></div>
                        <span className="text-2xl font-black tracking-tight text-white">{Math.floor(gameState.lives)}</span>
                    </div>
                </div>

                {/* Active Augments Bar */}
                {gameState.activeAugments.length > 0 && (
                <div className="flex flex-wrap gap-2 max-w-[200px]">
                    {gameState.activeAugments.map((aug, i) => (
                        <div key={aug.id + i} className={`p-1.5 rounded-lg border bg-slate-900/80 backdrop-blur border-slate-700/50 flex items-center justify-center group relative`} title={aug.name}>
                        <Cpu size={14} className={aug.rarity === 'LEGENDARY' ? 'text-amber-400' : aug.rarity === 'RARE' ? 'text-blue-400' : 'text-slate-400'} />
                        <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-50 w-48 p-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] shadow-2xl">
                            <div className="font-bold text-white mb-1 uppercase tracking-wider">{aug.name}</div>
                            <div className="text-slate-400 leading-tight">{aug.description}</div>
                        </div>
                        </div>
                    ))}
                </div>
                )}
            </div>

            {/* SYSTEM PATCH MODAL */}
            {gameState.isChoosingAugment && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 pointer-events-auto overflow-y-auto">
                    <div className="w-full max-w-5xl flex flex-col items-center">
                        <div className="flex flex-col items-center mb-10 text-center">
                        <div className="flex items-center gap-3 text-blue-400 mb-2">
                            <Cpu size={32} className="animate-pulse" />
                            <h2 className="text-4xl font-black uppercase tracking-[0.2em]">System Patch Detected</h2>
                        </div>
                        <p className="text-slate-400 font-mono text-sm">Wave {gameState.wave} Complete. Select an optimization protocol.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                        {gameState.augmentChoices.map(aug => (
                            <button 
                                key={aug.id}
                                onClick={() => onPickAugment(aug)}
                                className={`
                                group relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-300 text-left h-full
                                ${aug.rarity === 'LEGENDARY' ? 'bg-amber-900/10 border-amber-500/50 hover:bg-amber-900/20 hover:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 
                                    aug.rarity === 'RARE' ? 'bg-blue-900/10 border-blue-500/50 hover:bg-blue-900/20 hover:border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 
                                    'bg-slate-900 border-slate-800 hover:border-slate-600'}
                                `}
                            >
                                <div className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest mb-4 inline-block self-start
                                ${aug.rarity === 'LEGENDARY' ? 'bg-amber-500 text-black' : 
                                    aug.rarity === 'RARE' ? 'bg-blue-500 text-white' : 
                                    'bg-slate-700 text-slate-300'}
                                `}>
                                    {aug.rarity}
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3 group-hover:translate-x-1 transition-transform">{aug.name}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed flex-grow">{aug.description}</p>
                                
                                <div className="mt-8 flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-widest pt-4 border-t border-slate-800/50">
                                    <span>Install Patch</span>
                                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>
                        ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Top Center: Game Speed Controls */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 md:top-6 pointer-events-auto">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-1.5 rounded-xl flex items-center gap-1 shadow-xl">
                    <button onClick={() => onSetSpeed(0)} className={`p-2 rounded-lg transition-all ${gameState.gameSpeed === 0 ? 'bg-red-500/20 text-red-400' : 'hover:bg-slate-800 text-slate-400'}`}><Pause size={20} fill={gameState.gameSpeed === 0 ? "currentColor" : "none"} /></button>
                    <button onClick={() => onSetSpeed(1)} className={`p-2 rounded-lg transition-all ${gameState.gameSpeed === 1 ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}><Play size={20} fill={gameState.gameSpeed === 1 ? "currentColor" : "none"} /></button>
                    <button onClick={() => onSetSpeed(2)} className={`p-2 rounded-lg transition-all ${gameState.gameSpeed === 2 ? 'bg-green-500/20 text-green-400' : 'hover:bg-slate-800 text-slate-400'}`}><FastForward size={20} fill={gameState.gameSpeed === 2 ? "currentColor" : "none"} /></button>
                </div>
            </div>

            {/* Top Right: Wave Info & Controls */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-3 pointer-events-auto">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 px-5 py-3 rounded-xl shadow-xl shadow-black/20 flex items-center gap-3">
                    <Swords className="text-blue-400" size={20} />
                    <div className="flex flex-col leading-none">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Wave</span>
                        <span className="text-2xl font-black text-white">{gameState.wave} <span className="text-slate-500 text-lg">/ {totalWaves}</span></span>
                    </div>
                </div>
                
                <button onClick={onReset} className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 w-14 rounded-xl flex items-center justify-center hover:bg-slate-800 hover:text-white text-slate-400 transition-all shadow-xl shadow-black/20 active:scale-95" title="Restart Game"><RefreshCcw size={20} /></button>
            </div>

            {/* Bottom Left: Tactical Intel (AI Director Integrated) */}
            <div className="absolute bottom-24 left-4 md:bottom-6 md:left-6 max-w-[280px] md:max-w-sm pointer-events-auto">
                <div className={`bg-slate-900/90 backdrop-blur-md border-l-4 p-4 rounded-r-xl shadow-2xl shadow-black/50 overflow-hidden transition-all duration-300 border ${directorBorderClass}`}>
                    <div className={`flex items-center gap-2 mb-2 border-b border-slate-700/20 pb-2 ${directorHeaderColor}`}>
                        {directorIcon}
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{directorHeader}</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed font-mono"><span className={`mr-2 ${directorHeaderColor}`}>DIRECTOR:</span>{gameState.waveIntel}</p>
                </div>
            </div>

            {/* CONFIRMATION OVERLAY */}
            {pendingPlacement && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-auto animate-in slide-in-from-bottom-4 zoom-in-95 duration-200">
                    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
                        <div className="text-white font-bold uppercase tracking-wider text-sm">Confirm Deployment?</div>
                        <div className="flex gap-2">
                            <button onClick={onCancelPlacement} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"><X size={24} /></button>
                            <button onClick={onConfirmPlacement} className="p-2 bg-green-500 hover:bg-green-400 text-white rounded-lg shadow-lg shadow-green-500/30 transition-all transform hover:scale-105"><Check size={24} strokeWidth={3} /></button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* TARGETING OVERLAY */}
            {gameState.targetingAbility && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-auto animate-in slide-in-from-bottom-4 zoom-in-95 duration-200">
                    <div className="bg-red-900/90 backdrop-blur-md border border-red-500 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
                        <div className="flex flex-col">
                            <div className="text-white font-bold uppercase tracking-wider text-sm">Targeting Orbital Strike</div>
                            <div className="text-[10px] text-red-200">Click anywhere to launch</div>
                        </div>
                        <button onClick={onCancelPlacement} className="p-2 bg-red-500/40 hover:bg-red-500/60 text-white rounded-lg transition-colors"><X size={24} /></button>
                    </div>
                </div>
            )}

            {/* Bottom Center: Shop/Upgrade */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto w-full md:w-auto flex justify-center px-4">
                {selectedTower && baseStats ? (
                <div className="bg-slate-950/95 backdrop-blur-xl border border-blue-500/30 p-5 rounded-2xl flex flex-col gap-4 shadow-2xl shadow-blue-900/20 max-w-[95vw] md:max-w-4xl animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                                <h3 className="font-black text-white text-xl uppercase tracking-tight flex items-center gap-2">{selectedTower.techPath !== TechPath.NONE ? TECH_PATH_INFO[selectedTower.techPath].name : `${selectedTower.type} PROTOCOL`}</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white font-mono uppercase ${selectedTower.level >= MAX_LEVEL ? 'bg-yellow-600' : 'bg-blue-600'}`}>Level {selectedTower.level}</span>
                            </div>
                            <div className="flex gap-4 mt-2 text-xs text-slate-400">
                                <span className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded"><Swords size={12} className="text-red-400"/> {Math.round(selectedTower.damage)}</span>
                                <span className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded"><Zap size={12} className="text-yellow-400"/> {selectedTower.fireRate.toFixed(1)}/s</span>
                                <span className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded"><Info size={12} className="text-blue-400"/> {selectedTower.range.toFixed(1)}m</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => onSellTower(selectedTower.id)} className="flex items-center gap-2 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 rounded-lg text-red-400 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wider"><Trash2 size={14} />Sell (+{getSellValue(selectedTower.totalInvested)})</button>
                            <button onClick={onDeselectTower} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 justify-center w-full">
                        <div className="flex-grow flex gap-2">
                            {selectedTower.level === 1 && (
                                <div className="flex flex-col md:flex-row gap-4 w-full">
                                    {[TechPath.MAGMA, TechPath.PLASMA, TechPath.VOID].map(path => {
                                        const info = TECH_PATH_INFO[path];
                                        const cost = UPGRADE_CONFIG.costs[2];
                                        const canAfford = gameState.gold >= cost;
                                        return (
                                            <div key={path} className={`flex-1 flex flex-col p-4 rounded-xl border-2 transition-all relative overflow-hidden group ${canAfford ? 'border-slate-800 hover:border-blue-500/50 bg-slate-900 hover:bg-slate-800' : 'border-slate-800 bg-slate-900 opacity-60'}`}>
                                                <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg" style={{ backgroundColor: `${info.color}20`, color: info.color }}>{info.icon === 'Swords' && <Swords size={20} />}{info.icon === 'Zap' && <Zap size={20} />}{info.icon === 'Eye' && <Eye size={20} />}</div>
                                                <div><div className="font-bold text-white text-sm uppercase tracking-wider">{info.name}</div><div className="text-[10px] text-slate-400 font-mono">Tech Path</div></div>
                                                </div>
                                                <p className="text-xs text-slate-400 mb-4 h-8 leading-tight">{info.description}</p>
                                                <div className="space-y-1 mb-4">{info.abilities.map((ability, idx) => (<div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-300"><Check size={10} className="text-green-500" />{ability}</div>))}</div>
                                                <div className="mt-auto pt-2"><button onClick={() => canAfford && onUpgradeTower(selectedTower.id, path)} disabled={!canAfford} className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${canAfford ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}><Coins size={14} className={canAfford ? 'text-yellow-300' : 'text-slate-500'} />{cost} INSTALL</button></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {selectedTower.level >= 2 && selectedTower.level < MAX_LEVEL && (
                                <button onClick={() => gameState.gold >= UPGRADE_CONFIG.costs[selectedTower.level + 1] && onUpgradeTower(selectedTower.id, selectedTower.techPath)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${gameState.gold >= UPGRADE_CONFIG.costs[selectedTower.level + 1] ? 'border-blue-500 bg-blue-900/20 hover:bg-blue-900/30' : 'border-slate-800 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex items-center gap-4"><div className="bg-blue-500/20 p-3 rounded-xl"><ArrowUpCircle size={32} className="text-blue-400" /></div><div className="text-left"><div className="font-bold text-white text-lg">System Upgrade</div><div className="text-sm text-blue-200">Level {selectedTower.level + 1} Enhancement</div></div></div>
                                    <div className="flex flex-col items-end gap-1"><span className="text-[10px] uppercase font-bold text-slate-400">Cost</span><div className="flex items-center gap-2 text-yellow-400 font-black text-2xl"><Coins size={20} />{UPGRADE_CONFIG.costs[selectedTower.level + 1]}</div></div>
                                </button>
                            )}
                            {selectedTower.level >= MAX_LEVEL && (
                                <div className="w-full flex flex-col gap-3">
                                    {selectedTower.activeType !== ActiveAbilityType.NONE && (
                                        <button onClick={() => onTriggerAbility(selectedTower.id)} disabled={selectedTower.abilityCooldown > 0} className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between group relative overflow-hidden ${selectedTower.abilityCooldown > 0 ? 'border-slate-800 bg-slate-900 grayscale' : 'border-purple-500 bg-purple-900/30 hover:bg-purple-900/50'}`}>
                                            <div className="flex items-center gap-4 z-10"><div className={`p-3 rounded-lg ${selectedTower.abilityCooldown > 0 ? 'bg-slate-800' : 'bg-purple-500 text-white'}`}><Crosshair size={24} className={selectedTower.abilityCooldown > 0 ? 'text-slate-500' : 'animate-pulse'}/></div><div className="text-left"><div className="font-bold text-white text-lg">ACTIVATE ABILITY <span className="text-xs font-normal text-purple-300 uppercase tracking-widest bg-purple-900/50 px-2 py-0.5 rounded border border-purple-500/30">{ActiveAbilityType[selectedTower.activeType]}</span></div><div className="text-xs text-purple-200">{selectedTower.abilityCooldown > 0 ? `Recharging... ${(selectedTower.abilityCooldown / 1000).toFixed(1)}s` : 'Ready.'}</div></div></div>
                                            {selectedTower.abilityCooldown > 0 && <div className="absolute inset-0 bg-slate-800 origin-left z-0 opacity-50" style={{ transform: `scaleX(${selectedTower.abilityCooldown / selectedTower.abilityMaxCooldown})` }} />}
                                        </button>
                                    )}
                                    <div className="w-full text-center p-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 text-slate-500 font-mono text-sm uppercase tracking-widest flex items-center justify-center gap-2"><Shield size={16} />Max Tech Level</div>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-2"><Target size={12} /> Target Priority</div>
                            <div className="flex flex-col gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                                {[TargetPriority.FIRST, TargetPriority.STRONGEST, TargetPriority.WEAKEST].map(priority => (<button key={priority} onClick={() => onUpdatePriority(selectedTower.id, priority)} className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-left transition-all border ${selectedTower.targetPriority === priority ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>{priority}</button>))}
                            </div>
                        </div>
                    </div>
                </div>
                ) : (
                <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-2 rounded-2xl flex gap-2 shadow-2xl shadow-black/50 overflow-x-auto max-w-full">
                {Object.entries(TOWER_STATS).map(([type, stats]) => {
                    const discountCost = getTowerCost(stats.cost);
                    return (
                        <button key={type} onClick={() => onSelectTower(type as TowerType)} className={`group relative min-w-[80px] p-3 rounded-xl flex flex-col items-center gap-2 transition-all duration-200 ${selectedTowerType === type && !pendingPlacement && !gameState.targetingAbility ? 'bg-slate-800 border-2 border-blue-500' : 'bg-transparent border-2 border-transparent hover:bg-slate-800/50'} ${gameState.gold < discountCost ? 'opacity-40 grayscale' : ''}`}>
                        <div className="w-8 h-8 rounded-full shadow-lg transition-transform group-hover:scale-110" style={{ backgroundColor: stats.color }} />
                        <div className="flex flex-col items-center"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{type}</span><div className="flex items-center gap-1 text-yellow-400 text-xs font-black bg-slate-950/50 px-2 py-0.5 rounded-full mt-1"><Coins size={10} />{discountCost}</div></div>
                        {selectedTowerType === type && !pendingPlacement && !gameState.targetingAbility && (<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-40 bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-xl z-50 animate-in slide-in-from-bottom-2 duration-200"><h4 className="font-bold text-blue-400 text-[10px] mb-2 uppercase tracking-wider border-b border-slate-700 pb-1">Stats</h4><div className="space-y-1.5"><div className="flex justify-between text-[10px] text-slate-300"><span>DMG</span><span className="text-white">{stats.damage}</span></div><div className="flex justify-between text-[10px] text-slate-300"><span>RATE</span><span className="text-white">{stats.fireRate}/s</span></div><div className="flex justify-between text-[10px] text-slate-300"><span>RNG</span><span className="text-white">{stats.range}</span></div></div></div>)}
                        </button>
                    )
                })}
                </div>
                )}
            </div>

            {/* Bottom Right: Action Button */}
            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 pointer-events-auto flex flex-col gap-2 items-end">
                {gameState.wave > totalWaves - 2 && gameState.wave < totalWaves && gameState.waveStatus === 'IDLE' && (
                    <div className="bg-red-900/80 text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse border border-red-500">
                        Boss Incoming
                    </div>
                )}
                <button 
                    onClick={onStartWave}
                    disabled={gameState.waveStatus !== 'IDLE' || gameState.isChoosingAugment}
                    className={`
                        group relative flex items-center justify-center w-20 h-20 rounded-full border-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-300
                        ${gameState.waveStatus === 'IDLE' && !gameState.isChoosingAugment
                            ? 'bg-blue-600 border-blue-400 hover:scale-110 hover:bg-blue-500 cursor-pointer animate-[pulse_2s_infinite]' 
                            : 'bg-slate-800 border-slate-700 grayscale cursor-not-allowed opacity-80'}
                    `}
                >
                    <div className="absolute inset-0 rounded-full border-2 border-white/20 scale-90 group-hover:scale-100 transition-transform" />
                    {gameState.waveStatus === 'IDLE' && !gameState.isChoosingAugment ? (
                         <Play size={32} fill="currentColor" className="text-white ml-1" /> 
                    ) : (
                         <div className="flex gap-1">
                             <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                             <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-100" />
                             <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-200" />
                         </div>
                    )}
                </button>
            </div>
        </>
      )}
    </div>
  );
};

export default HUD;
