import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FileText, Target, CheckCircle, ChevronRight, Briefcase, ChevronLeft, Loader2, Star, ShieldCheck, BrainCircuit, XCircle, Award, Lightbulb, MapPin, BookOpen, Layers } from 'lucide-react';
import { Header } from './components/Header';
import { AIChatMentor } from './components/AIChatMentor';
import { InterviewSimulator } from './components/InterviewSimulator';
import { LeetcodeHub } from './components/LeetcodeHub';
import { LoginScreen } from './components/LoginScreen';
import { auth, signOut, onAuthStateChanged } from './firebase';

const API_BASE = "http://localhost:8000";

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
  
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  React.useEffect(() => {
      const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setCheckingAuth(false); });
      return () => unsub();
  }, []);

  const handleLogout = () => signOut(auth);

  const [ui, setUi] = useState(defaultUIStrings);
  const [translating, setTranslating] = useState(false);

  const [skills, setSkills] = useState([]);
  const [profileDict, setProfileDict] = useState({ location: "Amaravati", education: "10th Pass", preferred_sector: "Any" });
  const [quizData, setQuizData] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [tipsLoading, setTipsLoading] = useState(null); 
  const [jobTips, setJobTips] = useState({}); 

  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState([]);

  const targetCompany = jobs?.length > 0 ? jobs[0].company : "Tech";

  const navTo = (s) => { window.scrollTo(0,0); setScreen(s); };

  const selectLanguage = async (l) => {
    setLanguage(l);
    if (l === "English") return setUi(defaultUIStrings);
    setTranslating(true);
    try {
      const res = await axios.post(`${API_BASE}/translate`, { target_language: l, payload: defaultUIStrings });
      setUi(res.data.translated_payload || defaultUIStrings);
    } catch { alert("Translation server offline."); }
    setTranslating(false);
  };

  const handleManualSubmit = async (selectedSkills) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/manual-profile`, { ...profileDict, manual_skills: selectedSkills });
      setSkills(res.data.verified_skills || selectedSkills);
      setQuizData(res.data.assessment_quiz || []);
      setProfileDict(res.data.profile_dict);
      navTo("quiz");
    } catch { alert("Backend not reachable."); }
    setLoading(false);
  };

  const handleFileUpload = async (file) => {
    setLoading(true);
    const formData = new FormData(); formData.append("file", file);
    try {
      const res = await axios.post(`${API_BASE}/analyze-resume`, formData);
      setSkills(res.data.extracted_skills || []);
      setQuizData(res.data.assessment_quiz || []);
      setProfileDict(prev => ({ ...prev, ...res.data.profile_dict }));
      navTo("quiz");
    } catch { alert("Network error."); }
    setLoading(false);
  };

  const fetchRecommendedJobs = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/recommended-jobs`, { ...profileDict, skills, target_language: language });
      setJobs(res.data.top_matches || []);
      navTo("results");
    } catch { alert("Error finding jobs."); }
    setLoading(false);
  };

  const fetchJobTips = async (job) => {
    setTipsLoading(job.id);
    try {
      const res = await axios.post(`${API_BASE}/job-tips`, { title: job.title, company: job.company, language });
      setJobTips(prev => ({ ...prev, [job.id]: res.data.tips }));
    } catch { setJobTips(prev => ({ ...prev, [job.id]: ["Failed to load tips."] })); }
    setTipsLoading(null);
  };

  const startInterview = async (job) => {
    setInterviewLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/interview-prep`, { job_title: job.title, company: job.company, skills });
      setInterviewQuestions(res.data.questions);
      setInterviewStarted(true);
    } catch { alert("Failed testing."); }
    setInterviewLoading(false);
  };

  const pt = { initial: { opacity: 0, x: 100, filter: "blur(5px)" }, animate: { opacity: 1, x: 0, filter: "blur(0px)" }, exit: { opacity: 0, x: -100, filter: "blur(5px)" }, transition: { duration: 0.3, ease: "easeInOut" } };

  const OnboardingScreen = () => {
    const [loc, setLoc] = useState(profileDict.location); const [edu, setEdu] = useState(profileDict.education); const [sec, setSec] = useState(profileDict.preferred_sector);
    const handleContinue = (dest) => { setProfileDict({ location: loc, education: edu, preferred_sector: sec }); navTo(dest); };
    return (
      <motion.div {...pt} className="w-full pb-20 mt-4">
        <div className="flex flex-col gap-6 float-subtle">
            <h1 className="font-pixel text-2xl leading-[1.4] text-white drop-shadow-2xl uppercase">{ui.onboardingTitle}</h1>
            <p className="text-white/60 text-sm leading-relaxed font-sans border-l-2 border-white/20 pl-4">{ui.onboardingSub}</p>
            
            <div className="flex flex-col gap-3 mt-2 font-sans">
                <div><label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-2"><MapPin size={12}/> {ui.locationLabel}</label><input type="text" value={loc} onChange={(e)=>setLoc(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-none px-4 py-3 text-white focus:border-neon outline-none" /></div>
                <div><label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-2"><BookOpen size={12}/> {ui.educationLabel}</label><select value={edu} onChange={(e)=>setEdu(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-none px-4 py-3 text-white focus:border-neon outline-none appearance-none"><option className="bg-black">10th Pass</option><option className="bg-black">12th Pass</option><option className="bg-black">Diploma</option><option className="bg-black">Graduate</option></select></div>
                <div><label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-2"><Layers size={12}/> {ui.sectorLabel}</label><select value={sec} onChange={(e)=>setSec(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-none px-4 py-3 text-white focus:border-neon outline-none appearance-none"><option className="bg-black">Any</option><option className="bg-black">IT Support</option><option className="bg-black">Software Engineering</option><option className="bg-black">Logistics</option><option className="bg-black">Retail</option></select></div>
            </div>
            
            <div className="flex flex-col gap-4 mt-4">
                <button onClick={() => handleContinue("manual")} className="bg-neon text-black border border-neon font-black font-sans tracking-[0.2em] uppercase p-4 hover:bg-transparent hover:text-neon transition-all btn-glow"><Target size={18} className="inline mr-2 -mt-1"/>{ui.noResume}</button>
                <button onClick={() => handleContinue("upload")} className="bg-black/50 backdrop-blur-md font-sans text-white border border-white/30 font-black tracking-[0.2em] uppercase p-4 hover:border-white transition-all"><FileText size={18} className="inline mr-2 -mt-1"/>{ui.haveResume}</button>
            </div>
        </div>
      </motion.div>
    );
  }

  const ManualScreen = () => {
    const [selected, setSelected] = useState([]);
    const toggle = (id) => selected.includes(id) ? setSelected(selected.filter(s => s !== id)) : setSelected([...selected, id]);
    const map = [
      { id: "farming", label: "Farming", icon: "🚜" }, { id: "mechanic", label: "Mechanic", icon: "🔧" },
      { id: "typing", label: "Data Entry", icon: "⌨️" }, { id: "packaging", label: "Packaging", icon: "📦" },
      { id: "python", label: "Python", icon: "🐍" }, { id: "customer service", label: "Support", icon: "🎧" }
    ];
    return (
      <motion.div {...pt} className="w-full text-white pt-4 pb-20">
        <button onClick={() => navTo("onboarding")} className="text-neon border border-neon font-bold mb-6 flex items-center gap-2 bg-black/40 px-4 py-2 rounded-none text-[10px] tracking-widest uppercase"><ChevronLeft size={16} /> {ui.goBack}</button>
        <div className="mb-6"><h2 className="text-xl font-pixel mb-3 drop-shadow-md text-white md:text-2xl pt-2">{ui.manualTitle}</h2><p className="text-white/50 tracking-widest font-sans uppercase text-xs">{ui.manualSub}</p></div>
        <div className="grid grid-cols-2 gap-4">
          {map.map(s => (
            <motion.div key={s.id} whileTap={{ scale: 0.95 }} onClick={() => toggle(s.id)} className={`p-6 border text-center transition-all duration-300 cursor-pointer ${selected.includes(s.id) ? 'border-neon bg-neon/10 scale-105 shadow-[0_0_15px_rgba(255,85,0,0.3)]' : 'border-white/10 bg-black/40 hover:bg-black/60'}`}>
              <span className={`text-4xl block mb-4 transition-transform ${selected.includes(s.id) ? 'scale-110 drop-shadow-lg grayscale-0' : 'grayscale opacity-60'}`}>{s.icon}</span>
              <span className={`font-pixel text-[8px] sm:text-[10px] uppercase leading-relaxed ${selected.includes(s.id) ? 'text-neon' : 'text-white/60'}`}>{s.label}</span>
            </motion.div>
          ))}
        </div>
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => handleManualSubmit(selected)} disabled={loading || selected.length === 0} className={`w-full font-sans uppercase font-black text-xs tracking-widest p-4 mt-8 flex items-center justify-center border-2 transition-all ${loading ? 'bg-white/10 text-white/30 border-white/10' : selected.length === 0 ? 'bg-black/50 border-white/10 text-white/30 cursor-not-allowed' : 'bg-neon border-neon text-black btn-glow'}`}>
          {loading ? <span className="flex items-center gap-2 text-white"><Loader2 className="animate-spin text-neon" size={16}/> {ui.analyzing}</span> : <span>{ui.findOpportunities}</span>}
        </motion.button>
      </motion.div>
    );
  };

  const UploadScreen = () => {
    const fileRef = useRef(null);
    return (
      <motion.div {...pt} className="w-full text-white pt-4">
        <button onClick={() => navTo("onboarding")} className="text-neon border border-neon font-bold mb-6 flex items-center gap-2 bg-black/40 px-4 py-2 rounded-none text-[10px] tracking-widest uppercase"><ChevronLeft size={16} /> {ui.goBack}</button>
        <div className="mb-6"><h2 className="text-xl font-pixel mb-3">{ui.uploadTitle}</h2><p className="text-white/50 tracking-widest font-sans uppercase text-xs">System ready for encrypted ingest.</p></div>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-none p-10 text-center mb-6 relative overflow-hidden group shadow-xl">
          <div className="absolute inset-0 border border-neon opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <FileText size={48} className="mx-auto mb-8 text-white/30 group-hover:text-neon transition-colors" />
          <div className="relative z-10 flex flex-col items-center">
            <span className="bg-transparent border border-neon text-neon font-sans uppercase font-black text-xs tracking-[0.2em] px-6 py-3 cursor-pointer btn-glow">{ui.tapToBrowse}</span>
            <p className="text-[10px] text-white/30 font-bold mt-6 uppercase tracking-[0.3em]">{ui.pdfOnly}</p>
            <input type="file" ref={fileRef} accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => { if(e.target.files[0]) handleFileUpload(e.target.files[0]); }} />
          </div>
        </div>
        {loading && (<div className="mt-8 flex justify-center"><div className="bg-black/80 border border-neon text-neon font-pixel text-[10px] py-4 px-6 flex items-center gap-3"><Loader2 className="animate-spin" size={14}/> {ui.extracting}</div></div>)}
      </motion.div>
    )
  };

  const QuizScreen = () => {
    const [currentIdx, setCurrentIdx] = useState(0); const [selected, setSelected] = useState(null); const [score, setScore] = useState(0); const [finished, setFinished] = useState(false);
    if (loading) return (<motion.div {...pt} className="w-full text-center py-20 flex flex-col items-center"><Loader2 size={48} className="animate-spin text-neon mb-6" /><h2 className="text-xl font-pixel text-white leading-relaxed">{ui.generatingJobs}</h2></motion.div>);
    if (!quizData || quizData.length === 0) return (<motion.div {...pt} className="w-full text-center py-20"><button onClick={fetchRecommendedJobs} className="bg-neon text-black font-black text-sm py-4 px-8 border border-neon btn-glow uppercase">View Opportunities</button></motion.div>);
    const currentQ = quizData[currentIdx];
    const handleSelect = (opt) => { if (selected) return; setSelected(opt); if (opt === currentQ.a) setScore(s => s + 1); };
    const nextQ = () => { if (currentIdx + 1 < quizData.length) { setCurrentIdx(c => c + 1); setSelected(null); } else setFinished(true); };
    return (
      <motion.div {...pt} className="w-full pt-4 pb-20">
        <div className="bg-black/60 backdrop-blur-xl border border-white/20 shadow-[0_0_20px_rgba(255,85,0,0.1)] overflow-hidden">
             <div className="border-b border-white/10 p-6 relative overflow-hidden bg-white/5 text-white">
                <h2 className="text-[8px] font-bold tracking-[0.4em] uppercase text-neon mb-3"><BrainCircuit className="inline mb-1 mr-2" size={12}/> {ui.quizTitle}</h2>
                <h3 className="text-lg font-sans font-light leading-relaxed">{ui.quizSub}</h3>
            </div>
             <div className="h-1 bg-white/10 w-full relative"><motion.div initial={{ width: 0 }} animate={{ width: `${((currentIdx + (finished ? 1 : 0)) / quizData.length) * 100}%` }} className="absolute top-0 left-0 h-full bg-neon shadow-[0_0_10px_rgba(255,85,0,0.8)]"/></div>
            <div className="p-6 text-white font-sans">
                {finished ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
                        <Award size={48} className="mx-auto text-neon mb-6" />
                        <h3 className="text-lg font-pixel tracking-widest uppercase mb-4 leading-tight">{ui.finishQuizMsg}</h3>
                        <p className="text-lg text-white/50 font-black mb-10 tracking-[0.3em]">Score: {score} / {quizData.length}</p>
                        <motion.button whileTap={{ scale: 0.98 }} onClick={fetchRecommendedJobs} className="w-full bg-neon text-black font-black text-xs tracking-[0.2em] py-4 uppercase btn-glow border border-neon">{ui.finishQuiz}</motion.button>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <p className="text-lg font-light mb-8 leading-relaxed"><span className="text-neon font-pixel text-[10px] mr-2 block mb-2">Q{currentIdx + 1}.</span> {currentQ.q}</p>
                            <div className="flex flex-col gap-3 text-left">
                                {currentQ.options.map((opt, i) => {
                                    let stateClass = "border-white/10 bg-black/40 text-white/70"; let icon = null;
                                    if (selected) { if (opt === currentQ.a) { stateClass = "border-green-500 bg-green-500/10 text-green-400"; icon = <CheckCircle className="text-green-500" size={20} />; } else if (opt === selected) { stateClass = "border-red-500 bg-red-500/10 text-red-400"; icon = <XCircle className="text-red-500" size={20} />; } else { stateClass = "border-white/5 bg-black/20 opacity-50"; } }
                                    return (<button key={i} onClick={() => handleSelect(opt)} disabled={!!selected} className={`w-full p-4 text-xs rounded-none border transition-all flex justify-between items-center ${stateClass}`}><span className="pr-2">{opt}</span>{icon}</button>);
                                })}
                            </div>
                            {selected && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end mt-8"><button onClick={nextQ} className="bg-transparent text-white border border-white/30 font-bold uppercase tracking-[0.2em] text-[10px] py-4 px-6 active:bg-white active:text-black transition-colors">{ui.nextQuestion} <ChevronRight className="inline -mt-0.5" size={14} /></button></motion.div>)}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
      </motion.div>
    )
  }

  const ResultsScreen = () => (
    <motion.div {...pt} className="w-full pb-20 pt-4">
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <button onClick={() => navTo("onboarding")} className="text-neon font-pixel text-[8px] flex items-center gap-2 uppercase"><ChevronLeft size={14} /> {ui.startOver}</button>
          <div className="bg-green-500/10 text-green-400 px-3 py-1.5 text-[8px] font-pixel tracking-widest uppercase border border-green-500/20 flex items-center gap-2"><ShieldCheck size={12} /> VERIFIED</div>
      </div>
      
      <h2 className="text-lg font-pixel mb-6 text-white flex items-center gap-3 uppercase leading-relaxed"><Star className="text-neon" size={20} /> {ui.topJobMatches}</h2>
      
      <div className="space-y-6 text-white font-sans">
        {jobs.length === 0 ? <div className="p-8 border border-white/10 text-center font-pixel text-[10px] text-white/40 tracking-widest uppercase">{ui.noMatch}</div> : jobs.map((job, idx) => (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={job.id} className="bg-black/40 backdrop-blur-md border border-white/20 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-white/5 text-white/50 tracking-[0.3em] font-black uppercase px-4 py-2 text-[8px] border-l border-b border-white/10">SCORE: {job.match_score}%</div>
              <h3 className="text-sm font-pixel mt-2 uppercase text-white pr-20 leading-[1.6] pt-1">{job.title}</h3>
              <p className="text-neon font-bold tracking-widest uppercase mt-4 text-[10px] flex items-center gap-2"><Briefcase size={14} /> {job.company}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1 mb-4 flex items-center gap-2"><MapPin size={10}/> {job.location}</p>
              
              <p className="text-xs text-white/70 leading-relaxed font-light border-l border-white/20 pl-3">{job.description}</p>
              
              <AnimatePresence>{jobTips[job.id] && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-6 bg-neon/10 border border-neon/30 p-4"><h4 className="font-pixel text-[8px] text-neon uppercase mb-3 tracking-widest"><Lightbulb size={12} className="inline"/> SYSTEM ADVICE</h4><ul className="list-disc pl-4 space-y-2 text-white/80 text-[10px] sm:text-xs">{jobTips[job.id].map((tip, i) => <li key={i}>{tip}</li>)}</ul></motion.div>)}</AnimatePresence>
              
              <div className="mt-6 flex flex-col gap-3">
                <a href={job.apply_url || "#"} target="_blank" className="text-center bg-neon text-black tracking-[0.2em] font-black uppercase py-4 border border-neon btn-glow text-xs">{ui.applyNow}</a>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => fetchJobTips(job)} disabled={tipsLoading === job.id} className="bg-transparent text-white font-bold tracking-[0.2em] uppercase py-3 border border-white/30 flex items-center justify-center gap-2 text-[10px]">{tipsLoading === job.id ? <Loader2 className="animate-spin" size={14}/> : <><Lightbulb size={14}/> TIPS</>}</button>
                    <button onClick={() => startInterview(job)} disabled={interviewLoading} className="bg-transparent text-white font-bold tracking-[0.2em] uppercase py-3 border border-white/30 flex items-center justify-center gap-2 text-[10px]">{interviewLoading ? <Loader2 className="animate-spin" size={14}/> : <><Target size={14}/> INTERVIEW</>}</button>
                </div>
              </div>
            </motion.div>
          ))}
      </div>
      
      <div className="mt-8 space-y-6 pt-4 border-t border-white/10">
         <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 shadow-2xl">
             <h3 className="font-pixel text-[8px] text-white/50 tracking-[0.3em] uppercase mb-4 flex items-center gap-2"><ShieldCheck className="text-neon" size={14}/> SKILL VECTORS</h3>
             <div className="flex flex-wrap gap-2">{skills.map(s => (<span key={s} className="bg-white/5 text-white/80 px-3 py-1.5 border border-white/10 font-sans font-medium text-[10px] tracking-wider uppercase drop-shadow-sm">{s}</span>))}</div>
         </div>
         <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 shadow-2xl"><h3 className="font-pixel text-[8px] text-white/50 tracking-[0.3em] uppercase mb-4">TRAINING PATH</h3><LeetcodeHub company={targetCompany} skills={skills} /></div>
      </div>
    </motion.div>
  );

  if (checkingAuth) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-neon w-12 h-12" /></div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-black w-full font-sans text-white flex flex-col items-center selection:bg-neon selection:text-black">
      <video autoPlay loop muted playsInline className="fixed top-0 left-0 w-full h-full object-cover z-0 opacity-40 mix-blend-screen pointer-events-none text-black"><source src="https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-connection-background-3094-large.mp4" type="video/mp4"/></video>
      <div className="fixed top-0 left-0 w-full h-full bg-black/70 z-0 pointer-events-none"></div>

      <div className="w-full max-w-md bg-transparent min-h-screen flex flex-col relative shadow-2xl z-10">
          <Header language={language} selectLanguage={selectLanguage} user={user} onLogout={handleLogout} />
          <main className="flex-1 w-full px-4 overflow-y-auto pb-20 relative">
            {translating && (<div className="absolute top-4 left-4 right-4 bg-black/80 text-neon px-4 py-3 border border-neon font-pixel text-[8px] tracking-widest uppercase shadow-[0_0_15px_rgba(255,85,0,0.3)] z-50 flex items-center justify-center gap-3"><Loader2 className="animate-spin" size={12}/> DECODING LOCALE...</div>)}
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
