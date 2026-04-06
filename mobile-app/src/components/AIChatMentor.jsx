import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react';
import axios from 'axios';
const API_BASE = "http://localhost:8000";
export const AIChatMentor = ({ skills, language }) => {
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState([
        { role: "assistant", content: "Hello! I am your AI Mentor. Ask me about interviews, resume lines, or how to improve your skills." }
    ]);
    const scrollRef = useRef(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, chatOpen]);
    const sendChatMessage = async () => {
        const trimmedInput = chatInput.trim();
        if (!trimmedInput || isSending) return;
        const newMsgs = [...messages, { role: "user", content: trimmedInput }];
        setMessages(newMsgs);
        setChatInput("");
        setIsSending(true);
        try {
            const res = await axios.post(`${API_BASE}/agent-chat`, {
                messages: newMsgs,
                user_skills: skills?.length > 0 ? skills : ["general"],
                target_language: language
            });
            setMessages([...newMsgs, { role: "assistant", content: res.data?.reply?.trim() || "I am here with you. Ask me one interview or resume question and we will solve it together." }]);
        } catch(e) {
            setMessages([...newMsgs, { role: "assistant", content: "I hit a small connection issue, but you can ask again right away. Try something like: 'Give me one interview answer for my skills.'" }]);
        } finally {
            setIsSending(false);
        }
    };
    return (
        <>
            { }
            <motion.button 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setChatOpen(!chatOpen)}
                className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white w-16 h-16 rounded-full shadow-2xl z-50 flex items-center justify-center border-4 border-white overflow-hidden group"
            >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {chatOpen ? <X size={28} /> : <MessageSquare size={28} />}
            </motion.button>
            { }
            <AnimatePresence>
                {chatOpen && (
                    <motion.div 
                        initial={{ y: "100%", opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: "120%", opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 md:left-auto md:right-6 md:bottom-28 md:w-[400px] bg-white rounded-t-3xl md:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-40 flex flex-col h-[75vh] md:h-[600px] border border-gray-100 overflow-hidden"
                    >
                        { }
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm border border-white/20">
                                    <Bot className="text-white" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white leading-tight text-lg">AI Mentor Prep</h3>
                                    <p className="text-xs text-indigo-100 font-medium">Online & Ready to help</p>
                                </div>
                            </div>
                        </div>
                        { }
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50 relative">
                            {messages.map((m, i) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                                    transition={{ duration: 0.2 }}
                                    key={i} 
                                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    {m.role !== "user" && (
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 flex-shrink-0 border border-indigo-200">
                                            <Bot size={16} className="text-indigo-600" />
                                        </div>
                                    )}
                                    <div className={`max-w-[75%] p-4 rounded-2xl text-[15px] font-medium leading-relaxed shadow-sm ${
                                        m.role === "user" 
                                            ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-tr-sm" 
                                            : "bg-white border text-gray-800 rounded-tl-sm"
                                    }`}>
                                        {m.content}
                                    </div>
                                </motion.div>
                            ))}
                            {isSending && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-start"
                                >
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 flex-shrink-0 border border-indigo-200">
                                        <Bot size={16} className="text-indigo-600" />
                                    </div>
                                    <div className="bg-white border text-gray-600 rounded-2xl rounded-tl-sm px-4 py-3 text-sm font-medium shadow-sm flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin text-indigo-500" />
                                        Mentor is typing...
                                    </div>
                                </motion.div>
                            )}
                            <div ref={scrollRef}></div>
                        </div>
                        { }
                        <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                            <input 
                                type="text" 
                                value={chatInput} 
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                                className="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all shadow-inner font-medium text-gray-800"
                                placeholder="Ask about interviews, resume, or skills..."
                            />
                            <motion.button 
                                whileTap={{ scale: 0.9 }}
                                onClick={sendChatMessage} 
                                disabled={isSending || !chatInput.trim()}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-all ${
                                    isSending || !chatInput.trim()
                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        : "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white hover:shadow-lg"
                                }`}
                            >
                                {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};