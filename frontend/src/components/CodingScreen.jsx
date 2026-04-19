import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Play, Send, Loader2, ChevronRight, AlertTriangle, Eye, EyeOff, Terminal, CheckCircle, XCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

const API_BASE = "http://localhost:8000";

export const CodingScreen = ({ skills, onFinish }) => {
    const [challenges, setChallenges] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [code, setCode] = useState('');
    const [output, setOutput] = useState(null);
    const [running, setRunning] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showOutput, setShowOutput] = useState(false);
    const [submitted, setSubmitted] = useState({});

    const [tabSwitches, setTabSwitches] = useState(0);
    const [copyPasteCount, setCopyPasteCount] = useState(0);
    const startTimeRef = useRef(null);

    useEffect(() => {
        startTimeRef.current = Date.now();
    }, []);

    useEffect(() => {
        const fetchChallenges = async () => {
            setLoading(true);
            try {
                const res = await axios.post(`${API_BASE}/generate-test-2`, { skills });
                const data = res.data.challenges || [];
                setChallenges(data);
                if (data.length > 0) {
                    setCode(data[0].starterCode || '# Write your solution here\n');
                }
            } catch (e) {
                console.error("Failed to fetch coding challenges:", e);
                setChallenges([{
                    id: 'fallback-1',
                    title: `Implement a basic function in ${skills[0] || 'Python'}`,
                    difficulty: 'Medium',
                    prompt: 'Write a function that solves a basic problem.',
                    starterCode: 'def solve():\n    pass\n',
                    expectedSignals: ['def', 'return']
                }]);
                setCode('def solve():\n    pass\n');
            }
            setLoading(false);
        };
        fetchChallenges();
    }, [skills]);

    useEffect(() => {
        const handleVisChange = () => {
            if (document.hidden) {
                setTabSwitches(prev => prev + 1);
            }
        };
        const handlePaste = () => {
            setCopyPasteCount(prev => prev + 1);
        };
        document.addEventListener('visibilitychange', handleVisChange);
        document.addEventListener('paste', handlePaste);
        return () => {
            document.removeEventListener('visibilitychange', handleVisChange);
            document.removeEventListener('paste', handlePaste);
        };
    }, []);

    const currentChallenge = challenges[currentIdx];

    const runCode = async () => {
        setRunning(true);
        setShowOutput(true);
        try {
            const res = await axios.post(`${API_BASE}/execute-code`, {
                code: code,
                language: 'python'
            });
            setOutput(res.data);
        } catch (e) {
            setOutput({ stdout: '', stderr: e?.response?.data?.detail || 'Execution failed.', error: true });
        }
        setRunning(false);
    };

    const submitChallenge = async () => {
        await runCode();
        const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);

        try {
            const cheatingRes = await axios.post(`${API_BASE}/calculate-cheating-score`, {
                tab_switches: tabSwitches,
                copy_paste_count: copyPasteCount,
                time_taken_seconds: timeTaken
            });
            setSubmitted(prev => ({
                ...prev,
                [currentIdx]: {
                    code,
                    cheatingScore: cheatingRes.data.cheating_score,
                    riskLevel: cheatingRes.data.risk_level,
                    timeTaken
                }
            }));
        } catch (e) {
            console.error("Cheating score calculation failed:", e);
            setSubmitted(prev => ({ ...prev, [currentIdx]: { code, cheatingScore: 0, riskLevel: 'Low', timeTaken } }));
        }
    };

    const goNext = () => {
        if (currentIdx + 1 < challenges.length) {
            const nextIdx = currentIdx + 1;
            setCurrentIdx(nextIdx);
            setCode(challenges[nextIdx]?.starterCode || '# Write your solution\n');
            setOutput(null);
            setShowOutput(false);
            startTimeRef.current = Date.now();
        } else if (onFinish) {
            const totalCheating = Object.values(submitted).reduce((sum, s) => sum + (s.cheatingScore || 0), 0);
            const avgCheating = Math.round(totalCheating / Math.max(Object.keys(submitted).length, 1));
            onFinish({ submitted, averageCheatingScore: avgCheating });
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-20 text-center">
                <Loader2 size={64} className="animate-spin text-neon mx-auto mb-6" />
                <h2 className="text-2xl font-pixel text-white uppercase tracking-widest">Loading Challenges...</h2>
                <p className="text-white/40 mt-3 text-sm tracking-wider">Generating coding problems from your skill set</p>
            </div>
        );
    }

    if (challenges.length === 0) {
        return (
            <div className="max-w-4xl mx-auto py-20 text-center">
                <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4" />
                <h2 className="text-xl font-pixel text-white">No Challenges Available</h2>
                <button onClick={onFinish} className="mt-6 bg-neon text-black font-bold py-3 px-8 uppercase tracking-widest text-sm">Continue</button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto w-full pb-20"
        >
            {/* Header */}
            <div className="bg-black/60 backdrop-blur-2xl border border-white/20 p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-neon/10 border border-neon/20 p-2">
                        <Code size={20} className="text-neon" />
                    </div>
                    <div>
                        <h2 className="text-sm font-pixel text-white uppercase tracking-wider">Coding Challenge {currentIdx + 1} / {challenges.length}</h2>
                        <p className="text-white/40 text-[10px] tracking-widest uppercase">{currentChallenge?.difficulty || 'Medium'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-white/40 text-[10px] tracking-widest uppercase">
                    <span className={tabSwitches > 2 ? 'text-rose-400' : ''}>Tabs: {tabSwitches}</span>
                    <span className={copyPasteCount > 0 ? 'text-amber-400' : ''}>Pastes: {copyPasteCount}</span>
                </div>
            </div>

            {/* Progress */}
            <div className="h-1 bg-white/10 w-full mb-4">
                <motion.div
                    animate={{ width: `${((currentIdx + (submitted[currentIdx] ? 1 : 0)) / challenges.length) * 100}%` }}
                    className="h-full bg-neon shadow-[0_0_10px_rgba(255,85,0,0.8)]"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Problem Description */}
                <div className="bg-black/60 backdrop-blur-2xl border border-white/20 p-6 overflow-y-auto max-h-[600px]">
                    <h3 className="text-lg font-pixel text-white mb-4 uppercase tracking-wider">{currentChallenge?.title}</h3>
                    <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{currentChallenge?.prompt}</p>
                    {currentChallenge?.expectedSignals && (
                        <div className="mt-6">
                            <h4 className="text-[10px] text-white/40 font-bold tracking-widest uppercase mb-2">Expected in solution:</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {currentChallenge.expectedSignals.map((sig, i) => (
                                    <span key={i} className="text-[10px] bg-white/5 text-white/50 border border-white/10 px-2 py-1 font-mono">{sig}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {submitted[currentIdx] && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 bg-emerald-500/10 border border-emerald-500/20 p-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle size={16} className="text-emerald-400" />
                                <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Submitted</span>
                            </div>
                            <p className="text-white/50 text-xs">
                                Time: {submitted[currentIdx].timeTaken}s · 
                                Risk: <span className={submitted[currentIdx].riskLevel === 'High' ? 'text-rose-400' : submitted[currentIdx].riskLevel === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}>
                                    {submitted[currentIdx].riskLevel}
                                </span>
                            </p>
                        </motion.div>
                    )}
                </div>

                {/* Code Editor + Output */}
                <div className="flex flex-col gap-4">
                    <div className="bg-black/80 border border-white/20 overflow-hidden flex-1" style={{ minHeight: '350px' }}>
                        <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center justify-between">
                            <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase">Python</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={runCode}
                                    disabled={running}
                                    className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                                >
                                    {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run
                                </button>
                                <button
                                    onClick={submitChallenge}
                                    disabled={running || submitted[currentIdx]}
                                    className="flex items-center gap-1.5 bg-neon/20 text-neon border border-neon/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-neon hover:text-black transition-all disabled:opacity-50"
                                >
                                    <Send size={12} /> Submit
                                </button>
                            </div>
                        </div>
                        <Editor
                            height="320px"
                            language="python"
                            theme="vs-dark"
                            value={code}
                            onChange={(val) => setCode(val || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                padding: { top: 12 },
                                scrollBeyondLastLine: false,
                                wordWrap: 'on',
                                lineNumbers: 'on',
                                renderWhitespace: 'selection',
                            }}
                        />
                    </div>

                    {/* Output Panel */}
                    <div className="bg-black/80 border border-white/20">
                        <button
                            onClick={() => setShowOutput(!showOutput)}
                            className="w-full bg-white/5 border-b border-white/10 px-4 py-2 flex items-center justify-between text-white/50 hover:text-white transition-colors"
                        >
                            <span className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase">
                                <Terminal size={12} /> Output
                            </span>
                            {showOutput ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <AnimatePresence>
                            {showOutput && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 font-mono text-xs max-h-48 overflow-y-auto">
                                        {running ? (
                                            <div className="flex items-center gap-2 text-neon">
                                                <Loader2 size={14} className="animate-spin" /> Running...
                                            </div>
                                        ) : output ? (
                                            <>
                                                {output.stdout && <pre className="text-emerald-400 whitespace-pre-wrap">{output.stdout}</pre>}
                                                {output.stderr && <pre className="text-rose-400 whitespace-pre-wrap">{output.stderr}</pre>}
                                                {!output.stdout && !output.stderr && <span className="text-white/30">No output</span>}
                                            </>
                                        ) : (
                                            <span className="text-white/30">Run your code to see output</span>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="mt-6 flex justify-end">
                {submitted[currentIdx] && (
                    <motion.button
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={goNext}
                        className="bg-neon text-black font-bold py-4 px-8 border border-neon uppercase tracking-widest text-sm btn-glow hover:bg-transparent hover:text-neon transition-all flex items-center gap-2"
                    >
                        {currentIdx + 1 < challenges.length ? 'Next Challenge' : 'View Dashboard'} <ChevronRight size={18} />
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
};
