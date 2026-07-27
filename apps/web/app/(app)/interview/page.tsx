"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/game-context";
import { CleanSamuraiImg } from "@/lib/clean-samurai";
import { evaluateInterviewAnswer, InterviewScorecard, chatWithGroq } from "@/lib/ai-client";

interface RoleOption {
  id: string;
  title: string;
  domain: string;
  icon: string;
  difficulty: string;
}

const roles: RoleOption[] = [
  { id: "backend", title: "Senior Backend Engineer", domain: "Backend & Systems", icon: "⚔", difficulty: "Hard" },
  { id: "fullstack", title: "Fullstack Web Ninja", domain: "Frontend & API", icon: "⛩", difficulty: "Medium" },
  { id: "ai_eng", title: "AI / LLM Systems Developer", domain: "Artificial Intelligence", icon: "🔮", difficulty: "Hard" },
  { id: "frontend", title: "Frontend Performance Architect", domain: "UI/UX & Render Engines", icon: "🎨", difficulty: "Medium" },
];

export default function AiInterviewPage() {
  const { addXp, addCoins } = useGame();

  const [selectedRole, setSelectedRole] = useState<RoleOption>(roles[0]);
  const [sessionState, setSessionState] = useState<"idle" | "asking" | "evaluating" | "completed">("idle");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [scorecards, setScorecards] = useState<InterviewScorecard[]>([]);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  // Start interview session
  async function startInterview() {
    setSessionState("asking");
    setCurrentQuestionIndex(0);
    setScorecards([]);
    setLoadingQuestion(true);

    try {
      const prompt = `Generate 3 distinct, challenging interview questions for a candidate applying for '${selectedRole.title}'.
Format: Return ONLY the 3 questions separated by triple pipes (|||). No numbers, no headers.`;
      const res = await chatWithGroq([{ role: "user", content: prompt }], 0.6);
      const generated = res.split("|||").map((q) => q.trim()).filter((q) => q.length > 5);

      if (generated.length >= 3) {
        setQuestions(generated.slice(0, 3));
      } else {
        setQuestions([
          `How would you design a rate limiter for a high-concurrency API in ${selectedRole.title}?`,
          "Explain how you troubleshoot a memory leak in production server applications.",
          "How do you ensure data consistency across distributed database microservices?",
        ]);
      }
    } catch (err) {
      console.error(err);
      setQuestions([
        `How would you design a rate limiter for a high-concurrency API in ${selectedRole.title}?`,
        "Explain how you troubleshoot a memory leak in production server applications.",
        "How do you ensure data consistency across distributed database microservices?",
      ]);
    } finally {
      setLoadingQuestion(false);
    }
  }

  // Submit answer for evaluation
  async function handleSubmitAnswer() {
    if (!userAnswer.trim()) return;
    setSessionState("evaluating");

    const question = questions[currentQuestionIndex];
    const card = await evaluateInterviewAnswer(selectedRole.title, question, userAnswer);

    const updatedCards = [...scorecards, card];
    setScorecards(updatedCards);
    setUserAnswer("");

    // Reward player
    addXp(card.xpAwarded);
    addCoins(Math.floor(card.xpAwarded * 0.5));

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSessionState("asking");
    } else {
      setSessionState("completed");
    }
  }

  // Calculate final aggregate scores
  const avgOverall = scorecards.length > 0
    ? Math.round(scorecards.reduce((sum, c) => sum + c.overallScore, 0) / scorecards.length)
    : 0;

  const avgTechnical = scorecards.length > 0
    ? Math.round(scorecards.reduce((sum, c) => sum + c.technicalScore, 0) / scorecards.length)
    : 0;

  const avgProblemSolving = scorecards.length > 0
    ? Math.round(scorecards.reduce((sum, c) => sum + c.problemSolvingScore, 0) / scorecards.length)
    : 0;

  const avgSystemDesign = scorecards.length > 0
    ? Math.round(scorecards.reduce((sum, c) => sum + c.systemDesignScore, 0) / scorecards.length)
    : 0;

  const avgCommunication = scorecards.length > 0
    ? Math.round(scorecards.reduce((sum, c) => sum + c.communicationScore, 0) / scorecards.length)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="font-mono text-[10px] text-[#4a7a5a] uppercase tracking-widest px-2.5 py-1 rounded border border-[#4a7a5a]/30 bg-[#4a7a5a]/10">
          AI Interviewer & Scoring Dojo
        </span>
        <h1 className="font-cinzel text-3xl font-bold text-[#b49b64] tracking-wider">
          The AI Sparring Chamber
        </h1>
        <p className="font-cinzel text-xs text-[#6b6358] italic max-w-xl mx-auto">
          Test your blade against Master Kael and the Groq AI evaluation engine. Conduct real-time technical rounds and receive instant performance metrics.
        </p>
      </div>

      {/* IDLE STATE: Select Role & Launch */}
      {sessionState === "idle" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-cinzel text-sm font-bold text-[#c8c0b0] tracking-wider uppercase">
              1. Choose Target Role
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r)}
                  className={`p-5 rounded text-left transition-all flex flex-col justify-between space-y-4 ${
                    selectedRole.id === r.id
                      ? "scroll-surface border-[#b49b64]/50 ring-1 ring-[#b49b64]/30"
                      : "surface hover:border-[#b49b64]/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{r.icon}</span>
                      <div>
                        <h3 className="font-cinzel text-sm font-bold text-[#c8c0b0] tracking-wider">
                          {r.title}
                        </h3>
                        <p className="font-mono text-[10px] text-[#6b6358]">{r.domain}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[#8b2020]/30 bg-[#8b2020]/10 text-[#c43030]">
                      {r.difficulty}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="scroll-surface rounded p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full border border-[#b49b64]/40 bg-[#040506] p-1 overflow-hidden">
              <CleanSamuraiImg alt="Interviewer" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <h3 className="font-cinzel text-lg font-bold text-[#b49b64]">
                Ready for {selectedRole.title}?
              </h3>
              <p className="font-cinzel text-xs text-[#6b6358] italic max-w-md mx-auto">
                You will face 3 live technical questions. Groq AI will evaluate your technical logic, system design, and clarity.
              </p>
            </div>

            <button
              onClick={startInterview}
              className="btn-blood px-10 py-3 rounded text-xs uppercase tracking-widest"
            >
              Begin Technical Interview →
            </button>
          </div>
        </div>
      )}

      {/* ASKING & EVALUATING STATES */}
      {(sessionState === "asking" || sessionState === "evaluating") && (
        <div className="space-y-6">
          {/* Question Stepper */}
          <div className="flex items-center justify-between font-mono text-xs text-[#6b6358] border-b border-[rgba(180,155,100,0.12)] pb-3">
            <span>Role: <strong className="text-[#b49b64]">{selectedRole.title}</strong></span>
            <span>Question {currentQuestionIndex + 1} of {questions.length || 3}</span>
          </div>

          {loadingQuestion ? (
            <div className="p-12 text-center space-y-3 surface rounded">
              <p className="font-cinzel text-sm text-[#b49b64] animate-pulse">
                ⚔ Master Kael is formulating technical scenarios...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dialogue Box Question */}
              <div className="dialogue-box rounded p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-[#b49b64]/40 bg-[#040506] p-0.5 overflow-hidden">
                    <CleanSamuraiImg alt="Master Kael" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-cinzel text-xs text-[#6b6358] uppercase tracking-widest">
                    Master Kael asks:
                  </span>
                </div>
                <p className="font-cinzel text-base font-bold text-[#c8c0b0] leading-relaxed">
                  "{questions[currentQuestionIndex]}"
                </p>
              </div>

              {sessionState === "evaluating" ? (
                <div className="p-8 text-center surface rounded space-y-3">
                  <div className="w-8 h-8 border-2 border-[#b49b64] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-cinzel text-xs text-[#b49b64] italic">
                    Evaluating response against enterprise benchmarks with Groq LLM...
                  </p>
                </div>
              ) : (
                /* User Answer Input */
                <div className="space-y-4">
                  <textarea
                    rows={6}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your technical response here (explain architecture, tradeoffs, algorithms, protocols, or edge cases)..."
                    className="w-full bg-[#0a0b0d] border border-[#b49b64]/30 rounded p-4 font-mono text-xs text-[#c8c0b0] placeholder:text-[#5a5548] focus:outline-none focus:border-[#b49b64]"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!userAnswer.trim()}
                      className="btn-scroll px-8 py-3 rounded text-xs uppercase tracking-widest disabled:opacity-30"
                    >
                      Submit Answer for Evaluation →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* COMPLETED STATE: Comprehensive AI Scorecard */}
      {sessionState === "completed" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          <div className="scroll-surface rounded p-8 text-center space-y-4">
            <span className="font-mono text-xs text-[#4a7a5a] uppercase tracking-widest">
              Interview Complete • Scorecard Issued
            </span>
            <h2 className="font-cinzel text-3xl font-bold text-[#b49b64]">
              Overall Performance Rating: {avgOverall} / 100
            </h2>
            <p className="font-cinzel text-xs text-[#6b6358] italic max-w-lg mx-auto">
              Your responses for {selectedRole.title} have been analyzed across 4 key competencies.
            </p>
          </div>

          {/* Metric Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="surface rounded p-5 space-y-2 text-center">
              <span className="font-mono text-[10px] text-[#6b6358] uppercase">Technical Depth</span>
              <p className="font-mono text-2xl font-bold text-[#b49b64]">{avgTechnical}%</p>
            </div>
            <div className="surface rounded p-5 space-y-2 text-center">
              <span className="font-mono text-[10px] text-[#6b6358] uppercase">Problem Solving</span>
              <p className="font-mono text-2xl font-bold text-[#b49b64]">{avgProblemSolving}%</p>
            </div>
            <div className="surface rounded p-5 space-y-2 text-center">
              <span className="font-mono text-[10px] text-[#6b6358] uppercase">System Architecture</span>
              <p className="font-mono text-2xl font-bold text-[#b49b64]">{avgSystemDesign}%</p>
            </div>
            <div className="surface rounded p-5 space-y-2 text-center">
              <span className="font-mono text-[10px] text-[#6b6358] uppercase">Communication Clarity</span>
              <p className="font-mono text-2xl font-bold text-[#b49b64]">{avgCommunication}%</p>
            </div>
          </div>

          {/* Detailed Question Reviews */}
          <div className="space-y-4">
            <h3 className="font-cinzel text-sm font-bold text-[#c8c0b0] uppercase tracking-wider">
              Detailed Question Feedback
            </h3>
            {scorecards.map((card, idx) => (
              <div key={idx} className="surface rounded p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[rgba(180,155,100,0.1)] pb-3">
                  <span className="font-mono text-xs text-[#b49b64]">Question {idx + 1}</span>
                  <span className={`font-mono text-xs px-2.5 py-0.5 rounded border ${
                    card.overallScore >= 80
                      ? "border-[#4a7a5a]/40 bg-[#4a7a5a]/10 text-[#4a7a5a]"
                      : "border-[#b49b64]/40 bg-[#b49b64]/10 text-[#b49b64]"
                  }`}>
                    Score: {card.overallScore}/100 ({card.verdict})
                  </span>
                </div>
                <p className="font-cinzel text-xs text-[#6b6358] italic leading-relaxed">
                  "{card.feedback}"
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-[#4a7a5a] uppercase">✓ Strengths</span>
                    <ul className="list-disc list-inside font-sans text-xs text-[#c8c0b0] space-y-1">
                      {card.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-[#8b2020] uppercase">⚡ Key Growth Areas</span>
                    <ul className="list-disc list-inside font-sans text-xs text-[#c8c0b0] space-y-1">
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
              className="btn-scroll px-8 py-3 rounded text-xs uppercase tracking-widest"
            >
              Try Another Interview Round
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
