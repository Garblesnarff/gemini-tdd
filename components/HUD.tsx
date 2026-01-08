
import React from 'react';
import { GameState, TowerType, TechPath, ActiveAbilityType } from '../types';
import { TOWER_STATS, TECH_PATH_INFO, UPGRADE_CONFIG, MAX_LEVEL, SELL_REFUND_RATIO, ABILITY_CONFIG } from '../constants';
import { Heart, Coins, Swords, Shield, Zap, Info, ChevronRight, RefreshCcw, Radio, Eye, X, ArrowUpCircle, Check, Play, Pause, FastForward, Trash2, Crosshair } from 'lucide-react';

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
}

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
  onTriggerAbility
}) => {
  const selectedTower = gameState.selectedTowerId 
    ? gameState.towers.find(t => t.id === gameState.selectedTowerId) 
    : null;

  const baseStats = selectedTower ? TOWER_STATS[selectedTower.type] : null;

  return (
    <div className="fixed inset-0 pointer-events-none p-4 md:p-6 select-none font-sans">
      
      {/* Top Left: Resources */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-col gap-2 pointer-events-auto">
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
      </div>

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

      {/* Bottom Center: Contextual UI (Shop OR Upgrade) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto w-full md:w-auto flex justify-center px-4">
        
        {/* CASE 1: Upgrade Panel (If Tower Selected) */}
        {selectedTower && baseStats ? (
           <div className="bg-slate-950/95 backdrop-blur-xl border border-blue-500/30 p-5 rounded-2xl flex flex-col gap-4 shadow-2xl shadow-blue-900/20 max-w-[95vw] md:max-w-4xl animate-in slide-in-from-bottom-4 duration-300">
             
             {/* Header */}
             <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div className="flex flex-col">
                   <div className="flex items-center gap-3">
                     <h3 className="font-black text-white text-xl uppercase tracking-tight flex items-center gap-2">
                        {selectedTower.techPath !== TechPath.NONE ? TECH_PATH_INFO[selectedTower.techPath].name : `${selectedTower.type} PROTOCOL`}
                     </h3>
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white font-mono uppercase ${
                       selectedTower.level >= MAX_LEVEL ? 'bg-yellow-600' : 'bg-blue-600'
                     }`}>
                       Level {selectedTower.level}
                     </span>
                   </div>
                   
                   {/* Current Stats Row */}
                   <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded">
                        <Swords size={12} className="text-red-400"/> {Math.round(selectedTower.damage)}
                      </span>
                      <span className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded">
                        <Zap size={12} className="text-yellow-400"/> {selectedTower.fireRate.toFixed(1)}/s
                      </span>
                      <span className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded">
                        <Info size={12} className="text-blue-400"/> {selectedTower.range.toFixed(1)}m
                      </span>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => onSellTower(selectedTower.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 rounded-lg text-red-400 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wider"
                        title="Sell Tower"
                    >
                        <Trash2 size={14} />
                        Sell (+{Math.floor(selectedTower.totalInvested * SELL_REFUND_RATIO)})
                    </button>
                    <button 
                    onClick={onDeselectTower}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                    <X size={20} />
                    </button>
                </div>
             </div>

             {/* Upgrade Content */}
             <div className="flex gap-2 justify-center w-full">
                
                {/* Level 1 -> 2: Tech Path Selection */}
                {selectedTower.level === 1 && (
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                        {[TechPath.MAGMA, TechPath.PLASMA, TechPath.VOID].map(path => {
                            const info = TECH_PATH_INFO[path];
                            const cost = UPGRADE_CONFIG.costs[2];
                            const canAfford = gameState.gold >= cost;
                            const multipliers = UPGRADE_CONFIG.paths[path][2];

                            return (
                                <div 
                                  key={path}
                                  className={`
                                    flex-1 flex flex-col p-4 rounded-xl border-2 transition-all relative overflow-hidden group
                                    ${canAfford ? 'border-slate-800 hover:border-blue-500/50 bg-slate-900 hover:bg-slate-800' : 'border-slate-800 bg-slate-900 opacity-60'}
                                  `}
                                >
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${info.color}20`, color: info.color }}>
                                        {info.icon === 'Swords' && <Swords size={20} />}
                                        {info.icon === 'Zap' && <Zap size={20} />}
                                        {info.icon === 'Eye' && <Eye size={20} />}
                                      </div>
                                      <div>
                                        <div className="font-bold text-white text-sm uppercase tracking-wider">{info.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">Tech Path</div>
                                      </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-xs text-slate-400 mb-4 h-8 leading-tight">{info.description}</p>

                                    {/* Abilities List */}
                                    <div className="space-y-1 mb-4">
                                      {info.abilities.map((ability, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-300">
                                          <Check size={10} className="text-green-500" />
                                          {ability}
                                        </div>
                                      ))}
                                    </div>

                                    <div className="mt-auto pt-2">
                                      <button
                                          onClick={() => canAfford && onUpgradeTower(selectedTower.id, path)}
                                          disabled={!canAfford}
                                          className={`
                                              w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all
                                              ${canAfford 
                                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25 active:scale-95' 
                                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                                          `}
                                      >
                                          <div className="flex items-center gap-1">
                                            <Coins size={14} className={canAfford ? 'text-yellow-300' : 'text-slate-500'} /> 
                                            {cost}
                                          </div>
                                          <span>INSTALL UPGRADE</span>
                                      </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Level 2 -> 3+: Linear Upgrade */}
                {selectedTower.level >= 2 && selectedTower.level < MAX_LEVEL && (
                    <button
                        // @ts-ignore
                        onClick={() => gameState.gold >= UPGRADE_CONFIG.costs[selectedTower.level + 1] && onUpgradeTower(selectedTower.id, selectedTower.techPath)}
                        className={`
                            w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all
                            ${gameState.gold >= UPGRADE_CONFIG.costs[selectedTower.level + 1] 
                              ? 'border-blue-500 bg-blue-900/20 hover:bg-blue-900/30' 
                              : 'border-slate-800 bg-slate-900/50 opacity-60 cursor-not-allowed'}
                        `}
                    >
                        <div className="flex items-center gap-4">
                           <div className="bg-blue-500/20 p-3 rounded-xl">
                             <ArrowUpCircle size={32} className="text-blue-400" />
                           </div>
                           <div className="text-left">
                              <div className="font-bold text-white text-lg">Initialize System Upgrade</div>
                              <div className="text-sm text-blue-200">Enhance combat capabilities to Level {selectedTower.level + 1}</div>
                           </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Upgrade Cost</span>
                          <div className="flex items-center gap-2 text-yellow-400 font-black text-2xl">
                             <Coins size={20} /> 
                             {/* @ts-ignore */}
                             {UPGRADE_CONFIG.costs[selectedTower.level + 1]}
                          </div>
                        </div>
                    </button>
                )}

                 {/* Max Level */}
                 {selectedTower.level >= MAX_LEVEL && (
                     <div className="w-full flex flex-col gap-3">
                         {/* Ability Trigger Button (Only if Active Ability Exists) */}
                         {selectedTower.activeType !== ActiveAbilityType.NONE && (
                             <button
                                onClick={() => onTriggerAbility(selectedTower.id)}
                                disabled={selectedTower.abilityCooldown > 0}
                                className={`
                                    w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between group relative overflow-hidden
                                    ${selectedTower.abilityCooldown > 0 
                                        ? 'border-slate-800 bg-slate-900 cursor-not-allowed grayscale' 
                                        : 'border-purple-500 bg-purple-900/30 hover:bg-purple-900/50 cursor-pointer shadow-lg shadow-purple-500/20'}
                                `}
                             >
                                 <div className="flex items-center gap-4 z-10">
                                     <div className={`p-3 rounded-lg ${selectedTower.abilityCooldown > 0 ? 'bg-slate-800' : 'bg-purple-500 text-white'}`}>
                                         <Crosshair size={24} className={selectedTower.abilityCooldown > 0 ? 'text-slate-500' : 'animate-pulse'}/>
                                     </div>
                                     <div className="text-left">
                                         <div className="font-bold text-white text-lg flex items-center gap-2">
                                             ACTIVATE ABILITY
                                             {/* @ts-ignore */}
                                             <span className="text-xs font-normal text-purple-300 uppercase tracking-widest bg-purple-900/50 px-2 py-0.5 rounded border border-purple-500/30">
                                                {/* @ts-ignore */}
                                                {ActiveAbilityType[selectedTower.activeType]}
                                             </span>
                                         </div>
                                         <div className="text-xs text-purple-200">
                                            {selectedTower.abilityCooldown > 0 
                                                ? `Recharging System... ${(selectedTower.abilityCooldown / 1000).toFixed(1)}s` 
                                                : 'Systems Ready. Waiting for Command.'}
                                         </div>
                                     </div>
                                 </div>

                                 {/* Cooldown Progress Bar Background */}
                                 {selectedTower.abilityCooldown > 0 && (
                                     <div 
                                        className="absolute inset-0 bg-slate-800 origin-left z-0 opacity-50"
                                        style={{ transform: `scaleX(${selectedTower.abilityCooldown / selectedTower.abilityMaxCooldown})` }}
                                     />
                                 )}
                             </button>
                         )}

                         <div className="w-full text-center p-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 text-slate-500 font-mono text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                             <Shield size={16} />
                             Maximum Tech Level Reached
                         </div>
                     </div>
                 )}
             </div>
           </div>
        ) : (
        /* CASE 2: Tower Shop (Default) */
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-2 rounded-2xl flex gap-2 shadow-2xl shadow-black/50 overflow-x-auto max-w-full">
          {Object.entries(TOWER_STATS).map(([type, stats]) => (
            <button
              key={type}
              onClick={() => onSelectTower(type as TowerType)}
              className={`
                group relative min-w-[80px] p-3 rounded-xl flex flex-col items-center gap-2 transition-all duration-200
                ${selectedTowerType === type 
                  ? 'bg-slate-800 border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] translate-y-[-4px]' 
                  : 'bg-transparent border-2 border-transparent hover:bg-slate-800/50'}
                ${gameState.gold < stats.cost ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div 
                className="w-8 h-8 rounded-full shadow-lg transition-transform group-hover:scale-110" 
                style={{ backgroundColor: stats.color }}
              />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 group-hover:text-white">{type}</span>
                <div className="flex items-center gap-1 text-yellow-400 text-xs font-black bg-slate-950/50 px-2 py-0.5 rounded-full mt-1">
                  <Coins size={10} />
                  {stats.cost}
                </div>
              </div>
              
              {/* Tooltip for stats - appears above */}
              {selectedTowerType === type && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-40 bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-xl pointer-events-none animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
                  <h4 className="font-bold text-blue-400 text-[10px] mb-2 uppercase tracking-wider border-b border-slate-700 pb-1">Unit Stats</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-300">
                      <span className="flex items-center gap-1"><Swords size={10}/> DMG</span>
                      <span className="font-mono text-white">{stats.damage}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-300">
                      <span className="flex items-center gap-1"><Zap size={10}/> RATE</span>
                      <span className="font-mono text-white">{stats.fireRate}/s</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-300">
                      <span className="flex items-center gap-1"><Info size={10}/> RNG</span>
                      <span className="font-mono text-white">{stats.range}</span>
                    </div>
                  </div>
                  {/* Triangle pointer */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-slate-900 border-r border-b border-slate-700 transform rotate-45"></div>
                </div>
              )}
            </button>
          ))}
        </div>
        )}
      </div>

      {/* Bottom Right: Action Button */}
      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 pointer-events-auto">
        {gameState.waveStatus === 'IDLE' && !gameState.isGameOver && !selectedTower && (
          <button 
            onClick={onStartWave}
            className="group relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white pl-6 pr-5 py-4 rounded-xl font-bold text-lg shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/20 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <span>NEXT WAVE</span>
            <div className="bg-blue-700 rounded-lg p-1 group-hover:translate-x-1 transition-transform">
              <ChevronRight size={20} />
            </div>
          </button>
        )}
      </div>

    </div>
  );
};

// Helper component for Stat Rows
const StatRow: React.FC<{ icon: any, label: string, current: number, multiplier: number, color: string }> = ({ icon: Icon, label, current, multiplier, color }) => {
  const projected = current * multiplier;
  const isBetter = multiplier > 1;
  const isWorse = multiplier < 1;
  
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon size={12} className={color} />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500">{current % 1 === 0 ? current : current.toFixed(1)}</span>
        <ChevronRight size={10} className="text-slate-600" />
        <span className={`font-mono font-bold ${isBetter ? 'text-green-400' : isWorse ? 'text-red-400' : 'text-slate-300'}`}>
          {projected % 1 === 0 ? projected : projected.toFixed(1)}
        </span>
      </div>
    </div>
  );
};

export default HUD;
