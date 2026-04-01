import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { auth, provider, signInWithPopup } from '../firebase';

export const LoginScreen = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
      setLoading(true);
      try {
          await signInWithPopup(auth, provider);
      } catch (err) {
          alert("Login Failed: " + err.message);
          setLoading(false);
      }
  };

  return (
    <div className="bg-black flex items-center justify-center min-h-screen w-full relative z-50 px-4 overflow-hidden">
        
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 mix-blend-screen">
          <source src="https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-connection-background-3094-large.mp4" type="video/mp4"/>
        </video>
        <div className="absolute inset-0 bg-black/70 z-10 pointer-events-none"></div>

        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
            className="bg-black/40 backdrop-blur-2xl p-10 md:p-14 border border-white/10 w-full max-w-md text-center flex flex-col items-center relative overflow-hidden shadow-[0_0_50px_rgba(255,85,0,0.1)]"
        >
            <div className="w-20 h-20 bg-black border border-white/20 flex items-center justify-center mb-8 relative z-10 shadow-[0_0_20px_rgba(255,85,0,0.3)]">
                <Sparkles className="text-neon w-8 h-8 float-subtle" />
            </div>
            
            <div className="mb-10 relative z-10">
                <h2 className="text-3xl font-pixel text-white mb-6 uppercase leading-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">SYSTEM<br/><span className="text-neon">LOGIN</span></h2>
                <p className="text-white/60 font-sans tracking-widest text-xs uppercase leading-relaxed border-l-2 border-neon pl-4 text-left">
                    Authentication sequence required to deploy AI Job Engine protocols.
                </p>
            </div>
            
            <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleLogin} disabled={loading}
                className="w-full flex items-center justify-center gap-4 bg-neon text-black font-sans font-black text-xs tracking-[0.2em] uppercase py-5 hover:bg-transparent hover:text-neon border-2 border-neon transition-all duration-300 relative z-10 btn-glow"
            >
                {loading ? <Loader2 className="animate-spin w-5 h-5 text-black"/> : <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 drop-shadow-sm brightness-0"/>}
                <span>INITIALIZE GOOGLE</span>
            </motion.button>
        </motion.div>
    </div>
  );
};
