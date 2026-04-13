import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { skillSuggestions } from "./onboardingApi";

type SkillComboboxProps = {
  selectedSkills: string[];
  onAdd: (skill: string) => void;
};

export function SkillCombobox({ selectedSkills, onAdd }: SkillComboboxProps) {
  const [query, setQuery] = useState("");
  const suggestions = useMemo(() => skillSuggestions(query, selectedSkills), [query, selectedSkills]);

  const addSkill = (skill: string) => {
    const normalized = skill.trim();
    if (!normalized) return;
    onAdd(normalized);
    setQuery("");
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addSkill(query || suggestions[0] || "");
            }
          }}
          placeholder="Search or type a skill"
          className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200/40 dark:bg-white/10 dark:text-white"
        />
        <button
          type="button"
          onClick={() => addSkill(query || suggestions[0] || "")}
          className="absolute right-2 top-1/2 inline-flex h-10 -translate-y-1/2 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-orange-600 dark:bg-white dark:text-slate-950"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => addSkill(skill)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:-translate-y-1 hover:border-orange-300 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            {skill}
          </button>
        ))}
      </div>
    </div>
  );
}
