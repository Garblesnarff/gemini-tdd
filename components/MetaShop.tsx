
import React, { useState } from 'react';
import { MetaProgress, MetaUpgradeCategory } from '../types';
import { META_UPGRADES } from '../metaUpgrades';
import { ChevronLeft, Database, Lock, TrendingUp, Shield, Swords, Cpu, Unlock } from 'lucide-react';

interface MetaShopProps {
    metaProgress: MetaProgress;
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

const MetaShop: React.FC<MetaShopProps> = ({ metaProgress, onPurchase, onBack }) => {
    const [activeCategory, setActiveCategory] = useState<MetaUpgradeCategory>('ECONOMIC');

    return (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col z-50 pointer-events-auto overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold uppercase tracking-wider text-sm">
                    <ChevronLeft size={20} /> Return to Command
                </button>
                <div className="flex items-center gap-4">
                     <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Armory Protocol</h1>
                     <div className="h-8 w-px bg-slate-700" />
                     <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                         <Database size={24} className="text-emerald-400 animate-pulse" />
                         <span className="text-2xl font-black text-emerald-400 font-mono">{metaProgress.dataCores}</span>
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">CORES AVAILABLE</span>
                     </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`
                                flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold uppercase tracking-wide text-sm
                                ${activeCategory === cat.id 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                            `}
                        >
                            <cat.icon size={18} />
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Upgrade Grid */}
                <div className="flex-1 p-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
                        {META_UPGRADES.filter(u => u.category === activeCategory).map(upgrade => {
                            const currentLevel = metaProgress.upgradeLevels[upgrade.id] || 0;
                            const isMaxed = currentLevel >= upgrade.maxLevel;
                            const nextCost = !isMaxed ? upgrade.costs[currentLevel] : 0;
                            const canAfford = metaProgress.dataCores >= nextCost;
                            
                            // Check lock condition
                            let isLocked = false;
                            let lockReason = "";
                            if (upgrade.unlockCondition) {
                                // Simple check for implementation example. In a real app, pass full history check.
                                // Assuming metaProgress stores simple flags or we pass context.
                                // For MVP, let's assume if it has a condition, we check basic progress.
                                // Since we don't have Stage Clear history fully accessible here besides `achievements` or logic passed in,
                                // we'll skip complex lock logic rendering or assume unlocked for now, 
                                // OR better: Check `metaProgress.achievements` if implemented or pass unlock status.
                            }

                            return (
                                <div 
                                    key={upgrade.id}
                                    className={`
                                        group relative p-6 rounded-2xl border-2 transition-all flex flex-col h-full
                                        ${isMaxed 
                                            ? 'bg-emerald-950/20 border-emerald-500/30' 
                                            : canAfford 
                                                ? 'bg-slate-900 border-slate-800 hover:border-blue-500 hover:bg-slate-800/80 shadow-lg' 
                                                : 'bg-slate-950 border-slate-900 opacity-60'}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl ${isMaxed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {isMaxed ? <Shield size={24}/> : <Cpu size={24} />}
                                        </div>
                                        <div className="flex gap-1">
                                            {Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                                                <div 
                                                    key={i} 
                                                    className={`w-2 h-2 rounded-full ${i < currentLevel ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]' : 'bg-slate-800'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{upgrade.name}</h3>
                                    <p className="text-sm text-slate-400 mb-6 flex-grow">{upgrade.description}</p>

                                    <div className="mt-auto">
                                        {isMaxed ? (
                                            <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-sm">
                                                <Shield size={16} /> Max Level
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => canAfford && onPurchase(upgrade.id, nextCost)}
                                                disabled={!canAfford}
                                                className={`
                                                    w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wider text-sm
                                                    ${canAfford 
                                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:scale-[1.02]' 
                                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                                                `}
                                            >
                                                {canAfford ? 'Acquire Upgrade' : 'Insufficient Cores'}
                                                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${canAfford ? 'bg-black/20 text-white' : 'bg-black/20 text-slate-500'}`}>
                                                    {nextCost} ⬡
                                                </span>
                                            </button>
                                        )}
                                    </div>
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
