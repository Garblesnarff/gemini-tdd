
import React, { useState } from 'react';
import { MetaProgress, AchievementCategory } from '../types';
import { ACHIEVEMENTS } from '../achievements';
import { ChevronLeft, Lock, Medal, Check, Star } from 'lucide-react';

interface AchievementsPanelProps {
    metaProgress: MetaProgress;
    onBack: () => void;
}

const CATEGORIES: AchievementCategory[] = ['CAMPAIGN', 'MASTERY', 'ARSENAL', 'EXTERMINATION', 'ECONOMIC', 'SECRET'];

const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ metaProgress, onBack }) => {
    const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'ALL'>('ALL');

    const filtered = activeCategory === 'ALL' 
        ? ACHIEVEMENTS 
        : ACHIEVEMENTS.filter(a => a.category === activeCategory);

    const totalPoints = ACHIEVEMENTS.reduce((sum, a) => sum + (metaProgress.achievements[a.id] ? a.reward : 0), 0);
    const totalMax = ACHIEVEMENTS.reduce((sum, a) => sum + a.reward, 0);
    const countUnlocked = ACHIEVEMENTS.filter(a => metaProgress.achievements[a.id]).length;

    return (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col z-50 pointer-events-auto overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold uppercase tracking-wider text-sm">
                    <ChevronLeft size={20} /> Return
                </button>
                <div className="flex items-center gap-6">
                     <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Career Records</h1>
                     <div className="h-8 w-px bg-slate-700" />
                     <div className="flex items-center gap-4">
                         <div className="flex flex-col items-end">
                             <div className="text-2xl font-black text-yellow-400 leading-none">{countUnlocked} <span className="text-sm text-slate-500">/ {ACHIEVEMENTS.length}</span></div>
                             <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Unlocked</div>
                         </div>
                         <div className="flex flex-col items-end">
                             <div className="text-2xl font-black text-emerald-400 leading-none">{totalPoints} <span className="text-sm text-slate-500">/ {totalMax}</span></div>
                             <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Total Value</div>
                         </div>
                     </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-56 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
                    <button
                        onClick={() => setActiveCategory('ALL')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold uppercase tracking-wide text-xs ${activeCategory === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                        <Star size={16} /> All Records
                    </button>
                    <div className="h-px bg-slate-800 my-2" />
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold uppercase tracking-wide text-xs ${activeCategory === cat ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                        >
                            {cat === 'SECRET' ? <Lock size={16} /> : <Medal size={16} />}
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex-1 p-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
                        {filtered.map(ach => {
                            const unlocked = metaProgress.achievements[ach.id];
                            const isSecret = ach.isSecret && !unlocked;

                            return (
                                <div key={ach.id} className={`
                                    relative p-4 rounded-xl border flex flex-col gap-2 overflow-hidden
                                    ${unlocked 
                                        ? 'bg-slate-900/80 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                                        : 'bg-slate-950/50 border-slate-800 opacity-70'}
                                `}>
                                    {unlocked && <div className="absolute top-0 right-0 p-2 text-yellow-500"><Check size={20} /></div>}
                                    
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${unlocked ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-600'}`}>
                                            {isSecret ? <Lock size={20} /> : <Medal size={20} />}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className={`font-black uppercase text-sm ${unlocked ? 'text-white' : isSecret ? 'text-slate-500' : 'text-slate-300'}`}>
                                                {isSecret ? '???' : ach.name}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{ach.category}</div>
                                        </div>
                                    </div>

                                    <div className={`text-xs mt-1 ${unlocked ? 'text-slate-300' : 'text-slate-500 italic'}`}>
                                        {isSecret ? (ach.hiddenDescription || 'Locked') : ach.description}
                                    </div>

                                    <div className="mt-auto pt-3 border-t border-slate-800/50 flex items-center justify-between text-xs font-mono">
                                        <span className={unlocked ? 'text-emerald-400' : 'text-slate-600'}>
                                            {unlocked ? 'COMPLETED' : 'LOCKED'}
                                        </span>
                                        <span className="bg-black/30 px-2 py-0.5 rounded text-slate-400">
                                            {ach.reward} ⬡
                                        </span>
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

export default AchievementsPanel;
