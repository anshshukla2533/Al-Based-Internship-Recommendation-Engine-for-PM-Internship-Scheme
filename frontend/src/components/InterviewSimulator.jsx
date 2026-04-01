import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, CheckCircle, XCircle, ChevronRight, Award } from 'lucide-react';

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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
        >
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-white/10">
                        <BrainCircuit size={120} />
                    </div>
                    <div className="relative z-10 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <BrainCircuit size={20} />
                            <h2 className="text-sm font-bold tracking-widest uppercase text-blue-200">AI Mock Interview</h2>
                        </div>
                        <h3 className="text-xl font-black">Question {currentIdx + 1} of {questions.length}</h3>
                    </div>
                    {finished && (
                        <button onClick={onClose} className="text-white bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
                            <XCircle size={24} />
                        </button>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 bg-gray-100 w-full relative">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentIdx + (finished ? 1 : 0)) / questions.length) * 100}%` }}
                        className="absolute top-0 left-0 h-full bg-blue-500"
                    />
                </div>

                <div className="p-6">
                    {finished ? (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 text-green-500 mb-6 border-8 border-green-50">
                                <Award size={48} />
                            </div>
                            <h3 className="text-3xl font-black text-gray-800 mb-2">Interview Complete!</h3>
                            <p className="text-lg text-gray-500 font-medium bg-gray-50 inline-block px-6 py-2 rounded-full">
                                You scored {score} out of {questions.length}
                            </p>
                            <button 
                                onClick={onClose}
                                className="mt-8 w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition"
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
                                <p className="text-lg font-bold text-gray-800 mb-6 leading-relaxed">
                                    {currentQ.q}
                                </p>
                                
                                <div className="space-y-3">
                                    {currentQ.options.map((opt, i) => {
                                        let stateClass = "border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50";
                                        let icon = null;
                                        
                                        if (selected) {
                                            if (opt === currentQ.a) {
                                                stateClass = "border-green-500 bg-green-50 text-green-800 font-bold";
                                                icon = <CheckCircle className="text-green-500" size={20} />;
                                            } else if (opt === selected) {
                                                stateClass = "border-red-500 bg-red-50 text-red-800 font-bold";
                                                icon = <XCircle className="text-red-500" size={20} />;
                                            } else {
                                                stateClass = "border-gray-200 bg-gray-50 opacity-50";
                                            }
                                        }

                                        return (
                                            <button 
                                                key={i}
                                                onClick={() => handleSelect(opt)}
                                                disabled={!!selected}
                                                className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex justify-between items-center ${stateClass}`}
                                            >
                                                <span className="text-[15px]">{opt}</span>
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
                                        className="mt-6 w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-500/20"
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
