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

    <div className="bg-black flex items-center justify-center min-h-screen w-full max-w-md mx-auto relative z-50 overflow-hidden font-sans">

        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
          <div className="absolute inset-0 opacity-30" style={{background: 'radial-gradient(ellipse at 30% 50%, rgba(255,85,0,0.2) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(99,102,241,0.12) 0%, transparent 50%)', animation: 'float 8s ease-in-out infinite'}} />
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px'}} />
        </div>

        <div className="absolute inset-0 bg-black/30 z-10 pointer-events-none"></div>

        <motion.div 

            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}

            className="z-20 w-full px-6 flex flex-col items-center justify-center h-full text-center"

        >

            <div className="w-20 h-20 bg-black border border-white/20 flex items-center justify-center mb-10 shadow-[0_0_30px_rgba(255,85,0,0.2)]">

                <Sparkles className="text-neon w-8 h-8 float-subtle" />

            </div>

            <div className="mb-12">

                <h2 className="text-2xl font-pixel text-white mb-4 uppercase leading-[1.4]">GATEWAY<br/><span className="text-neon text-3xl">AI</span></h2>

                <p className="text-white/50 tracking-widest text-[10px] uppercase max-w-[250px] mx-auto leading-relaxed border-t border-b border-white/10 py-4">

                    Neural profile matching unlocked via social authentication.

                </p>

            </div>

            <motion.button 

                whileTap={{ scale: 0.96 }}

                onClick={handleLogin} disabled={loading}

                className="w-full max-w-[300px] flex items-center justify-center gap-3 bg-neon text-black font-black text-[10px] tracking-widest uppercase py-4 border border-neon hover:bg-black hover:text-neon transition-all duration-300 btn-glow"

            >

                {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4 brightness-0"/>}

                <span>OVERRIDE WITH GOOGLE</span>

            </motion.button>

            <div className="absolute bottom-10 text-[8px] font-bold text-white/30 tracking-[0.3em] uppercase">Secure Access Node</div>

        </motion.div>

    </div>

  );

};