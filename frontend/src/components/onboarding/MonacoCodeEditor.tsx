import Editor from "@monaco-editor/react";

type MonacoCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language?: string;
};

export function MonacoCodeEditor({ value, onChange, language = "javascript" }: MonacoCodeEditorProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10" style={{ height: "400px" }}>
      <Editor
        height="100%"
        defaultLanguage={language}
        theme="vs-dark"
        value={value}
        onChange={(val) => onChange(val || "")}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: false,
        }}
      />
    </div>
  );
}
