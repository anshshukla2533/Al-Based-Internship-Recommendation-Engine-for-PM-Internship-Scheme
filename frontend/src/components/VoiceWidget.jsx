import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, Mic, Phone, Volume2, X } from "lucide-react";
import axios from "axios";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const CALL_WINDOW_FEATURES = "popup=yes,width=420,height=760,resizable=yes,scrollbars=yes";
function findOmniLauncher() {
  const selectors = [
    "[data-omnidimension-launcher]",
    "[data-omnidim-launcher]",
    "[id*='omni'][id*='widget'] button",
    "[class*='omni'][class*='widget'] button",
    "iframe[src*='omnidim']",
  ];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  return null;
}
function detectOmniWidgetPresence() {
  const scriptTags = Array.from(document.querySelectorAll("script[src], script"));
  const hasOmniScript = scriptTags.some((tag) => {
    const source = `${tag.src || ""} ${tag.textContent || ""}`.toLowerCase();
    return source.includes("omnidim");
  });
  return hasOmniScript || Boolean(findOmniLauncher());
}
export function VoiceWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCallPending, setPhoneCallPending] = useState(false);
  const [showWebsiteCall, setShowWebsiteCall] = useState(false);
  const [widgetDetected, setWidgetDetected] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [connection, setConnection] = useState({
    loading: false,
    ok: false,
    message: "OmniDimension status not checked yet.",
    warning: "",
    resolvedAgentId: null,
    widgetUrl: "",
  });
  const [micPermission, setMicPermission] = useState({
    state: "unknown",
    detail: "Microphone permission has not been checked yet.",
  });
  useEffect(() => {
    const refreshWidgetPresence = () => {
      setWidgetDetected(detectOmniWidgetPresence());
    };
    refreshWidgetPresence();
    const timerId = window.setInterval(refreshWidgetPresence, 2500);
    return () => window.clearInterval(timerId);
  }, []);
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let ignore = false;
    const checkConnection = async () => {
      setConnection((prev) => ({ ...prev, loading: true }));
      try {
        const response = await axios.get(`${API_BASE}/api/voice-agent/status`);
        if (ignore) {
          return;
        }
        const warning = response.data.warning || "";
        const resolvedAgentId = response.data.resolved_agent_id || null;
        const widgetUrl = response.data.widget_url || "";
        setConnection({
          loading: false,
          ok: true,
          message: resolvedAgentId
            ? `Connected to OmniDimension agent ${resolvedAgentId}.`
            : "Connected to OmniDimension.",
          warning,
          resolvedAgentId,
          widgetUrl,
        });
      } catch (error) {
        if (ignore) {
          return;
        }
        setConnection({
          loading: false,
          ok: false,
          message: error?.response?.data?.detail || "Could not validate the OmniDimension connection.",
          warning: "",
          resolvedAgentId: null,
          widgetUrl: "",
        });
      }
    };
    checkConnection();
    return () => {
      ignore = true;
    };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen || !navigator.permissions?.query) {
      return;
    }
    let ignore = false;
    let permissionStatus;
    const syncPermission = async () => {
      try {
        permissionStatus = await navigator.permissions.query({ name: "microphone" });
        if (ignore) {
          return;
        }
        const nextState = permissionStatus.state;
        setMicPermission({
          state: nextState,
          detail:
            nextState === "granted"
              ? "Browser microphone access is already allowed."
              : nextState === "denied"
                ? "Browser microphone access is blocked. Use the site permission icon in the address bar to allow the microphone."
                : "The browser will ask for microphone access when the voice call starts.",
        });
        permissionStatus.onchange = () => {
          setMicPermission({
            state: permissionStatus.state,
            detail:
              permissionStatus.state === "granted"
                ? "Browser microphone access is already allowed."
                : permissionStatus.state === "denied"
                  ? "Browser microphone access is blocked. Use the site permission icon in the address bar to allow the microphone."
                  : "The browser will ask for microphone access when the voice call starts.",
          });
        };
      } catch (error) {
        setMicPermission({
          state: "unknown",
          detail: "Could not read browser microphone permission status.",
        });
      }
    };
    syncPermission();
    return () => {
      ignore = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [isOpen]);
  const requestMicrophoneAccess = async () => {
    if (!window.isSecureContext) {
      setMicPermission({
        state: "blocked",
        detail: "Microphone access only works on HTTPS or localhost. Open the site in a secure context first.",
      });
      setActionMessage("Microphone access is blocked because the site is not running in a secure context.");
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermission({
        state: "unsupported",
        detail: "This browser does not support microphone access for web calls.",
      });
      setActionMessage("This browser does not support microphone access for website calls.");
      return false;
    }
    try {
      setMicPermission({
        state: "checking",
        detail: "Requesting microphone access from the browser...",
      });
      setActionMessage("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission({
        state: "granted",
        detail: "Microphone access granted. Starting the voice call now.",
      });
      return true;
    } catch (error) {
      const errorName = error?.name || "";
      const deniedMessage =
        errorName === "NotAllowedError" || errorName === "PermissionDeniedError"
          ? "Microphone access was denied. Click the lock icon near the address bar and allow the microphone for this site."
          : errorName === "NotFoundError"
            ? "No microphone device was found on this computer."
            : "The browser could not start microphone access.";
      setMicPermission({
        state: "denied",
        detail: deniedMessage,
      });
      setActionMessage(deniedMessage);
      return false;
    }
  };
  const handlePhoneCall = async () => {
    const normalizedPhone = phoneNumber.trim();
    if (!normalizedPhone) {
      setActionMessage("Enter a phone number with country code, for example +919876543210.");
      return;
    }
    setPhoneCallPending(true);
    setActionMessage("Requesting a phone call from OmniDimension...");
    try {
      const response = await axios.post(`${API_BASE}/api/voice-agent/call`, {
        phone_number: normalizedPhone,
      });
      setActionMessage(response.data.warning || "Phone call request sent successfully.");
    } catch (error) {
      setActionMessage(error?.response?.data?.detail || "Failed to request the phone call.");
    }
    setPhoneCallPending(false);
  };
  const handleWebCall = async () => {
    let popupWindow = null;
    if (connection.widgetUrl) {
      popupWindow = window.open("", "omnidimension-voice-call", CALL_WINDOW_FEATURES);
    }
    const hasMicAccess = await requestMicrophoneAccess();
    if (!hasMicAccess) {
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
      return;
    }
    if (connection.widgetUrl) {
      if (popupWindow) {
        popupWindow.location.href = connection.widgetUrl;
        popupWindow.focus();
        setShowWebsiteCall(false);
        setActionMessage("OmniDimension opened in a call window. If you still do not hear the agent, allow microphone access in that window too.");
        return;
      }
      setShowWebsiteCall((prev) => !prev);
      setActionMessage("Popup was blocked, so the website call opened inside the page instead.");
      return;
    }
    const launcher = findOmniLauncher();
    if (launcher && typeof launcher.click === "function") {
      launcher.click();
      setActionMessage("Opening the OmniDimension website widget now.");
      return;
    }
    setActionMessage("Website call is not ready yet. Add the official OmniDimension Web Bot Widget script to the site first.");
  };
  const statusTone = connection.ok ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10";
  const statusIcon = connection.loading ? (
    <Loader2 className="animate-spin text-orange-300" size={18} />
  ) : connection.ok ? (
    <CheckCircle2 className="text-emerald-400" size={18} />
  ) : (
    <AlertCircle className="text-amber-400" size={18} />
  );
  return (
    <>
      <motion.button
        id="voice-widget-fab"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-[60] flex h-16 w-16 items-center justify-center rounded-full border-2 border-orange-400/50 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white shadow-[0_0_30px_rgba(255,100,0,0.5)] transition-transform hover:scale-110 active:scale-95 md:h-[72px] md:w-[72px]"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 1 }}
        aria-label="Open voice assistant"
      >
        {isOpen ? <X size={28} /> : <Mic size={28} />}
        {!isOpen && (
          <>
            <span className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping" />
            <span className="absolute -inset-1 rounded-full border-2 border-orange-400/40 animate-pulse" />
          </>
        )}
      </motion.button>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: 1.5 }}
            className="pointer-events-none fixed bottom-[26px] left-[90px] z-[60] md:left-[100px]"
          >
            <div className="rounded-lg border border-orange-500/40 bg-black/90 px-4 py-2 shadow-[0_0_20px_rgba(255,100,0,0.2)] backdrop-blur-sm">
              <p className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-orange-400 md:text-sm">
                Tap To Speak
              </p>
              <p className="text-[10px] tracking-wide text-white/60">
                Website call plus phone-call fallback
              </p>
            </div>
            <div className="absolute top-1/2 -left-2 h-0 w-0 -translate-y-1/2 border-b-[6px] border-r-[8px] border-t-[6px] border-b-transparent border-r-black/90 border-t-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="voice-widget-panel"
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 left-4 right-4 z-[60] overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-b from-gray-900 to-black shadow-[0_0_40px_rgba(255,100,0,0.15)] md:left-6 md:right-auto md:w-[390px]"
          >
            <div className="flex items-center gap-3 bg-gradient-to-r from-orange-600 to-red-600 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Volume2 size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Voice Assistant
                </h3>
                <p className="text-[11px] text-white/70">PM Internship Scheme</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="ml-auto text-white/60 transition-colors hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className={`rounded-xl border p-4 ${statusTone}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{statusIcon}</div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
                      OmniDimension Backend
                    </p>
                    <p className="mt-1 text-sm text-white/80">{connection.message}</p>
                    {connection.warning && (
                      <p className="mt-2 text-xs leading-relaxed text-amber-200">{connection.warning}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className={`rounded-xl border p-4 ${
                micPermission.state === "granted"
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : micPermission.state === "checking"
                    ? "border-orange-500/30 bg-orange-500/10"
                    : "border-white/10 bg-white/5"
              }`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {micPermission.state === "granted" ? (
                      <CheckCircle2 className="text-emerald-400" size={18} />
                    ) : micPermission.state === "checking" ? (
                      <Loader2 className="animate-spin text-orange-300" size={18} />
                    ) : (
                      <Mic className="text-orange-300" size={18} />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
                      Browser Microphone
                    </p>
                    <p className="mt-1 text-sm text-white/80">{micPermission.detail}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">
                      Website Call
                    </p>
                    <p className="mt-1 text-sm text-white/80">
                      {connection.widgetUrl
                        ? "Website call is ready from your OmniDimension widget URL."
                        : widgetDetected
                          ? "The OmniDimension web widget script is present on this page."
                          : "No OmniDimension website widget script was detected on this page."}
                    </p>
                  </div>
                  {connection.widgetUrl || widgetDetected ? (
                    <CheckCircle2 className="text-emerald-400" size={18} />
                  ) : (
                    <AlertCircle className="text-amber-400" size={18} />
                  )}
                </div>
                <button
                  onClick={handleWebCall}
                  disabled={!connection.widgetUrl && !widgetDetected}
                  className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-3 font-bold uppercase tracking-wider transition-all ${
                    connection.widgetUrl || widgetDetected
                      ? "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-400 hover:to-red-500"
                      : "cursor-not-allowed bg-white/10 text-white/30"
                  }`}
                >
                  <Mic size={18} />
                  {connection.widgetUrl
                    ? showWebsiteCall
                      ? "Hide Website Call"
                      : "Start Website Call"
                    : widgetDetected
                      ? "Open Website Call"
                      : "Widget Script Missing"}
                </button>
                {showWebsiteCall && connection.widgetUrl && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-orange-400/30 bg-black/40">
                    <iframe
                      src={connection.widgetUrl}
                      title="OmniDimension Website Call"
                      className="h-[550px] w-full border-0"
                      allow="microphone; autoplay"
                    />
                  </div>
                )}
                {!connection.widgetUrl && !widgetDetected && (
                  <div className="mt-3 text-xs leading-relaxed text-white/55">
                    Paste the generated script from OmniDimension Deploy &gt; Web Bot Widget into the website.
                    API key and agent ID alone do not create the browser microphone widget.
                    <a
                      href="https://dashboard.staging.omnidim.io/docs/guides/web-chat-widget"
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 text-orange-300 hover:text-orange-200"
                    >
                      Setup guide
                    </a>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">
                  Phone Call Fallback
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Use this if you want OmniDimension to ring your phone directly.
                </p>
                <div className="mt-4 flex gap-2">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="+919876543210"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-orange-400/50"
                  />
                  <button
                    onClick={handlePhoneCall}
                    disabled={phoneCallPending}
                    className={`flex min-w-[132px] items-center justify-center gap-2 rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                      phoneCallPending
                        ? "cursor-wait bg-white/10 text-white/30"
                        : "bg-white text-black hover:bg-orange-100"
                    }`}
                  >
                    {phoneCallPending ? <Loader2 className="animate-spin" size={16} /> : <Phone size={16} />}
                    {phoneCallPending ? "Calling" : "Ring Phone"}
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-relaxed text-white/55">
                <p>Tell the assistant your skills, city, education, and preferred sector.</p>
                <p className="mt-2">Example: "I am in Delhi, I know Excel and data entry, and I want IT internships."</p>
                {actionMessage && <p className="mt-3 text-orange-200">{actionMessage}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-5 py-3">
              <span className="text-[10px] tracking-wider text-white/30">
                WEBSITE CALL NEEDS THE OFFICIAL OMNIDIMENSION WIDGET SCRIPT
              </span>
              <span className="text-[10px] font-bold tracking-wider text-orange-400/60">
                OMNIDIMENSION
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}