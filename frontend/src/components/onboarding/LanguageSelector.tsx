import { useState } from "react";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "or", label: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "as", label: "Assamese", native: "অসমীয়া" },
];

type LanguageSelectorProps = {
  currentLang: string;
  onLanguageChange: (langCode: string) => void;
  compact?: boolean;
};

export function LanguageSelector({ currentLang, onLanguageChange, compact = false }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-orange-400 ${compact ? "px-2 py-1.5" : ""}`}
      >
        <Globe size={14} />
        <span>{current.native}</span>
        <svg className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  onLanguageChange(lang.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-orange-50 dark:hover:bg-white/10 ${
                  currentLang === lang.code
                    ? "bg-orange-50 font-bold text-orange-700 dark:bg-orange-500/10 dark:text-orange-200"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                <span className="font-semibold">{lang.native}</span>
                <span className="text-xs text-slate-400">{lang.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export { LANGUAGES };
