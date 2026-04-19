import { useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle2, Code2, Loader2, Trophy, Play } from "lucide-react";
import { generateAssessmentBundle, executeCode, calculateCheatingScore } from "./onboardingApi";
import { MonacoCodeEditor } from "./MonacoCodeEditor";
import { CheatingDetector } from "./CheatingDetector";
import type { AssessmentBundle, StageScores, StageTab } from "./types";

type Step2AssessmentProps = {
  skills: string[];
  onBack: () => void;
  onComplete: (scores: StageScores) => void;
};

export function Step2_Assessment({ skills, onBack, onComplete }: Step2AssessmentProps) {
  const [activeTab, setActiveTab] = useState<StageTab>("basics");
  const [bundle, setBundle] = useState<AssessmentBundle | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [codeByChallenge, setCodeByChallenge] = useState<Record<string, string>>({});
  const [executionResults, setExecutionResults] = useState<Record<string, { stdout: string; stderr: string; error: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [isTest2Skipped, setIsTest2Skipped] = useState(false);
  
  // Cheating Telemetry
  const [telemetry, setTelemetry] = useState({ tabSwitches: 0, copyPasteCount: 0 });
  const [startTime] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    generateAssessmentBundle(skills).then((nextBundle) => {
      if (!alive) return;
      setBundle(nextBundle);
      setCodeByChallenge(
        Object.fromEntries(nextBundle.deep.map((challenge) => [challenge.id, challenge.starterCode])),
      );
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [skills]);

  const completion = useMemo(() => {
    if (!bundle) return { basics: 0, deep: 0 };
    const answeredBasics = bundle.basics.filter((question) => answers[question.id]?.trim()).length;
    const solvedDeep = bundle.deep.filter((challenge) => codeByChallenge[challenge.id]?.trim().length > 10).length;
    return {
      basics: Math.round((answeredBasics / Math.max(bundle.basics.length, 1)) * 100),
      deep: Math.round((solvedDeep / Math.max(bundle.deep.length, 1)) * 100),
    };
  }, [answers, bundle, codeByChallenge]);

  const handleRunCode = async (challengeId: string) => {
    const code = codeByChallenge[challengeId] || "";
    setExecutionResults(prev => ({ ...prev, [challengeId]: { stdout: "Executing...", stderr: "", error: false } }));
    const result = await executeCode(code, "python");
    setExecutionResults(prev => ({ ...prev, [challengeId]: result }));
  };

  const submitAssessment = async () => {
    if (!bundle) return;
    
    // Calculate cheating score
    const timeTakenSeconds = Math.floor((Date.now() - startTime) / 1000);
    const cheatScore = await calculateCheatingScore({
      tabSwitches: telemetry.tabSwitches,
      copyPasteCount: telemetry.copyPasteCount,
      timeTakenSeconds
    });

    const correctBasics = bundle.basics.reduce((score, question) => {
      const userAnswer = (answers[question.id] || "").trim().toLowerCase();
      if (!userAnswer) return score;
      if (question.type === "short") return score + (userAnswer.length > 18 ? 1 : 0.5);
      return score + (userAnswer === (question.answer || "").trim().toLowerCase() ? 1 : 0);
    }, 0);

    const stage1 = Math.round((correctBasics / Math.max(bundle.basics.length, 1)) * 100);
    
    let stage2 = 0;
    if (!isTest2Skipped) {
      const deepScore = bundle.deep.reduce((score, challenge) => {
        const code = (codeByChallenge[challenge.id] || "").toLowerCase();
        const hitCount = challenge.expectedSignals.filter((signal) => code.includes(signal.toLowerCase())).length;
        const implementationBonus = code.length > 30 ? 20 : 0;
        return score + Math.min(100, Math.round((hitCount / Math.max(challenge.expectedSignals.length, 1)) * 80 + implementationBonus));
      }, 0);
      stage2 = Math.round(deepScore / Math.max(bundle.deep.length, 1));
    }

    // Combine and apply anti-cheat penalty
    let total = isTest2Skipped 
      ? Math.round(stage1 * 0.7) // Cap max score if skipped
      : Math.round(stage1 * 0.45 + stage2 * 0.55);
      
    // Apply cheating penalty
    total = Math.max(0, total - Math.floor(cheatScore / 2));

    onComplete({ stage1, stage2, total, cheatingScore: cheatScore });
  };

  if (loading || !bundle) {
    return (
      <div className="grid min-h-[460px] place-items-center rounded-[2rem] border border-[var(--border)] bg-white/90 p-10 text-center shadow-xl dark:bg-white/5">
        <div>
          <Loader2 className="mx-auto mb-5 animate-spin text-orange-600" size={38} />
          <h3 className="font-display text-3xl font-black text-slate-950 dark:text-white">Generating two-stage assessment</h3>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Building basics, deep theory, and CP tasks from your verified skills.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-[var(--border)] bg-white/90 p-5 shadow-2xl shadow-slate-950/5 dark:bg-white/5 md:p-7 relative">
      <CheatingDetector onTelemetryUpdate={(data) => setTelemetry(data)} />
      
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-600">Dynamic assessment</p>
          <h3 className="mt-2 font-display text-4xl font-black text-slate-950 dark:text-white">
            Prove the trust score
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Test 1 (Basics) is mandatory. Test 2 (Deep + CP) checks reasoning and implementation for high-quality matching, but can be skipped.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-100 p-2 dark:bg-black/30">
          <button
            type="button"
            onClick={() => setActiveTab("basics")}
            className={`rounded-xl px-4 py-3 text-sm font-black transition ${
              activeTab === "basics" ? "bg-white text-orange-600 shadow-lg dark:bg-white dark:text-slate-950" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Test 1: Basics {completion.basics}%
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("deep")}
            className={`rounded-xl px-4 py-3 text-sm font-black transition ${
              activeTab === "deep" ? "bg-white text-orange-600 shadow-lg dark:bg-white dark:text-slate-950" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Test 2: Deep {isTest2Skipped ? "(Skipped)" : `${completion.deep}%`}
          </button>
        </div>
      </div>

      {activeTab === "basics" ? (
        <div className="mt-8 grid gap-4">
          {bundle.basics.map((question, index) => (
            <article key={question.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                    Q{index + 1} - {question.skill}
                  </span>
                  <h4 className="mt-2 text-lg font-black text-slate-950 dark:text-white">{question.prompt}</h4>
                </div>
                <Brain className="shrink-0 text-orange-500" />
              </div>

              {question.type === "mcq" && question.options?.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAnswers((previous) => ({ ...previous, [question.id]: option }))}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition hover:-translate-y-1 ${
                        answers[question.id] === option
                          ? "border-orange-400 bg-orange-50 text-orange-700 shadow-lg dark:bg-orange-500/10"
                          : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[question.id] || ""}
                  onChange={(event) => setAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))}
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-black/20 dark:text-white"
                  placeholder="Write a concise answer..."
                />
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-6">
          {!isTest2Skipped ? (
            <>
              <div className="flex justify-end mb-2">
                 <button onClick={() => setIsTest2Skipped(true)} className="text-sm font-bold text-slate-500 hover:text-slate-800 underline">Skip Test 2 (Max score will be capped)</button>
              </div>
              {bundle.deep.map((challenge) => (
                <article key={challenge.id} className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-950">
                      <Code2 size={15} />
                      {challenge.difficulty}
                    </div>
                    <h4 className="font-display text-3xl font-black text-slate-950 dark:text-white">{challenge.title}</h4>
                    <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{challenge.prompt}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {challenge.companyTargets.map((company) => (
                        <span
                          key={company}
                          className="rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-orange-700 dark:border-orange-300/20 dark:bg-orange-300/10 dark:text-orange-200"
                        >
                          {company}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <MonacoCodeEditor
                      language="python"
                      value={codeByChallenge[challenge.id] || challenge.starterCode}
                      onChange={(value) => setCodeByChallenge((previous) => ({ ...previous, [challenge.id]: value }))}
                    />
                    <div className="flex justify-end">
                      <button onClick={() => handleRunCode(challenge.id)} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-700 text-sm font-bold">
                        <Play size={14} /> Run Code
                      </button>
                    </div>
                    {executionResults[challenge.id] && (
                      <div className={`mt-2 p-3 rounded-xl text-xs font-mono ${executionResults[challenge.id].error ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-100 text-slate-800 dark:bg-black/40 dark:text-slate-300'}`}>
                        {executionResults[challenge.id].stdout && <div>{executionResults[challenge.id].stdout}</div>}
                        {executionResults[challenge.id].stderr && <div className="text-red-500">{executionResults[challenge.id].stderr}</div>}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </>
          ) : (
             <div className="text-center py-10">
               <p className="text-lg font-bold text-slate-600 dark:text-slate-300">You have opted to skip Test 2.</p>
               <button onClick={() => setIsTest2Skipped(false)} className="mt-4 text-orange-600 hover:underline">Changed your mind? Take Test 2</button>
             </div>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-600 transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
        >
          Back
        </button>
        <button
          type="button"
          onClick={submitAssessment}
          className="inline-flex items-center justify-center gap-3 rounded-2xl bg-orange-600 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-orange-500/20 transition hover:-translate-y-1 hover:bg-orange-500"
        >
          <CheckCircle2 size={18} />
          Submit & Generate Dashboard
        </button>
      </div>
    </div>
  );
}
