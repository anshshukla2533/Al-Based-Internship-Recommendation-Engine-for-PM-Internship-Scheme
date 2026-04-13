import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, MessageSquare, Send, X } from "lucide-react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function AIChatMentorRedesign({ skills, language }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello. I am your AI mentor. Ask me about interviews, resume lines, or how to improve your profile." },
  ]);
  const messagesRef = useRef(null);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const res = await axios.post(`${API_BASE}/agent-chat`, { messages: nextMessages, user_skills: skills?.length ? skills : ["general"], target_language: language });
      setMessages([...nextMessages, { role: "assistant", content: res.data?.reply?.trim() || "I am here to help with interview and profile preparation." }]);
    } catch {
      setMessages([...nextMessages, { role: "assistant", content: "There was a connection issue, but you can ask again right away." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <motion.button type="button" initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.94 }} onClick={() => setOpen((prev) => !prev)} className="voice-fab mentor-fab">
        {open ? <X size={26} /> : <MessageSquare size={26} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.96 }} className="floating-panel mentor-panel">
            <div className="border-b border-[var(--border)] bg-[var(--accent-soft)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--accent)]"><Bot size={22} /></div>
                <div>
                  <div className="font-display text-lg font-semibold text-[var(--text-primary)]">AI Mentor</div>
                  <div className="text-sm text-[var(--text-secondary)]">Interview and profile support</div>
                </div>
              </div>
            </div>

            <div ref={messagesRef} className="mentor-thread flex-1 space-y-4 overflow-y-auto px-4 py-5">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}>
                  {message.content}
                </div>
              ))}
              {sending && (
                <div className="chat-bubble-assistant flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
                  Preparing guidance...
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border)] px-4 py-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && sendMessage()}
                  className="theme-input flex-1"
                  placeholder="Ask about interviews, resume points, or skill improvement..."
                />
                <button type="button" onClick={sendMessage} disabled={sending || !input.trim()} className="primary-btn justify-center disabled:pointer-events-none disabled:opacity-50">
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
