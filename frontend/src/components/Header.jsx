import React from 'react';
import { motion } from 'framer-motion';
import { Globe, LogOut } from 'lucide-react';

export const Header = ({ language, selectLanguage, user, onLogout }) => {
    const langs = ["English", "हिंदी (Hindi)", "मराठी (Marathi)", "తెలుగు (Telugu)", "தமிழ் (Tamil)"];
    
    return (
        <header className="w-full flex justify-between items-center py-6 px-6 md:px-12 z-50 relative">
            <div className="font-pixel tracking-widest text-lg md:text-xl text-white drop-shadow-lg cursor-pointer hover:scale-105 transition-transform">
                PM <span className="text-neon">INTERN</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm font-bold bg-black/40 backdrop-blur-md border border-white/20 p-1.5 md:p-2 pl-4 rounded-none shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                {user && (
                    <div className="hidden md:flex items-center gap-3 border-r border-white/20 pr-4">
                        <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-none border border-white/50" />
                        <span className="max-w-[120px] truncate tracking-widest text-xs uppercase text-white/90">{user.displayName}</span>
                        <button onClick={onLogout} className="ml-1 text-neon/70 hover:text-neon transition-colors" title="Logout">
                            <LogOut size={16} />
                        </button>
                    </div>
                )}
                
                <div className="flex items-center gap-2 group cursor-pointer text-white px-2">
                    <Globe size={16} className="text-neon opacity-80 group-hover:opacity-100 transition-opacity" />
                    <select 
                      className="bg-transparent outline-none cursor-pointer appearance-none tracking-widest uppercase text-xs font-bold font-sans text-white pr-2 group-hover:text-neon transition-colors"
                      value={language}
                      onChange={(e) => selectLanguage(e.target.value)}
                    >
                        {langs.map(l => <option key={l} value={l} className="bg-black text-white">{l}</option>)}
                    </select>
                </div>
            </div>
        </header>
    );
};
