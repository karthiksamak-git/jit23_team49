"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/game-context";
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
      text: `Greetings, ${player.characterName || "Warrior"}. I am Master Kael, your persistent AI Sensei. Ask me anything about your career path, technical concepts, or current quest!`,
      time: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickTips, setQuickTips] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Contextual tips based on current route
  useEffect(() => {
    if (pathname.includes("/world-map")) {
      setQuickTips([
        "How do I unlock boss battles?",
        "Explain B-Tree indexing simply",
        "Generate a custom AI roadmap",
      ]);
    } else if (pathname.includes("/interview")) {
      setQuickTips([
        "How can I score higher in technical rounds?",
        "Give me a system design practice tip",
        "What questions are asked for Backend roles?",
      ]);
    } else if (pathname.includes("/opportunities")) {
      setQuickTips([
        "How can I bridge my skill gaps?",
        "What skills do top backend jobs require?",
        "Am I ready to apply for internships?",
      ]);
    } else {
      setQuickTips([
        "What is the best career for my interests?",
        "How do I earn more XP and Guild Coins?",
        "Explain REST vs GraphQL",
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
        },
        chatHistory
      );

      const mentorMsg = {
        sender: "mentor" as const,
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, mentorMsg]);
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
            className="mb-4 w-96 max-w-[calc(100vw-2rem)] h-[520px] rounded-xl bg-[#08090c]/95 border border-[#b49b64]/30 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col overflow-hidden"
          >
            {/* Widget Header */}
            <div className="p-4 bg-[#0e1014] border-b border-[rgba(180,155,100,0.12)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full border border-[#b49b64]/40 bg-[#040506] overflow-hidden flex items-center justify-center p-0.5">
                  <CleanMasterImg alt="Master Kael" className="w-full h-full object-contain" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#4a7a5a] border-2 border-[#040506]" />
                </div>
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-[#b49b64] tracking-wider">
                    Master Kael
                  </h3>
                  <p className="font-mono text-[10px] text-[#4a7a5a] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4a7a5a] animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#6b6358] hover:text-[#c8c0b0] text-sm font-mono px-2 py-1 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs font-sans scrollbar-thin">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    m.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-lg leading-relaxed ${
                      m.sender === "user"
                        ? "bg-[#1a1714] text-[#c8c0b0] border border-[#b49b64]/30 rounded-br-none font-mono text-xs"
                        : "dialogue-box text-[#c8c0b0] rounded-bl-none font-cinzel italic"
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="font-mono text-[9px] text-[#5a5548] mt-1 px-1">
                    {m.time}
                  </span>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-[#b49b64] font-mono text-xs animate-pulse italic">
                  <span>⚔ Master Kael is consulting the AI scrolls...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            {quickTips.length > 0 && (
              <div className="px-3 py-2 bg-[#050608] border-t border-[rgba(180,155,100,0.08)] flex gap-1.5 overflow-x-auto scrollbar-none">
                {quickTips.map((tip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(tip)}
                    className="whitespace-nowrap font-mono text-[10px] text-[#b49b64]/80 hover:text-[#b49b64] bg-[#12141a] hover:bg-[#1a1c24] px-2.5 py-1 rounded border border-[rgba(180,155,100,0.15)] transition-colors"
                  >
                    + {tip}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-[#08090c] border-t border-[rgba(180,155,100,0.15)] flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Master Kael anything..."
                className="flex-1 bg-[#040506] border border-[rgba(180,155,100,0.2)] rounded px-3 py-2 text-xs text-[#c8c0b0] placeholder:text-[#5a5548] focus:outline-none focus:border-[#b49b64]"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="btn-blood px-3.5 py-2 rounded text-xs uppercase tracking-wider font-mono disabled:opacity-30"
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Master Trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative group flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer"
      >
        <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
          {/* Active online pulse indicator */}
          <span className="absolute top-0 right-0 z-20 w-3.5 h-3.5 rounded-full bg-[#4a7a5a] border-2 border-[#040506] animate-ping" />
          <span className="absolute top-0 right-0 z-20 w-3.5 h-3.5 rounded-full bg-[#4a7a5a] border-2 border-[#040506]" />

          {/* Clean PNG image without box background */}
          <CleanMasterImg
            alt="Ask Master"
            className="w-full h-full object-contain filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] transition-transform group-hover:scale-110"
          />
        </div>

        {/* Text badge below the PNG image */}
        <span className="font-cinzel text-xs font-bold text-[#b49b64] group-hover:text-[#ffffff] tracking-wider px-3 py-1 rounded-full bg-[#0c0e11]/90 border border-[#b49b64]/50 shadow-[0_4px_15px_rgba(0,0,0,0.8)] backdrop-blur-md transition-colors">
          {isOpen ? "Close Master" : "Ask Master"}
        </span>
      </motion.button>
    </div>
  );
}
