
import React, { useState, useMemo } from 'react';
import { MetaProgress, MetaUpgradeCategory, StageProgress, StageId, MetaUpgrade } from '../types';
import { META_UPGRADES } from '../metaUpgrades';
import { STAGE_CONFIGS } from '../constants';
// Added Check to the imported icons
import { ChevronLeft, Database, Lock, TrendingUp, Shield, Swords, Cpu, Unlock, Target, Star, Info, AlertCircle, Check } from 'lucide-react';

interface MetaShopProps {
    metaProgress: MetaProgress;
    stageProgress: Record<StageId, StageProgress>;
    onPurchase: (upgradeId: string, cost: number) => void;
    onBack: () => void;
}

const CATEGORIES: { id: MetaUpgradeCategory; label: string; icon: React.FC<any> }[] = [
    { id: 'ECONOMIC', label: 'Economy', icon: TrendingUp },
    { id: 'DEFENSIVE', label: 'Defense', icon: Shield },
    { id: 'OFFENSIVE', label: 'Offense', icon: Swords },
    { id: 'TECH', label: 'Tech Specs', icon: Cpu },
    { id: 'UNLOCKABLE', label: 'Unlocks', icon: Unlock }
];

const MetaShop: React.FC<MetaShopProps> = ({ metaProgress, stageProgress, onPurchase, onBack }) => {
    const [activeCategory, setActiveCategory] = useState<MetaUpgradeCategory>('ECONOMIC');

    const totalStars = useMemo(() => {
        // Explicitly cast to StageProgress[] to avoid "unknown" type error
        return (Object.values(stageProgress) as StageProgress[]).reduce((acc, curr) => acc + curr.stars, 0);
    }, [stageProgress]);

    const isUpgradeLocked = (upgrade: MetaUpgrade) => {
        if (!upgrade.unlockCondition) return { locked: false, reason: "" };
        
        const cond = upgrade.unlockCondition;
        if (cond.type === 'STAGE_CLEAR' && cond.stageId) {
            const stage = stageProgress[cond.stageId];
            if (!stage.completed) {
                return { locked: true, reason: `CLEAR ${STAGE_CONFIGS[cond.stageId].name}` };
            }
        }
        if (cond.type === 'STARS' && cond.stars) {
            if (totalStars < cond.stars) {
                return { locked: true, reason: `${cond.stars} TOTAL STARS REQUIRED` };
            }
        }
        return { locked: false, reason: "" };
    };

    const nextUnlockGoal = useMemo(() => {
        // Find first locked stage
        const stages = Object.values(STAGE_CONFIGS);
        const nextStage = stages.find(s => !stageProgress[s.id].completed);
        
        // Find first locked upgrade
        const nextUpgrade = META_UPGRADES.find(u => {
            const currentLevel = metaProgress.upgradeLevels[u.id] || 0;
            const { locked } = isUpgradeLocked(u);
            return locked && currentLevel === 0;
        });

        return { nextStage, nextUpgrade };
    }, [stageProgress, metaProgress]);

    return (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col z-50 pointer-events-auto overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold uppercase tracking-wider text-sm group">
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Return to Command
                </button>
                <div className="flex items-center gap-6">
                     <div className="flex flex-col items-end">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Armory Protocol</h1>
                        <span className="text-[10px] text-blue-400 font-bold tracking-[0.2em] mt-1">SST DEPLOYMENT READINESS</span>
                     </div>
                     <div className="h-10 w-px bg-slate-700" />
                     <div className="flex items-center gap-3 bg-slate-800/80 px-5 py-2.5 rounded-xl border border-slate-700 shadow-xl">
                         <Database size={24} className="text-emerald-400 animate-pulse" />
                         <div className="flex flex-col">
                             <span className="text-2xl font-black text-emerald-400 font-mono leading-none">{metaProgress.dataCores}</span>
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">AVAIL CORES</span>
                         </div>
                     </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-8">
                    <div className="flex flex-col gap-2">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-4">Categories</div>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`
                                    flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all font-bold uppercase tracking-wide text-xs
                                    ${activeCategory === cat.id 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                                `}
                            >
                                <cat.icon size={16} />
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-auto flex flex-col gap-4">
                        <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                            <div className="flex items-center gap-2 mb-3">
                                <Target size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Command Objectives</span>
                            </div>
                            
                            {nextUnlockGoal.nextStage && (
                                <div className="flex flex-col gap-1 mb-4">
                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Priority Ops</div>
                                    <div className="text-xs text-white font-black uppercase flex items-center justify-between">
                                        {nextUnlockGoal.nextStage.name}
                                        <ChevronRight size={12} className="text-slate-600" />
                                    </div>
                                    <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                                        <div className="bg-blue-500 h-full w-1/3 animate-pulse" />
                                    </div>
                                </div>
                            )}

                            {nextUnlockGoal.nextUpgrade && (
                                <div className="flex flex-col gap-1 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                    <div className="text-[9px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                                        <Unlock size={10} /> Research Goal
                                    </div>
                                    <div className="text-xs text-slate-300 font-bold uppercase">{nextUnlockGoal.nextUpgrade.name}</div>
                                    <div className="text-[8px] text-slate-500 leading-tight mt-1">Requires: {isUpgradeLocked(nextUnlockGoal.nextUpgrade).reason}</div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-6 px-1">
                                <div className="flex items-center gap-2">
                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                    <span className="text-sm font-black text-white">{totalStars}</span>
                                </div>
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Total Stars</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upgrade Grid */}
                <div className="flex-1 p-10 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
                        {META_UPGRADES.filter(u => u.category === activeCategory).map(upgrade => {
                            const currentLevel = metaProgress.upgradeLevels[upgrade.id] || 0;
                            const isMaxed = currentLevel >= upgrade.maxLevel;
                            const nextCost = !isMaxed ? upgrade.costs[currentLevel] : 0;
                            const canAfford = metaProgress.dataCores >= nextCost;
                            const { locked, reason } = isUpgradeLocked(upgrade);

                            return (
                                <div 
                                    key={upgrade.id}
                                    className={`
                                        group relative p-8 rounded-[2rem] border-2 transition-all duration-300 flex flex-col h-full
                                        ${locked 
                                            ? 'bg-slate-950/40 border-slate-900 opacity-50 desaturate-[0.8]' 
                                            : isMaxed 
                                                ? 'bg-emerald-950/10 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.05)]' 
                                                : canAfford 
                                                    ? 'bg-slate-900/40 border-slate-800 hover:border-blue-500 hover:bg-slate-900/60 shadow-xl' 
                                                    : 'bg-slate-950 border-slate-900'}
                                    `}
                                >
                                    {locked && (
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/20 rounded-[2rem] pointer-events-none">
                                            <div className="bg-red-500/10 border border-red-500/40 px-3 py-1 rounded-full flex items-center gap-2 mb-2">
                                                <Lock size={12} className="text-red-500" />
                                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Locked</span>
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-500 px-6 text-center leading-tight">{reason}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-4 rounded-2xl transition-colors ${locked ? 'bg-slate-800 text-slate-600' : isMaxed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-600/20 text-blue-400'}`}>
                                            {isMaxed ? <Shield size={28}/> : <Cpu size={28} />}
                                        </div>
                                        <div className="flex gap-1.5 pt-2">
                                            {Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                                                <div 
                                                    key={i} 
                                                    className={`w-3 h-1.5 rounded-full transition-all duration-500 ${i < currentLevel ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-slate-800'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <h3 className={`text-2xl font-black uppercase tracking-tight mb-3 ${locked ? 'text-slate-600' : 'text-white'}`}>{upgrade.name}</h3>
                                    <p className={`text-sm leading-relaxed mb-8 flex-grow ${locked ? 'text-slate-700' : 'text-slate-400'}`}>{upgrade.description}</p>

                                    <div className="mt-auto space-y-4">
                                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest border-t border-slate-800/50 pt-6">
                                            <span className="text-slate-500">Tier Analysis</span>
                                            <div className="h-px flex-1 bg-slate-800/50" />
                                        </div>
                                        
                                        {isMaxed ? (
                                            <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center gap-3 text-emerald-400 font-black uppercase tracking-[0.2em] text-xs">
                                                <Check size={18} /> Elite Protocol Active
                                            </div>
                                        ) : locked ? (
                                            <div className="w-full py-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-slate-600 font-black uppercase tracking-widest text-[10px]">
                                                <AlertCircle size={14} /> Intelligence Incomplete
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => canAfford && onPurchase(upgrade.id, nextCost)}
                                                disabled={!canAfford}
                                                className={`
                                                    group/btn w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-xs
                                                    ${canAfford 
                                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 hover:scale-[1.03] active:scale-95' 
                                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                                                `}
                                            >
                                                {canAfford ? 'Initialize Upgrade' : 'Insufficient Resources'}
                                                <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors font-mono ${canAfford ? 'bg-black/20 text-white' : 'bg-black/20 text-slate-600'}`}>
                                                    <span className="text-sm">{nextCost}</span>
                                                    <span className="text-[10px]">⬡</span>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Sub-label for specific category effects */}
                                    {!locked && upgrade.effects.some(e => e.techPath) && (
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Specialization Detected</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetaShop;

const ChevronRight = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6" />
    </svg>
);
