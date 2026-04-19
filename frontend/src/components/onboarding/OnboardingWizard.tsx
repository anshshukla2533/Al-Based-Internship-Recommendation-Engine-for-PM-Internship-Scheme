import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ClipboardCheck, FileSearch, Gauge, Loader2, Sparkles } from "lucide-react";
import {
  computeTrustAssessment,
  createLearningResources,
  createSkillGaps,
  fetchCourseRecommendations,
  fetchInternshipMatches,
  fetchResumeImprover,
  generateAnalytics,
} from "./onboardingApi";
import { Step1_SkillIngestion } from "./Step1_SkillIngestion";
import { Step2_Assessment } from "./Step2_Assessment";
import { Step3_ResultsDashboard } from "./Step3_ResultsDashboard";
import { LanguageSelector } from "./LanguageSelector";
import type { InternshipMatch, OnboardingProfile, StageScores, WizardResults, WizardStep } from "./types";

type OnboardingWizardProps = {
  defaultProfile?: Partial<OnboardingProfile>;
  onMatchesReady?: (payload: { skills: string[]; matches: InternshipMatch[]; totalScore: number }) => void;
  onOpenMatches?: () => void;
};

const wizardSteps: Array<{ step: WizardStep; title: string; body: string; icon: typeof FileSearch }> = [
  {
    step: 1,
    title: "Ingest skills",
    body: "Resume OCR or manual skill verification",
    icon: FileSearch,
  },
  {
    step: 2,
    title: "Assess trust",
    body: "Basics plus deep theory and CP",
    icon: ClipboardCheck,
  },
  {
    step: 3,
    title: "Route outcome",
    body: "Learning redirect or verified matches",
    icon: Gauge,
  },
];

