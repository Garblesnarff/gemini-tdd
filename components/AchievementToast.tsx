
import React, { useEffect, useState } from 'react';
import { Achievement } from '../types';
import { Medal } from 'lucide-react';

interface AchievementToastProps {
    achievement: Achievement;
    onDismiss: () => void;
}

const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onDismiss }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Animation in
        requestAnimationFrame(() => setVisible(true));
        
        // Auto dismiss
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onDismiss, 300); // Wait for exit animation
        }, 4000);

        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className={`
            pointer-events-auto cursor-pointer
            transform transition-all duration-500 ease-out
            ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
            bg-slate-900/95 backdrop-blur-xl border border-yellow-500/50 rounded-l-xl p-4 shadow-[0_0_20px_rgba(234,179,8,0.3)]
            flex items-start gap-4 w-80 mb-2 relative overflow-hidden group
        `} onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}>
            
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />

            <div className="bg-yellow-500/20 p-2 rounded-lg border border-yellow-500/30 flex-shrink-0">
                <Medal size={24} className="text-yellow-400 animate-pulse" />
            </div>
            
            <div className="flex flex-col min-w-0">
                <div className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-0.5">Achievement Unlocked</div>
                <div className="text-white font-black uppercase text-sm leading-tight truncate">{achievement.name}</div>
                <div className="text-slate-400 text-xs mt-1 truncate">{achievement.description}</div>
                <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    +{achievement.reward} Data Cores
                </div>
            </div>
        </div>
    );
};

export default AchievementToast;
