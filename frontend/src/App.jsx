import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Sparkles, FileText, Target, CheckCircle, ChevronRight, Briefcase, ChevronLeft, Loader2, Star, ShieldCheck, BrainCircuit, XCircle, Award, Lightbulb, MapPin, BookOpen, Layers } from 'lucide-react';
import { Header } from './components/Header';
import { AIChatMentor } from './components/AIChatMentor';
import { InterviewSimulator } from './components/InterviewSimulator';
import { LeetcodeHub } from './components/LeetcodeHub';
import { LoginScreen } from './components/LoginScreen';
import { auth, signOut, onAuthStateChanged } from './firebase';

const API_BASE = "http://localhost:8000";

// Core static dictionary for english fallbacks
const defaultUIStrings = {
  onboardingTitle: "EMPOWERING YOUTH CAREERS",
  onboardingSub: "The PM Internship Scheme connects ambitious youth from across the nation with top 500 CSR companies.",
  locationLabel: "Coordinates", educationLabel: "Clearance Level", sectorLabel: "Sector Directive",
  noResume: "VISUAL SKILLS", noResumeSub: "Initialize Manual Grid",
  haveResume: "UPLOAD RESUME", haveResumeSub: "Launch Auto Scan", or: "OR",
  manualTitle: "COMPETENCY MATRIX", manualSub: "Select visual icons matching your operational skills.", findOpportunities: "FIND INTERNSHIPS",
  uploadTitle: "DOCUMENT UPLOAD", tapToBrowse: "TAP TO BROWSE", pdfOnly: "PDF PROTOCOL ONLY",
  goBack: "RETURN", analyzing: "SCANNING...", extracting: "AI EXTRACTING...",
  startOver: "SYSTEM REBOOT", skillsVerified: "PROFILE VERIFIED", topJobMatches: "TOP DIRECTIVES", applyNow: "EXECUTE APPLICATION", aiInterview: "SIMULATE AI INTERVIEW", getTips: "REQUEST TACTICS",
  quizTitle: "SKILL VERIFICATION", quizSub: "Answer 5 technical questions to unlock secure matching protocols.", generatingJobs: "CALCULATING VECTORS...", finishQuizMsg: "VERIFICATION COMPLETE!", nextQuestion: "PROCEED", finishQuiz: "REVEAL DIRECTIVES", noMatch: "NO EXACT MATCHES IN DATABASE."
};

