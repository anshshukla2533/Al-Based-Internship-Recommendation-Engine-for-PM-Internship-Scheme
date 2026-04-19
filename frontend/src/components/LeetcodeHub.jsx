import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Target, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
const API_BASE = "http://localhost:8000";
export const LeetcodeHub = ({ company, jobTitle, skills }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const fetchProblems = async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const res = await axios.post(`${API_BASE}/learning-recommendations`, { company, job_title: jobTitle, skills });
            setRecommendations(res.data.recommendations);
            setFetched(true);
        } catch(e) {
            console.error("Failed to fetch Leetcode problems", e);
            setRecommendations([]);
            setFetched(true);
            setErrorMessage(e?.response?.data?.detail || "Failed to build the learning path.");
        }
        setLoading(false);
    };
    const getDiffColor = (diff) => {
        const d = diff.toLowerCase();
        if (d.includes('easy')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
        if (d.includes('medium')) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    };
    if (!fetched && !loading) {
        return (
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon/5 rounded-full blur-3xl -z-10 transform translate-x-10 -translate-y-10"></div>
                <div className="bg-neon/10 border border-neon/20 w-20 h-20 flex items-center justify-center mx-auto mb-5">
                    <Code2 className="text-neon" size={32} />
                </div>
                <h3 className="text-xl font-pixel text-white mb-2 uppercase tracking-wider">Build a Path for {jobTitle || company}</h3>
                <p className="text-white/50 font-medium mb-8 max-w-sm mx-auto text-sm">Get a practical learning path for this internship so you know what to study next.</p>
                <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={fetchProblems}
                    className="bg-neon text-black font-bold py-3.5 px-8 border border-neon uppercase tracking-widest text-sm btn-glow hover:bg-transparent hover:text-neon transition-all inline-flex items-center gap-2"
                >
                    <BookOpen size={18} /> Generate Learning Path
                </motion.button>
            </div>
        );
    }
    return (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
            <div className="bg-white/5 border-b border-white/10 p-6 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                    <div className="bg-neon/10 border border-neon/20 p-2">
                        <Code2 size={24} className="text-neon" />
                    </div>
                    <div>
                        <h3 className="font-pixel text-sm uppercase tracking-wider">{jobTitle || company || "PM Internship"} Learning Path</h3>
                        <p className="text-xs text-white/40 font-medium uppercase tracking-widest">Role-specific prep roadmap</p>
                    </div>
                </div>
                {loading && <span className="flex items-center gap-2 text-sm font-bold text-neon"><Loader2 className="animate-spin" size={16} /> Loading...</span>}
            </div>
            <div className="p-2">
                {recommendations.length > 0 ? (
                    <div className="divide-y divide-white/5">
                        {recommendations.map((prob, i) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={i} 
                                className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group"
                            >
                                <div>
                                    <h4 className="font-bold text-white mb-1 group-hover:text-neon transition-colors">{prob.title}</h4>
                                    <div className="flex items-center gap-3 text-xs font-bold text-white/40">
                                        <span className="flex items-center gap-1.5"><AlertCircle size={14} /> Topic: {prob.topic}</span>
                                        <span className="flex items-center gap-1.5"><Target size={14} /> Goal: {prob.acceptance}</span>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 text-xs font-black border uppercase tracking-wider ${getDiffColor(prob.difficulty)}`}>
                                    {prob.difficulty}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                ) : !loading && (
                    <div className="p-8 text-center text-white/50 font-medium">{errorMessage || "Failed to load learning path. Try again later."}</div>
                )}
            </div>
        </div>
    );
};