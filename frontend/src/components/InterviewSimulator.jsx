import React, { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { BrainCircuit, CheckCircle, XCircle, ChevronRight, Award, X } from 'lucide-react';

export const InterviewSimulator = ({ questions, onClose }) => {

    const [currentIdx, setCurrentIdx] = useState(0);

    const [selected, setSelected] = useState(null);

    const [score, setScore] = useState(0);

    const [finished, setFinished] = useState(false);

    if (!questions || questions.length === 0) return null;

    const currentQ = questions[currentIdx];

    const handleSelect = (opt) => {

        if (selected) return;

        setSelected(opt);

        if (opt === currentQ.a) {

            setScore(s => s + 1);

        }

    };

    const nextQ = () => {

        if (currentIdx + 1 < questions.length) {

            setCurrentIdx(c => c + 1);

            setSelected(null);

        } else {

            setFinished(true);

        }

    };

    return (

        <motion.div 

            initial={{ opacity: 0, scale: 0.9 }}

            animate={{ opacity: 1, scale: 1 }}

            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"

        >

            <div className="bg-black/90 backdrop-blur-2xl border border-white/20 max-w-lg w-full overflow-hidden shadow-[0_0_60px_rgba(255,85,0,0.15)] relative">

                {}

                <div className="bg-white/5 border-b border-white/10 p-6 flex justify-between items-center relative overflow-hidden">

                    <div className="absolute -right-10 -top-10 text-neon/10">

                        <BrainCircuit size={120} />

                    </div>

                    <div className="relative z-10 text-white">

                        <div className="flex items-center gap-2 mb-1">

                            <BrainCircuit size={20} className="text-neon" />

                            <h2 className="text-[10px] font-bold tracking-[0.4em] uppercase text-neon">AI Mock Interview</h2>

                        </div>

                        <h3 className="text-xl font-pixel uppercase tracking-wider">Question {currentIdx + 1} of {questions.length}</h3>

                    </div>

                    <button onClick={onClose} className="text-white/50 hover:text-white border border-white/20 p-2 hover:border-neon transition-all">

                        <X size={20} />

                    </button>

                </div>

                {}

                <div className="h-1 bg-white/10 w-full relative">

                    <motion.div 

                        initial={{ width: 0 }}

                        animate={{ width: `${((currentIdx + (finished ? 1 : 0)) / questions.length) * 100}%` }}

                        className="absolute top-0 left-0 h-full bg-neon shadow-[0_0_10px_rgba(255,85,0,0.8)]"

                    />

                </div>

                <div className="p-6">

                    {finished ? (

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">

                            <Award size={64} className="mx-auto text-neon mb-8" />

                            <h3 className="text-2xl font-pixel text-white mb-2 uppercase tracking-widest">Interview Complete!</h3>

                            <p className="text-xl text-white/50 font-black tracking-[0.3em] mb-10">

                                Score: {score} / {questions.length}

                            </p>

                            <button 

                                onClick={onClose}

                                className="w-full bg-neon text-black font-bold py-4 border border-neon uppercase tracking-widest text-sm btn-glow hover:bg-transparent hover:text-neon transition-all"

                            >

                                Back to Dashboard

                            </button>

                        </motion.div>

                    ) : (

                        <AnimatePresence mode="wait">

                            <motion.div 

                                key={currentIdx}

                                initial={{ opacity: 0, x: 20 }}

                                animate={{ opacity: 1, x: 0 }}

                                exit={{ opacity: 0, x: -20 }}

                            >

                                <p className="text-lg font-light text-white mb-6 leading-relaxed">

                                    <span className="text-neon font-pixel text-sm mr-2">{currentIdx + 1}.</span>

                                    {currentQ.q}

                                </p>

                                <div className="space-y-3">

                                    {currentQ.options.map((opt, i) => {

                                        let stateClass = "border-white/10 bg-black/40 hover:border-white/30 text-white/70";

                                        let icon = null;

                                        if (selected) {

                                            if (opt === currentQ.a) {

                                                stateClass = "border-green-500 bg-green-500/10 text-green-400";

                                                icon = <CheckCircle className="text-green-500" size={20} />;

                                            } else if (opt === selected) {

                                                stateClass = "border-red-500 bg-red-500/10 text-red-400";

                                                icon = <XCircle className="text-red-500" size={20} />;

                                            } else {

                                                stateClass = "border-white/5 bg-black/20 opacity-50";

                                            }

                                        }

                                        return (

                                            <button 

                                                key={i}

                                                onClick={() => handleSelect(opt)}

                                                disabled={!!selected}

                                                className={`w-full p-4 border text-left transition-all duration-200 flex justify-between items-center ${stateClass}`}

                                            >

                                                <span className="text-sm">{opt}</span>

                                                {icon}

                                            </button>

                                        );

                                    })}

                                </div>

                                {selected && (

                                    <motion.button 

                                        initial={{ opacity: 0, y: 10 }}

                                        animate={{ opacity: 1, y: 0 }}

                                        onClick={nextQ}

                                        className="mt-6 w-full bg-transparent text-white border-2 border-white/30 font-bold py-4 flex items-center justify-center gap-2 uppercase tracking-widest text-xs hover:border-white hover:bg-white hover:text-black transition-colors"

                                    >

                                        {currentIdx + 1 === questions.length ? "Finish Interview" : "Next Question"} <ChevronRight size={20} />

                                    </motion.button>

                                )}

                            </motion.div>

                        </AnimatePresence>

                    )}

                </div>

            </div>

        </motion.div>

    );

};