function App() {
  const [screen, setScreen] = useState("onboarding");
  const [language, setLanguage] = useState("English");
  
  // Auth State
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  React.useEffect(() => {
      const unsub = onAuthStateChanged(auth, (u) => {
          setUser(u);
          setCheckingAuth(false);
      });
      return () => unsub();
  }, []);

  const handleLogout = () => signOut(auth);

  // Localization dictionary
  const [ui, setUi] = useState(defaultUIStrings);
  const [translating, setTranslating] = useState(false);

  // User States
  const [skills, setSkills] = useState([]);
  const [profileDict, setProfileDict] = useState({ location: "Amaravati", education: "10th Pass", preferred_sector: "Any" });
  const [quizData, setQuizData] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Job Tips State
  const [tipsLoading, setTipsLoading] = useState(null); // stores Job ID currently loading tips
  const [jobTips, setJobTips] = useState({}); // stores { jobId: ["tip1", "tip2"] }

  // Interview Simulator State
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState([]);

  // Default target for Leetcode
  const targetCompany = jobs?.length > 0 ? jobs[0].company : "Tech";

  const navTo = (s) => {
    window.scrollTo(0,0);
    setScreen(s);
  };

  // 1. Localization Layer
  const selectLanguage = async (l) => {
    setLanguage(l);
    if (l === "English") {
      setUi(defaultUIStrings);
      return;
    }
    
    setTranslating(true);
    try {
      const res = await axios.post(`${API_BASE}/translate`, {
        target_language: l,
        payload: defaultUIStrings
      });
      setUi(res.data.translated_payload || defaultUIStrings);
    } catch (e) {
      alert("Translation server offline. Using English.");
    }
    setTranslating(false);
  };

  // 2. Profile Extraction
  const handleManualSubmit = async (selectedSkills) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/manual-profile`, {
        education: profileDict.education, 
        location: profileDict.location, 
        preferred_sector: profileDict.preferred_sector, 
        manual_skills: selectedSkills
      });
      setSkills(res.data.verified_skills || selectedSkills);
      setQuizData(res.data.assessment_quiz || []);
      setProfileDict(res.data.profile_dict);
      navTo("quiz");
    } catch (e) {
      alert("Backend not reachable. Ensure FastAPI is running!");
    }
    setLoading(false);
  };

  const handleFileUpload = async (file) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API_BASE}/analyze-resume`, formData);
      setSkills(res.data.extracted_skills || []);
      setQuizData(res.data.assessment_quiz || []);
      // Maintain onboarding dict + extracted data
      setProfileDict(prev => ({ ...prev, ...res.data.profile_dict }));
      navTo("quiz");
    } catch (e) {
      // Graceful fallback is now handled in backend, so if this triggers it's a real network issue
      alert("Network error. Is the backend running?");
    }
    setLoading(false);
  };

  // 3. Post-Quiz Job Matching (TF-IDF)
  const fetchRecommendedJobs = async () => {
    setLoading(true);
    try {
      const payload = {
        skills: skills,
        location: profileDict?.location || "India",
        education: profileDict?.education || "10th Pass",
        preferred_sector: profileDict?.preferred_sector || "Any",
        target_language: language
      };
      const res = await axios.post(`${API_BASE}/recommended-jobs`, payload);
      setJobs(res.data.top_matches || []);
      navTo("results");
    } catch(e) {
      alert("Error finding recommended jobs.");
    }
    setLoading(false);
  };

  // 4. Mentor Tips for specific job
  const fetchJobTips = async (job) => {
    setTipsLoading(job.id);
    try {
      const res = await axios.post(`${API_BASE}/job-tips`, {
        title: job.title,
        company: job.company,
        language: language
      });
      setJobTips(prev => ({ ...prev, [job.id]: res.data.tips }));
    } catch(e) {
      console.error(e);
      setJobTips(prev => ({ ...prev, [job.id]: ["Failed to load tips."] }));
    }
    setTipsLoading(null);
  };

  // 5. Job Specific Interview Prep
  const startInterview = async (job) => {
    setInterviewLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/interview-prep`, {
        job_title: job.title,
        company: job.company,
        skills: skills
      });
      setInterviewQuestions(res.data.questions);
      setInterviewStarted(true);
    } catch (e) {
      alert("Failed to pull interview questions.");
    }
    setInterviewLoading(false);
  };

  const pageTransition = { 
      initial: { opacity: 0, x: 200, filter: "blur(10px)" }, 
      animate: { opacity: 1, x: 0, filter: "blur(0px)" }, 
      exit: { opacity: 0, x: -200, filter: "blur(10px)" }, 
      transition: { duration: 0.5, ease: "easeInOut" } 
  };

  // --- Screens ---
  const OnboardingScreen = () => {
    const [loc, setLoc] = useState(profileDict.location); const [edu, setEdu] = useState(profileDict.education); const [sec, setSec] = useState(profileDict.preferred_sector);
    const handleContinue = (dest) => { setProfileDict({ location: loc, education: edu, preferred_sector: sec }); navTo(dest); };
    return (
      <motion.div {...pageTransition} className="w-full flex-grow grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mt-12 mb-12 relative pb-20">
        <div className="hidden lg:block w-full h-full"></div>
        <div className="flex flex-col gap-6 lg:gap-8 max-w-2xl float-subtle">
            <p className="text-neon font-bold tracking-[0.3em] text-xs uppercase flex items-center gap-4"><span className="w-12 h-px bg-neon inline-block"></span>GOVERNMENT OF INDIA</p>
            <h1 className="font-pixel text-4xl lg:text-[42px] leading-[1.4] text-white drop-shadow-2xl uppercase">{ui.onboardingTitle}</h1>
            <p className="text-white/60 text-lg leading-relaxed font-sans max-w-lg border-l-2 border-white/20 pl-6">{ui.onboardingSub}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2 font-sans">
                <div><label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-2"><MapPin size={12}/> {ui.locationLabel}</label><input type="text" value={loc} onChange={(e)=>setLoc(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-none px-4 py-3 text-white focus:border-neon outline-none" /></div>
                <div><label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-2"><BookOpen size={12}/> {ui.educationLabel}</label><select value={edu} onChange={(e)=>setEdu(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-none px-4 py-3 text-white focus:border-neon outline-none appearance-none"><option className="bg-black">10th Pass</option><option className="bg-black">12th Pass</option><option className="bg-black">Diploma</option><option className="bg-black">Graduate</option></select></div>
                <div><label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-2"><Layers size={12}/> {ui.sectorLabel}</label><select value={sec} onChange={(e)=>setSec(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-none px-4 py-3 text-white focus:border-neon outline-none appearance-none"><option className="bg-black">Any</option><option className="bg-black">IT Support</option><option className="bg-black">Software Engineering</option><option className="bg-black">Logistics</option><option className="bg-black">Retail</option></select></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <button onClick={() => handleContinue("manual")} className="bg-neon text-black border-2 border-neon font-bold font-sans tracking-widest uppercase px-6 py-4 hover:bg-transparent hover:text-neon transition-all btn-glow"><Target size={18} className="inline mr-2 -mt-1"/>{ui.noResume}</button>
                <button onClick={() => handleContinue("upload")} className="bg-black/50 backdrop-blur-md font-sans text-white border-2 border-white/30 font-bold tracking-widest uppercase px-6 py-4 hover:border-white transition-all"><FileText size={18} className="inline mr-2 -mt-1"/>{ui.haveResume}</button>
            </div>
        </div>
      </motion.div>
    );
  }

  const ManualScreen = () => {
    const [selected, setSelected] = useState([]);
    const toggle = (skill) => selected.includes(skill) ? setSelected(selected.filter(s => s !== skill)) : setSelected([...selected, skill]);
    const map = [
      { id: "farming", label: "Farming", icon: "🚜" }, { id: "mechanic", label: "Mechanic", icon: "🔧" },
      { id: "typing", label: "Data Entry", icon: "⌨️" }, { id: "packaging", label: "Packaging", icon: "📦" },
      { id: "python", label: "Python", icon: "🐍" }, { id: "customer service", label: "Support", icon: "🎧" }
    ];
    return (
      <motion.div {...pageTransition} className="max-w-3xl mx-auto w-full pb-20 pt-10 text-white">
        <button onClick={() => navTo("onboarding")} className="text-neon border border-neon font-bold mb-10 flex items-center gap-2 bg-black/40 px-4 py-2 rounded-none text-xs tracking-widest hover:bg-neon hover:text-black transition-colors uppercase"><ChevronLeft size={16} /> {ui.goBack}</button>
        <div className="text-center mb-12"><h2 className="text-3xl font-pixel mb-4 drop-shadow-md text-white">{ui.manualTitle}</h2><p className="text-white/50 tracking-widest font-sans uppercase text-sm">{ui.manualSub}</p></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {map.map(s => (
            <motion.div key={s.id} whileTap={{ scale: 0.95 }} onClick={() => toggle(s.id)} className={`p-10 border text-center transition-all duration-300 cursor-pointer ${selected.includes(s.id) ? 'border-neon bg-neon/10 scale-105 shadow-[0_0_15px_rgba(255,85,0,0.3)]' : 'border-white/10 bg-black/40 hover:bg-black/60'}`}>
              <span className={`text-5xl block mb-6 transition-transform ${selected.includes(s.id) ? 'scale-110 drop-shadow-lg grayscale-0' : 'grayscale opacity-60'}`}>{s.icon}</span>
              <span className={`font-pixel text-[10px] uppercase leading-relaxed ${selected.includes(s.id) ? 'text-neon' : 'text-white/60'}`}>{s.label}</span>
            </motion.div>
          ))}
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleManualSubmit(selected)} disabled={loading || selected.length === 0} className={`w-full max-w-md mx-auto font-sans uppercase font-black text-sm tracking-widest py-5 mt-16 flex items-center justify-center border-2 transition-all ${loading ? 'bg-white/10 text-white/30 border-white/10' : selected.length === 0 ? 'bg-black/50 border-white/10 text-white/30 cursor-not-allowed' : 'bg-neon border-neon text-black btn-glow hover:bg-transparent hover:text-neon'}`}>
          {loading ? <span className="flex items-center gap-2 text-white"><Loader2 className="animate-spin text-neon" /> {ui.analyzing}</span> : <span>{ui.findOpportunities}</span>}
        </motion.button>
      </motion.div>
    );
  };

  const UploadScreen = () => {
    const fileRef = useRef(null);
    return (
      <motion.div {...pageTransition} className="max-w-2xl mx-auto w-full pt-10 text-white">
        <button onClick={() => navTo("onboarding")} className="text-neon border border-neon font-bold mb-10 flex items-center gap-2 bg-black/40 px-4 py-2 rounded-none text-xs tracking-widest hover:bg-neon hover:text-black transition-colors uppercase"><ChevronLeft size={16} /> {ui.goBack}</button>
        <div className="text-center mb-12"><h2 className="text-3xl font-pixel mb-4">{ui.uploadTitle}</h2><p className="text-white/50 tracking-widest font-sans uppercase text-sm">System ready for encrypted document ingestion.</p></div>
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-none p-16 text-center mb-8 relative overflow-hidden group shadow-2xl">
          <div className="absolute inset-0 border-2 border-neon opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <FileText size={72} className="mx-auto mb-10 text-white/30 group-hover:text-neon transition-colors" />
          <div className="relative z-10 flex flex-col items-center">
            <span className="bg-transparent border border-neon text-neon font-sans uppercase font-black text-sm tracking-[0.2em] px-10 py-4 cursor-pointer hover:bg-neon hover:text-black transition-colors btn-glow">{ui.tapToBrowse}</span>
            <p className="text-xs text-white/30 font-bold mt-8 uppercase tracking-[0.3em]">{ui.pdfOnly}</p>
            <input type="file" ref={fileRef} accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => { if(e.target.files[0]) handleFileUpload(e.target.files[0]); }} />
          </div>
        </div>
        {loading && (<div className="mt-10 flex justify-center"><div className="bg-black/80 border border-neon text-neon font-pixel text-xs py-4 px-8 flex items-center gap-4"><Loader2 className="animate-spin" size={16}/> {ui.extracting}</div></div>)}
      </motion.div>
    )
  };

  const QuizScreen = () => {
    const [currentIdx, setCurrentIdx] = useState(0); const [selected, setSelected] = useState(null); const [score, setScore] = useState(0); const [finished, setFinished] = useState(false);
    if (loading) return (<motion.div {...pageTransition} className="max-w-xl mx-auto text-center py-20 flex flex-col items-center"><Loader2 size={64} className="animate-spin text-neon mb-10" /><h2 className="text-3xl font-pixel text-white">{ui.generatingJobs}</h2></motion.div>);
    if (!quizData || quizData.length === 0) return (<motion.div {...pageTransition} className="max-w-xl mx-auto text-center py-20"><button onClick={fetchRecommendedJobs} className="bg-neon text-black font-black text-lg py-4 px-10 border border-neon btn-glow uppercase">View Opportunities</button></motion.div>);
    const currentQ = quizData[currentIdx];
    const handleSelect = (opt) => { if (selected) return; setSelected(opt); if (opt === currentQ.a) setScore(s => s + 1); };
    const nextQ = () => { if (currentIdx + 1 < quizData.length) { setCurrentIdx(c => c + 1); setSelected(null); } else setFinished(true); };
    return (
      <motion.div {...pageTransition} className="max-w-3xl mx-auto w-full pt-10 pb-20">
        <div className="bg-black/60 backdrop-blur-2xl border border-white/20 shadow-[0_0_30px_rgba(255,85,0,0.1)] overflow-hidden">
             <div className="border-b border-white/10 p-10 relative overflow-hidden bg-white/5 text-white">
                <h2 className="text-[10px] font-bold tracking-[0.4em] uppercase text-neon mb-4"><BrainCircuit className="inline mb-1 mr-2" size={14}/> {ui.quizTitle}</h2>
                <h3 className="text-2xl font-sans font-light max-w-lg leading-relaxed">{ui.quizSub}</h3>
            </div>
             <div className="h-1 bg-white/10 w-full relative"><motion.div initial={{ width: 0 }} animate={{ width: `${((currentIdx + (finished ? 1 : 0)) / quizData.length) * 100}%` }} className="absolute top-0 left-0 h-full bg-neon shadow-[0_0_10px_rgba(255,85,0,0.8)]"/></div>
            <div className="p-10 text-white font-sans">
                {finished ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
                        <Award size={64} className="mx-auto text-neon mb-8" />
                        <h3 className="text-2xl font-pixel tracking-widest uppercase mb-4 leading-tight">{ui.finishQuizMsg}</h3>
                        <p className="text-xl text-white/50 font-black mb-10 tracking-[0.3em]">Score: {score} / {quizData.length}</p>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fetchRecommendedJobs} className="w-full max-w-md bg-neon text-black font-black text-sm tracking-[0.2em] py-5 uppercase btn-glow border border-neon">{ui.finishQuiz}</motion.button>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <p className="text-2xl font-light mb-10 leading-relaxed"><span className="text-neon font-pixel text-sm mr-2">{currentIdx + 1}.</span> {currentQ.q}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                {currentQ.options.map((opt, i) => {
                                    let stateClass = "border-white/10 bg-black/40 hover:border-white/30 text-white/70"; let icon = null;
                                    if (selected) { if (opt === currentQ.a) { stateClass = "border-green-500 bg-green-500/10 text-green-400"; icon = <CheckCircle className="text-green-500" size={24} />; } else if (opt === selected) { stateClass = "border-red-500 bg-red-500/10 text-red-400"; icon = <XCircle className="text-red-500" size={24} />; } else { stateClass = "border-white/5 bg-black/20 opacity-50"; } }
                                    return (<button key={i} onClick={() => handleSelect(opt)} disabled={!!selected} className={`w-full p-6 text-sm rounded-none border transition-all flex justify-between items-center ${stateClass}`}><span>{opt}</span>{icon}</button>);
                                })}
                            </div>
                            {selected && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end mt-10"><button onClick={nextQ} className="bg-transparent text-white border-2 border-white/30 font-bold uppercase tracking-[0.2em] text-xs py-4 px-8 hover:border-white hover:bg-white hover:text-black transition-colors">{ui.nextQuestion} <ChevronRight className="inline -mt-0.5" size={16} /></button></motion.div>)}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
      </motion.div>
    )
  }

  const ResultsScreen = () => (
    <motion.div {...pageTransition} className="max-w-6xl mx-auto w-full px-4 lg:px-0 grid grid-cols-1 lg:grid-cols-12 gap-10 pb-20">
      <div className="lg:col-span-8 space-y-8">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <button onClick={() => navTo("onboarding")} className="text-neon font-pixel text-[10px] flex items-center gap-2 hover:text-white transition-colors uppercase"><ChevronLeft size={16} /> {ui.startOver}</button>
            <div className="bg-green-500/10 text-green-400 px-4 py-2 text-[10px] font-pixel tracking-widest uppercase border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)] flex items-center gap-2"><ShieldCheck size={14} /> {ui.skillsVerified}</div>
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-pixel mb-8 text-white flex items-center gap-4 uppercase"><Star className="text-neon" size={24} /> {ui.topJobMatches}</h2>
          <div className="space-y-6 text-white font-sans">
            {jobs.length === 0 ? <div className="p-12 border border-white/10 text-center font-pixel text-xs text-white/40 tracking-widest uppercase">{ui.noMatch}</div> : jobs.map((job, idx) => (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={job.id} className="bg-black/40 backdrop-blur-xl border border-white/20 p-8 relative overflow-hidden hover:border-white/40">
                  <div className="absolute top-0 right-0 bg-white/5 text-white/50 tracking-[0.3em] font-black uppercase px-6 py-3 text-[10px] border-l border-b border-white/10">MATCH: {job.match_score}%</div>
                  <h3 className="text-xl font-pixel mt-4 uppercase text-white pr-24 leading-relaxed">{job.title}</h3>
                  <p className="text-neon font-bold tracking-widest uppercase mt-4 text-xs flex items-center gap-2"><Briefcase size={16} /> {job.company} <span className="text-white/30">|</span> {job.location}</p>
                  <p className="text-sm text-white/70 mt-4 leading-relaxed font-light border-l border-white/20 pl-4">{job.description}</p>
                  <AnimatePresence>{jobTips[job.id] && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-8 bg-neon/10 border border-neon/30 p-6"><h4 className="font-pixel text-[10px] text-neon uppercase mb-4 tracking-widest"><Lightbulb size={14} className="inline"/> SYSTEM ADVICE</h4><ul className="list-disc pl-5 space-y-3 text-white/80 text-xs">{jobTips[job.id].map((tip, i) => <li key={i}>{tip}</li>)}</ul></motion.div>)}</AnimatePresence>
                  <div className="mt-8 flex flex-col md:flex-row gap-4">
                    <a href={job.apply_url || "#"} target="_blank" className="flex-1 text-center bg-neon text-black tracking-[0.2em] font-black uppercase py-4 border border-neon btn-glow transition-colors">{ui.applyNow}</a>
                    <button onClick={() => fetchJobTips(job)} disabled={tipsLoading === job.id} className="px-6 bg-transparent text-white font-bold tracking-[0.2em] uppercase py-4 border border-white/30 flex items-center justify-center gap-3 transition hover:border-white">{tipsLoading === job.id ? <Loader2 className="animate-spin" size={18}/> : <><Lightbulb size={18}/> {ui.getTips}</>}</button>
                    <button onClick={() => startInterview(job)} disabled={interviewLoading} className="px-6 bg-transparent text-white font-bold tracking-[0.2em] uppercase py-4 border border-white/30 flex items-center justify-center gap-3 transition hover:border-white">{interviewLoading ? <Loader2 className="animate-spin" size={18}/> : <><Target size={18}/> {ui.aiInterview}</>}</button>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      </div>
      <div className="lg:col-span-4 space-y-8 pt-10 lg:pt-0">
         <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-8 shadow-2xl">
             <h3 className="font-pixel text-[10px] text-white/50 tracking-[0.3em] uppercase mb-6 flex items-center gap-3"><ShieldCheck className="text-neon" size={16}/> VERIFIED SKILL VECTORS</h3>
             <div className="flex flex-wrap gap-2">{skills.map(s => (<span key={s} className="bg-white/5 text-white/80 px-4 py-2 border border-white/10 font-sans font-medium text-xs tracking-wider uppercase drop-shadow-sm">{s}</span>))}</div>
         </div>
         <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-8 shadow-2xl"><h3 className="font-pixel text-[10px] text-white/50 tracking-[0.3em] uppercase mb-6">TRAINING PATH</h3><LeetcodeHub company={targetCompany} skills={skills} /></div>
      </div>
    </motion.div>
  );

  if (checkingAuth) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-neon w-12 h-12" /></div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen flex flex-col relative w-full overflow-hidden bg-black selection:bg-neon selection:text-black">
      <video autoPlay loop muted playsInline className="fixed top-0 left-0 w-full h-full object-cover z-0 opacity-40 mix-blend-screen pointer-events-none text-black"><source src="https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-connection-background-3094-large.mp4" type="video/mp4"/></video>
      <div className="fixed top-0 left-0 w-full h-full bg-black/70 z-0 pointer-events-none"></div>

      <div className="relative z-10 w-full min-h-screen flex flex-col overflow-y-auto overflow-x-hidden h-screen">
          <Header language={language} selectLanguage={selectLanguage} user={user} onLogout={handleLogout} />
          <main className="flex-1 w-full px-6 md:px-12 flex flex-col items-center pt-10">
            {translating && (<div className="fixed top-24 right-10 bg-black/80 text-neon px-6 py-3 border border-neon font-pixel text-[10px] tracking-widest uppercase shadow-[0_0_15px_rgba(255,85,0,0.3)] z-50 flex items-center gap-3"><Loader2 className="animate-spin" size={12}/> DECODING LOCALE...</div>)}
            <AnimatePresence mode="wait">
              {screen === "onboarding" && <OnboardingScreen key="onboarding" />}
              {screen === "manual" && <ManualScreen key="manual" />}
              {screen === "upload" && <UploadScreen key="upload" />}
              {screen === "quiz" && <QuizScreen key="quiz" />}
              {screen === "results" && <ResultsScreen key="results" />}
            </AnimatePresence>
          </main>
      </div>
      {screen === "results" && <div className="fixed bottom-0 right-0 z-50"><AIChatMentor skills={skills} language={language} /></div>}
      {interviewStarted && <InterviewSimulator questions={interviewQuestions} onClose={() => setInterviewStarted(false)} />}
    </div>
  );
}

export default App;
