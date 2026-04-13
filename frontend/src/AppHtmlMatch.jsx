import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  ChevronLeft,
  ArrowRight,
  CalendarDays,
  FileText,
  House,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  MessageSquare,
  MoonStar,
  Sparkles,
  SunMedium,
  Target,
  X,
} from "lucide-react";
import { AIChatMentorRedesign } from "./components/AIChatMentorRedesign";
import { InterviewSimulatorRedesign } from "./components/InterviewSimulatorRedesign";
import { auth, onAuthStateChanged, provider, signInWithPopup, signOut } from "./firebase";

const API_BASE_CANDIDATES = Array.from(new Set([
  import.meta.env.VITE_API_BASE_URL,
  "http://localhost:8000",
  "http://localhost:8001",
].filter(Boolean)));
const THEME_KEY = "pm-html-match-theme";

const extractErrorDetail = (payload) => {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (payload?.detail && typeof payload.detail === "string" && payload.detail.trim()) return payload.detail.trim();
  if (payload?.message && typeof payload.message === "string" && payload.message.trim()) return payload.message.trim();
  return "";
};

const stats = [
  { label: "Internship Listings", value: 120000 },
  { label: "States Covered", value: 28 },
  { label: "% Match Accuracy", value: 94 },
  { label: "Regional Languages", value: 12 },
];

const sectorOptions = [
  { display: "🏭 Manufacturing", value: "Steel & Manufacturing" },
  { display: "💻 Technology", value: "IT & Technology" },
  { display: "🏥 Healthcare", value: "Healthcare" },
  { display: "🌾 Agriculture", value: "Agriculture & Fertilizers" },
  { display: "🎓 Education", value: "Any" },
  { display: "🏗️ Infrastructure", value: "Construction & Infrastructure" },
  { display: "💰 Finance", value: "Banking & Finance" },
  { display: "🎨 Media & Arts", value: "Any" },
  { display: "🌿 Environment", value: "Any" },
  { display: "⚖️ Governance", value: "Any" },
];

const skillOptions = [
  "Data Entry",
  "MS Office",
  "Basic Computer",
  "Communication",
  "Field Work",
  "Coding",
  "Design",
  "Teaching",
  "Sales / Marketing",
  "Research",
];

const educationMap = {
  "10th / High School": "10th Pass",
  "12th / Intermediate": "12th Pass",
  "Diploma / ITI": "Diploma",
  "Undergraduate (BA/BSc/BCom)": "Graduate",
  "Undergraduate (B.Tech/BE)": "Graduate",
  Postgraduate: "Graduate",
};

const stateOptions = [
  "Andhra Pradesh",
  "Telangana",
  "Karnataka",
  "Tamil Nadu",
  "Maharashtra",
  "Uttar Pradesh",
  "Rajasthan",
  "Bihar",
  "West Bengal",
  "Gujarat",
  "Madhya Pradesh",
  "Odisha",
  "Jharkhand",
  "Other",
];

const locationOptions = [
  "Any location",
  "Near my district",
  "State capital",
  "Any metro",
  "Remote / WFH",
];

const featureCards = [
  ["🤖", "Lightweight AI Engine", "Rule-based ML model runs fast even on low bandwidth and modest devices."],
  ["📱", "Mobile-First Design", "Fully responsive and simple enough for small screens and slower connections."],
  ["🌐", "12 Regional Languages", "Built to feel inclusive across Bharat with multilingual-first thinking."],
  ["🎯", "3-5 Smart Picks Only", "No overwhelming lists. Just the most relevant internships with clear fit."],
  ["🔒", "Privacy First", "Minimal data collection aligned with safe and responsible use."],
  ["⚡", "Portal Ready", "Presentation-ready frontend that can fit into the PM Internship flow cleanly."],
];

