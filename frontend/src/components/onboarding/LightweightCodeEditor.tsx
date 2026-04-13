type LightweightCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function LightweightCodeEditor({ value, onChange }: LightweightCodeEditorProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#07111f] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950 px-4 py-3">
        <div className="flex gap-2">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-300" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <span className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Code editor</span>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="min-h-[340px] w-full resize-y bg-[#07111f] p-5 font-mono text-sm leading-7 text-emerald-100 outline-none placeholder:text-slate-500"
        placeholder="Write your solution here..."
      />
    </div>
  );
}
