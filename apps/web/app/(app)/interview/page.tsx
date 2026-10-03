"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/game-context";
import { CleanSamuraiImg } from "@/lib/clean-samurai";
import { evaluateInterviewAnswer, InterviewScorecard, chatWithGroq } from "@/lib/ai-client";

/* ═══════════════════════════════════════════
   MOCK INTERVIEW PRACTICE
   AI-powered technical interview simulation
   with real-time scoring and feedback
   ═══════════════════════════════════════════ */

interface RoleOption {
  id: string;
  title: string;
  domain: string;
  icon: string;
  difficulty: string;
  color: string;
}

const roles: RoleOption[] = [
  { id: "backend", title: "Backend Developer", domain: "Backend & APIs", icon: "⚙️", difficulty: "Medium", color: "teal" },
  { id: "fullstack", title: "Full-Stack Developer", domain: "Frontend & Backend", icon: "🌐", difficulty: "Medium", color: "blue" },
  { id: "ai_eng", title: "AI / ML Engineer", domain: "Machine Learning", icon: "🤖", difficulty: "Hard", color: "rose" },
  { id: "frontend", title: "Frontend Developer", domain: "UI & Web Apps", icon: "🎨", difficulty: "Medium", color: "purple" },
  { id: "devops", title: "DevOps Engineer", domain: "Cloud & CI/CD", icon: "☁️", difficulty: "Hard", color: "amber" },
  { id: "data", title: "Data Analyst", domain: "Data & Analytics", icon: "📊", difficulty: "Medium", color: "emerald" },
];

const diffColors: Record<string, string> = {
  Medium: "border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fbbf24]",
  Hard: "border-[#f43f5e]/30 bg-[#f43f5e]/10 text-[#fb7185]",
  Easy: "border-[#10b981]/30 bg-[#10b981]/10 text-[#34d399]",
};

const roleColors: Record<string, { border: string; text: string; bg: string }> = {
  teal: { border: "border-[#06b6d4]/30", text: "text-[#22d3ee]", bg: "surface-teal" },
  purple: { border: "border-[#a855f7]/30", text: "text-[#c084fc]", bg: "surface-purple" },
  emerald: { border: "border-[#10b981]/30", text: "text-[#34d399]", bg: "surface-emerald" },
  amber: { border: "border-[#f59e0b]/30", text: "text-[#fbbf24]", bg: "surface-amber" },
  rose: { border: "border-[#f43f5e]/30", text: "text-[#fb7185]", bg: "surface-rose" },
  blue: { border: "border-[#3b82f6]/30", text: "text-[#60a5fa]", bg: "surface-blue" },
};

