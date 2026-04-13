type SkillChipsProps = {
  skills: string[];
  onChange: (skills: string[]) => void;
};

export function SkillChips({ skills, onChange }: SkillChipsProps) {
  const updateSkill = (index: number, value: string) => {
    onChange(skills.map((skill, currentIndex) => (currentIndex === index ? value : skill)).filter(Boolean));
  };

  const removeSkill = (index: number) => {
    onChange(skills.filter((_, currentIndex) => currentIndex !== index));
  };

  if (!skills.length) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white/70 p-5 text-sm text-[var(--muted)] dark:bg-white/5">
        No skills added yet. Upload a resume or add skills manually.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {skills.map((skill, index) => (
        <div
          key={`${skill}-${index}`}
          className="group inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-2 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg dark:border-orange-300/20 dark:bg-orange-300/10"
        >
          <input
            value={skill}
            onChange={(event) => updateSkill(index, event.target.value)}
            className="w-32 bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
            aria-label={`Edit ${skill}`}
          />
          <button
            type="button"
            onClick={() => removeSkill(index)}
            className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-black text-orange-600 shadow-sm transition hover:bg-orange-600 hover:text-white dark:bg-white/10"
            aria-label={`Remove ${skill}`}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
