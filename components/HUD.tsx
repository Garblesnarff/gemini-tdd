
import React, { useMemo } from 'react';
import { GameState, TowerType, TechPath, ActiveAbilityType, TargetPriority, Vector3Tuple, Augment } from '../types';
import { TOWER_STATS, TECH_PATH_INFO, UPGRADE_CONFIG, MAX_LEVEL, SELL_REFUND_RATIO, ABILITY_CONFIG } from '../constants';
import { Heart, Coins, Swords, Shield, Zap, Info, ChevronRight, RefreshCcw, Radio, Eye, X, ArrowUpCircle, Check, Play, Pause, FastForward, Trash2, Crosshair, Target, Cpu, Flame, Snowflake, Ghost, Bomb } from 'lucide-react';

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
    
    const abilityStats = useMemo(() => {
        // Explicitly typed record to ensure map iteration works correctly
        const stats: Record<string, AbilityStat> = {
            [ActiveAbilityType.ERUPTION]: { count: 0, ready: 0, maxCd: 0, currentCd: 0, label: 'ERUPT', key: '1', color: 'red' },
            [ActiveAbilityType.OVERCLOCK]: { count: 0, ready: 0, maxCd: 0, currentCd: 0, label: 'CLOCK', key: '2', color: 'cyan' },
            [ActiveAbilityType.FREEZE]: { count: 0, ready: 0, maxCd: 0, currentCd: 0, label: 'FREEZE', key: '3', color: 'purple' },
            [ActiveAbilityType.ORBITAL_STRIKE]: { count: 0, ready: 0, maxCd: 0, currentCd: 0, label: 'STRIKE', key: '4', color: 'rose' },
        };

        gameState.towers.forEach(t => {
            if (t.activeType === ActiveAbilityType.NONE) return;
            const s = stats[t.activeType];
            if (!s) return;

            s.count++;
            if (t.abilityCooldown <= 0) {
                // Special check for ORBITAL_STRIKE: It's global, so it doesn't need a local target check
                if (t.activeType === ActiveAbilityType.ORBITAL_STRIKE) {
                    s.ready++;
                } else {
                    // Other abilities need a valid target in range
                    const hasTarget = gameState.enemies.some(enemy => {
                        const dist = Math.sqrt(
                            Math.pow(enemy.position.x - t.position.x, 2) +
                            Math.pow(enemy.position.z - t.position.z, 2)
                        );
                        return dist <= t.range;
                    });
                    if (hasTarget) {
                        s.ready++;
                    }
                }
            } else {
                if (s.currentCd === 0 || t.abilityCooldown < s.currentCd) {
                    s.currentCd = t.abilityCooldown;
                    s.maxCd = t.abilityMaxCooldown;
                }
            }
        });

        // Filter out abilities that have no towers built (count == 0) to keep HUD clean? 
        // Or keep them disabled? User didn't specify, but let's show them disabled if not present to show potential?
        // Actually, let's only return what is in the list above to preserve order 1,2,3,4
        return stats;
    }, [gameState.towers, gameState.enemies]);

    return (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto">
            {Object.entries(abilityStats).map(([type, statValue]) => {
                const s = statValue as AbilityStat;
                const activeType = type as ActiveAbilityType;
                const hasTech = s.count > 0;
                const progress = s.currentCd > 0 ? (s.currentCd / s.maxCd) * 100 : 0;
                const isTargeting = gameState.targetingAbility === activeType;
                
                let Icon = Crosshair;
                if (activeType === ActiveAbilityType.ERUPTION) Icon = Flame;
                if (activeType === ActiveAbilityType.OVERCLOCK) Icon = Zap;
                if (activeType === ActiveAbilityType.FREEZE) Icon = Snowflake;
                if (activeType === ActiveAbilityType.ORBITAL_STRIKE) Icon = Bomb;

                return (
                    <button
                        key={type}
                        onClick={() => hasTech && onBatchTrigger(activeType)}
                        disabled={!hasTech || s.ready === 0}
                        className={`
                            group relative w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200 overflow-hidden
                            ${!hasTech ? 'opacity-20 bg-slate-900 border-slate-800 grayscale cursor-not-allowed' : 
                              isTargeting 
                                ? `bg-red-500/20 border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]` 
                                : s.ready > 0 
                                    ? `bg-slate-900/80 border-${s.color}-500/50 hover:border-${s.color}-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] active:scale-95` 
                                    : 'bg-slate-950/90 border-slate-800 cursor-not-allowed grayscale'}
                        `}
                    >
                        {/* Cooldown Fill */}
                        {s.currentCd > 0 && !isTargeting && (
                            <div 
                                className="absolute bottom-0 left-0 right-0 bg-slate-800/80 origin-bottom z-0"
                                style={{ height: `${progress}%` }}
                            />
                        )}

                        <div className="relative z-10 flex flex-col items-center">
                            <Icon size={24} className={isTargeting ? 'text-red-400' : s.ready > 0 ? `text-${s.color}-400` : 'text-slate-500'} />
                            <span className={`text-[9px] font-black uppercase tracking-tighter mt-1 ${isTargeting ? 'text-red-400' : 'opacity-70'}`}>
                                {isTargeting ? 'TARGETING' : s.label}
                            </span>
                        </div>

                        {/* Ready Badge */}
                        {hasTech && (
                            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-slate-800 shadow-lg z-20
                                ${s.ready > 0 ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}
                            `}>
                                {s.ready}
                            </div>
                        )}

                        {/* Hotkey Indicator */}
                        <div className="absolute bottom-0.5 left-1 text-[8px] font-bold text-slate-500 uppercase">{s.key}</div>
                        
                        {/* Tooltip on Hover */}
                        <div className="absolute left-full ml-4 hidden group-hover:block bg-slate-950 border border-slate-800 p-2 rounded-lg text-[10px] w-32 shadow-2xl z-50 pointer-events-none">
                            <div className="font-bold text-white mb-1 uppercase tracking-wider">{s.label} PROTOCOL</div>
                            <div className="text-slate-400 leading-tight">
                                {!hasTech ? "Tech not researched." : isTargeting ? "Click map to launch." : s.ready > 0 ? `Trigger ${s.ready} tower(s).` : `Recharging... ${(s.currentCd/1000).toFixed(1)}s`}
                            </div>
                        </div>
                    </button>
                );
            })}
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
  onBatchTrigger
}) => {
  const selectedTower = gameState.selectedTowerId 
    ? gameState.towers.find(t => t.id === gameState.selectedTowerId) 
    : null;

  const baseStats = selectedTower ? TOWER_STATS[selectedTower.type] : null;

  return (
    <div className="fixed inset-0 pointer-events-none p-4 md:p-6 select-none font-sans">
      
      {/* Ability Hotbar (Left-Center) */}
      <AbilityHotbar gameState={gameState} onBatchTrigger={onBatchTrigger} />

      {/* Top Left: Resources & Active Augments */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-col gap-3 pointer-events-auto">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl flex items-center gap-4 shadow-xl shadow-black/20">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-500/20 p-1.5 rounded-lg">
              <Coins className="text-yellow-400" size={18} />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">{gameState.gold}</span>
          </div>
          <div className="w-px h-8 bg-slate-700/50" />
          <div className="flex items-center gap-2">
            <div className="bg-red-500/20 p-1.5 rounded-lg">
              <Heart className="text-red-500" size={18} />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">{gameState.lives}</span>
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
                   <p className="text-slate-400 font-mono text-sm">Select an optimization protocol to integrate into current systems.</p>
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
            <button 
                onClick={() => onSetSpeed(0)}
                className={`p-2 rounded-lg transition-all ${gameState.gameSpeed === 0 ? 'bg-red-500/20 text-red-400' : 'hover:bg-slate-800 text-slate-400'}`}
            >
                <Pause size={20} fill={gameState.gameSpeed === 0 ? "currentColor" : "none"} />
            </button>
            <button 
                onClick={() => onSetSpeed(1)}
                className={`p-2 rounded-lg transition-all ${gameState.gameSpeed === 1 ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}
            >
                <Play size={20} fill={gameState.gameSpeed === 1 ? "currentColor" : "none"} />
            </button>
            <button 
                onClick={() => onSetSpeed(2)}
                className={`p-2 rounded-lg transition-all ${gameState.gameSpeed === 2 ? 'bg-green-500/20 text-green-400' : 'hover:bg-slate-800 text-slate-400'}`}
            >
                <FastForward size={20} fill={gameState.gameSpeed === 2 ? "currentColor" : "none"} />
            </button>
         </div>
      </div>

      {/* Top Right: Wave Info & Controls */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-3 pointer-events-auto">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 px-5 py-3 rounded-xl shadow-xl shadow-black/20 flex items-center gap-3">
          <Swords className="text-blue-400" size={20} />
          <div className="flex flex-col leading-none">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Wave</span>
            <span className="text-2xl font-black text-white">{gameState.wave}</span>
          </div>
        </div>
        
        <button 
          onClick={onReset}
          className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 w-14 rounded-xl flex items-center justify-center hover:bg-slate-800 hover:text-white text-slate-400 transition-all shadow-xl shadow-black/20 active:scale-95"
          title="Restart Game"
        >
          <RefreshCcw size={20} />
        </button>
      </div>

      {/* Bottom Left: Tactical Intel */}
      <div className="absolute bottom-24 left-4 md:bottom-6 md:left-6 max-w-[280px] md:max-w-sm pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md border-l-4 border-blue-500 p-4 rounded-r-xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="flex items-center gap-2 mb-2 text-blue-400 border-b border-blue-500/20 pb-2">
            <Radio size={14} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Incoming Transmission</span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed font-mono">
            <span className="text-blue-500 mr-2">Cmdr:</span>
            {gameState.waveIntel}
          </p>
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
                    <button onClick={() => onSellTower(selectedTower.id)} className="flex items-center gap-2 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 rounded-lg text-red-400 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wider"><Trash2 size={14} />Sell (+{Math.floor(selectedTower.totalInvested * SELL_REFUND_RATIO)})</button>
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
          {Object.entries(TOWER_STATS).map(([type, stats]) => (
            <button key={type} onClick={() => onSelectTower(type as TowerType)} className={`group relative min-w-[80px] p-3 rounded-xl flex flex-col items-center gap-2 transition-all duration-200 ${selectedTowerType === type && !pendingPlacement && !gameState.targetingAbility ? 'bg-slate-800 border-2 border-blue-500' : 'bg-transparent border-2 border-transparent hover:bg-slate-800/50'} ${gameState.gold < stats.cost ? 'opacity-40 grayscale' : ''}`}>
              <div className="w-8 h-8 rounded-full shadow-lg transition-transform group-hover:scale-110" style={{ backgroundColor: stats.color }} />
              <div className="flex flex-col items-center"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{type}</span><div className="flex items-center gap-1 text-yellow-400 text-xs font-black bg-slate-950/50 px-2 py-0.5 rounded-full mt-1"><Coins size={10} />{stats.cost}</div></div>
              {selectedTowerType === type && !pendingPlacement && !gameState.targetingAbility && (<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-40 bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-xl z-50 animate-in slide-in-from-bottom-2 duration-200"><h4 className="font-bold text-blue-400 text-[10px] mb-2 uppercase tracking-wider border-b border-slate-700 pb-1">Stats</h4><div className="space-y-1.5"><div className="flex justify-between text-[10px] text-slate-300"><span>DMG</span><span className="text-white">{stats.damage}</span></div><div className="flex justify-between text-[10px] text-slate-300"><span>RATE</span><span className="text-white">{stats.fireRate}/s</span></div><div className="flex justify-between text-[10px] text-slate-300"><span>RNG</span><span className="text-white">{stats.range}</span></div></div></div>)}
            </button>
          ))}
        </div>
        )}
      </div>

      {/* Bottom Right: Action Button */}
      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 pointer-events-auto">
        {gameState.waveStatus === 'IDLE' && !gameState.isGameOver && !selectedTower && !pendingPlacement && !gameState.isChoosingAugment && !gameState.targetingAbility && (
          <button onClick={onStartWave} className="group bg-blue-600 hover:bg-blue-500 text-white pl-6 pr-5 py-4 rounded-xl font-bold text-lg shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center gap-3 transition-all transform hover:scale-105">
            <span>NEXT WAVE</span><div className="bg-blue-700 rounded-lg p-1 group-hover:translate-x-1 transition-transform"><ChevronRight size={20} /></div>
          </button>
        )}
      </div>
    </div>
  );
};

export default HUD;
