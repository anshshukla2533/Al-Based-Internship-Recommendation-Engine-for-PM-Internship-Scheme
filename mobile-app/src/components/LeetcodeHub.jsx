import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Target, Users, BookOpen, AlertCircle } from 'lucide-react';
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
        if (d.includes('easy')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (d.includes('medium')) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-rose-600 bg-rose-50 border-rose-200';
    };
    if (!fetched && !loading) {
        return (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -z-10 transform translate-x-10 -translate-y-10"></div>
                <div className="bg-orange-100/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Code2 className="text-orange-600" size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2">Build a Path for {jobTitle || company}</h3>
                <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">Get a practical learning path for this internship so you know what to study next.</p>
                <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={fetchProblems}
                    className="bg-gray-900 text-white font-bold py-3.5 px-8 rounded-xl shadow-md inline-flex items-center gap-2"
                >
                    <BookOpen size={18} /> Generate Learning Path
                </motion.button>
            </div>
        );
    }
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-lg">
                        <Code2 size={24} className="text-orange-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{jobTitle || company || "PM Internship"} Learning Path</h3>
                        <p className="text-xs text-gray-400 font-medium">Role-specific prep roadmap</p>
                    </div>
                </div>
                {loading && <span className="animate-pulse text-sm font-bold text-orange-400">Loading...</span>}
            </div>
            <div className="p-2">
                {recommendations.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                        {recommendations.map((prob, i) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={i} 
                                className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                            >
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">{prob.title}</h4>
                                    <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                        <span className="flex items-center gap-1.5"><AlertCircle size={14} /> Topic: {prob.topic}</span>
                                        <span className="flex items-center gap-1.5"><Target size={14} /> Goal: {prob.acceptance}</span>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-xs font-black border uppercase tracking-wider ${getDiffColor(prob.difficulty)}`}>
                                    {prob.difficulty}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                ) : !loading && (
                    <div className="p-8 text-center text-gray-500 font-medium">{errorMessage || "Failed to load learning path. Try again later."}</div>
                )}
            </div>
        </div>
    );
};