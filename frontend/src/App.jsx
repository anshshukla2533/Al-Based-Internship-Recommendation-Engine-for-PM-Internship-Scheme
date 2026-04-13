import React, { useState, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import axios from 'axios';

import { Sparkles, FileText, Target, CheckCircle, ChevronRight, Briefcase, ChevronLeft, Loader2, Star, ShieldCheck, BrainCircuit, XCircle, Award, Lightbulb, MapPin, BookOpen, Layers, Tractor, Monitor, Truck, ShoppingBag, Landmark, Heart, Factory, Wrench, Zap, Hammer, Globe, Cpu, Keyboard, Package, HeadsetIcon as Headphones, Code, PenTool, Users, Phone, Languages } from 'lucide-react';

import { Header } from './components/Header';

import { AIChatMentor } from './components/AIChatMentor';

import { InterviewSimulator } from './components/InterviewSimulator';

import { LeetcodeHub } from './components/LeetcodeHub';

import { VoiceWidget } from './components/VoiceWidget';

import { LoginScreen } from './components/LoginScreen';

import { auth, signOut, onAuthStateChanged } from './firebase';

const API_BASE = "http://localhost:8000";

const defaultUIStrings = {

  onboardingTitle: "YOUR CAREER STARTS HERE",

  onboardingSub: "The PM Internship Scheme connects youth with India's top 500 companies. Choose your path below.",

  locationLabel: "Your City", educationLabel: "Education", sectorLabel: "Choose Sector",

  noResume: "SELECT SKILLS", noResumeSub: "Pick from icons below",

  haveResume: "UPLOAD RESUME", haveResumeSub: "We'll scan it for you", or: "OR",

  manualTitle: "SELECT YOUR SKILLS", manualSub: "Tap icons that match what you can do.", findOpportunities: "FIND MY INTERNSHIPS",

  uploadTitle: "UPLOAD RESUME", tapToBrowse: "TAP TO BROWSE", pdfOnly: "PDF ONLY",

  goBack: "BACK", analyzing: "SCANNING...", extracting: "AI EXTRACTING...",

  startOver: "START OVER", skillsVerified: "VERIFIED", topJobMatches: "YOUR TOP MATCHES", applyNow: "APPLY NOW", aiInterview: "PRACTICE INTERVIEW", getTips: "GET TIPS",

  quizTitle: "QUICK QUIZ", quizSub: "Answer 5 questions to verify your skills.", generatingJobs: "FINDING JOBS...", finishQuizMsg: "QUIZ COMPLETE!", nextQuestion: "NEXT", finishQuiz: "SEE MY INTERNSHIPS", noMatch: "No matches found. Try different skills."

};

const SECTOR_OPTIONS = [

  { id: "Any", label: "All Sectors", icon: Globe },

  { id: "IT & Technology", label: "IT & Tech", icon: Monitor },

  { id: "Agriculture & Fertilizers", label: "Agriculture", icon: Tractor },

  { id: "Banking & Finance", label: "Banking", icon: Landmark },

  { id: "Healthcare", label: "Healthcare", icon: Heart },

  { id: "Logistics & E-Commerce", label: "Logistics", icon: Truck },

  { id: "FMCG & Retail", label: "Retail", icon: ShoppingBag },

  { id: "Automotive", label: "Automotive", icon: Wrench },

  { id: "Power & Energy", label: "Energy", icon: Zap },

  { id: "Steel & Manufacturing", label: "Manufacturing", icon: Factory },

  { id: "Construction & Infrastructure", label: "Construction", icon: Hammer },

  { id: "Telecommunications", label: "Telecom", icon: Phone },

];

const LOCATION_OPTIONS = [

  "India (Any)", "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",

  "Pune", "Kolkata", "Noida", "Ahmedabad", "Jaipur", "Remote"

];

const LANG_OPTIONS = [

  { code: "English", label: "English", lang: "en" },

  { code: "Hindi", label: "हिंदी", lang: "hi" },

  { code: "Telugu", label: "తెలుగు", lang: "te" },

];

const LANGUAGE_CHOICES = [

  { code: "English", label: "English", lang: "en" },

  { code: "Hindi", label: "Hindi", lang: "hi" },

  { code: "Marathi", label: "Marathi", lang: "mr" },

  { code: "Telugu", label: "Telugu", lang: "te" },

  { code: "Tamil", label: "Tamil", lang: "ta" },

];

const resolveLanguageOption = (choice) => {

  if (choice && typeof choice === "object" && choice.lang) return choice;

  const raw = String(

    (choice && typeof choice === "object" && (choice.code || choice.label)) || choice || ""

  ).trim().toLowerCase();

  return LANGUAGE_CHOICES.find((option) => {

    const optionCode = option.code.toLowerCase();

    const optionLabel = option.label.toLowerCase();

    return raw === optionCode || raw === optionLabel || raw.includes(optionCode) || raw.includes(optionLabel);

  }) || LANGUAGE_CHOICES[0];

};

function App() {

  const [screen, setScreen] = useState("onboarding");

  const [language, setLanguage] = useState("English");

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

  const [ui, setUi] = useState(defaultUIStrings);

  const [translating, setTranslating] = useState(false);

  const [skills, setSkills] = useState([]);

  const [profileDict, setProfileDict] = useState({ location: "India (Any)", education: "10th Pass", preferred_sector: "Any" });

  const [activeLang, setActiveLang] = useState("en");

  const [quizData, setQuizData] = useState([]);

  const [quizSessionKey, setQuizSessionKey] = useState(0);

  const [jobs, setJobs] = useState([]);

  const [loading, setLoading] = useState(false);

  const [tipsLoading, setTipsLoading] = useState(null);  

  const [jobTips, setJobTips] = useState({});  

  const [interviewStarted, setInterviewStarted] = useState(false);

  const [interviewLoading, setInterviewLoading] = useState(false);

  const [interviewQuestions, setInterviewQuestions] = useState([]);

  const targetJob = jobs?.length > 0 ? jobs[0] : null;

  const targetCompany = targetJob?.company || "Tech";

  const navTo = (s) => {

    window.scrollTo(0,0);

    setScreen(s);

  };

  const selectLanguage = async (choice) => {

    const langObj = resolveLanguageOption(choice);

    setLanguage(langObj.code);

    setActiveLang(langObj.lang);

    if (langObj.lang === "en") {

      setUi(defaultUIStrings);

      return;

    }

    setTranslating(true);

    try {

      const res = await axios.post(`${API_BASE}/translate`, {

        target_language: langObj.lang,

        payload: defaultUIStrings

      });

      setUi(res.data.translated_payload || defaultUIStrings);

    } catch {

      console.error("Translation failed, using English.");

      setUi(defaultUIStrings);

    }

    setTranslating(false);

  };

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

      setQuizSessionKey(prev => prev + 1);

      setProfileDict(res.data.profile_dict);

      navTo("quiz");

    } catch (e) {

      alert(e?.response?.data?.detail || "Backend not reachable. Ensure FastAPI is running!");

    }

    setLoading(false);

  };

  const handleFileUpload = async (file) => {

    setLoading(true);

    const formData = new FormData();

    formData.append("file", file);

    formData.append("location", profileDict.location || "India (Any)");

    formData.append("education", profileDict.education || "10th Pass");

    formData.append("preferred_sector", profileDict.preferred_sector || "Any");

    try {

      const res = await axios.post(`${API_BASE}/analyze-resume`, formData);

      setSkills(res.data.extracted_skills || []);

      setQuizData(res.data.assessment_quiz || []);

      setQuizSessionKey(prev => prev + 1);

      setProfileDict(prev => ({ ...prev, ...res.data.profile_dict }));

      navTo("quiz");

    } catch (e) {

      alert(e?.response?.data?.detail || "Network error. Is the backend running?");

    }

    setLoading(false);

  };

  const fetchRecommendedJobs = async () => {

    setLoading(true);

    try {

      const payload = {

        skills: skills,

        location: profileDict?.location || "India",

        education: profileDict?.education || "10th Pass",

        preferred_sector: profileDict?.preferred_sector || "Any",

        target_language: language,

        lang: activeLang

      };

      const res = await axios.post(`${API_BASE}/recommended-jobs`, payload);

      setJobs(res.data.top_matches || []);

      navTo("results");

    } catch(e) {

      alert(e?.response?.data?.detail || "Error finding recommended jobs.");

    }

    setLoading(false);

  };

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

  const startInterview = async (job) => {

    setInterviewLoading(true);

    try {

      const interviewSkills = job.matched_skills?.length ? job.matched_skills : (job.skills?.length ? job.skills : skills);

      const res = await axios.post(`${API_BASE}/interview-prep`, {

        job_title: job.title,

        company: job.company,

        skills: interviewSkills

      });

      setInterviewQuestions(res.data.questions);

      if (res.data.questions?.length) {

        setInterviewStarted(true);

      } else {

        alert("No interview questions were generated for this internship yet.");

      }

    } catch (e) {

      alert(e?.response?.data?.detail || "Failed to pull interview questions.");

    }

    setInterviewLoading(false);

  };

  const pageTransition = { 

      initial: { opacity: 0, x: 200, filter: "blur(10px)" }, 

      animate: { opacity: 1, x: 0, filter: "blur(0px)" }, 

      exit: { opacity: 0, x: -200, filter: "blur(10px)" }, 

      transition: { duration: 0.5, ease: "easeInOut" } 

  };

  const OnboardingScreen = () => {

    const [loc, setLoc] = useState(profileDict.location);

    const [edu, setEdu] = useState(profileDict.education);

    const [sec, setSec] = useState(profileDict.preferred_sector);

    const handleContinue = (dest) => { setProfileDict({ location: loc, education: edu, preferred_sector: sec }); navTo(dest); };

    return (

      <motion.div {...pageTransition} className="w-full max-w-4xl mx-auto pt-6 pb-20">

        { }

        <div className="text-center mb-10">

          <p className="text-neon font-bold tracking-[0.3em] text-xs uppercase mb-4 flex items-center justify-center gap-3"><span className="w-8 h-px bg-neon inline-block"></span>PM INTERNSHIP SCHEME<span className="w-8 h-px bg-neon inline-block"></span></p>

          <h1 className="font-pixel text-2xl md:text-4xl leading-[1.5] text-white uppercase">{ui.onboardingTitle}</h1>

          <p className="text-white/50 text-sm md:text-base leading-relaxed font-sans max-w-lg mx-auto mt-4">{ui.onboardingSub}</p>

        </div>

        { }

        <div className="mb-10">

          <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2"><Layers size={12}/> {ui.sectorLabel}</h3>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">

            {SECTOR_OPTIONS.map(s => {

              const Icon = s.icon;

              const active = sec === s.id;

              return (

                <motion.button key={s.id} whileTap={{ scale: 0.95 }} onClick={() => setSec(s.id)}

                  className={`flex flex-col items-center justify-center p-4 md:p-5 border transition-all duration-200 cursor-pointer ${active ? 'border-neon bg-neon/10 shadow-[0_0_12px_rgba(255,85,0,0.3)]' : 'border-white/10 bg-black/40 hover:border-white/30'}`}>

                  <Icon size={28} className={`mb-2 ${active ? 'text-neon' : 'text-white/40'}`} />

                  <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${active ? 'text-neon' : 'text-white/50'}`}>{s.label}</span>

                </motion.button>

              );

            })}

          </div>

        </div>

        { }

        <div className="mb-10">

          <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2"><MapPin size={12}/> {ui.locationLabel}</h3>

          <div className="flex flex-wrap gap-2">

            {LOCATION_OPTIONS.map(l => (

              <motion.button key={l} whileTap={{ scale: 0.95 }} onClick={() => setLoc(l)}

                className={`px-4 py-3 border text-xs font-bold uppercase tracking-wider transition-all ${loc === l ? 'border-neon bg-neon/10 text-neon shadow-[0_0_10px_rgba(255,85,0,0.2)]' : 'border-white/10 bg-black/40 text-white/50 hover:border-white/30'}`}>

                {l}

              </motion.button>

            ))}

          </div>

        </div>

        { }

        <div className="mb-10">

          <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2"><BookOpen size={12}/> {ui.educationLabel}</h3>

          <div className="flex flex-wrap gap-3">

            {["10th Pass", "12th Pass", "Diploma", "Graduate"].map(e => (

              <motion.button key={e} whileTap={{ scale: 0.95 }} onClick={() => setEdu(e)}

                className={`px-6 py-4 border text-sm font-bold uppercase tracking-wider transition-all ${edu === e ? 'border-neon bg-neon/10 text-neon shadow-[0_0_10px_rgba(255,85,0,0.2)]' : 'border-white/10 bg-black/40 text-white/50 hover:border-white/30'}`}>

                {e}

              </motion.button>

            ))}

          </div>

        </div>

        { }

        <div className="flex flex-col sm:flex-row gap-4 mt-8">

            <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleContinue("manual")} className="flex-1 bg-neon text-black font-bold font-sans tracking-widest uppercase px-6 py-5 text-sm border-2 border-neon hover:bg-transparent hover:text-neon transition-all btn-glow flex items-center justify-center gap-3">

              <Target size={20}/> {ui.noResume}

            </motion.button>

            <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleContinue("upload")} className="flex-1 bg-black/50 backdrop-blur-md font-sans text-white border-2 border-white/30 font-bold tracking-widest uppercase px-6 py-5 text-sm hover:border-white transition-all flex items-center justify-center gap-3">

              <FileText size={20}/> {ui.haveResume}

            </motion.button>

        </div>

      </motion.div>

    );

  }

  const ManualScreen = () => {

    const [selected, setSelected] = useState([]);

    const toggle = (skill) => selected.includes(skill) ? setSelected(selected.filter(s => s !== skill)) : setSelected([...selected, skill]);

    const skillMap = [

      { id: "farming", label: "Farming", icon: Tractor },

      { id: "mechanic", label: "Mechanic", icon: Wrench },

      { id: "data entry", label: "Data Entry", icon: Keyboard },

      { id: "packaging", label: "Packaging", icon: Package },

      { id: "python", label: "Python", icon: Code },

      { id: "customer service", label: "Support", icon: Phone },

      { id: "networking", label: "Networking", icon: Cpu },

      { id: "excel", label: "Excel", icon: Monitor },

      { id: "hardware", label: "Hardware", icon: Hammer },

      { id: "logistics", label: "Logistics", icon: Truck },

      { id: "communication", label: "Communication", icon: Users },

      { id: "design", label: "Design", icon: PenTool },

    ];

    return (

      <motion.div {...pageTransition} className="max-w-3xl mx-auto w-full pb-20 pt-6 text-white">

        <button onClick={() => navTo("onboarding")} className="text-neon border border-neon font-bold mb-8 flex items-center gap-2 bg-black/40 px-4 py-2 text-xs tracking-widest hover:bg-neon hover:text-black transition-colors uppercase"><ChevronLeft size={16} /> {ui.goBack}</button>

        <div className="text-center mb-10">

          <h2 className="text-2xl md:text-3xl font-pixel mb-3 text-white">{ui.manualTitle}</h2>

          <p className="text-white/50 tracking-widest font-sans text-xs uppercase">{ui.manualSub}</p>

        </div>

        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">

          {skillMap.map(s => {

            const Icon = s.icon;

            const active = selected.includes(s.id);

            return (

              <motion.div key={s.id} whileTap={{ scale: 0.93 }} onClick={() => toggle(s.id)}

                className={`flex flex-col items-center justify-center p-6 md:p-8 border text-center transition-all duration-200 cursor-pointer ${active ? 'border-neon bg-neon/10 shadow-[0_0_15px_rgba(255,85,0,0.3)]' : 'border-white/10 bg-black/40 hover:bg-black/60'}`}>

                <Icon size={36} className={`mb-3 transition-all ${active ? 'text-neon scale-110' : 'text-white/30'}`} />

                <span className={`font-bold text-[10px] uppercase tracking-wider ${active ? 'text-neon' : 'text-white/50'}`}>{s.label}</span>

              </motion.div>

            );

          })}

        </div>

        <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleManualSubmit(selected)} disabled={loading || selected.length === 0}

          className={`w-full max-w-md mx-auto block font-sans uppercase font-black text-sm tracking-widest py-5 mt-12 border-2 transition-all ${loading ? 'bg-white/10 text-white/30 border-white/10' : selected.length === 0 ? 'bg-black/50 border-white/10 text-white/30 cursor-not-allowed' : 'bg-neon border-neon text-black btn-glow hover:bg-transparent hover:text-neon'}`}>

          {loading ? <span className="flex items-center justify-center gap-2 text-white"><Loader2 className="animate-spin text-neon" /> {ui.analyzing}</span> : <span>{ui.findOpportunities}</span>}

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

    <motion.div {...pageTransition} className="w-full max-w-4xl mx-auto pb-20">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">

          <button onClick={() => navTo("onboarding")} className="text-neon font-bold text-xs flex items-center gap-2 hover:text-white transition-colors uppercase tracking-widest border border-neon px-4 py-2 bg-black/40"><ChevronLeft size={16} /> {ui.startOver}</button>

          <div className="bg-green-500/10 text-green-400 px-4 py-2 text-[10px] font-bold tracking-widest uppercase border border-green-500/20 flex items-center gap-2"><ShieldCheck size={14} /> {ui.skillsVerified}</div>

      </div>

      { }

      <div className="mb-8 flex flex-wrap gap-2">

        {skills.map(s => (<span key={s} className="bg-white/5 text-white/70 px-4 py-2 border border-white/10 font-sans font-medium text-xs tracking-wider uppercase">{s}</span>))}

      </div>

      <h2 className="text-xl md:text-2xl font-pixel mb-8 text-white flex items-center gap-4 uppercase"><Star className="text-neon" size={24} /> {ui.topJobMatches}</h2>

      { }

      <div className="space-y-8">

        {jobs.length === 0 ? <div className="p-12 border border-white/10 text-center text-white/40 text-sm">{ui.noMatch}</div> : jobs.map((job, idx) => {

          const visibleSkills = job.matched_skills?.length ? job.matched_skills : (job.skills || []);

          const sourceLabel = job.source || "Internship Portal";

          return (

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.12 }} key={job.id}

            className="bg-black/50 backdrop-blur-xl border border-white/20 p-6 md:p-10 relative overflow-hidden hover:border-neon/40 transition-colors">

            { }

            <div className="absolute top-0 right-0 bg-neon/10 text-neon tracking-[0.3em] font-black uppercase px-5 py-3 text-xs border-l border-b border-neon/30">MATCH {job.match_score}%</div>

            { }

            <h3 className="text-lg md:text-2xl font-pixel mt-2 uppercase text-white pr-28 leading-relaxed">{job.title}</h3>

            { }

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-4">

              <p className="text-neon font-bold tracking-widest uppercase text-xs flex items-center gap-2"><Briefcase size={16} /> {job.company}</p>

              <p className="text-white/40 text-xs flex items-center gap-1 uppercase tracking-wider"><MapPin size={12}/> {job.location}</p>

              <p className="text-white/30 text-[10px] uppercase tracking-[0.25em]">Live on {sourceLabel}</p>

            </div>

            { }

            <p className="text-sm text-white/60 mt-5 leading-relaxed font-light">{job.description}</p>

            {job.field && <p className="text-[11px] text-white/35 mt-3 uppercase tracking-[0.18em]">Field: {job.field}</p>}

            { }

            {visibleSkills.length > 0 && <div className="flex flex-wrap gap-2 mt-5">{visibleSkills.map(sk => (<span key={sk} className="text-[10px] uppercase tracking-wider px-3 py-1.5 border border-white/10 text-white/40 bg-white/5 font-bold">{sk}</span>))}</div>}

            { }

            <AnimatePresence>{jobTips[job.id] && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-6 bg-neon/5 border border-neon/20 p-5"><h4 className="text-[10px] text-neon uppercase mb-3 tracking-widest font-bold"><Lightbulb size={12} className="inline mr-1"/> TIPS</h4><ul className="list-disc pl-5 space-y-2 text-white/70 text-xs">{jobTips[job.id].map((tip, i) => <li key={i}>{tip}</li>)}</ul></motion.div>)}</AnimatePresence>

            { }

            <div className="mt-8 flex flex-col gap-4">

              <a href={job.apply_url || "https://pminternship.mca.gov.in/"} target="_blank" rel="noopener noreferrer"

                className="w-full text-center bg-neon text-black tracking-[0.15em] font-black uppercase py-5 md:py-6 text-base border-2 border-neon btn-glow transition-all hover:bg-transparent hover:text-neon flex items-center justify-center gap-3">

                <Globe size={20} /> APPLY ON {sourceLabel.toUpperCase()} →

              </a>

              <div className="grid grid-cols-2 gap-3">

                <button onClick={() => fetchJobTips(job)} disabled={tipsLoading === job.id} className="bg-transparent text-white font-bold tracking-widest uppercase py-4 border border-white/20 flex items-center justify-center gap-2 text-xs hover:border-white transition-colors">{tipsLoading === job.id ? <Loader2 className="animate-spin" size={16}/> : <><Lightbulb size={16}/> {ui.getTips}</>}</button>

                <button onClick={() => startInterview(job)} disabled={interviewLoading} className="bg-transparent text-white font-bold tracking-widest uppercase py-4 border border-white/20 flex items-center justify-center gap-2 text-xs hover:border-white transition-colors">{interviewLoading ? <Loader2 className="animate-spin" size={16}/> : <><Target size={16}/> {ui.aiInterview}</>}</button>

              </div>

            </div>

          </motion.div>

        )})}

      </div>

      { }

      {jobs.length > 0 && (

        <div className="mt-12 bg-black/40 backdrop-blur-xl border border-white/20 p-8">

          <h3 className="font-pixel text-[10px] text-white/50 tracking-[0.3em] uppercase mb-6">TRAINING PATH</h3>

          <LeetcodeHub company={targetCompany} jobTitle={targetJob?.title || "PM Internship"} skills={targetJob?.matched_skills?.length ? targetJob.matched_skills : (targetJob?.skills || skills)} />

        </div>

      )}

    </motion.div>

  );

  if (checkingAuth) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-neon w-12 h-12" /></div>;

  if (!user) return <LoginScreen />;

  return (

    <div className="min-h-screen flex flex-col relative w-full overflow-hidden bg-black selection:bg-neon selection:text-black">

      <video autoPlay loop muted playsInline className="fixed top-0 left-0 w-full h-full object-cover z-0 opacity-60 pointer-events-none"><source src="https://raw.githubusercontent.com/SkTheAdvanceGamer/Video/main/Futuristic_Data_Node_Animation.mp4" type="video/mp4"/></video>

      <div className="fixed top-0 left-0 w-full h-full bg-black/30 z-0 pointer-events-none"></div>

      <div className="relative z-10 w-full min-h-screen flex flex-col overflow-y-auto overflow-x-hidden h-screen">

          <Header language={language} selectLanguage={selectLanguage} user={user} onLogout={handleLogout} />

          { }

          <div className="w-full flex justify-center py-3 bg-black/30 backdrop-blur-sm border-b border-white/5">

            <div className="flex items-center gap-1 bg-black/50 border border-white/10 p-1">

              {LANGUAGE_CHOICES.map(lo => (

                <button key={lo.code} onClick={() => selectLanguage(lo)}

                  className={`px-5 py-2.5 text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${language === lo.code ? 'bg-neon text-black' : 'text-white/50 hover:text-white'}`}>

                  {lo.label}

                </button>

              ))}

            </div>

          </div>

          <main className="flex-1 w-full px-4 md:px-12 flex flex-col items-center pt-6">

            {translating && (<div className="fixed top-24 right-10 bg-black/80 text-neon px-6 py-3 border border-neon font-pixel text-[10px] tracking-widest uppercase shadow-[0_0_15px_rgba(255,85,0,0.3)] z-50 flex items-center gap-3"><Loader2 className="animate-spin" size={12}/> DECODING LOCALE...</div>)}

            <AnimatePresence mode="wait">

              {screen === "onboarding" && <OnboardingScreen key="onboarding" />}

              {screen === "manual" && <ManualScreen key="manual" />}

              {screen === "upload" && <UploadScreen key="upload" />}

              {screen === "quiz" && <QuizScreen key={`quiz-${quizSessionKey}`} />}

              {screen === "results" && <ResultsScreen key="results" />}

            </AnimatePresence>

          </main>

      </div>

      {(screen === "quiz" || screen === "results") && <div className="fixed bottom-0 right-0 z-50"><AIChatMentor skills={skills} language={language} /></div>}

      {interviewStarted && <InterviewSimulator questions={interviewQuestions} onClose={() => setInterviewStarted(false)} />}

      {}

      <VoiceWidget />

    </div>

  );

}

export default App;