export default function MockInterviewPage() {
  const { addXp, addCoins } = useGame();

  const [selectedRole, setSelectedRole] = useState<RoleOption>(roles[0]);
  const [sessionState, setSessionState] = useState<"idle" | "asking" | "evaluating" | "completed">("idle");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [scorecards, setScorecards] = useState<InterviewScorecard[]>([]);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  async function startInterview() {
    setSessionState("asking");
    setCurrentQuestionIndex(0);
    setScorecards([]);
    setLoadingQuestion(true);

    try {
      const prompt = `Generate 3 interview questions for a '${selectedRole.title}' position.
These should be practical questions testing real-world knowledge, not trivia.
Use clear, simple language.
Format: Return ONLY the 3 questions separated by triple pipes (|||). No numbers, no headers.`;
      const res = await chatWithGroq([{ role: "user", content: prompt }], 0.6);
      const generated = res.split("|||").map((q) => q.trim()).filter((q) => q.length > 5);

      if (generated.length >= 3) {
        setQuestions(generated.slice(0, 3));
      } else {
        setQuestions([
          `How would you handle a slow API endpoint that takes too long to respond?`,
          "Explain the difference between a SQL and NoSQL database. When would you use each?",
          "How would you design a simple login system for a web application?",
        ]);
      }
    } catch {
      setQuestions([
        `What are the key responsibilities of a ${selectedRole.title}?`,
        "How would you debug a production issue that only happens sometimes?",
        "Describe how you would learn a new technology quickly for a project.",
      ]);
    } finally {
      setLoadingQuestion(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!userAnswer.trim()) return;
    setSessionState("evaluating");

    const question = questions[currentQuestionIndex];
    const card = await evaluateInterviewAnswer(selectedRole.title, question, userAnswer);

    const updatedCards = [...scorecards, card];
    setScorecards(updatedCards);
    setUserAnswer("");

    addXp(card.xpAwarded);
    addCoins(Math.floor(card.xpAwarded * 0.5));

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSessionState("asking");
    } else {
      setSessionState("completed");
    }
  }

  const avgOverall = scorecards.length > 0
    ? Math.round(scorecards.reduce((sum, c) => sum + c.overallScore, 0) / scorecards.length) : 0;
  const avgTechnical = scorecards.length > 0
    ? Math.round(scorecards.reduce((sum, c) => sum + c.technicalScore, 0) / scorecards.length) : 0;
  const avgProblemSolving = scorecards.length > 0
    ? Math.round(scorecards.reduce((sum, c) => sum + c.problemSolvingScore, 0) / scorecards.length) : 0;
  const avgSystemDesign = scorecards.length > 0
    ? Math.round(scorecards.reduce((sum, c) => sum + c.systemDesignScore, 0) / scorecards.length) : 0;
  const avgCommunication = scorecards.length > 0
    ? Math.round(scorecards.reduce((sum, c) => sum + c.communicationScore, 0) / scorecards.length) : 0;

  const rc = roleColors[selectedRole.color] || roleColors.teal;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-[10px] font-mono text-[#a855f7] uppercase tracking-widest px-3 py-1 rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10">
          AI-Powered Practice
        </span>
        <h1 className="font-cinzel text-3xl font-bold text-[#e8dfc8] tracking-wider">
          Mock Interview
        </h1>
        <p className="text-xs text-[#6b6358] max-w-xl mx-auto">
          Practice real interview questions and get instant AI feedback on your answers. Build confidence before applying to jobs.
        </p>
      </div>

      {/* IDLE: Select Role */}
      {sessionState === "idle" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#e8dfc8] tracking-wider uppercase">
              1. Choose a role to practice for
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {roles.map((r) => {
                const c = roleColors[r.color] || roleColors.teal;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRole(r)}
                    className={`p-4 rounded-xl text-left transition-all border ${
                      selectedRole.id === r.id
                        ? `${c.bg} ${c.border} ring-1 ${c.border}`
                        : "surface hover:border-[#2a2520]"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{r.icon}</span>
                      <div>
                        <h3 className={`text-sm font-semibold ${selectedRole.id === r.id ? c.text : "text-[#e8dfc8]"}`}>
                          {r.title}
                        </h3>
                        <p className="font-mono text-[10px] text-[#6b6358]">{r.domain}</p>
                      </div>
                    </div>
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${diffColors[r.difficulty]}`}>
                      {r.difficulty}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${rc.bg} rounded-xl p-6 text-center space-y-4 border ${rc.border}`}>
            <div className="w-14 h-14 mx-auto rounded-full border border-[#06b6d4]/30 bg-[#040506] p-1 overflow-hidden">
              <CleanSamuraiImg alt="Interviewer" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <h3 className={`font-cinzel text-lg font-bold ${rc.text}`}>
                Ready for {selectedRole.title} Practice?
              </h3>
              <p className="text-xs text-[#6b6358] max-w-md mx-auto">
                You&apos;ll face 3 practical questions. AI will evaluate your technical knowledge, problem-solving, and communication.
              </p>
            </div>
            <button
              onClick={startInterview}
              className="btn-primary px-8 py-3 rounded-xl text-xs font-semibold uppercase tracking-widest"
            >
              <span>Start Practice Interview →</span>
            </button>
          </div>
        </div>
      )}

      {/* ASKING & EVALUATING */}
      {(sessionState === "asking" || sessionState === "evaluating") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-[#6b6358] border-b border-[#2a2520]/30 pb-3">
            <span>Role: <strong className={rc.text}>{selectedRole.title}</strong></span>
            <span>Question {currentQuestionIndex + 1} of {questions.length || 3}</span>
          </div>

          {loadingQuestion ? (
            <div className="p-12 text-center space-y-3 surface rounded-xl">
              <div className="w-8 h-8 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-[#06b6d4] animate-pulse">
                Generating interview questions...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className={`dialogue-box-teal rounded-xl p-6 space-y-3`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-[#06b6d4]/30 bg-[#040506] p-0.5 overflow-hidden">
                    <CleanSamuraiImg alt="Interviewer" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xs text-[#22d3ee] uppercase tracking-widest font-medium">
                    Interviewer asks:
                  </span>
                </div>
                <p className="text-base font-semibold text-[#e8dfc8] leading-relaxed">
                  {questions[currentQuestionIndex]}
                </p>
              </div>

              {sessionState === "evaluating" ? (
                <div className="p-8 text-center surface rounded-xl space-y-3">
                  <div className="w-8 h-8 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-[#c084fc] animate-pulse">
                    AI is evaluating your response...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    rows={6}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here. Explain your thinking clearly — just like you would in a real interview..."
                    className="w-full bg-[#0a0b0d] border border-[#2a2520] rounded-xl p-4 text-sm text-[#e8dfc8] placeholder:text-[#3d3830] focus:outline-none focus:border-[#06b6d4] transition-colors"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!userAnswer.trim()}
                      className="btn-primary px-8 py-3 rounded-xl text-xs font-semibold uppercase tracking-widest disabled:opacity-30"
                    >
                      <span>Submit Answer →</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* COMPLETED: Scorecard */}
      {sessionState === "completed" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          <div className="rounded-2xl p-8 text-center space-y-4 border border-[#06b6d4]/20 bg-gradient-to-br from-[#06b6d4]/5 to-[#a855f7]/5">
            <span className="text-[10px] font-mono text-[#10b981] uppercase tracking-widest">
              Interview Complete
            </span>
            <h2 className="font-cinzel text-3xl font-bold bg-gradient-to-r from-[#06b6d4] to-[#a855f7] bg-clip-text text-transparent">
              Overall Score: {avgOverall}/100
            </h2>
            <p className="text-xs text-[#6b6358] max-w-lg mx-auto">
              Your answers for {selectedRole.title} have been analyzed across 4 key areas.
            </p>
          </div>

          {/* Scores Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="surface-teal rounded-xl p-4 text-center space-y-1">
              <span className="text-[10px] text-[#6b6358] uppercase">Technical</span>
              <p className="font-mono text-2xl font-bold text-[#22d3ee]">{avgTechnical}%</p>
            </div>
            <div className="surface-purple rounded-xl p-4 text-center space-y-1">
              <span className="text-[10px] text-[#6b6358] uppercase">Problem Solving</span>
              <p className="font-mono text-2xl font-bold text-[#c084fc]">{avgProblemSolving}%</p>
            </div>
            <div className="surface-amber rounded-xl p-4 text-center space-y-1">
              <span className="text-[10px] text-[#6b6358] uppercase">System Design</span>
              <p className="font-mono text-2xl font-bold text-[#fbbf24]">{avgSystemDesign}%</p>
            </div>
            <div className="surface-emerald rounded-xl p-4 text-center space-y-1">
              <span className="text-[10px] text-[#6b6358] uppercase">Communication</span>
              <p className="font-mono text-2xl font-bold text-[#34d399]">{avgCommunication}%</p>
            </div>
          </div>

          {/* Detailed Feedback */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#e8dfc8] uppercase tracking-wider">
              Question-by-Question Feedback
            </h3>
            {scorecards.map((card, idx) => (
              <div key={idx} className="surface rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#2a2520]/30 pb-3">
                  <span className="text-xs text-[#22d3ee]">Question {idx + 1}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border ${
                    card.overallScore >= 80
                      ? "border-[#10b981]/30 bg-[#10b981]/10 text-[#34d399]"
                      : card.overallScore >= 60
                      ? "border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fbbf24]"
                      : "border-[#f43f5e]/30 bg-[#f43f5e]/10 text-[#fb7185]"
                  }`}>
                    {card.overallScore}/100 — {card.verdict}
                  </span>
                </div>
                <p className="text-xs text-[#9a9182] leading-relaxed">
                  {card.feedback}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-[#34d399] uppercase font-medium">✓ Strengths</span>
                    <ul className="list-disc list-inside text-xs text-[#c8c0b0] space-y-1">
                      {card.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-[#fbbf24] uppercase font-medium">⚡ Areas to Improve</span>
                    <ul className="list-disc list-inside text-xs text-[#c8c0b0] space-y-1">
                      {card.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setSessionState("idle")}
              className="btn-primary px-8 py-3 rounded-xl text-xs font-semibold uppercase tracking-widest"
            >
              <span>Practice Another Interview</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
