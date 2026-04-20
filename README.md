<div align="center">

# 🚀 AI-Based Internship Recommendation Engine

### For the PM Internship Scheme · Government of India

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://docker.com)

**An end-to-end AI-powered platform that matches young Indians — especially rural and first-generation learners — with verified PM Internship Scheme opportunities through resume parsing, skill assessment, trust scoring, and intelligent job matching.**

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [API Reference](#-api-reference) · [Screenshots](#-screenshots) · [Contributing](#-contributing)

---

</div>

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Docker Deployment](#-docker-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About the Project

The **PM Internship Scheme** (launched by the Ministry of Corporate Affairs, Govt. of India) aims to connect **1 crore young Indians** with top 500 CSR companies. This AI engine solves the core problem: **how do rural and semi-urban youth discover the right internship when they lack guidance, internet fluency, or English proficiency?**

This platform provides:

- 🤖 **AI-powered resume parsing** with OCR support for scanned documents
- 📝 **Two-stage skill assessment** (MCQ + Coding challenges) with anti-cheating detection
- 🔒 **Trust Score Engine** that verifies skills against GitHub repos and LinkedIn profiles
- 🎯 **Smart job matching** with hyperlocal recommendations
- 🌐 **12 Indian language support** for rural accessibility
- 📱 **Cross-platform** — Web + Mobile (React/Vite)

---

## ✨ Features

### 🧠 AI Resume Analysis
| Feature | Description |
|---------|------------|
| **OCR Resume Parsing** | Upload PDF, DOCX, or image resumes. Tesseract OCR extracts text from scanned documents |
| **Skill Extraction** | Groq/Gemini AI identifies 5-8 job-relevant skills from resume content |
| **Contact Signal Extraction** | AI + regex fallback extracts GitHub URLs, LinkedIn profiles, and emails automatically |
| **ATS Score** | Applicant Tracking System compatibility score with improvement tips |
| **Resume Improver** | Section-by-section suggestions to strengthen the resume |

### 🏆 Trust Score Engine
| Component | Weight | How It Works |
|-----------|--------|-------------|
| **Assessment Score** | 55% | Two-stage quiz (basics + deep theory/coding) with cheating penalty |
| **GitHub Verification** | 20% | Fetches repos via GitHub API, checks languages, activity, and cross-matches resume projects |
| **LinkedIn Verification** | 12% | Validates URL format and reachability |
| **Account Verification** | 8% | Email validation with `.edu` / `.ac.in` bonus |
| **Profile Completeness** | 5% | Skills + GitHub + LinkedIn + Email completeness |

### 🎯 Smart Job Matching
- **Firecrawl-powered scraping** of PM Internship portal for real-time listings
- **TF-IDF + cosine similarity** scoring between candidate skills and job requirements
- **Location-aware matching** with hyperlocal district-level recommendations
- **Sector filtering** across Manufacturing, Technology, Healthcare, Agriculture, Finance, and more

### 📱 Cross-Platform
- **Web App** — Full-featured React + Vite SPA with glassmorphism UI, dark mode, and animated transitions
- **Mobile App** — Optimized React + Vite mobile build with touch-friendly interface
- **Responsive Design** — Works seamlessly from rural feature phones to desktop browsers

### 🌐 Multilingual Support (12 Languages)
Hindi · Telugu · Tamil · Bengali · Marathi · Gujarati · Punjabi · Kannada · Malayalam · Odia · Assamese · English

### 🔐 Anti-Cheating System
- Tab switch detection
- Copy-paste monitoring
- Time anomaly analysis
- Automated integrity scoring with penalty deductions

### 🤖 AI Tools
- **AI Chat Mentor** — Context-aware career guidance chatbot
- **Interview Simulator** — Company-specific mock interview questions
- **Code Executor** — Sandboxed code execution environment with Monaco editor
- **Voice AI Agent** — OmniDimension-powered phone-based career guidance for rural users

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │   Web Frontend   │    │   Mobile App     │                   │
│  │   React + Vite   │    │   React + Vite   │                   │
│  │   Tailwind CSS   │    │   Framer Motion  │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                             │
│           └───────────┬───────────┘                             │
└───────────────────────┼─────────────────────────────────────────┘
                        │ REST API (JSON)
┌───────────────────────┼─────────────────────────────────────────┐
│                  BACKEND LAYER                                  │
│  ┌────────────────────▼─────────────────────────────────┐       │
│  │              FastAPI Application                      │       │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────────────┐ │       │
│  │  │ Resume   │ │ Trust     │ │ Job Matching Engine   │ │       │
│  │  │ Parser   │ │ Scorer    │ │ TF-IDF + Cosine Sim  │ │       │
│  │  └──────────┘ └───────────┘ └──────────────────────┘ │       │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────────────┐ │       │
│  │  │ Quiz     │ │ Code      │ │ Anti-Cheat           │ │       │
│  │  │ Engine   │ │ Executor  │ │ Telemetry            │ │       │
│  │  └──────────┘ └───────────┘ └──────────────────────┘ │       │
│  └──────────────────────────────────────────────────────┘       │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────────────┐
│               EXTERNAL SERVICES                                 │
│  ┌─────────┐ ┌────────┐ ┌───────────┐ ┌───────────┐            │
│  │ Groq AI │ │ Gemini │ │ Firecrawl │ │ GitHub    │            │
│  │ (Fast)  │ │(Backup)│ │ (Scraper) │ │    API    │            │
│  └─────────┘ └────────┘ └───────────┘ └───────────┘            │
│  ┌──────────────┐ ┌─────────────┐ ┌──────────────────┐         │
│  │ OmniDimension│ │ Google      │ │ Firebase Auth    │         │
│  │ (Voice AI)   │ │ Translate   │ │ (Login)          │         │
│  └──────────────┘ └─────────────┘ └──────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **FastAPI** | High-performance async REST API framework |
| **Groq API** | Primary LLM provider (fast inference for skill extraction, quiz generation) |
| **Google Gemini** | Fallback LLM provider |
| **Tesseract OCR** | Optical character recognition for scanned resumes |
| **pdfplumber + PyPDF** | PDF text extraction |
| **scikit-learn** | TF-IDF vectorization and cosine similarity for job matching |
| **Firecrawl** | High-speed web scraping for internship listings |
| **deep-translator** | Multilingual translation engine |
| **OmniDimension** | Voice AI agent for phone-based rural access |
| **PostgreSQL** | Optional database for production deployment |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19** | UI component framework |
| **Vite 8** | Lightning-fast build tool and dev server |
| **Tailwind CSS 4** | Utility-first CSS framework |
| **Framer Motion** | Smooth animations and page transitions |
| **Monaco Editor** | VS Code-grade code editor for coding challenges |
| **Lucide React** | Premium icon library |
| **Firebase Auth** | Google OAuth sign-in |
| **Axios** | HTTP client for API communication |

---

## ⚡ Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- **Tesseract OCR** — [Download for Windows](https://github.com/UB-Mannheim/tesseract/wiki)
- **Poppler** — [Download for Windows](https://github.com/oschwartz10612/poppler-windows/releases) (add `bin/` to PATH)

### 1. Clone the Repository

```bash
git clone https://github.com/SkTheAdvanceGamer/Al-Based-Internship-Recommendation-Engine-for-PM-Internship-Scheme.git
cd Al-Based-Internship-Recommendation-Engine-for-PM-Internship-Scheme
```

### 2. Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables (see Environment Variables section)
cp .env.example .env.txt
# Edit .env.txt with your API keys

# Start the FastAPI server
uvicorn main:app --reload
```

> Wait for `[STARTUP] Server is ready` before proceeding.

### 3. Frontend Setup (Web App)

```bash
# Open a new terminal
cd frontend
npm install
npm run dev
```

> Open `http://localhost:5173` in your browser.

### 4. Mobile App Setup (Optional)

```bash
# Open another terminal
cd mobile-app
npm install
npm run dev
```

> Open `http://localhost:5174` in a mobile browser or responsive mode.

---

## 🔑 Environment Variables

Create a `.env.txt` file in the project root:

```env
# Required — At least one AI provider
GROQ_API_KEY=gsk_your_groq_key_here
GEMINI_API_KEY=AIzaSy_your_gemini_key_here

# Optional — Enhanced features
FIRECRAWL_API_KEY=fc-your_firecrawl_key_here
OMNIDIMENSION_API_KEY=your_omnidimension_key_here
OMNIDIMENSION_AGENT_ID=your_agent_id_here
GITHUB_TOKEN=ghp_your_github_token_here
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `GROQ_API_KEY` | ✅ | Primary AI provider (fast skill extraction, quiz generation) |
| `GEMINI_API_KEY` | ⚠️ Fallback | Backup AI provider when Groq is unavailable |
| `FIRECRAWL_API_KEY` | Optional | High-speed scraping of PM Internship portal |
| `OMNIDIMENSION_API_KEY` | Optional | Voice AI agent for phone-based career guidance |
| `GITHUB_TOKEN` | Optional | Increases GitHub API rate limit for trust verification |

---

## 📡 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze-resume` | Upload resume for OCR parsing, skill extraction, and contact signal detection |
| `POST` | `/manual-profile` | Submit skills manually without a resume |
| `POST` | `/recommended-jobs` | Get AI-matched internship recommendations |
| `POST` | `/compute-trust-score` | Calculate trust score with GitHub/LinkedIn/Email verification |

### Assessment Engine

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/generate-test-1` | Generate MCQ-based skill assessment questions |
| `POST` | `/generate-test-2` | Generate coding challenge problems |
| `POST` | `/execute-code` | Execute code in sandboxed environment |
| `POST` | `/calculate-cheating-score` | Analyze test-taking behavior for integrity |
| `POST` | `/generate-analytics` | Generate performance analytics dashboard |

### AI Tools

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/interview-prep` | Generate company-specific interview questions |
| `POST` | `/agent-chat` | AI mentor chatbot for career guidance |
| `POST` | `/job-tips` | Get tactical tips for specific job applications |
| `POST` | `/translate` | Translate content to 12 Indian regional languages |

### Resume Enhancement

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/resume-improver` | Get ATS score + improvement suggestions |
| `POST` | `/ats-score` | Calculate ATS compatibility score |
| `POST` | `/resume-suggestions` | Section-by-section resume improvements |

### Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/github-verification` | Verify GitHub profile and match skills against repos |
| `POST` | `/plagiarism-detection` | Detect code plagiarism in submissions |

### Infrastructure

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/` | Health check and server status |
| `POST` | `/refresh-internships` | Refresh internship listings from PM portal |
| `POST` | `/firecrawl-scrape` | Scrape URL via Firecrawl API |
| `POST` | `/course-recommendations` | Get personalized course recommendations |

---

## 📁 Project Structure

```
Al-Based-Internship-Recommendation-Engine/
│
├── main.py                    # FastAPI backend (all endpoints, AI logic, trust scoring)
├── fetch_internships.py       # Internship scraper (Firecrawl + Playwright + Requests fallback)
├── internship_founder.py      # Internship data processing utilities
├── jobs.json                  # Cached internship listings
├── schema.sql                 # PostgreSQL database schema
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Docker container configuration
├── docker-compose.yml         # Multi-service Docker orchestration
├── .env.txt                   # Environment variables (API keys)
├── .env.example               # Template for environment variables
├── LICENSE                    # MIT License
│
├── frontend/                  # Web application
│   ├── src/
│   │   ├── AppHtmlMatch.jsx           # Main app component (landing, form, results)
│   │   ├── main.jsx                   # React entry point
│   │   ├── theme.css                  # Design system tokens
│   │   ├── htmlMatch.css              # Landing page styles
│   │   ├── index.css                  # Global styles
│   │   ├── firebase.js                # Firebase auth configuration
│   │   └── components/
│   │       ├── onboarding/
│   │       │   ├── OnboardingWizard.tsx        # 3-step wizard orchestrator
│   │       │   ├── Step1_SkillIngestion.tsx    # Resume upload + skill editing
│   │       │   ├── Step2_Assessment.tsx        # MCQ + coding assessment
│   │       │   ├── Step3_ResultsDashboard.tsx  # Trust score + matches dashboard
│   │       │   ├── LanguageSelector.tsx        # 12-language dropdown
│   │       │   ├── onboardingApi.ts            # API client functions
│   │       │   └── types.ts                   # TypeScript interfaces
│   │       ├── AIChatMentorRedesign.jsx       # AI career chatbot
│   │       ├── InterviewSimulatorRedesign.jsx # Mock interview simulator
│   │       ├── CodingScreen.jsx               # Monaco code editor
│   │       └── VoiceWidget.jsx                # Voice AI call widget
│   └── package.json
│
└── mobile-app/                # Mobile application
    ├── src/
    │   ├── App.jsx                    # Mobile app main component
    │   ├── App.css                    # Neon theme styles
    │   ├── firebase.js                # Firebase auth
    │   └── components/
    │       ├── Header.jsx             # Navigation + language selector
    │       ├── AIChatMentor.jsx       # Mobile AI chatbot
    │       ├── InterviewSimulator.jsx # Mobile interview prep
    │       ├── LeetcodeHub.jsx        # Coding challenges
    │       └── LoginScreen.jsx        # Authentication screen
    └── package.json
```

---

## 🐳 Docker Deployment

### Quick Deploy

```bash
# Start backend + PostgreSQL
docker-compose up -d

# Build frontend (optional, for production)
docker-compose --profile build run frontend
```

### Production Build

```bash
# Build the Docker image
docker build -t pm-intern-ai .

# Run with environment variables
docker run -p 8000:8000 --env-file .env.txt pm-intern-ai
```

---

## 🔄 User Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Step 1     │     │   Step 2     │     │   Step 3     │     │   Step 4     │
│              │     │              │     │              │     │              │
│  Upload      │────▶│  Take Skill  │────▶│  View Trust  │────▶│  Apply to    │
│  Resume      │     │  Assessment  │     │  Dashboard   │     │  Internships │
│              │     │              │     │              │     │              │
│ • OCR Parse  │     │ • 10 MCQs    │     │ • Trust Score│     │ • Top 3-5    │
│ • Extract    │     │ • 3 Coding   │     │ • GitHub ✓   │     │   Matches    │
│   Skills     │     │   Problems   │     │ • LinkedIn ✓ │     │ • Apply Link │
│ • Detect     │     │ • Anti-Cheat │     │ • ATS Score  │     │ • Interview  │
│   GitHub/LI  │     │   Monitor    │     │ • Skill Gaps │     │   Prep       │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Shubham Kumar Singh**

- GitHub: [@SkTheAdvanceGamer](https://github.com/SkTheAdvanceGamer)

---

<div align="center">

**Built with ❤️ for Bharat 🇮🇳**

*Empowering rural youth with AI-driven career opportunities through the PM Internship Scheme*

</div>
