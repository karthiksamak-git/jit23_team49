"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/game-context";
import { playSound } from "@/lib/sound-engine";
import { CleanMasterImg } from "@/lib/clean-samurai";
import { getMentorResponse, ChatMessage } from "@/lib/ai-client";

export function GlobalMentorAgent() {
  const pathname = usePathname();
  const { player } = useGame();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    { sender: "mentor" | "user"; text: string; time: string }[]
  >([
    {
      sender: "mentor",
      text: `Hi ${player.characterName || "there"}! I'm your AI Career Mentor. Ask me anything about your learning path, career options, or technical concepts — I'm here to help!`,
      time: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickTips, setQuickTips] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Contextual tips based on current route
  useEffect(() => {
    if (pathname.includes("/world-map")) {
      setQuickTips([
        "What should I learn next?",
        "Explain this topic simply",
        "How long will this level take?",
      ]);
    } else if (pathname.includes("/interview")) {
      setQuickTips([
        "How can I score higher in interviews?",
        "Give me a practice question",
        "What do interviewers look for?",
      ]);
    } else if (pathname.includes("/opportunities")) {
      setQuickTips([
        "Am I ready to apply for jobs?",
        "How do I bridge my skill gaps?",
        "What skills are most in demand?",
      ]);
    } else if (pathname.includes("/dashboard")) {
      setQuickTips([
        "What should I focus on today?",
        "How do I improve my level?",
        "Suggest a quick learning activity",
      ]);
    } else {
      setQuickTips([
        "Which IT career suits me best?",
        "How do I earn more XP?",
        "Explain REST APIs simply",
      ]);
    }
  }, [pathname]);

  async function handleSend(textToSend?: string) {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = { sender: "user" as const, text: query, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const chatHistory: ChatMessage[] = messages.slice(-6).map((m) => ({
        role: m.sender === "mentor" ? "assistant" : "user",
        content: m.text,
      }));

      const reply = await getMentorResponse(
        query,
        {
          characterName: player.characterName,
          level: player.level,
          realmName: player.realmName,
          xp: player.xp,
          currentRoute: pathname,
          completedMissions: player.completedMissions,
          interests: player.interests,
          recommendedDomain: player.recommendedDomain,
        },
        chatHistory
      );

      const mentorMsg = {
        sender: "mentor" as const,
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, mentorMsg]);
      // 🔔 Friendly chime when the mentor replies (quieter if chat is open & focused)
      playSound("notification", isOpen ? 0 : 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="mb-4 w-96 max-w-[calc(100vw-2rem)] h-[520px] rounded-2xl bg-[#08090c]/95 border border-[#06b6d4]/20 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-[#0e1014] border-b border-[#2a2520]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full border border-[#06b6d4]/40 bg-[#040506] overflow-hidden flex items-center justify-center p-0.5">
                  <CleanMasterImg alt="AI Mentor" className="w-full h-full object-contain" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10b981] border-2 border-[#040506]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#22d3ee] tracking-wider">
                    AI Mentor
                  </h3>
                  <p className="font-mono text-[10px] text-[#10b981] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#6b6358] hover:text-[#c8c0b0] text-sm px-2 py-1 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs scrollbar-thin">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    m.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-xl leading-relaxed ${
                      m.sender === "user"
                        ? "bg-[#06b6d4]/10 text-[#e8dfc8] border border-[#06b6d4]/20 rounded-br-none font-mono text-xs"
                        : "bg-[#0e1014] text-[#c8c0b0] border border-[#2a2520]/40 rounded-bl-none text-xs"
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="font-mono text-[9px] text-[#3d3830] mt-1 px-1">
                    {m.time}
                  </span>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-[#06b6d4] text-xs animate-pulse">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-bounce" />
                  </div>
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Tips */}
            {quickTips.length > 0 && (
              <div className="px-3 py-2 bg-[#050608] border-t border-[#2a2520]/30 flex gap-1.5 overflow-x-auto scrollbar-none">
                {quickTips.map((tip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(tip)}
                    className="whitespace-nowrap text-[10px] text-[#06b6d4]/80 hover:text-[#06b6d4] bg-[#06b6d4]/5 hover:bg-[#06b6d4]/10 px-2.5 py-1.5 rounded-lg border border-[#06b6d4]/15 transition-colors"
                  >
                    {tip}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="p-3 bg-[#08090c] border-t border-[#2a2520]/30 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your career path..."
                className="flex-1 bg-[#040506] border border-[#2a2520]/40 rounded-lg px-3 py-2 text-xs text-[#e8dfc8] placeholder:text-[#3d3830] focus:outline-none focus:border-[#06b6d4] transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="btn-teal px-3.5 py-2 rounded-lg text-xs uppercase tracking-wider disabled:opacity-30"
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          playSound(isOpen ? "click" : "notification");
          setIsOpen(!isOpen);
        }}
        className="relative group flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer"
      >
        <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
          <span className="absolute top-0 right-0 z-20 w-3.5 h-3.5 rounded-full bg-[#10b981] border-2 border-[#040506] animate-ping" />
          <span className="absolute top-0 right-0 z-20 w-3.5 h-3.5 rounded-full bg-[#10b981] border-2 border-[#040506]" />
          <CleanMasterImg
            alt="AI Mentor"
            className="w-full h-full object-contain filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] transition-transform group-hover:scale-110"
          />
        </div>

        <span className="text-xs font-semibold text-[#22d3ee] group-hover:text-white tracking-wider px-3 py-1 rounded-full bg-[#0c0e11]/90 border border-[#06b6d4]/40 shadow-[0_4px_15px_rgba(0,0,0,0.8)] backdrop-blur-md transition-colors">
          {isOpen ? "Close" : "AI Mentor"}
        </span>
      </motion.button>
    </div>
  );
}
