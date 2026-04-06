import React from 'react';
import { motion } from 'framer-motion';
import { Globe, LogOut } from 'lucide-react';
export const Header = ({ language, selectLanguage, user, onLogout }) => {
    const languageOptions = [
        { code: "English", label: "English" },
        { code: "Hindi", label: "Hindi" },
        { code: "Marathi", label: "Marathi" },
        { code: "Telugu", label: "Telugu" },
        { code: "Tamil", label: "Tamil" },
    ];
    const langs = ["English", "हिंदी (Hindi)", "मराठी (Marathi)", "తెలుగు (Telugu)", "தமிழ் (Tamil)"];
    return (
        <header className="w-full flex justify-between items-center py-6 px-6 z-50 relative">
            <div className="font-pixel tracking-widest text-md text-white drop-shadow-md">
                PM <span className="text-neon">INTERN</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
                {user && (
                    <button onClick={onLogout} className="border border-white/20 bg-black/50 p-1">
                        <img src={user.photoURL} alt="Avatar" className="w-6 h-6 opacity-90 grayscale hover:grayscale-0" />
                    </button>
                )}
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-white/20 text-white px-3 py-2 cursor-pointer shadow-lg text-[10px]">
                    <Globe size={14} className="text-neon" />
                    <select 
                      className="bg-transparent outline-none cursor-pointer appearance-none tracking-widest uppercase font-bold font-sans pr-1"
                      value={language}
                      onChange={(e) => selectLanguage(languageOptions.find((lang) => lang.code === e.target.value) || languageOptions[0])}
                    >
                        {languageOptions.map((lang) => <option key={lang.code} value={lang.code} className="bg-black text-white">{lang.label}</option>)}
                    </select>
                </div>
            </div>
        </header>
    );
};