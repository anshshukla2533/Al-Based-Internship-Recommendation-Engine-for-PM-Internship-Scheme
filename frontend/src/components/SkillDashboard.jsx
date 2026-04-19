import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, BookOpen, FileText, Loader2, ChevronRight, Award, Target, ShieldCheck, AlertTriangle, ExternalLink, Sparkles } from 'lucide-react';
import axios from 'axios';

const API_BASE = "http://localhost:8000";

const normalizeExternalUrl = (value, fallback = "https://www.coursera.org/") => {
    const raw = String(value || "").trim();
    if (!raw) return fallback;

    const maybeAbsolute = (() => {
        if (/^https?:\/\//i.test(raw)) return raw;
        if (raw.startsWith("//")) return `https:${raw}`;
        if (/^www\./i.test(raw)) return `https://${raw}`;
        if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
        return "";
    })();

    try {
        const parsed = new URL(maybeAbsolute || raw);
        if (!["http:", "https:"].includes(parsed.protocol)) return fallback;
        if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname.toLowerCase())) return fallback;
        return parsed.toString();
    } catch {
        return fallback;
    }
};

export const SkillDashboard = ({ skills, totalScore, cheatingScore, resumeText, onBack }) => {
    const [analytics, setAnalytics] = useState(null);
    const [courses, setCourses] = useState([]);
    const [atsData, setAtsData] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const analyticsRes = await axios.post(`${API_BASE}/generate-analytics`, {
                    skills: skills,
                    total_score: totalScore || 0,
                    cheating_score: cheatingScore || 0
                });
                setAnalytics(analyticsRes.data);

                const weakSkills = Object.entries(analyticsRes.data.skill_scores || {})
                    .filter(([, sc]) => sc < (analyticsRes.data.overall_score || 50))
                    .map(([sk]) => sk);

                const courseRes = await axios.post(`${API_BASE}/course-recommendations`, {
                    skills: skills,
                    weak_skills: weakSkills
                });
                setCourses(
                    (courseRes.data.courses || []).map((course) => ({
                        ...course,
                        url_hint: normalizeExternalUrl(
                            course.url_hint,
                            `https://www.youtube.com/results?search_query=learn+${encodeURIComponent(String(course.skill || "internship skill"))}`,
                        ),
                    })),
                );

                if (resumeText && resumeText.length > 50) {
                    try {
                        const [atsRes, sugRes] = await Promise.all([
                            axios.post(`${API_BASE}/ats-score`, { resume_text: resumeText, target_keywords: skills }),
                            axios.post(`${API_BASE}/resume-suggestions`, { resume_text: resumeText, skills: skills })
                        ]);
                        setAtsData(atsRes.data);
                        setSuggestions(sugRes.data.suggestions || []);
                    } catch (e) {
                        console.error("ATS/Suggestions failed:", e);
                    }
                }
            } catch (e) {
                console.error("Dashboard data fetch failed:", e);
            }
            setLoading(false);
        };
        fetchAll();
    }, [skills, totalScore, cheatingScore, resumeText]);

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-amber-400';
        return 'text-rose-400';
    };

    const getScoreBarColor = (score) => {
        if (score >= 80) return 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]';
        if (score >= 60) return 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]';
        return 'bg-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]';
    };

    const getPriorityColor = (priority) => {
        if (priority === 'high') return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
        if (priority === 'medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'courses', label: 'Courses', icon: BookOpen },
        ...(resumeText ? [{ id: 'ats', label: 'ATS Score', icon: FileText }] : [])
    ];

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-20 text-center">
                <Loader2 size={64} className="animate-spin text-neon mx-auto mb-6" />
                <h2 className="text-2xl font-pixel text-white uppercase tracking-widest">Analyzing Performance...</h2>
                <p className="text-white/40 mt-3 text-sm tracking-wider">Generating your skill dashboard</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto w-full pb-20"
        >
            {onBack && (
                <button onClick={onBack} className="text-neon border border-neon font-bold mb-8 flex items-center gap-2 bg-black/40 px-4 py-2 text-xs tracking-widest hover:bg-neon hover:text-black transition-colors uppercase">
                    ← Back
                </button>
            )}

            {/* Header Score Card */}
            <div className="bg-black/60 backdrop-blur-2xl border border-white/20 p-8 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-neon/5 rounded-full blur-3xl -z-10 translate-x-20 -translate-y-20"></div>
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative">
                        <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#scoreGrad)" strokeWidth="8"
                                strokeDasharray={`${(analytics?.overall_score || 0) * 3.27} 327`}
                                strokeLinecap="round" />
                            <defs>
                                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#ff5500" />
                                    <stop offset="100%" stopColor="#ff8800" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <span className={`text-3xl font-pixel ${getScoreColor(analytics?.overall_score || 0)}`}>{analytics?.overall_score || 0}</span>
                                <span className="text-white/30 text-xs block tracking-widest">SCORE</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-xl font-pixel text-white uppercase tracking-wider mb-3">Performance Dashboard</h2>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            {skills.map(s => (
                                <span key={s} className="bg-white/5 text-white/60 px-3 py-1.5 border border-white/10 text-[10px] tracking-wider uppercase font-bold">{s}</span>
                            ))}
                        </div>
                    </div>
                    {cheatingScore !== undefined && cheatingScore !== null && (
                        <div className="text-center">
                            <div className={`text-xs font-bold tracking-widest uppercase mb-1 ${cheatingScore > 50 ? 'text-rose-400' : cheatingScore > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {cheatingScore > 50 ? 'HIGH RISK' : cheatingScore > 20 ? 'MEDIUM' : 'CLEAN'}
                            </div>
                            <div className="text-white/30 text-[10px] tracking-widest uppercase flex items-center gap-1">
                                <ShieldCheck size={12} /> Integrity
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-black/40 border border-white/10 p-1">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold tracking-widest uppercase transition-all ${activeTab === tab.id ? 'bg-neon text-black' : 'text-white/50 hover:text-white'}`}
                        >
                            <Icon size={14} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {/* Skill Scores */}
                        <div className="bg-black/60 backdrop-blur-2xl border border-white/20 p-6 mb-6">
                            <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-neon mb-6 flex items-center gap-2">
                                <BarChart3 size={14} /> Skill Breakdown
                            </h3>
                            <div className="space-y-4">
                                {Object.entries(analytics?.skill_scores || {}).map(([skill, score]) => (
                                    <div key={skill}>
                                        <div className="flex justify-between mb-1.5">
                                            <span className="text-white/70 text-xs font-bold uppercase tracking-wider">{skill}</span>
                                            <span className={`text-xs font-bold ${getScoreColor(score)}`}>{score}%</span>
                                        </div>
                                        <div className="h-2 bg-white/10 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${score}%` }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                className={`h-full ${getScoreBarColor(score)}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-black/60 backdrop-blur-2xl border border-emerald-500/20 p-6">
                                <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-emerald-400 mb-4 flex items-center gap-2">
                                    <TrendingUp size={14} /> Strengths
                                </h3>
                                <ul className="space-y-2">
                                    {(analytics?.strengths || []).map((s, i) => (
                                        <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                                            <span className="text-emerald-400 mt-0.5">▸</span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-black/60 backdrop-blur-2xl border border-amber-500/20 p-6">
                                <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-amber-400 mb-4 flex items-center gap-2">
                                    <TrendingDown size={14} /> Areas to Improve
                                </h3>
                                <ul className="space-y-2">
                                    {(analytics?.weaknesses || []).map((w, i) => (
                                        <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                                            <span className="text-amber-400 mt-0.5">▸</span> {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'courses' && (
                    <motion.div key="courses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div className="bg-black/60 backdrop-blur-2xl border border-white/20 p-6">
                            <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-neon mb-6 flex items-center gap-2">
                                <BookOpen size={14} /> Recommended Courses
                            </h3>
                            {courses.length === 0 ? (
                                <p className="text-white/40 text-center py-8">No course recommendations available.</p>
                            ) : (
                                <div className="space-y-3">
                                    {courses.map((course, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                            key={i}
                                            className="bg-white/5 border border-white/10 p-4 hover:border-neon/30 transition-all group"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[9px] bg-neon/10 text-neon px-2 py-0.5 border border-neon/20 uppercase tracking-widest font-bold">{course.skill}</span>
                                                        <span className="text-[9px] bg-white/5 text-white/40 px-2 py-0.5 border border-white/10 uppercase tracking-widest font-bold">{course.difficulty}</span>
                                                    </div>
                                                    <h4 className="text-white font-bold text-sm group-hover:text-neon transition-colors">{course.course_name}</h4>
                                                    <p className="text-white/40 text-xs mt-1">{course.description}</p>
                                                    <p className="text-white/30 text-[10px] mt-2 uppercase tracking-wider">{course.platform}</p>
                                                </div>
                                                {course.url_hint && (
                                                    <a href={course.url_hint} target="_blank" rel="noopener noreferrer"
                                                        className="text-neon hover:text-white border border-neon/30 p-2 hover:bg-neon hover:border-neon transition-all flex-shrink-0">
                                                        <ExternalLink size={16} />
                                                    </a>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'ats' && (
                    <motion.div key="ats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {atsData ? (
                            <>
                                {/* ATS Score Overview */}
                                <div className="bg-black/60 backdrop-blur-2xl border border-white/20 p-6 mb-6">
                                    <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-neon mb-6 flex items-center gap-2">
                                        <FileText size={14} /> ATS Compatibility Score
                                    </h3>
                                    <div className="flex items-center gap-8 mb-6">
                                        <div className="text-center">
                                            <span className={`text-5xl font-pixel ${getScoreColor(atsData.ats_score)}`}>{atsData.ats_score}</span>
                                            <span className="text-white/30 text-[10px] block tracking-widest uppercase mt-1">ATS SCORE</span>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-white/50 text-xs uppercase tracking-wider">Keywords</span>
                                                    <span className={`text-xs font-bold ${getScoreColor(atsData.ats_score)}`}>
                                                        {atsData.keyword_matches?.length || 0} matched
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-white/10">
                                                    <div className={`h-full ${getScoreBarColor(atsData.ats_score)}`}
                                                        style={{ width: `${Math.min(100, (atsData.keyword_matches?.length || 0) * 10)}%` }} />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-white/50 text-xs uppercase tracking-wider">Formatting</span>
                                                    <span className={`text-xs font-bold ${getScoreColor(atsData.formatting_score || 0)}`}>
                                                        {atsData.formatting_score || 0}%
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-white/10">
                                                    <div className={`h-full ${getScoreBarColor(atsData.formatting_score || 0)}`}
                                                        style={{ width: `${atsData.formatting_score || 0}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Missing Keywords */}
                                    {atsData.missing_keywords?.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="text-[10px] text-amber-400 font-bold tracking-widest uppercase mb-2 flex items-center gap-1">
                                                <AlertTriangle size={12} /> Missing Keywords
                                            </h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {atsData.missing_keywords.map((kw, i) => (
                                                    <span key={i} className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 uppercase tracking-wider font-bold">{kw}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Tips */}
                                    {atsData.tips?.length > 0 && (
                                        <div className="mt-6 bg-neon/5 border border-neon/20 p-4">
                                            <h4 className="text-[10px] text-neon font-bold tracking-widest uppercase mb-3 flex items-center gap-1">
                                                <Sparkles size={12} /> AI Tips
                                            </h4>
                                            <ul className="space-y-2">
                                                {atsData.tips.map((tip, i) => (
                                                    <li key={i} className="text-white/70 text-xs flex items-start gap-2">
                                                        <span className="text-neon mt-0.5">▸</span> {tip}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Resume Suggestions */}
                                {suggestions.length > 0 && (
                                    <div className="bg-black/60 backdrop-blur-2xl border border-white/20 p-6">
                                        <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-neon mb-6 flex items-center gap-2">
                                            <Target size={14} /> Resume Improvement Suggestions
                                        </h3>
                                        <div className="space-y-3">
                                            {suggestions.map((sug, i) => (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    key={i}
                                                    className="bg-white/5 border border-white/10 p-4"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-white/80 text-xs font-bold uppercase tracking-wider">{sug.section}</span>
                                                        <span className={`text-[9px] px-2 py-0.5 border uppercase tracking-widest font-bold ${getPriorityColor(sug.priority)}`}>
                                                            {sug.priority}
                                                        </span>
                                                    </div>
                                                    <p className="text-white/40 text-xs mb-1">{sug.current_issue}</p>
                                                    <p className="text-white/70 text-sm">→ {sug.improvement}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-black/60 border border-white/20 p-12 text-center">
                                <FileText size={48} className="mx-auto text-white/20 mb-4" />
                                <p className="text-white/40 text-sm">Upload a resume to see ATS analysis</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