export function OnboardingWizard({ defaultProfile, onMatchesReady, onOpenMatches }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [skills, setSkills] = useState<string[]>([]);
  const [scores, setScores] = useState<StageScores | null>(null);
  const [results, setResults] = useState<WizardResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [profileSignals, setProfileSignals] = useState({
    githubUrl: defaultProfile?.githubUrl || "",
    linkedinUrl: defaultProfile?.linkedinUrl || "",
    email: defaultProfile?.email || "",
    targetRole: defaultProfile?.targetRole || "PM Internship",
  });
  const [currentLang, setCurrentLang] = useState("en");

  const profile = useMemo<OnboardingProfile>(
    () => ({
      location: defaultProfile?.location || "India",
      education: defaultProfile?.education || "Graduate",
      preferredSector: defaultProfile?.preferredSector || "Any",
      githubUrl: profileSignals.githubUrl,
      linkedinUrl: profileSignals.linkedinUrl,
      email: profileSignals.email,
      targetRole: profileSignals.targetRole,
    }),
    [
      defaultProfile?.education,
      defaultProfile?.location,
      defaultProfile?.preferredSector,
      profileSignals.email,
      profileSignals.githubUrl,
      profileSignals.linkedinUrl,
      profileSignals.targetRole,
    ],
  );

  const verifiedSkillCount = skills.length;

  const completeAssessment = async (nextScores: StageScores) => {
    setScores(nextScores);
    setCurrentStep(3);
    setLoadingResults(true);

    const skillGaps = createSkillGaps(skills, nextScores.stage1, nextScores.stage2);
    const weakSkills = skillGaps.map(g => g.skill);

    const [resources, matches, analyticsData, trustAssessment, resumeImprover] = await Promise.all([
      fetchCourseRecommendations(skills, weakSkills),
      fetchInternshipMatches(skills, profile),
      generateAnalytics(skills, nextScores.total, nextScores.cheatingScore || 0),
      computeTrustAssessment(profile, skills, nextScores.total, nextScores.cheatingScore || 0, resumeText),
      fetchResumeImprover(resumeText, skills, profileSignals.targetRole || "PM Internship"),
    ]);

    const nextResults = {
      scores: nextScores,
      skillGaps,
      resources,
      matches,
      analytics: analyticsData,
      cheatingScore: nextScores.cheatingScore || 0,
      trustAssessment,
      resumeImprover,
    };

    setResults(nextResults);
    setLoadingResults(false);

    if (matches.length) {
      onMatchesReady?.({ skills, matches, totalScore: nextScores.total });
    }
  };

  const restartWizard = () => {
    setCurrentStep(1);
    setScores(null);
    setResults(null);
    setLoadingResults(false);
  };

  return (
    <section className="relative overflow-hidden rounded-[2.2rem] border border-[var(--border)] bg-[var(--bg2)] p-4 shadow-2xl shadow-slate-950/10 dark:bg-white/[0.03] md:p-6">
      <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="relative mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-orange-700 dark:border-orange-300/20 dark:bg-orange-300/10 dark:text-orange-200">
            <Sparkles size={15} />
            Resume Trust Score Wizard
          </div>
          <h3 className="mt-4 font-display text-4xl font-black leading-none text-slate-950 dark:text-white md:text-5xl">
            Verify, assess, then match
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            One guided flow for OCR resume parsing, editable skill verification, two-stage assessment, and job-ready recommendations.
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <LanguageSelector currentLang={currentLang} onLanguageChange={setCurrentLang} />
          <div className="grid gap-2 rounded-3xl border border-[var(--border)] bg-white/80 p-4 text-xs font-black uppercase tracking-[0.18em] text-slate-600 dark:bg-black/20 dark:text-slate-300">
          <div className="flex justify-between gap-6"><span>Location</span><strong>{profile.location}</strong></div>
          <div className="flex justify-between gap-6"><span>Education</span><strong>{profile.education}</strong></div>
          <div className="flex justify-between gap-6"><span>Sector</span><strong>{profile.preferredSector}</strong></div>
          </div>
        </div>
      </div>

      <div className="relative mb-6 grid gap-3 lg:grid-cols-3">
        {wizardSteps.map((item) => {
          const Icon = item.icon;
          const isActive = item.step === currentStep;
          const isComplete = item.step < currentStep;

          return (
            <div
              key={item.step}
              className={`rounded-3xl border p-4 transition ${
                isActive
                  ? "border-orange-300 bg-white shadow-xl shadow-orange-500/10 dark:bg-white/10"
                  : isComplete
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-300/20 dark:bg-emerald-300/10"
                    : "border-[var(--border)] bg-white/60 dark:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                    isActive
                      ? "bg-orange-600 text-white"
                      : isComplete
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                  }`}
                >
                  {isComplete ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">
                    Step {item.step}
                  </p>
                  <h4 className="font-black text-slate-950 dark:text-white">{item.title}</h4>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</p>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, filter: "blur(10px)" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {currentStep === 1 && (
              <Step1_SkillIngestion
                skills={skills}
                onSkillsChange={setSkills}
                profileSignals={profileSignals}
                onProfileSignalsChange={setProfileSignals}
                onResumeTextExtracted={setResumeText}
                onContinue={() => setCurrentStep(2)}
              />
            )}

            {currentStep === 2 && (
              <Step2_Assessment
                skills={skills}
                onBack={() => setCurrentStep(1)}
                onComplete={completeAssessment}
              />
            )}

            {currentStep === 3 && (
              loadingResults || !results ? (
                <div className="grid min-h-[420px] place-items-center rounded-[2rem] border border-[var(--border)] bg-white/90 p-10 text-center shadow-xl dark:bg-white/5">
                  <div>
                    <Loader2 className="mx-auto mb-5 animate-spin text-orange-600" size={38} />
                    <h3 className="font-display text-3xl font-black text-slate-950 dark:text-white">
                      Building trust dashboard
                    </h3>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      Checking {verifiedSkillCount} verified skills against courses and internship matches.
                    </p>
                  </div>
                </div>
              ) : (
                <Step3_ResultsDashboard
                  results={results}
                  onRestart={restartWizard}
                  onOpenMatches={onOpenMatches || (() => undefined)}
                />
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {scores ? (
        <div className="relative mt-5 rounded-3xl border border-[var(--border)] bg-white/70 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
          Current assessment score: <strong className="text-slate-950 dark:text-white">{scores.total}%</strong>
        </div>
      ) : null}
    </section>
  );
}
