import { useRef, useState } from "react";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { parseResumeWithOcr } from "./onboardingApi";
import { SkillChips } from "./SkillChips";
import { SkillCombobox } from "./SkillCombobox";

type Step1SkillIngestionProps = {
  skills: string[];
  onSkillsChange: (skills: string[]) => void;
  onContinue: () => void;
};

export function Step1_SkillIngestion({ skills, onSkillsChange, onContinue }: Step1SkillIngestionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const mergeSkills = (incomingSkills: string[]) => {
    const merged = [...skills];
    for (const skill of incomingSkills) {
      if (!merged.some((item) => item.toLowerCase() === skill.toLowerCase())) {
        merged.push(skill);
      }
    }
    onSkillsChange(merged);
  };

  const handleFile = async (file?: File) => {
    if (!file || isParsing) return;
    setFileName(file.name);
    setIsParsing(true);
    try {
      const parsedSkills = await parseResumeWithOcr(file);
      mergeSkills(parsedSkills);
    } finally {
      setIsParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
        className={`relative overflow-hidden rounded-[2rem] border border-dashed p-6 transition ${
          isDragging
            ? "border-orange-400 bg-orange-50 shadow-2xl shadow-orange-200/50 dark:bg-orange-500/10"
            : "border-[var(--border)] bg-white/80 dark:bg-white/5"
        }`}
      >
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="relative space-y-5">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl dark:bg-white dark:text-slate-950">
            {isParsing ? <Loader2 className="animate-spin" size={24} /> : <UploadCloud size={24} />}
          </div>
          <div>
            <h3 className="font-display text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Upload resume for OCR parsing
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Drag a PDF here, or browse from your device. The wizard will call the OCR parsing endpoint and show editable skills before the assessment starts.
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isParsing}
            className="inline-flex items-center gap-3 rounded-full bg-orange-600 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-orange-500/20 transition hover:-translate-y-1 hover:bg-orange-500 disabled:cursor-wait disabled:opacity-70"
          >
            <FileText size={17} />
            {isParsing ? "Reading PDF" : "Browse PDF"}
          </button>

          {isParsing ? (
            <div className="space-y-3 rounded-3xl border border-orange-100 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-4 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
              ))}
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
                Extracting skills from {fileName || "resume"}...
              </p>
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-950 p-4 text-sm font-semibold text-white dark:bg-black/40">
              Supported format: PDF resume. Editable skills will appear instantly after parsing.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[var(--border)] bg-white/90 p-6 shadow-xl shadow-slate-950/5 dark:bg-white/5">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-600">Manual verification</p>
          <h3 className="mt-2 font-display text-3xl font-black text-slate-950 dark:text-white">Add or refine skills</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Add missing skills manually, then edit or remove any chip before moving to the trust assessment.
          </p>
        </div>

        <SkillCombobox selectedSkills={skills} onAdd={(skill) => mergeSkills([skill])} />

        <div className="mt-6">
          <SkillChips skills={skills} onChange={onSkillsChange} />
        </div>

        <button
          type="button"
          onClick={onContinue}
          disabled={!skills.length || isParsing}
          className="mt-8 w-full rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white transition hover:-translate-y-1 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
        >
          Continue to assessment
        </button>
      </section>
    </div>
  );
}
