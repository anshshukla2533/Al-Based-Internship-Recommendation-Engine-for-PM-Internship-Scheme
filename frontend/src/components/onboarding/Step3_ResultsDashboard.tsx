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
import type { InternshipMatch, LearningResource, SkillGap, StageScores, WizardResults } from "./types";

type Step3ResultsDashboardProps = {
  results: WizardResults;
  onRestart: () => void;
  onOpenMatches: () => void;
};

type RedirectionViewProps = {
  scores: StageScores;
  gaps: SkillGap[];
  resources: LearningResource[];
  onRestart: () => void;
};

type MatchViewProps = {
  scores: StageScores;
  matches: InternshipMatch[];
  onOpenMatches: () => void;
  onRestart: () => void;
};

export function Step3_ResultsDashboard({ results, onRestart, onOpenMatches }: Step3ResultsDashboardProps) {
  const passed = results.scores.total >= 70;

  return passed ? (
    <MatchView
      scores={results.scores}
      matches={results.matches}
      onOpenMatches={onOpenMatches}
      onRestart={onRestart}
    />
  ) : (
    <RedirectionView
      scores={results.scores}
      gaps={results.skillGaps}
      resources={results.resources}
      onRestart={onRestart}
    />
  );
}

function RedirectionView({ scores, gaps, resources, onRestart }: RedirectionViewProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-amber-200 bg-amber-50/90 shadow-2xl shadow-amber-500/10 dark:border-amber-300/20 dark:bg-amber-300/10">
      <div className="relative p-6 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-amber-300/30 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
          <section className="rounded-[1.6rem] bg-white p-6 shadow-xl shadow-amber-900/5 dark:bg-black/25">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200">
              <TriangleAlert size={24} />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-amber-700 dark:text-amber-200">
              Learning route unlocked
            </p>
            <h3 className="mt-3 font-display text-4xl font-black text-slate-950 dark:text-white">
              Trust score needs a short sprint
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200">
              Your score is not low forever. The platform is redirecting you toward the exact skills that can raise match confidence before applying.
            </p>

            <div className="mt-6 grid gap-3">
              <ScoreRow label="Basics" value={scores.stage1} />
              <ScoreRow label="Deep theory + CP" value={scores.stage2} />
              <ScoreRow label="Total trust score" value={scores.total} highlight />
            </div>

            <button
              type="button"
              onClick={onRestart}
              className="mt-6 inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 py-4 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:-translate-y-1 hover:bg-amber-600 dark:bg-white dark:text-slate-950"
            >
              <RotateCcw size={16} />
              Retake assessment
            </button>
          </section>

          <section className="grid gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700 dark:text-amber-200">
                Skill gaps
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {gaps.map((gap) => (
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
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700 dark:text-amber-200">
                Recommended resources
              </p>
              <div className="mt-4 grid gap-3">
                {resources.map((resource) => (
                  <a
                    key={`${resource.title}-${resource.provider}`}
                    href={resource.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex flex-col gap-4 rounded-3xl border border-amber-200 bg-white p-5 transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200">
                        <BookOpen size={21} />
                      </span>
                      <div>
                        <h4 className="font-black text-slate-950 dark:text-white">{resource.title}</h4>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {resource.provider} - {resource.duration} - {resource.skill}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="text-amber-600 transition group-hover:translate-x-1 dark:text-amber-200" size={18} />
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MatchView({ scores, matches, onOpenMatches, onRestart }: MatchViewProps) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200 bg-emerald-50/90 p-6 shadow-2xl shadow-emerald-500/10 dark:border-emerald-300/20 dark:bg-emerald-300/10 md:p-8">
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200">
              <CheckCircle2 size={25} />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-200">
              Passed trust assessment
            </p>
            <h3 className="mt-3 font-display text-4xl font-black text-slate-950 dark:text-white">
              Verified matches are ready
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700 dark:text-slate-200">
              Your trust score is high enough to unlock hyperlocal and remote opportunities, plus company-specific interview prep.
            </p>
          </div>

          <div className="grid min-w-[260px] gap-3 rounded-[1.6rem] bg-white p-4 dark:bg-black/25">
            <ScoreRow label="Basics" value={scores.stage1} />
            <ScoreRow label="Deep theory + CP" value={scores.stage2} />
            <ScoreRow label="Total trust score" value={scores.total} highlight />
          </div>
        </div>

        <div className="relative mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onOpenMatches}
            disabled={!matches.length}
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-white shadow-xl shadow-emerald-500/20 transition hover:-translate-y-1 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open full match page
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-emerald-800 transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/5 dark:text-emerald-100"
          >
            <RotateCcw size={16} />
            Start again
          </button>
        </div>
      </section>

      <section className="columns-1 gap-4 md:columns-2 xl:columns-3">
        {matches.map((match) => (
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

      <InterviewPrepVault matches={matches} />
    </div>
  );
}

function InterviewPrepVault({ matches }: { matches: InternshipMatch[] }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/30 dark:border-white/10 md:p-8">
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange-500/25 blur-3xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-orange-200">
            {matches.length ? <Unlock size={15} /> : <LockKeyhole size={15} />}
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
