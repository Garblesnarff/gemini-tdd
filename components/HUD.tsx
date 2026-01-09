
import React from 'react';
import { GameState, TowerType, TechPath, ActiveAbilityType, TargetPriority, Vector3Tuple, StageId } from '../types';
import { TOWER_STATS, STAGE_CONFIGS, SELL_REFUND_RATIO, UPGRADE_CONFIG, TECH_PATH_INFO, MAX_LEVEL } from '../constants';
import { Heart, Coins, Swords, RefreshCcw, X, ChevronRight, Lock, Star, Check, ArrowUpCircle, Info, Zap, Flame, Snowflake, Crosshair, Skull, Trash2 } from 'lucide-react';

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
  onPickAugment: () => void;
  onBatchTrigger: (type: ActiveAbilityType) => void;
  onEnterStageSelect: () => void;
  onSelectStage: (id: StageId) => void;
  onCompleteStage: () => void;
}

const HUD: React.FC<HUDProps> = (props) => {
  const { gameState } = props;

  // Main Menu
  if (gameState.gamePhase === 'MENU') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center pointer-events-auto">
        <h1 className="text-7xl font-black text-blue-500 mb-2 tracking-tighter italic">GEMINI STRIKE</h1>
        <p className="text-slate-500 mb-12 font-mono tracking-widest uppercase text-sm">Orbital Defense Command</p>
        <button onClick={props.onEnterStageSelect} className="px-16 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-full transition-all hover:scale-105 shadow-[0_0_40px_rgba(37,99,235,0.4)] border-2 border-blue-400">INITIATE COMMAND</button>
      </div>
    );
  }

  // Stage Selection
  if (gameState.gamePhase === 'STAGE_SELECT') {
    return (
      <div className="fixed inset-0 bg-slate-950 p-12 overflow-y-auto pointer-events-auto">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-black text-white mb-12 tracking-tight uppercase italic">Mission Deployment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(STAGE_CONFIGS).map(([id, config]) => {
              const prog = gameState.stageProgress[id as StageId];
              return (
                <button 
                  key={id} 
                  onClick={() => prog.unlocked && props.onSelectStage(id as StageId)} 
                  disabled={!prog.unlocked} 
                  className={`relative p-8 rounded-3xl border-4 transition-all text-left ${prog.unlocked ? 'bg-slate-900 border-slate-800 hover:border-blue-500 hover:scale-[1.02]' : 'bg-slate-950 border-slate-900 opacity-50 cursor-not-allowed'}`}
                >
                  {!prog.unlocked && <Lock className="absolute top-6 right-6 text-slate-700" size={24} />}
                  <div className="text-xs font-bold text-blue-400 mb-2 tracking-widest uppercase">{id} Sector</div>
                  <h3 className="text-3xl font-black text-white mb-4 uppercase">{config.name}</h3>
                  <p className="text-sm text-slate-400 mb-8 leading-relaxed h-12 overflow-hidden">{config.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-1">
                        {[1,2,3].map(i => <Star key={i} size={20} className={prog.stars >= i ? 'text-yellow-400 fill-yellow-400' : 'text-slate-800'} />)}
                    </div>
                    {prog.completed && <div className="px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-black rounded uppercase border border-green-500/30">Cleared</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const selectedTower = gameState.towers.find(t => t.id === gameState.selectedTowerId);

  // Ready abilities for hotbar
  const abilityGroups = [
    { type: ActiveAbilityType.ERUPTION, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500/50' },
    { type: ActiveAbilityType.OVERCLOCK, icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/50' },
    { type: ActiveAbilityType.FREEZE, icon: Snowflake, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
    { type: ActiveAbilityType.ORBITAL_STRIKE, icon: Crosshair, color: 'text-rose-500', bg: 'bg-rose-500/20', border: 'border-rose-500/50' }
  ].filter(group => gameState.towers.some(t => t.activeType === group.type));

  return (
    <div className="fixed inset-0 pointer-events-none p-6">
      {/* Boss Health UI */}
      {gameState.activeBoss && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-slate-900/90 backdrop-blur-xl p-5 rounded-2xl border-2 border-red-600/50 shadow-[0_0_50px_rgba(220,38,38,0.2)] animate-in slide-in-from-top-4">
          <div className="flex justify-between items-end mb-3">
            <div>
              <div className="text-[10px] font-bold text-red-500 uppercase tracking-[0.3em] mb-1">{gameState.activeBoss.bossConfig?.title}</div>
              <div className="text-3xl font-black text-white uppercase italic tracking-tighter">{gameState.activeBoss.bossConfig?.name}</div>
            </div>
            <div className="text-right">
              <div className="text-red-400 font-mono text-lg font-black uppercase">Phase {(gameState.activeBoss.currentPhase ?? 0) + 1}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Critical Integrity Risk</div>
            </div>
          </div>
          <div className="h-5 bg-slate-950 rounded-full overflow-hidden border-2 border-slate-800 shadow-inner">
            <div className="h-full bg-gradient-to-r from-red-800 via-red-600 to-red-400 transition-all duration-300 relative" style={{ width: `${(gameState.activeBoss.health / gameState.activeBoss.maxHealth) * 100}%` }}>
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Resource Counters */}
      <div className="absolute top-6 left-6 flex gap-6 pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border-2 border-slate-800 flex items-center gap-4 shadow-2xl">
          <div className="p-2 bg-yellow-500/20 rounded-lg"><Coins className="text-yellow-400" size={28} /></div>
          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available Gold</div>
            <div className="text-3xl font-black tabular-nums">{gameState.gold}</div>
          </div>
        </div>
        <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border-2 border-slate-800 flex items-center gap-4 shadow-2xl">
          <div className="p-2 bg-red-500/20 rounded-lg"><Heart className="text-red-500" size={28} /></div>
          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base Integrity</div>
            <div className="text-3xl font-black tabular-nums">{gameState.lives}</div>
          </div>
        </div>
      </div>

      {/* Wave Tracking */}
      <div className="absolute top-6 right-6 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border-2 border-slate-800 pointer-events-auto flex items-center gap-6 shadow-2xl">
        <div className="text-right">
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Combat Wave</div>
          <div className="text-3xl font-black tabular-nums">{gameState.wave} <span className="text-slate-600 text-xl">/ {STAGE_CONFIGS[gameState.currentStage].waves}</span></div>
        </div>
        <button onClick={props.onReset} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-all hover:rotate-180 duration-500"><RefreshCcw size={24} /></button>
      </div>

      {/* Placement Confirmation */}
      {props.pendingPlacement && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-xl p-6 rounded-3xl border-2 border-blue-500 flex items-center gap-6 pointer-events-auto shadow-[0_0_50px_rgba(59,130,246,0.3)] animate-in zoom-in-90 slide-in-from-bottom-8">
            <div className="text-lg font-black uppercase text-white tracking-tight italic">Authorize Deployment?</div>
            <div className="flex gap-3">
                <button onClick={props.onCancelPlacement} className="p-3 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-xl transition-all"><X size={28} /></button>
                <button onClick={props.onConfirmPlacement} className="p-3 bg-green-500 hover:bg-green-400 text-white rounded-xl transition-all shadow-lg shadow-green-500/30"><Check size={28} /></button>
            </div>
        </div>
      )}

      {/* Global Ability Hotbar */}
      {!selectedTower && !props.pendingPlacement && abilityGroups.length > 0 && gameState.gamePhase !== 'GAME_OVER' && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto scale-110">
          {abilityGroups.map(group => {
            const readyTowers = gameState.towers.filter(t => t.activeType === group.type && t.abilityCooldown <= 0);
            const totalTowers = gameState.towers.filter(t => t.activeType === group.type);
            const isTargeting = gameState.targetingAbility === group.type;

            return (
              <button 
                key={group.type}
                onClick={() => props.onBatchTrigger(group.type)}
                disabled={readyTowers.length === 0}
                className={`group relative px-6 py-3 rounded-2xl border-2 flex items-center gap-4 transition-all shadow-xl disabled:opacity-30 disabled:grayscale ${group.bg} ${group.border} ${isTargeting ? 'ring-4 ring-white animate-pulse' : 'hover:scale-105 active:scale-95'}`}
              >
                <group.icon size={28} className={`${group.color} transition-transform group-hover:scale-110`} />
                <div className="flex flex-col items-start">
                  <span className="text-xs font-black text-white uppercase tracking-tight">
                    {ActiveAbilityType[group.type]}
                  </span>
                  <div className="flex gap-1.5 mt-1">
                    {totalTowers.map((t, idx) => (
                      <div key={idx} className={`w-3 h-1.5 rounded-full transition-colors ${t.abilityCooldown <= 0 ? 'bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'bg-slate-700'}`} />
                    ))}
                  </div>
                </div>
                {readyTowers.length > 0 && (
                  <div className="absolute -top-3 -right-3 bg-white text-black text-xs font-black w-7 h-7 rounded-full flex items-center justify-center shadow-2xl border-2 border-slate-900">
                    {readyTowers.length}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tower Upgrade/Control Panel */}
      {selectedTower && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-950/98 border-2 border-blue-500/60 p-8 rounded-[2rem] flex flex-col gap-6 pointer-events-auto w-full max-w-5xl shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                      <h3 className="text-4xl font-black uppercase text-white tracking-tighter italic">{selectedTower.type} PROTOCOL</h3>
                      <span className="text-sm font-black px-4 py-1 rounded-full bg-blue-600 text-white font-mono uppercase tracking-widest shadow-lg shadow-blue-600/30">Tier {selectedTower.level}</span>
                    </div>
                    <div className="flex gap-6 text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                      <span className="flex items-center gap-2"><Swords size={16} className="text-red-500"/> {Math.round(selectedTower.damage)} Payload</span>
                      <span className="flex items-center gap-2"><Zap size={16} className="text-cyan-500"/> {selectedTower.fireRate.toFixed(2)}/Sec</span>
                      <span className="flex items-center gap-2"><Info size={16} className="text-blue-500"/> {selectedTower.range}m Radius</span>
                    </div>
                </div>
                <div className="flex items-center gap-5">
                    <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Tactical Priority</span>
                        <div className="flex bg-slate-900 p-1.5 rounded-xl border-2 border-slate-800">
                            {[TargetPriority.FIRST, TargetPriority.STRONGEST, TargetPriority.WEAKEST].map(priority => (
                                <button
                                    key={priority}
                                    onClick={() => props.onUpdatePriority(selectedTower.id, priority)}
                                    className={`px-5 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${selectedTower.targetPriority === priority ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {priority}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="w-px h-16 bg-slate-800 mx-2" />
                    <button onClick={() => props.onSellTower(selectedTower.id)} className="flex items-center gap-2 px-6 py-3 bg-red-900/30 text-red-400 rounded-xl hover:bg-red-900/50 text-sm font-black uppercase transition-all border border-red-500/20"><Trash2 size={18}/> SCRAP (+{Math.floor(selectedTower.totalInvested * SELL_REFUND_RATIO)})</button>
                    <button onClick={props.onDeselectTower} className="p-3 text-slate-500 hover:text-white transition-all hover:scale-110"><X size={32}/></button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {selectedTower.level === 1 ? (
                    [TechPath.MAGMA, TechPath.PLASMA, TechPath.VOID].map(path => {
                        const info = TECH_PATH_INFO[path];
                        const cost = UPGRADE_CONFIG.costs[2];
                        const canAfford = gameState.gold >= cost;
                        return (
                            <button key={path} disabled={!canAfford} onClick={() => props.onUpgradeTower(selectedTower.id, path)} className={`p-6 rounded-2xl border-4 text-left transition-all relative group overflow-hidden ${canAfford ? 'bg-slate-900 border-slate-800 hover:border-blue-500 hover:scale-[1.03]' : 'opacity-30 border-slate-950 grayscale cursor-not-allowed'}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="font-black text-white text-lg uppercase tracking-tight">{info.name}</div>
                                  <div className="text-yellow-400 font-black flex items-center gap-1.5 text-base"><Coins size={18}/> {cost}</div>
                                </div>
                                <p className="text-xs text-slate-500 leading-snug mb-4 h-10 line-clamp-2">{info.description}</p>
                                <div className="space-y-2">
                                  {info.abilities.map((ability, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                      <Check size={12} className="text-green-500" /> {ability}
                                    </div>
                                  ))}
                                </div>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 -mr-12 -mt-12 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
                            </button>
                        );
                    })
                ) : selectedTower.level < MAX_LEVEL ? (
                    <button onClick={() => props.onUpgradeTower(selectedTower.id, selectedTower.techPath)} disabled={gameState.gold < UPGRADE_CONFIG.costs[selectedTower.level + 1 as 2|3]} className="col-span-3 p-6 bg-blue-600/10 border-4 border-blue-500 rounded-2xl flex items-center justify-between hover:bg-blue-600/20 transition-all disabled:opacity-50 group">
                        <div className="flex items-center gap-6">
                          <div className="p-4 bg-blue-500 rounded-2xl text-white shadow-2xl group-hover:scale-110 transition-transform"><ArrowUpCircle size={36}/></div>
                          <div className="text-left">
                            <div className="font-black text-white text-2xl tracking-tight uppercase italic">Final Ascension Upgrade</div>
                            <div className="text-sm font-black text-blue-400 uppercase tracking-widest">Unlocks T3 Protocol Features</div>
                          </div>
                        </div>
                        <div className="text-yellow-400 font-black flex items-center gap-3 text-4xl drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]"><Coins size={36}/> {UPGRADE_CONFIG.costs[selectedTower.level + 1 as 2|3]}</div>
                    </button>
                ) : (
                    <div className="col-span-3 flex flex-col gap-4">
                        {selectedTower.activeType !== ActiveAbilityType.NONE && (
                           <button 
                             onClick={() => props.onTriggerAbility(selectedTower.id)} 
                             disabled={selectedTower.abilityCooldown > 0} 
                             className={`w-full p-6 rounded-2xl border-4 transition-all flex items-center justify-between group relative overflow-hidden ${selectedTower.abilityCooldown > 0 ? 'border-slate-800 bg-slate-900' : 'border-purple-500 bg-purple-900/30 hover:bg-purple-900/40 hover:scale-[1.01]'}`}
                           >
                              <div className="flex items-center gap-6 z-10">
                                <div className={`p-4 rounded-2xl ${selectedTower.abilityCooldown > 0 ? 'bg-slate-800 text-slate-600' : 'bg-purple-600 text-white shadow-[0_0_30px_rgba(147,51,234,0.4)] animate-pulse'}`}>
                                  <Crosshair size={32} />
                                </div>
                                <div className="text-left">
                                  <div className="font-black text-white text-3xl uppercase tracking-tighter italic">Activate {ActiveAbilityType[selectedTower.activeType]}</div>
                                  <div className={`text-sm font-black uppercase tracking-widest ${selectedTower.abilityCooldown > 0 ? 'text-slate-600' : 'text-purple-400'}`}>
                                    {selectedTower.abilityCooldown > 0 ? `RECHARGING: ${(selectedTower.abilityCooldown / 1000).toFixed(1)}s` : 'System Ready for Discharge'}
                                  </div>
                                </div>
                              </div>
                              {selectedTower.abilityCooldown > 0 && (
                                <div className="absolute inset-0 bg-slate-800/80 origin-left z-0" style={{ transform: `scaleX(${selectedTower.abilityCooldown / selectedTower.abilityMaxCooldown})` }} />
                              )}
                           </button>
                        )}
                        <div className="w-full py-4 bg-slate-900/50 rounded-2xl text-center font-mono text-slate-500 uppercase tracking-[0.4em] text-xs border-2 border-dashed border-slate-800">Peak Efficiency Achieved</div>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Shop / Bottom Menu */}
      {!gameState.isGameOver && gameState.gamePhase !== 'STAGE_COMPLETE' && gameState.gamePhase !== 'GAME_OVER' && !selectedTower && !props.pendingPlacement && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-2xl border-4 border-slate-800 p-3 rounded-3xl flex gap-4 pointer-events-auto shadow-[0_0_100px_rgba(0,0,0,0.8)]">
          {Object.entries(TOWER_STATS).map(([type, stats]) => (
            <div key={type} className="group relative">
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 hidden group-hover:block w-48 bg-slate-950/98 border-2 border-slate-800 p-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                <div className="text-xs font-black text-blue-400 mb-3 uppercase tracking-[0.2em] border-b border-slate-800 pb-2">{type} PROTOCOL</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase"><span>Dmg</span><span className="text-white">{stats.damage}</span></div>
                  <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase"><span>Rate</span><span className="text-white">{stats.fireRate}/s</span></div>
                  <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase"><span>Radius</span><span className="text-white">{stats.range}m</span></div>
                </div>
              </div>

              <button 
                onClick={() => props.onSelectTower(type as TowerType)} 
                className={`p-5 rounded-2xl flex flex-col items-center gap-3 transition-all ${props.selectedTowerType === type ? 'bg-slate-800 ring-4 ring-blue-500 scale-110 shadow-lg shadow-blue-500/20' : 'hover:bg-slate-800 hover:scale-105'} ${gameState.gold < stats.cost ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
              >
                <div className="w-10 h-10 rounded-full shadow-2xl transition-transform group-hover:rotate-12" style={{ backgroundColor: stats.color }} />
                <div className="text-sm font-black uppercase text-slate-200 tracking-tight">{type}</div>
                <div className="text-yellow-400 font-black flex items-center gap-1.5 text-lg"><Coins size={18}/>{stats.cost}</div>
              </button>
            </div>
          ))}
          {gameState.waveStatus === 'IDLE' && (
            <button onClick={props.onStartWave} className="ml-6 px-14 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all flex items-center gap-4 shadow-[0_0_40px_rgba(37,99,235,0.4)] border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">
              DEPLOY <ChevronRight size={28} className="animate-pulse" />
            </button>
          )}
        </div>
      )}

      {/* Stage Victory Overlay */}
      {gameState.gamePhase === 'STAGE_COMPLETE' && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center pointer-events-auto z-[100] animate-in fade-in duration-1000">
           <div className="text-blue-500 text-sm font-black tracking-[0.8em] mb-6 uppercase animate-pulse">Sector Permanently Secured</div>
           <h2 className="text-[10rem] font-black text-white mb-12 uppercase italic tracking-tighter drop-shadow-[0_0_80px_rgba(59,130,246,0.3)]">Victory</h2>
           <button onClick={props.onCompleteStage} className="px-20 py-6 bg-white text-black font-black rounded-full hover:scale-110 transition-all shadow-[0_0_60px_rgba(255,255,255,0.3)] text-2xl uppercase tracking-widest">Return to Command</button>
        </div>
      )}

      {/* Mission Failed Overlay */}
      {gameState.gamePhase === 'GAME_OVER' && (
        <div className="fixed inset-0 bg-red-950/95 backdrop-blur-3xl flex flex-col items-center justify-center pointer-events-auto z-[100] animate-in fade-in duration-700">
           <Skull className="text-red-600 mb-8 animate-bounce" size={120} />
           <div className="text-red-500 text-sm font-black tracking-[0.8em] mb-6 uppercase">Mission Critical Failure</div>
           <h2 className="text-[10rem] font-black text-white mb-12 uppercase italic tracking-tighter drop-shadow-[0_0_80px_rgba(220,38,38,0.3)]">Defeat</h2>
           <div className="flex gap-8">
              <button onClick={props.onReset} className="px-16 py-6 bg-red-600 text-white font-black rounded-full hover:scale-110 transition-all shadow-[0_0_60px_rgba(220,38,38,0.3)] text-xl uppercase tracking-widest border-4 border-red-400">Restart Deployment</button>
              <button onClick={props.onEnterStageSelect} className="px-16 py-6 bg-slate-900 text-white font-black rounded-full hover:scale-110 transition-all shadow-2xl text-xl uppercase tracking-widest border-4 border-slate-700">Abort Mission</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default HUD;
