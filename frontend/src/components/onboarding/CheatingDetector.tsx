import { useEffect, useState } from "react";

type CheatingDetectorProps = {
  onTelemetryUpdate: (data: { tabSwitches: number; copyPasteCount: number }) => void;
};

export function CheatingDetector({ onTelemetryUpdate }: CheatingDetectorProps) {
  const [tabSwitches, setTabSwitches] = useState(0);
  const [copyPasteCount, setCopyPasteCount] = useState(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const next = prev + 1;
          onTelemetryUpdate({ tabSwitches: next, copyPasteCount });
          return next;
        });
      }
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      // Only penalize large pastes or frequent copies
      const text = e.clipboardData?.getData("text") || "";
      if (e.type === "paste" && text.length > 20) {
        setCopyPasteCount((prev) => {
          const next = prev + 1;
          onTelemetryUpdate({ tabSwitches, copyPasteCount: next });
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("copy", handleCopyPaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("copy", handleCopyPaste);
    };
  }, [copyPasteCount, onTelemetryUpdate, tabSwitches]);

  return null; // Invisible component
}