const languagesTicker = [
  "HINDI · हिन्दी",
  "TELUGU · తెలుగు",
  "TAMIL · தமிழ்",
  "BENGALI · বাংলা",
  "MARATHI · मराठी",
  "GUJARATI · ગુજરાતી",
  "PUNJABI · ਪੰਜਾਬੀ",
  "KANNADA · ಕನ್ನಡ",
  "MALAYALAM · മലയാളം",
  "ODIA · ଓଡ଼ିଆ",
];

const getInitialTheme = () => {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return "light";
};

const getJobEmoji = (job) => {
  const label = `${job.field || ""} ${job.title || ""}`.toLowerCase();
  if (label.includes("tech") || label.includes("software") || label.includes("data")) return "💻";
  if (label.includes("health")) return "🏥";
  if (label.includes("bank") || label.includes("finance")) return "💰";
  if (label.includes("agri")) return "🌾";
  if (label.includes("manufact")) return "🏭";
  return "⭐";
};

export default function AppHtmlMatch() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [activePage, setActivePage] = useState("home");
  const [pendingSection, setPendingSection] = useState(null);
  const [pageOverlay, setPageOverlay] = useState(false);
  const [pageOverlayLabel, setPageOverlayLabel] = useState("Opening workspace");
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [splashProgress, setSplashProgress] = useState(0);
  const [splashDone, setSplashDone] = useState(false);
  const [stuckNav, setStuckNav] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [skills, setSkills] = useState([]);
  const [jobTips, setJobTips] = useState({});
  const [tipsLoading, setTipsLoading] = useState(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    state: "",
    education: "",
    locationPref: "",
    sectors: [],
    skills: [],
  });
  const fileInputRef = useRef(null);
  const apiBaseRef = useRef(API_BASE_CANDIDATES[0]);
  const statsRef = useRef(null);
  const [displayStats, setDisplayStats] = useState(stats.map(() => 0));

  const postApi = async (path, payload, config = {}) => {
    const bases = [apiBaseRef.current, ...API_BASE_CANDIDATES.filter((base) => base !== apiBaseRef.current)];
    let lastError = null;
    for (const base of bases) {
      try {
        const response = await axios.post(`${base}${path}`, payload, { timeout: 20000, ...config });
        apiBaseRef.current = base;
        return response;
      } catch (error) {
        lastError = error;
        if (error?.response) throw error;
      }
    }
    throw lastError;
  };

  const getApiErrorMessage = (error, fallbackMessage) => {
    const detail = extractErrorDetail(error?.response?.data);
    if (detail) return detail;
    if (!error?.response && error?.message && error.code !== "ERR_NETWORK") {
      return error.message;
    }
    if (!error?.response) {
      const bases = API_BASE_CANDIDATES.join(" or ");
      return `Cannot connect to the backend. Start FastAPI on ${bases}, or set VITE_API_BASE_URL to the correct server.`;
    }
    return error?.message || fallbackMessage;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
    const meta = document.querySelector("meta[name='theme-color']");
    if (meta) meta.setAttribute("content", theme === "dark" ? "#080C14" : "#FFFFFF");
  }, [theme]);

  useEffect(() => {
    let progress = 0;
    const timer = window.setInterval(() => {
      progress += 5;
      setSplashProgress(Math.min(progress, 100));
      if (progress >= 100) {
        window.clearInterval(timer);
        window.setTimeout(() => setSplashDone(true), 350);
      }
    }, 70);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => setStuckNav(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("v");
        });
      },
      { threshold: 0.15 },
    );
    document.querySelectorAll(".sr, .sr-l, .sr-r").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [jobs.length]);

  useEffect(() => {
    if (!statsRef.current) return undefined;
    const node = statsRef.current;
    let animated = false;
    const animate = () => {
      if (animated) return;
      animated = true;
      const start = performance.now();
      const duration = 1300;
      const tick = (time) => {
        const progress = Math.min((time - start) / duration, 1);
        setDisplayStats(stats.map((item) => Math.floor(item.value * progress)));
        if (progress < 1) window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) animate();
      });
    }, { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 900) return undefined;
    const cursor = document.getElementById("cursor");
    const ring = document.getElementById("cursor-ring");
    if (!cursor || !ring) return undefined;
    const move = (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      ring.style.left = `${event.clientX}px`;
      ring.style.top = `${event.clientY}px`;
    };
    const enter = () => {
      cursor.style.width = "18px";
      cursor.style.height = "18px";
      ring.style.width = "56px";
      ring.style.height = "56px";
    };
    const leave = () => {
      cursor.style.width = theme === "dark" ? "12px" : "10px";
      cursor.style.height = theme === "dark" ? "12px" : "10px";
      ring.style.width = theme === "dark" ? "40px" : "36px";
      ring.style.height = theme === "dark" ? "40px" : "36px";
    };
    const interactiveNodes = document.querySelectorAll("button,a,.chip,.rc-btn,.feat-card,.res-card,.ai-card,.stat-item,.proc-step");
    window.addEventListener("mousemove", move);
    interactiveNodes.forEach((element) => {
      element.addEventListener("mouseenter", enter);
      element.addEventListener("mouseleave", leave);
    });
    return () => {
      window.removeEventListener("mousemove", move);
      interactiveNodes.forEach((element) => {
        element.removeEventListener("mouseenter", enter);
        element.removeEventListener("mouseleave", leave);
      });
    };
  }, [theme, jobs.length]);

  const firstName = useMemo(() => (form.name.trim().split(" ")[0] || "You"), [form.name]);

  const switchPage = (nextPage, label = "Opening workspace") => {
    setPageOverlayLabel(label);
    setPageOverlay(true);
    window.setTimeout(() => {
      setActivePage(nextPage);
      window.scrollTo({ top: 0, behavior: "auto" });
    }, 220);
    window.setTimeout(() => setPageOverlay(false), 700);
  };

  useEffect(() => {
    if (activePage !== "home" || !pendingSection) return;
    const target = document.getElementById(pendingSection);
    if (target) {
      window.setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 120);
    }
    setPendingSection(null);
  }, [activePage, pendingSection]);

  const openHomeSection = (sectionId = null) => {
    if (activePage === "home") {
      if (sectionId) document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setPendingSection(sectionId);
    switchPage("home", "Opening landing page");
  };

  const goToForm = () => {
    if (activePage === "form") return;
    switchPage("form", "Opening matching form");
  };

  const goToResultsPage = () => {
    if (activePage === "results") return;
    switchPage("results", "Loading your top matches");
  };

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const toggleChip = (type, value) => {
    setForm((prev) => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter((item) => item !== value)
        : [...prev[type], value],
    }));
  };

  const startLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert(`Login failed: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const buildRecommendationPayload = (verifiedSkills, educationLabel, sectorValue) => ({
    skills: verifiedSkills,
    location: form.state || "India (Any)",
    education: educationMap[educationLabel] || "Graduate",
    preferred_sector: sectorValue || "Any",
    target_language: "English",
    lang: "en",
  });

  const fetchRecommendations = async (verifiedSkills, educationLabel, sectorValue) => {
    const response = await postApi("/recommended-jobs", buildRecommendationPayload(verifiedSkills, educationLabel, sectorValue));
    setJobs(response.data.top_matches || []);
    setSkills(verifiedSkills);
    setChatEnabled(true);
    goToResultsPage();
  };

  const findMatches = async () => {
    setLoading(true);
    try {
      const selectedSector = form.sectors[0] || "Any";
      const response = await postApi("/manual-profile", {
        education: educationMap[form.education] || "Graduate",
        location: form.state || "India (Any)",
        preferred_sector: selectedSector,
        manual_skills: form.skills,
      });
      const verifiedSkills = response.data.verified_skills || form.skills;
      await fetchRecommendations(verifiedSkills, form.education, selectedSector);
    } catch (error) {
      alert(getApiErrorMessage(error, "Could not fetch recommendations. Please make sure the backend is running."));
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (file) => {
    if (!file) return;
    if (!file.name?.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a PDF resume file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("location", form.state || "India (Any)");
      formData.append("education", educationMap[form.education] || "Graduate");
      formData.append("preferred_sector", form.sectors[0] || "Any");
      const response = await postApi("/analyze-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const extractedSkills = response.data.extracted_skills || [];
      if (!extractedSkills.length) {
        throw new Error("No resume skills could be identified. Please try a clearer PDF or use manual skill selection.");
      }
      await fetchRecommendations(extractedSkills, form.education, form.sectors[0] || "Any");
    } catch (error) {
      alert(getApiErrorMessage(error, "Resume analysis failed. Please try again."));
    } finally {
      setUploadingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fetchTips = async (jobKey, job) => {
    setTipsLoading(jobKey);
    try {
      const response = await postApi("/job-tips", {
        title: job.title,
        company: job.company,
        language: "English",
      });
      setJobTips((prev) => ({ ...prev, [jobKey]: response.data.tips || [] }));
    } catch (error) {
      setJobTips((prev) => ({ ...prev, [jobKey]: [getApiErrorMessage(error, "Tips could not be loaded right now.")] }));
    } finally {
      setTipsLoading(null);
    }
  };

  const startInterview = async (job) => {
    setInterviewLoading(true);
    try {
      const response = await postApi("/interview-prep", {
        job_title: job.title,
        company: job.company,
        skills: job.matched_skills?.length ? job.matched_skills : skills,
      });
      setInterviewQuestions(response.data.questions || []);
      if (response.data.questions?.length) setInterviewOpen(true);
    } catch (error) {
      alert(getApiErrorMessage(error, "Interview questions could not be generated."));
    } finally {
      setInterviewLoading(false);
    }
  };

  const openModal = (job) => {
    setActiveJob(job);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveJob(null);
  };

  return (
    <div className="html-match-shell">
      <div id="cursor" />
      <div id="cursor-ring" />

      <div id="splash" className={splashDone ? "out" : ""}>
        <div className="splash-wordmark">PM INTERN AI</div>
        <div className="splash-sub">PM Internship Scheme · AI Recommendation Engine</div>
        <div className="splash-bar" />
        <div className="splash-pct">{String(splashProgress).padStart(2, "0")}</div>
      </div>

      <nav id="mainNav" className={stuckNav ? "stuck" : ""}>
        <button type="button" className="nav-logo logo-btn" onClick={() => openHomeSection()}>
          PM INTERN AI
        </button>
        <ul className="nav-links">
          <li><a href="#process" onClick={(e) => { e.preventDefault(); openHomeSection("process"); }}>How It Works</a></li>
          <li><a href="#form-section" onClick={(e) => { e.preventDefault(); goToForm(); }}>Get Matched</a></li>
          <li><a href="#features" onClick={(e) => { e.preventDefault(); openHomeSection("features"); }}>Features</a></li>
        </ul>
        <div className="nav-actions">
          <button type="button" className="theme-toggle" onClick={toggleTheme}>
            {theme === "dark" ? <SunMedium size={16} /> : <MoonStar size={16} />}
          </button>
          {authChecked && (
            user ? (
              <button type="button" className="nav-btn" onClick={handleLogout}>
                Sign Out <LogOut size={14} />
              </button>
            ) : (
              <button type="button" className="nav-btn" onClick={startLogin}>
                Sign In <LogIn size={14} />
              </button>
            )
          )}
        </div>
      </nav>

      {pageOverlay && (
        <div className="page-transition-overlay">
          <div className="page-transition-copy">
            <span className="page-transition-tag">PM Intern AI</span>
            <strong>{pageOverlayLabel}</strong>
          </div>
        </div>
      )}

      <div className={`page-panel ${activePage === "home" ? "page-panel-active" : "page-panel-hidden"}`}>
      <section className="hero">
        <div className={theme === "dark" ? "hero-sky" : "hero-wash"} />
        <div className={theme === "dark" ? "hero-grid" : "hero-dots"} />
        <div className="hero-scan" />
        <div className="hero-ring" />
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className={theme === "dark" ? "line" : "eyebrow-line"} />
            <span className={theme === "dark" ? "dot" : "eyebrow-dot"} />
            AI-Powered · PM Internship Scheme 2025
          </div>
          <h1 className="hero-h1">
            <span className={theme === "dark" ? "line1" : "l1"}>YOUR DREAM</span>
            <span className={theme === "dark" ? "line2" : "l2"}>INTERNSHIP</span>
            <span className={theme === "dark" ? "line3" : "l3"}>FOUND NOW</span>
          </h1>
          <p className="hero-sub">
            Built for every young Indian from rural villages to metro colleges. Our AI reads your profile and returns the internships you were meant to find.
          </p>
          <div className="hero-ctas">
            <button type="button" className={theme === "dark" ? "cta-primary" : "cta-fill"} onClick={goToForm}>
              <span>Get My Recommendations</span>
              <span>→</span>
            </button>
            <button type="button" className={theme === "dark" ? "cta-secondary" : "cta-ghost"} onClick={() => document.getElementById("process")?.scrollIntoView({ behavior: "smooth" })}>
              How It Works ↓
            </button>
          </div>
        </div>
        <div className="hero-scroll">
          <div className={theme === "dark" ? "scroll-line" : "scroll-bar"} />
          Scroll
        </div>
      </section>

      <div className="stats-strip" ref={statsRef}>
        <div className="stats-inner">
          {stats.map((item, index) => (
            <div key={item.label} className="stat-item sr">
              <div className="stat-num">{displayStats[index]}</div>
              <div className="stat-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section className={theme === "dark" ? "cin-section sec-ai" : "sec-ai"} id="about">
        <div className={theme === "dark" ? "sec-ai-inner" : "ai-inner"}>
          <div className="sr-l">
            <div className="cin-tag"><span className="bar" /> Intelligence Layer</div>
            <h2 className="cin-h2">NOT A LIST.<br /><em>YOUR MATCHES.</em></h2>
            <p className="cin-p">Most portals dump hundreds of listings on you. These screens do the opposite and surface only the roles you are genuinely likely to succeed in.</p>
            <p className="cin-p" style={{ marginTop: "1.1rem" }}>Designed to feel premium for presentation while staying simple for first-generation learners and rural applicants.</p>
          </div>
          <div className="sr-r">
            <div className="ai-visual">
              <div className="ai-card c1"><div className="acard-sector">Agriculture</div><div className="acard-role">Rural Development Intern</div><div className="acard-co">NABARD · Guntur, AP</div><div className="acard-bar"><div className="acard-fill" style={{ width: "78%" }} /></div><div className="acard-match">78% match</div></div>
              <div className="ai-card c2"><div className="acard-sector">⭐ Top Match · Technology</div><div className="acard-role">IT Support & Data Intern</div><div className="acard-co">TCS · Hyderabad, TS</div><div className="acard-bar"><div className="acard-fill" style={{ width: "96%" }} /></div><div className="acard-match">96% match</div></div>
              <div className="ai-card c3"><div className="acard-sector">Finance</div><div className="acard-role">Banking Operations Intern</div><div className="acard-co">SBI · Tirupati, AP</div><div className="acard-bar"><div className="acard-fill" style={{ width: "84%" }} /></div><div className="acard-match">84% match</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec-process" id="process">
        <div className="process-inner">
          <div className="process-header">
            <div className="cin-tag sr" style={{ justifyContent: "center" }}><span className="bar" /> Simple Process <span className="bar" /></div>
            <h2 className="cin-h2 sr" style={{ textAlign: "center" }}>FOUR STEPS.<br /><em>ONE FUTURE.</em></h2>
          </div>
          <div className="process-track">
            {[["📝", "01", "Build Your Profile", "Education, skills, interests and location in one simple form."], ["🤖", "02", "AI Analyses You", "The engine matches your profile against internship opportunities."], ["🎯", "03", "See Top Picks", "Ranked cards show only the most relevant internships."], ["🚀", "04", "Apply with Confidence", "Open details, view suggestions, and move toward application."]].map(([icon, num, title, desc]) => (
              <div key={num} className="proc-step sr">
                <div className="proc-node">{icon}<div className="proc-num">{num}</div></div>
                <div className="proc-title">{title}</div>
                <div className="proc-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      </div>

      <div className={`page-panel page-workspace ${activePage === "form" ? "page-panel-active" : "page-panel-hidden"}`}>
        <section className="workspace-hero">
          <div className="workspace-hero__mesh" />
          <div className="workspace-hero__content">
            <div className="workspace-kicker">Matching Workspace</div>
            <h2 className="workspace-title">BUILD YOUR PROFILE AND LET THE ENGINE DO THE REST</h2>
            <p className="workspace-subtitle">This screen keeps the same visual language, but now opens like a dedicated page instead of only scrolling down the landing view.</p>
            <div className="workspace-actions">
              <button type="button" className="workspace-pill" onClick={() => openHomeSection()}>
                <House size={16} />
                Home
              </button>
              <button type="button" className="workspace-pill workspace-pill-strong" onClick={() => openHomeSection("process")}>
                <ChevronLeft size={16} />
                Process
              </button>
            </div>
          </div>
        </section>

      <section className="sec-form" id="form-section">
        <div className="form-wrap">
          <div className="form-header-area">
            <div className="cin-tag sr" style={{ justifyContent: "center" }}><span className="bar" /> Get Matched <span className="bar" /></div>
            <h2 className="cin-h2 sr" style={{ textAlign: "center" }}>TELL US<br /><em>ABOUT YOURSELF</em></h2>
            <p className="cin-p sr" style={{ textAlign: "center", margin: "0 auto", maxWidth: "420px" }}>This form uses the same reference layout, then connects to your actual recommendation backend.</p>
          </div>

          <div className="form-card sr">
            <div className="form-grid-inner">
              <div className="form-row">
                <div className="fg">
                  <label className="fl">Your Name</label>
                  <input className="fi" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Priya Sharma" />
                </div>
                <div className="fg">
                  <label className="fl">State / UT</label>
                  <select className="fs" value={form.state} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}>
                    <option value="">Select state</option>
                    {stateOptions.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="fg">
                  <label className="fl">Education Level</label>
                  <select className="fs" value={form.education} onChange={(e) => setForm((prev) => ({ ...prev, education: e.target.value }))}>
                    <option value="">Select education</option>
                    {Object.keys(educationMap).map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">Location Preference</label>
                  <select className="fs" value={form.locationPref} onChange={(e) => setForm((prev) => ({ ...prev, locationPref: e.target.value }))}>
                    <option value="">Any location</option>
                    {locationOptions.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
              </div>

              <div className="fg">
                <label className="fl">Sector Interests — select all that apply</label>
                <div className="chip-group">
                  {sectorOptions.map((item) => <button key={item.display} type="button" className={`chip ${form.sectors.includes(item.value) ? "on" : ""}`} onClick={() => toggleChip("sectors", item.value)}>{item.display}</button>)}
                </div>
              </div>

              <div className="fg">
                <label className="fl">Your Skills — select all that apply</label>
                <div className="chip-group">
                  {skillOptions.map((item) => <button key={item} type="button" className={`chip ${form.skills.includes(item) ? "on" : ""}`} onClick={() => toggleChip("skills", item)}>{item}</button>)}
                </div>
              </div>

              <div className="form-actions-row">
                <button type="button" className="submit-btn" id="submitBtn" disabled={loading || !form.skills.length || !form.education} onClick={findMatches}>
                  {loading ? <><Loader2 size={18} className="spin" /> Finding internships...</> : <><span id="sbText">✦ Find My Best Internships</span></>}
                </button>
                <button type="button" className="upload-alt-btn" onClick={() => fileInputRef.current?.click()} disabled={uploadingResume}>
                  {uploadingResume ? <><Loader2 size={16} className="spin" /> Reading Resume...</> : <><FileText size={16} /> Upload Resume PDF</>}
                </button>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden-file" onChange={(e) => handleResumeUpload(e.target.files?.[0])} />
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>

      <div className={`page-panel page-workspace ${activePage === "results" ? "page-panel-active" : "page-panel-hidden"}`}>
      <section className="workspace-hero workspace-hero-results">
        <div className="workspace-hero__mesh" />
        <div className="workspace-hero__content">
          <div className="workspace-kicker">Recommendation Results</div>
          <h2 className="workspace-title">YOUR TOP PICKS ARE READY TO REVIEW</h2>
          <p className="workspace-subtitle">Cards, tips, and interview prep now sit inside a dedicated results page so the experience feels more polished after every main action.</p>
          <div className="workspace-actions">
            <button type="button" className="workspace-pill" onClick={goToForm}>
              <ChevronLeft size={16} />
              Back to form
            </button>
            <button type="button" className="workspace-pill workspace-pill-strong" onClick={() => openHomeSection()}>
              <House size={16} />
              Home
            </button>
          </div>
        </div>
      </section>

      <section className={`results-zone ${jobs.length ? "on" : ""}`} id="resultsZone">
        <div className="results-inner">
          <div className="results-top">
            <div>
              <div className="cin-tag"><span className="bar" /> AI Matches</div>
              <h2 className="cin-h2" id="resTitle">Top Picks <em>for {firstName}</em></h2>
            </div>
            <div className="res-badge">✦ <span id="resCount">{jobs.length} matches found</span></div>
          </div>
          <div className="cards-grid" id="cardsGrid">
            {jobs.map((job, index) => {
              const tips = jobTips[job.id || index];
              return (
                <div key={job.id || `${job.title}-${index}`} className={`res-card ${jobs.length ? "appeared" : ""}`}>
                  <div className="rc-rank">#{index + 1}</div>
                  <div className="rc-sector">{job.field || form.sectors[0] || "Top Match"}</div>
                  <div className="rc-logo">{getJobEmoji(job)}</div>
                  <div className="rc-company">{job.company}</div>
                  <div className="rc-role">{job.title}</div>
                  <div className="rc-meta">
                    <span><MapPin size={14} /> {job.location || form.state || "India"}</span>
                    <span><CalendarDays size={14} /> {job.duration || "2-6 months"}</span>
                  </div>
                  <div className="rc-match-row"><span className="rc-match-label">Profile Match</span><span className="rc-match-pct">{job.match_score || 0}%</span></div>
                  <div className="rc-bar"><div className="rc-fill" style={{ width: `${job.match_score || 0}%` }} /></div>
                  <div className="rc-footer">
                    <div className="rc-stipend">{job.stipend || "₹15k/mo"} <span>stipend</span></div>
                    <button type="button" className="rc-btn" onClick={() => openModal(job)}>View & Apply →</button>
                  </div>
                  <div className="rc-extra-actions">
                    <button type="button" className="rc-subbtn" onClick={() => fetchTips(job.id || index, job)}>{tipsLoading === (job.id || index) ? "Loading..." : "Get Tips"}</button>
                    <button type="button" className="rc-subbtn" onClick={() => startInterview(job)}>{interviewLoading ? "Loading..." : "Interview Qs"}</button>
                  </div>
                  {tips?.length ? <div className="rc-tips">{tips.map((tip, tipIndex) => <div key={tipIndex}>{tip}</div>)}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      </div>

      <div className={`page-panel ${activePage === "home" ? "page-panel-active" : "page-panel-hidden"}`}>
      <section className="sec-features" id="features">
        <div className="feat-header">
          <div className="cin-tag sr" style={{ justifyContent: "center" }}><span className="bar" /> Built For Bharat <span className="bar" /></div>
          <h2 className="cin-h2 sr" style={{ textAlign: "center" }}>DESIGNED FOR<br /><em>EVERY INDIAN</em></h2>
        </div>
        <div className="feat-grid">
          {featureCards.map(([glyph, title, desc]) => (
            <div key={title} className="feat-card sr">
              <span className="feat-glyph">{glyph}</span>
              <div className="feat-title">{title}</div>
              <div className="feat-desc">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="lang-banner">
        <div className="lang-track">
          {[...languagesTicker, ...languagesTicker].map((item, index) => (
            <React.Fragment key={`${item}-${index}`}>
              <span className="lang-item">{item}</span>
              <span className="lang-sep">◆</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <footer>
        <div className="footer-inner">
          <div className={theme === "dark" ? "footer-brand-col" : ""}>
            <div className={theme === "dark" ? "footer-wordmark" : "footer-wm"}>PM INTERNSHIP AI</div>
            <div className={theme === "dark" ? "footer-tagline" : "footer-tagline"}>Powered by the PM Internship Scheme · Ministry of Corporate Affairs · Government of India</div>
          </div>
          <div className={theme === "dark" ? "footer-links-col" : "footer-col"}>
            <h4>Navigate</h4>
            <a href="#process">How It Works</a>
            <a href="#form-section">Get Matched</a>
            <a href="#features">Features</a>
          </div>
          <div className={theme === "dark" ? "footer-links-col" : "footer-col"}>
            <h4>Support</h4>
            <a href="https://pminternship.mca.gov.in/" target="_blank" rel="noreferrer">PM Portal</a>
            <a href="#form-section">Recommendation Form</a>
            <a href="#resultsZone">Top Matches</a>
          </div>
        </div>
        <div className="footer-bottom"><div className="footer-copy">AI-based internship recommendation interface aligned to your reference HTML design.</div></div>
      </footer>
      </div>

      <button type="button" className={`float-cta ${chatEnabled && jobs.length > 0 ? "float-cta-chat-offset" : ""}`} onClick={goToForm}><Target size={18} /> Match Me</button>

      {modalOpen && activeJob && (
        <div className="modal-bg open" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={closeModal}><X size={16} /></button>
            <div className={theme === "dark" ? "modal-strip" : "modal-hero-strip"}>
              <div className="modal-co">{activeJob.company}</div>
              <div className="modal-role">{activeJob.title}</div>
              <div className="modal-loc">{activeJob.location || form.state || "India"}</div>
            </div>
            <div className="modal-body">
              <div className="modal-info-grid">
                <div className="mini-info"><span>Match</span><strong>{activeJob.match_score || 0}%</strong></div>
                <div className="mini-info"><span>Stipend</span><strong>{activeJob.stipend || "₹15k/mo"}</strong></div>
              </div>
              <div className="modal-copy">{activeJob.description}</div>
              {activeJob.matched_skills?.length ? <div className="modal-skills-row">{activeJob.matched_skills.map((item) => <span key={item} className="mini-chip">{item}</span>)}</div> : null}
              <div className="modal-actions">
                <a className={theme === "dark" ? "modal-apply" : "modal-apply-btn"} href={activeJob.apply_url || "https://pminternship.mca.gov.in/"} target="_blank" rel="noreferrer"><span>Apply on Portal →</span></a>
                <button type="button" className="rc-subbtn" onClick={() => startInterview(activeJob)}>Interview Questions</button>
                <button type="button" className="rc-subbtn" onClick={() => fetchTips(activeJob.id || activeJob.title, activeJob)}>AI Tips</button>
              </div>
              {jobTips[activeJob.id || activeJob.title]?.length ? <div className="rc-tips modal-tips">{jobTips[activeJob.id || activeJob.title].map((tip, index) => <div key={index}>{tip}</div>)}</div> : null}
            </div>
          </div>
        </div>
      )}

      {chatEnabled && jobs.length > 0 && <AIChatMentorRedesign skills={skills} language="English" />}
      {interviewOpen && <InterviewSimulatorRedesign questions={interviewQuestions} onClose={() => setInterviewOpen(false)} />}
    </div>
  );
}
