import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  LockKeyhole,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Unlock,
} from "lucide-react";
import type { InternshipMatch, WizardResults } from "./types";

type Step3ResultsDashboardProps = {
  results: WizardResults;
  onRestart: () => void;
  onOpenMatches: () => void;
};

export function Step3_ResultsDashboard({ results, onRestart, onOpenMatches }: Step3ResultsDashboardProps) {
  const analytics = results.analytics || {};
  const cheatingScore = results.cheatingScore || 0;
  const passed = results.scores.total >= 70;
  const trustAssessment = results.trustAssessment;
  const resumeImprover = results.resumeImprover;
  const hasResumeImproverData = Boolean(
    resumeImprover && (
      resumeImprover.atsScore !== undefined
      || (resumeImprover.missingKeywords || []).length
      || (resumeImprover.tips || []).length
      || (resumeImprover.suggestions || []).length
    ),
  );

  return (
    <div className="space-y-6">
      {/* Score Header */}
      <section className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-2xl md:p-8 ${
        passed
          ? "border-emerald-200 bg-emerald-50/90 shadow-emerald-500/10 dark:border-emerald-300/20 dark:bg-emerald-300/10"
          : "border-amber-200 bg-amber-50/90 shadow-amber-500/10 dark:border-amber-300/20 dark:bg-amber-300/10"
      }`}>
        <div className={`absolute right-0 top-0 h-56 w-56 rounded-full blur-3xl ${
          passed ? "bg-emerald-300/25" : "bg-amber-300/30"
        }`} />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${
              passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200"
            }`}>
              {passed ? <CheckCircle2 size={25} /> : <TriangleAlert size={24} />}
            </div>
            <p className={`mt-5 text-xs font-black uppercase tracking-[0.28em] ${
              passed ? "text-emerald-700 dark:text-emerald-200" : "text-amber-700 dark:text-amber-200"
            }`}>
              {passed ? "Passed trust assessment" : "Learning route unlocked"}
            </p>
            <h3 className="mt-3 font-display text-4xl font-black text-slate-950 dark:text-white">
              {passed ? "Verified matches are ready" : "Trust score needs a short sprint"}
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700 dark:text-slate-200">
              {passed
                ? "Your trust score is high enough to unlock hyperlocal and remote opportunities, plus company-specific interview prep."
                : "Your score is not low forever. The platform has still found matches and is redirecting you toward skills that can raise confidence."}
            </p>
          </div>
          <div className="grid min-w-[260px] gap-3 rounded-[1.6rem] bg-white p-4 dark:bg-black/25">
            <ScoreRow label="Basics" value={results.scores.stage1} />
            <ScoreRow label="Deep theory + CP" value={results.scores.stage2} />
            <ScoreRow label="Total trust score" value={results.scores.total} highlight />
          </div>
        </div>
      </section>

      {/* Analytics Dashboard */}
      {analytics && (analytics.strengths?.length > 0 || analytics.weaknesses?.length > 0) && (
        <section className="relative overflow-hidden rounded-[2rem] border border-blue-200 bg-blue-50/90 p-6 shadow-xl dark:border-blue-300/20 dark:bg-blue-900/10 md:p-8">
          <h3 className="font-display text-2xl font-black text-slate-950 dark:text-white mb-4">Analytics Dashboard</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Strengths</h4>
              <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
                {(analytics.strengths || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Areas for Improvement</h4>
              <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
                {(analytics.weaknesses || []).map((w: string, i: number) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
          {cheatingScore > 0 && (
            <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-xl text-sm font-bold dark:bg-red-900/30 dark:text-red-300">
              Integrity Note: A penalty of {Math.floor(cheatingScore / 2)} points was applied due to abnormal test behavior.
            </div>
          )}
        </section>
      )}

      {/* Trust Breakdown */}
      {trustAssessment && (
        <section className="rounded-[2rem] border border-purple-200 bg-purple-50/80 p-6 shadow-xl dark:border-purple-300/20 dark:bg-purple-900/10 md:p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-purple-700 dark:text-purple-200">
                Trust verification
              </p>
              <h3 className="mt-2 font-display text-3xl font-black text-slate-950 dark:text-white">
                {trustAssessment.trustLevel} confidence profile
              </h3>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-300/15 dark:text-purple-200">
              <LockKeyhole size={20} />
            </span>
          </div>
          <div className="grid gap-3 rounded-3xl bg-white p-4 dark:bg-black/25">
            <ScoreRow label="Computed trust score" value={trustAssessment.trustScore} highlight />
            {Object.entries(trustAssessment.breakdown || {}).map(([key, value]) => (
              <ScoreRow key={key} label={formatMetricLabel(key)} value={Number(value || 0)} />
            ))}
          </div>
          {(trustAssessment.recommendations || []).length > 0 && (
            <div className="mt-5 rounded-2xl border border-purple-200 bg-white p-4 dark:border-purple-300/20 dark:bg-white/5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-700 dark:text-purple-200">
                Trust boosters
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-200">
                {(trustAssessment.recommendations || []).map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Resume Improver */}
      {resumeImprover && hasResumeImproverData && (
        <section className="rounded-[2rem] border border-teal-200 bg-teal-50/80 p-6 shadow-xl dark:border-teal-300/20 dark:bg-teal-900/10 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700 dark:text-teal-200">
            Resume improver
          </p>
          <h3 className="mt-2 font-display text-3xl font-black text-slate-950 dark:text-white">
            ATS and profile enhancement
          </h3>
          <div className="mt-5 grid gap-3 rounded-3xl bg-white p-4 dark:bg-black/25">
            <ScoreRow label="ATS score" value={Number(resumeImprover.atsScore ?? 0)} highlight />
          </div>
          {(resumeImprover.missingKeywords || []).length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700 dark:text-teal-200">
                Missing keywords
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(resumeImprover.missingKeywords || []).slice(0, 12).map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-bold text-teal-700 dark:border-teal-300/20 dark:bg-white/5 dark:text-teal-200"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(resumeImprover.tips || []).length > 0 && (
            <div className="mt-5 rounded-2xl border border-teal-200 bg-white p-4 dark:border-teal-300/20 dark:bg-white/5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700 dark:text-teal-200">
                ATS tips
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-200">
                {(resumeImprover.tips || []).map((tip, index) => (
                  <li key={`${tip}-${index}`}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          {(resumeImprover.suggestions || []).length > 0 && (
            <div className="mt-5 grid gap-3">
              {(resumeImprover.suggestions || []).map((suggestion, index) => (
                <article
                  key={`${suggestion.section}-${index}`}
                  className="rounded-2xl border border-teal-200 bg-white p-4 dark:border-teal-300/20 dark:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-900 dark:text-white">
                      {suggestion.section}
                    </h4>
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-teal-700 dark:bg-teal-300/15 dark:text-teal-200">
                      {suggestion.priority}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{suggestion.current_issue}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{suggestion.improvement}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Skill Gaps */}
      {results.skillGaps.length > 0 && (
        <section>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700 dark:text-amber-200 mb-4">
            Skill gaps identified
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {results.skillGaps.map((gap) => (
              <article
                key={`${gap.skill}-${gap.reason}`}
                className="rounded-3xl border border-amber-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-black text-slate-950 dark:text-white">{gap.skill}</h4>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-300/15 dark:text-amber-200">
                    {gap.priority}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{gap.reason}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Courses */}
      {results.resources.length > 0 && (
        <section>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-200 mb-4">
            Recommended courses ({results.resources.length})
          </p>
          <div className="grid gap-3">
            {results.resources.map((resource) => (
              <a
                key={`${resource.title}-${resource.provider}`}
                href={resource.href}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col gap-4 rounded-3xl border border-emerald-200 bg-white p-5 transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-xl dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200">
                    <BookOpen size={21} />
                  </span>
                  <div>
                    <h4 className="font-black text-slate-950 dark:text-white">{resource.title}</h4>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {resource.provider} · {resource.duration} · {resource.skill}
                    </p>
                  </div>
                </div>
                <ExternalLink className="text-emerald-600 transition group-hover:translate-x-1 dark:text-emerald-200" size={18} />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Internship Matches */}
      {results.matches.length > 0 && (
        <>
          <section>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-700 dark:text-orange-200 mb-4">
              {passed ? "Verified internship matches" : "Available internship matches"} ({results.matches.length})
            </p>
          </section>
          <section className="columns-1 gap-4 md:columns-2 xl:columns-3">
            {results.matches.map((match) => (
              <article
                key={match.id}
                className="mb-4 break-inside-avoid rounded-[1.6rem] border border-[var(--border)] bg-white p-5 shadow-xl shadow-slate-950/5 transition hover:-translate-y-2 hover:border-orange-300 hover:shadow-2xl dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-300/15 dark:text-orange-200">
                    <BriefcaseBusiness size={21} />
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200">
                    {match.matchScore}%
                  </span>
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-orange-600">{match.company}</p>
                <h4 className="mt-2 text-xl font-black leading-tight text-slate-950 dark:text-white">{match.title}</h4>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 dark:bg-white/10">
                    <MapPin size={13} />
                    {match.location}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-2 dark:bg-white/10">{match.mode}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-2 dark:bg-white/10">{match.stipend}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {match.skills.map((skill) => (
                    <span
                      key={`${match.id}-${skill}`}
                      className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 dark:border-orange-300/20 dark:bg-orange-300/10 dark:text-orange-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-950">
                  <ShieldCheck size={16} />
                  {match.trustBadge}
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {/* Interview Prep Vault */}
      <InterviewPrepVault matches={results.matches} />

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {results.matches.length > 0 && (
          <button
            type="button"
            onClick={onOpenMatches}
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-white shadow-xl shadow-emerald-500/20 transition hover:-translate-y-1 hover:bg-emerald-600"
          >
            Open full match page
            <ArrowRight size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-slate-800 transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
        >
          <RotateCcw size={16} />
          Start again
        </button>
      </div>
    </div>
  );
}

function InterviewPrepVault({ matches }: { matches: InternshipMatch[] }) {
  if (!matches.length) return null;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/30 dark:border-white/10 md:p-8">
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange-500/25 blur-3xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-orange-200">
            <Unlock size={15} />
            Interview prep vault
          </div>
          <h3 className="mt-4 font-display text-4xl font-black">Company questions unlocked</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Questions are generated from the companies and roles you matched with, so prep feels specific instead of generic.
          </p>
        </div>
        <Sparkles className="text-orange-300" size={34} />
      </div>

      <div className="relative mt-7 grid gap-4 lg:grid-cols-3">
        {matches.map((match) => (
          <article key={`vault-${match.id}`} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200">{match.company}</p>
            <h4 className="mt-2 font-black text-white">{match.title}</h4>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-200">
              <p>1. How would you prove trustworthiness in a {match.mode.toLowerCase()} internship setup?</p>
              <p>2. Explain one project where you used {match.skills[0] || "your strongest skill"} to solve a real problem.</p>
              <p>3. What would you do in your first 7 days at {match.company}?</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatMetricLabel(metricKey: string) {
  return metricKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ScoreRow({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl px-4 py-3 ${
        highlight
          ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
          : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
      }`}
    >
      <span className="text-xs font-black uppercase tracking-[0.18em]">{label}</span>
      <strong className="text-lg">{value}%</strong>
    </div>
  );
}
