"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/lib/game-context";
import { chatWithGroq } from "@/lib/ai-client";

/* Tiny blur-up placeholder: instant terrain paint while the webp loads (2.3MB png → 105KB webp) */
const TERRAIN_BLUR = "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAASABgDASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAMCBv/EAB0QAAICAgMBAAAAAAAAAAAAAAABAhEDMSEiQRL/xAAWAQEBAQAAAAAAAAAAAAAAAAAAAQL/xAAVEQEBAAAAAAAAAAAAAAAAAAAAEf/aAAwDAQACEQMRAD8A5qGNTl2aSKyxfEaVNEHkuqS4Kqakl4VmJdW9Uwam41xQCxCPppaAAy9gAD//2Q==";

/* ═══════════════════════════════════════════
   DYNAMIC WORLD MAP & AI ROADMAP GENERATOR
   - Dynamic domain switching & AI custom roadmap generation
   - Live level unlocks, prerequisite connections, & trial completions
   ═══════════════════════════════════════════ */

interface MissionNode {
  id: string;
  title: string;
  subtitle: string;
  lore: string;
  status: "completed" | "active" | "locked";
  type: "lesson" | "challenge" | "boss";
  xp: number;
  iconKey: "shrine" | "query" | "scroll" | "index" | "schema" | "gateway" | "boss" | "ai" | "cloud";
  iconUrl?: string;
  x: number;  // position % from left
  y: number;  // position % from top
  connections: string[]; // ids this connects to
}

interface DomainRealm {
  id: string;
  name: string;
  subtitle: string;
  narrativeIntro: string;
  missions: MissionNode[];
  isAiGenerated?: boolean;
}

const defaultIcons: Record<string, string> = {
  shrine: "/png/kindpng_1111657.png",
  query: "/png/kindpng_2524739.png",
  scroll: "/png/kindpng_2525020.png",
  index: "/png/kindpng_340024.png",
  schema: "/png/kindpng_5601933.png",
  gateway: "/png/kindpng_5929531.png",
  boss: "/png/samurai-png-11553980134hdueus36j0.png",
  ai: "/png/kindpng_7672866.png",
  cloud: "/png/kindpng_7679533.png",
};

/* Full Set of IT Domain Realms */
const initialDomainRealms: DomainRealm[] = [
  {
    id: "backend",
    name: "Operation: Backend Development",
    subtitle: "Master server logic, databases, APIs, and microservices",
    narrativeIntro: "Build robust server architecture that handles data, authentication, and high-concurrency requests.",
    missions: [
      { id: "m1", title: "HTTP & Server Basics", subtitle: "Level 1", lore: "Learn how web servers listen to requests, process HTTP methods, and return status codes.", status: "active", type: "lesson", xp: 100, iconKey: "shrine", x: 50, y: 88, connections: ["m2"] },
      { id: "m2", title: "Database Queries & SQL", subtitle: "Level 2", lore: "Master relational database querying using SQL to fetch, insert, update, and aggregate data.", status: "locked", type: "lesson", xp: 150, iconKey: "query", x: 35, y: 72, connections: ["m3", "m3b"] },
      { id: "m3", title: "Indexing & Performance", subtitle: "Level 3 — Speed Track", lore: "Apply indexing and query optimization to make database queries execute in milliseconds.", status: "locked", type: "challenge", xp: 200, iconKey: "index", x: 24, y: 54, connections: ["m4"] },
      { id: "m3b", title: "Data Schemas & ORMs", subtitle: "Level 3 — Architecture Track", lore: "Design relational database schemas and use ORMs to manage application data models safely.", status: "locked", type: "challenge", xp: 200, iconKey: "schema", x: 66, y: 54, connections: ["m4"] },
      { id: "m4", title: "REST & GraphQL APIs", subtitle: "Level 4", lore: "Build scalable API endpoints, authentication middlewares, and handle error scenarios.", status: "locked", type: "lesson", xp: 250, iconKey: "gateway", x: 45, y: 38, connections: ["m5"] },
      { id: "m5", title: "Backend Systems Capstone", subtitle: "Final Boss", lore: "Demonstrate your complete backend engineering competence in a full system challenge.", status: "locked", type: "boss", xp: 500, iconKey: "boss", x: 50, y: 20, connections: [] },
    ],
  },
  {
    id: "frontend",
    name: "Operation: Frontend Development",
    subtitle: "Master UI render engines, React components, state, and styling",
    narrativeIntro: "Build responsive, accessible, and fast web applications that users love to interact with.",
    missions: [
      { id: "f1", title: "HTML5 & Semantic Web", subtitle: "Level 1", lore: "Understand modern document structure, accessible tags, and web page layout basics.", status: "active", type: "lesson", xp: 100, iconKey: "shrine", x: 50, y: 88, connections: ["f2"] },
      { id: "f2", title: "CSS Flexbox & Modern Grid", subtitle: "Level 2", lore: "Master responsive layout positioning, media queries, and utility-first styling.", status: "locked", type: "challenge", xp: 150, iconKey: "scroll", x: 35, y: 72, connections: ["f3", "f3b"] },
      { id: "f3", title: "JavaScript & DOM Manipulation", subtitle: "Level 3 — Scripting Track", lore: "Handle user events, fetch dynamic data from APIs, and mutate web page elements.", status: "locked", type: "challenge", xp: 200, iconKey: "query", x: 24, y: 54, connections: ["f4"] },
      { id: "f3b", title: "React Component Architecture", subtitle: "Level 3 — Component Track", lore: "Build reusable components, manage state with hooks, and handle prop flow.", status: "locked", type: "challenge", xp: 200, iconKey: "schema", x: 66, y: 54, connections: ["f4"] },
      { id: "f4", title: "State Management & Next.js", subtitle: "Level 4", lore: "Master routing, server components, and global application state management.", status: "locked", type: "lesson", xp: 250, iconKey: "gateway", x: 45, y: 38, connections: ["f5"] },
      { id: "f5", title: "Frontend Architecture Capstone", subtitle: "Final Boss", lore: "Build a complete high-performance web interface meeting modern industry standards.", status: "locked", type: "boss", xp: 500, iconKey: "boss", x: 50, y: 20, connections: [] },
    ],
  },
  {
    id: "fullstack",
    name: "Operation: Full-Stack Development",
    subtitle: "Combine client UI and server backend to build complete web products",
    narrativeIntro: "Master end-to-end development, connecting frontend interfaces with backend databases.",
    missions: [
      { id: "fs1", title: "Web Architecture Basics", subtitle: "Level 1", lore: "Understand client-server architecture, HTTP requests, and web app structure.", status: "active", type: "lesson", xp: 100, iconKey: "shrine", x: 50, y: 88, connections: ["fs2"] },
      { id: "fs2", title: "Full-Stack JavaScript & APIs", subtitle: "Level 2", lore: "Connect frontend components with Node.js & Express API servers.", status: "locked", type: "challenge", xp: 160, iconKey: "query", x: 35, y: 72, connections: ["fs3"] },
      { id: "fs3", title: "Database Integration & Auth", subtitle: "Level 3", lore: "Implement user registration, password hashing, JWT sessions, and database queries.", status: "locked", type: "challenge", xp: 220, iconKey: "schema", x: 24, y: 54, connections: ["fs4"] },
      { id: "fs4", title: "Full-Stack Deployment", subtitle: "Level 4", lore: "Deploy web applications to cloud hosts with automated builds and database connections.", status: "locked", type: "lesson", xp: 280, iconKey: "gateway", x: 45, y: 38, connections: ["fs5"] },
      { id: "fs5", title: "Product Capstone Project", subtitle: "Final Boss", lore: "Build and deploy a full-featured web app from scratch.", status: "locked", type: "boss", xp: 500, iconKey: "boss", x: 50, y: 20, connections: [] },
    ],
  },
  {
    id: "devops",
    name: "Operation: DevOps & Cloud",
    subtitle: "Master containerization, CI/CD pipelines, and cloud infrastructure",
    narrativeIntro: "Automate software delivery pipelines, manage cloud resources, and ensure server uptime.",
    missions: [
      { id: "d1", title: "Linux & Shell Scripting", subtitle: "Level 1", lore: "Master command line navigation, shell scripts, and system permissions.", status: "active", type: "lesson", xp: 100, iconKey: "shrine", x: 50, y: 88, connections: ["d2"] },
      { id: "d2", title: "Docker Containerization", subtitle: "Level 2", lore: "Package applications and their dependencies into portable Docker containers.", status: "locked", type: "challenge", xp: 170, iconKey: "cloud", x: 35, y: 72, connections: ["d3"] },
      { id: "d3", title: "CI/CD Pipelines with GitHub Actions", subtitle: "Level 3", lore: "Automate software testing, code quality checks, and automated deployments.", status: "locked", type: "challenge", xp: 230, iconKey: "index", x: 24, y: 54, connections: ["d4"] },
      { id: "d4", title: "Cloud Infrastructure (AWS/GCP)", subtitle: "Level 4", lore: "Provision virtual machines, storage buckets, and manage cloud networking.", status: "locked", type: "lesson", xp: 300, iconKey: "gateway", x: 45, y: 38, connections: ["d5"] },
      { id: "d5", title: "Cloud Reliability Capstone", subtitle: "Final Boss", lore: "Set up a self-healing, automated cloud infrastructure pipeline.", status: "locked", type: "boss", xp: 500, iconKey: "boss", x: 50, y: 20, connections: [] },
    ],
  },
  {
    id: "ai",
    name: "Operation: AI & Machine Learning",
    subtitle: "Master data models, neural networks, LLMs, and AI integrations",
    narrativeIntro: "Train intelligent models, understand prompt engineering, and integrate AI APIs into applications.",
    missions: [
      { id: "ai1", title: "Python for AI & Data", subtitle: "Level 1", lore: "Learn fundamental Python programming for data manipulation and AI workflows.", status: "active", type: "lesson", xp: 100, iconKey: "shrine", x: 50, y: 88, connections: ["ai2"] },
      { id: "ai2", title: "Machine Learning Fundamentals", subtitle: "Level 2", lore: "Understand supervised and unsupervised learning algorithms and model evaluation.", status: "locked", type: "challenge", xp: 180, iconKey: "ai", x: 35, y: 72, connections: ["ai3"] },
      { id: "ai3", title: "Prompt Engineering & LLM APIs", subtitle: "Level 3", lore: "Work with Large Language Models, structured prompt engineering, and API integration.", status: "locked", type: "challenge", xp: 240, iconKey: "query", x: 24, y: 54, connections: ["ai4"] },
      { id: "ai4", title: "Neural Networks & Deep Learning", subtitle: "Level 4", lore: "Understand neural network layers, embeddings, and vector similarity search.", status: "locked", type: "lesson", xp: 300, iconKey: "schema", x: 45, y: 38, connections: ["ai5"] },
      { id: "ai5", title: "AI Application Capstone", subtitle: "Final Boss", lore: "Build an intelligent AI-powered application with real-time inference.", status: "locked", type: "boss", xp: 500, iconKey: "boss", x: 50, y: 20, connections: [] },
    ],
  },
  {
    id: "data",
    name: "Operation: Data Science & Analytics",
    subtitle: "Master data extraction, Pandas analysis, visualization, and SQL BI",
    narrativeIntro: "Turn raw datasets into valuable business insights, clear visualizations, and predictive analytics.",
    missions: [
      { id: "ds1", title: "SQL & Data Extraction", subtitle: "Level 1", lore: "Extract and clean datasets from relational databases using SQL aggregations.", status: "active", type: "lesson", xp: 100, iconKey: "shrine", x: 50, y: 88, connections: ["ds2"] },
      { id: "ds2", title: "Python Pandas & Data Analysis", subtitle: "Level 2", lore: "Manipulate dataframes, handle missing values, and transform complex datasets.", status: "locked", type: "challenge", xp: 170, iconKey: "index", x: 35, y: 72, connections: ["ds3"] },
      { id: "ds3", title: "Data Visualization & Dashboards", subtitle: "Level 3", lore: "Build compelling visual charts and dashboards to communicate business metrics.", status: "locked", type: "challenge", xp: 230, iconKey: "scroll", x: 24, y: 54, connections: ["ds4"] },
      { id: "ds4", title: "Statistical Modeling", subtitle: "Level 4", lore: "Apply hypothesis testing, regression models, and forecasting techniques.", status: "locked", type: "lesson", xp: 290, iconKey: "gateway", x: 45, y: 38, connections: ["ds5"] },
      { id: "ds5", title: "Analytics Capstone", subtitle: "Final Boss", lore: "Analyze a complex real-world dataset and present actionable recommendations.", status: "locked", type: "boss", xp: 500, iconKey: "boss", x: 50, y: 20, connections: [] },
    ],
  },
];

function statusColor(status: string) {
  switch (status) {
    case "completed": return { border: "border-[#10b981]", text: "text-[#34d399]", bg: "bg-[#10b981]/15" };
    case "active": return { border: "border-[#06b6d4]", text: "text-[#22d3ee]", bg: "bg-[#06b6d4]/20" };
    default: return { border: "border-[#2a2520]", text: "text-[#6b6358]", bg: "bg-[#0a0b0d]/60" };
  }
}

function typeLabel(type: string) {
  switch (type) {
    case "boss": return "⚔ Capstone Trial";
    case "challenge": return "◆ Skill Challenge";
    default: return "◇ Practice Lesson";
  }
}

export default function DynamicWorldMapPage() {
  const { player, completeMission, addCoins } = useGame();
  const [mounted, setMounted] = useState(false);
  const [realms, setRealms] = useState<DomainRealm[]>(initialDomainRealms);
  const [activeDomainId, setActiveDomainId] = useState("backend");
  const [selected, setSelected] = useState<MissionNode | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [showAiModal, setShowAiModal] = useState(false);
  const [customGoal, setCustomGoal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync active realm with user's AI recommended domain from onboarding
  useEffect(() => {
    setMounted(true);
    if (player.recommendedDomain || player.realmName) {
      const rec = (player.recommendedDomain || player.realmName).toLowerCase();
      if (rec.includes("frontend")) setActiveDomainId("frontend");
      else if (rec.includes("full")) setActiveDomainId("fullstack");
      else if (rec.includes("devops") || rec.includes("cloud")) setActiveDomainId("devops");
      else if (rec.includes("ai") || rec.includes("machine")) setActiveDomainId("ai");
      else if (rec.includes("data")) setActiveDomainId("data");
      else setActiveDomainId("backend");
    }
  }, [player.recommendedDomain, player.realmName]);

  const activeRealm = realms.find((r) => r.id === activeDomainId) || realms[0];

  // Dynamic Level Unlocking Logic
  const liveMissions = useMemo(() => {
    const completed = new Set(player.completedMissions);

    return activeRealm.missions.map((m, idx) => {
      const iconUrl = defaultIcons[m.iconKey] || "";

      if (completed.has(m.id)) {
        return { ...m, status: "completed" as const, iconUrl };
      }

      // Node is active if:
      // 1. It is the starting level (idx === 0)
      // 2. OR any prerequisite connected to it is completed
      const isPrereqCompleted = activeRealm.missions.some(
        (prev) => prev.connections.includes(m.id) && completed.has(prev.id)
      );

      if (idx === 0 || isPrereqCompleted) {
        return { ...m, status: "active" as const, iconUrl };
      }

      return { ...m, status: "locked" as const, iconUrl };
    });
  }, [activeRealm.missions, player.completedMissions]);

  const filteredMissions = liveMissions.filter((m) =>
    m.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.subtitle.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const completedCount = liveMissions.filter((m) => m.status === "completed").length;
  const totalCount = liveMissions.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // AI Dynamic Custom Roadmap Generator
  async function handleGenerateAiRoadmap(e: React.FormEvent) {
    e.preventDefault();
    if (!customGoal.trim() || isGenerating) return;

    setIsGenerating(true);

    try {
      const prompt = `Generate a 5-level learning roadmap for a student who wants to master: "${customGoal}".
Return ONLY a valid JSON object:
{
  "name": "Operation: ${customGoal}",
  "subtitle": "AI-Forged Learning Path for ${customGoal}",
  "narrativeIntro": "A custom learning path generated by AI for ${customGoal}.",
  "missions": [
    { "id": "c1", "title": "Level 1 Title", "subtitle": "Level 1", "lore": "Brief description", "type": "lesson", "xp": 100, "iconKey": "shrine", "x": 50, "y": 88, "connections": ["c2"] },
    { "id": "c2", "title": "Level 2 Title", "subtitle": "Level 2", "lore": "Brief description", "type": "challenge", "xp": 160, "iconKey": "query", "x": 35, "y": 72, "connections": ["c3"] },
    { "id": "c3", "title": "Level 3 Title", "subtitle": "Level 3", "lore": "Brief description", "type": "challenge", "xp": 220, "iconKey": "index", "x": 24, "y": 54, "connections": ["c4"] },
    { "id": "c4", "title": "Level 4 Title", "subtitle": "Level 4", "lore": "Brief description", "type": "lesson", "xp": 280, "iconKey": "gateway", "x": 45, "y": 38, "connections": ["c5"] },
    { "id": "c5", "title": "Capstone Project", "subtitle": "Final Boss", "lore": "Final capstone", "type": "boss", "xp": 500, "iconKey": "boss", "x": 50, "y": 20, "connections": [] }
  ]
}`;

      const res = await chatWithGroq([{ role: "user", content: prompt }], 0.6);
      const cleaned = res.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const slug = customGoal.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
      const newDomainId = `ai-${slug}-${Date.now()}`;

      const aiRealm: DomainRealm = {
        id: newDomainId,
        name: parsed.name || `Operation: ${customGoal}`,
        subtitle: parsed.subtitle || `AI Roadmap for ${customGoal}`,
        narrativeIntro: parsed.narrativeIntro || `AI-generated roadmap for ${customGoal}.`,
        isAiGenerated: true,
        missions: (parsed.missions || []).map((m: any, idx: number) => ({
          ...m,
          id: `${newDomainId}-${idx + 1}`,
          connections: m.connections ? m.connections.map((c: string) => `${newDomainId}-${c.replace("c", "")}`) : [],
        })),
      };

      setRealms((prev) => [...prev, aiRealm]);
      setActiveDomainId(newDomainId);
      setShowAiModal(false);
      setCustomGoal("");
    } catch (err) {
      console.error("Failed to generate AI roadmap:", err);
    } finally {
      setIsGenerating(false);
    }
  }

  // Quick Trial Completion for Demo / Instant Unlocking
  function handleFastCompleteMission(mission: MissionNode) {
    completeMission(mission.id, mission.xp);
    addCoins(Math.floor(mission.xp * 0.8));
    setSelected(null);
  }

  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col lg:flex-row relative">

      {/* ══════ LEFT PANEL — Domain Switcher & AI Generator ══════ */}
      <aside className="lg:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-[#2a2520]/40 p-6 space-y-6 bg-[#060709]/70 backdrop-blur-md">

        {/* Dynamic Domain Switcher */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block font-mono text-[10px] text-[#6b6358] uppercase tracking-widest">
              Domain Realms
            </label>
            <button
              onClick={() => setShowAiModal(true)}
              className="text-[10px] font-mono text-[#06b6d4] hover:underline flex items-center gap-1"
            >
              + AI Roadmap Generator
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {realms.map((r) => (
              <button
                key={r.id}
                onClick={() => { setActiveDomainId(r.id); setSelected(null); }}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium tracking-wider transition-all ${
                  activeDomainId === r.id
                    ? "bg-[#06b6d4]/15 text-[#22d3ee] border border-[#06b6d4]/40 font-semibold"
                    : "surface text-[#6b6358] hover:text-[#c8c0b0]"
                }`}
              >
                {r.name.replace("Operation: ", "")}
              </button>
            ))}
          </div>
        </div>

        <div className="ink-divider-teal" />

        <div className="space-y-2">
          <span className="text-[10px] font-mono text-[#06b6d4] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10">
            Active Domain
          </span>
          <h2 className="font-cinzel text-xl font-bold text-[#e8dfc8] tracking-wider leading-tight">
            {activeRealm.name}
          </h2>
          <p className="text-xs text-[#6b6358]">
            {activeRealm.subtitle}
          </p>
        </div>

        {/* Intro */}
        <div className="dialogue-box-teal rounded-xl px-4 py-4">
          <p className="text-xs text-[#9a9182] leading-relaxed">
            {activeRealm.narrativeIntro}
          </p>
        </div>

        {/* Search Filter */}
        <div className="space-y-1.5">
          <input
            type="text"
            placeholder="Search levels..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-[#0a0b0d] border border-[#2a2520] rounded-lg px-3 py-2 text-xs text-[#e8dfc8] placeholder:text-[#3d3830] focus:outline-none focus:border-[#06b6d4]"
          />
        </div>

        <div className="ink-divider-teal" />

        {/* Progress Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#6b6358]">Domain Progress</span>
            <span className="text-[#34d399] font-bold">
              {completedCount} / {totalCount} ({progressPct}%)
            </span>
          </div>
          <div className="xp-track h-2 rounded-full">
            <div className="xp-fill-emerald rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* AI Generator CTA */}
        <button
          onClick={() => setShowAiModal(true)}
          className="btn-teal w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 mt-4"
        >
          <span>✨ Forge Custom AI Roadmap</span>
        </button>
      </aside>

      {/* ══════ CENTER — Dynamic Interactive Map ══════ */}
      <div className="flex-1 relative overflow-hidden min-h-[550px]">
        <div className="absolute inset-0 bg-[#040506]/25">
          {/* Cinematic terrain backdrop (dark theme) */}
          <img
            src="/png/terrain-map.webp"
            alt=""
            aria-hidden="true"
            decoding="async"
            fetchPriority="low"
            style={{ backgroundImage: `url(${TERRAIN_BLUR})`, backgroundSize: "cover", backgroundPosition: "center" }}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          {/* Dark veil so nodes/lines stay readable over the artwork */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#040506]/75 via-[#040506]/35 to-[#040506]/85" />
          <div className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 30%, rgba(6,182,212,0.35) 0%, transparent 50%),
                                radial-gradient(circle at 75% 70%, rgba(168,85,247,0.35) 0%, transparent 50%)`
            }}
          />
        </div>

        {/* Connecting SVG lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {activeRealm.missions.map((m) =>
            m.connections.map((targetId) => {
              const target = activeRealm.missions.find((n) => n.id === targetId);
              if (!target) return null;
              const sourceNode = liveMissions.find((n) => n.id === m.id);
              const isActive = sourceNode?.status === "completed";
              return (
                <line
                  key={`${m.id}-${targetId}`}
                  x1={`${m.x}%`}
                  y1={`${m.y}%`}
                  x2={`${target.x}%`}
                  y2={`${target.y}%`}
                  className={isActive ? "ink-path-active" : "ink-path"}
                  strokeDasharray={isActive ? "none" : "6 4"}
                />
              );
            })
          )}
        </svg>

        {/* Level Nodes */}
        <div className="relative z-20 w-full h-full min-h-[550px] lg:min-h-[calc(100vh-48px)]">
          {filteredMissions.map((m) => {
            const colors = statusColor(m.status);
            const isBoss = m.type === "boss";
            const pngIcon = m.iconUrl || defaultIcons[m.iconKey] || "";

            return (
              <button
                key={m.id}
                onClick={() => m.status !== "locked" && setSelected(m)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                  m.status === "locked" ? "opacity-60 grayscale-[0.4] cursor-not-allowed scale-90" : "cursor-pointer hover:scale-110 z-30"
                }`}
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`${isBoss ? "w-16 h-16 shadow-[0_0_20px_rgba(244,63,94,0.4)]" : "w-12 h-12"} rounded-full ${colors.border} ${colors.bg} border-2 flex items-center justify-center p-2.5 transition-transform overflow-hidden bg-[#0c0e11] drop-shadow-xl`}>
                    <img
                      src={pngIcon}
                      alt={m.title}
                      suppressHydrationWarning
                      className={`w-full h-full object-contain ${
                        m.status === "completed"
                          ? "brightness-125"
                          : m.status === "locked"
                          ? "grayscale opacity-55"
                          : "brightness-110"
                      }`}
                    />
                  </div>

                  <span className={`text-[10px] font-semibold tracking-wider whitespace-nowrap px-2.5 py-0.5 rounded-full border bg-[#040506]/90 backdrop-blur-sm ${
                    m.status === "active" ? "text-[#22d3ee] border-[#06b6d4]/40" : m.status === "completed" ? "text-[#34d399] border-[#10b981]/40" : "text-[#6b6358] border-[#2a2520]"
                  }`}>
                    {m.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════ RIGHT PANEL — Mission Details & Actions ══════ */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:w-96 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-[#2a2520]/40 p-6 space-y-6 bg-[#0a0b0d]/95 backdrop-blur z-40"
          >
            <button
              onClick={() => setSelected(null)}
              className="text-[#6b6358] hover:text-[#e8dfc8] text-xs font-mono transition-colors"
            >
              ✕ Close Panel
            </button>

            <div className="space-y-2">
              <span className={`text-[10px] font-mono uppercase tracking-widest ${
                selected.type === "boss" ? "text-[#fb7185]" : "text-[#06b6d4]"
              }`}>
                {typeLabel(selected.type)}
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-[#06b6d4]/40 p-2 bg-[#0c0e11] overflow-hidden">
                  <img
                    src={selected.iconUrl || defaultIcons[selected.iconKey]}
                    alt={selected.title}
                    suppressHydrationWarning
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-cinzel text-lg font-bold text-[#e8dfc8] tracking-wider">
                    {selected.title}
                  </h3>
                  <p className="text-xs text-[#6b6358]">{selected.subtitle}</p>
                </div>
              </div>
            </div>

            <div className="ink-divider-teal" />

            <div className="dialogue-box-teal rounded-xl px-4 py-4">
              <p className="text-xs text-[#9a9182] leading-relaxed">
                {selected.lore}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-mono text-[#6b6358] tracking-widest uppercase">
                Rewards Offered
              </p>
              <div className="flex items-center gap-4 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#22d3ee]">⬡</span>
                  <span className="font-bold text-[#22d3ee]">+{selected.xp} XP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#c084fc]">🪙</span>
                  <span className="font-bold text-[#c084fc]">+{Math.floor(selected.xp * 0.8)} Coins</span>
                </div>
              </div>
            </div>

            <div className="ink-divider-teal" />

            {/* Dynamic Action Buttons linking to Dojo */}
            {selected.status === "completed" ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 text-center text-xs text-[#34d399] font-medium">
                  ✓ Level Completed
                </div>
                <Link
                  href={`/worlds/dojo?missionId=${selected.id}&title=${encodeURIComponent(selected.title)}&domain=${encodeURIComponent(activeRealm.name)}&lore=${encodeURIComponent(selected.lore)}&xp=${selected.xp}`}
                  className="btn-teal block text-center py-3 rounded-xl text-xs uppercase tracking-wider w-full font-semibold"
                >
                  Re-take Practice Trial →
                </Link>
              </div>
            ) : selected.status === "active" ? (
              <div className="space-y-2">
                <Link
                  href={`/worlds/dojo?missionId=${selected.id}&title=${encodeURIComponent(selected.title)}&domain=${encodeURIComponent(activeRealm.name)}&lore=${encodeURIComponent(selected.lore)}&xp=${selected.xp}`}
                  className="btn-primary block text-center py-3.5 rounded-xl text-xs uppercase tracking-widest w-full font-bold shadow-lg"
                >
                  <span>Start Practice Trial →</span>
                </Link>
                <button
                  onClick={() => handleFastCompleteMission(selected)}
                  className="text-[10px] font-mono text-[#6b6358] hover:text-[#22d3ee] block text-center w-full py-1 transition-colors"
                >
                  ⚡ Fast Complete (Demo Unlock)
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-[#2a2520] bg-[#040506] text-center text-xs text-[#6b6358]">
                🔒 Complete previous levels to unlock
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ══════ AI ROADMAP GENERATOR MODAL ══════ */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040506]/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="surface max-w-md w-full p-6 rounded-2xl space-y-5 border border-[#06b6d4]/30 shadow-2xl bg-[#090b0f]"
            >
              <div className="space-y-1">
                <h3 className="font-cinzel text-lg font-bold text-[#22d3ee] tracking-wider">
                  ✨ AI Custom Roadmap Generator
                </h3>
                <p className="text-xs text-[#9a9182] leading-relaxed">
                  Enter any IT domain or career goal to dynamically generate a custom 5-level learning path.
                </p>
              </div>

              <form onSubmit={handleGenerateAiRoadmap} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-[#6b6358] uppercase tracking-widest font-medium">
                    Career Goal / IT Domain
                  </label>
                  <input
                    type="text"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    placeholder="e.g. Cybersecurity Analyst, Game Developer..."
                    className="w-full bg-[#040506] border border-[#2a2520] rounded-xl px-4 py-2.5 text-sm text-[#e8dfc8] placeholder:text-[#3d3830] focus:outline-none focus:border-[#06b6d4]"
                    required
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-mono text-[#6b6358] hover:text-[#e8dfc8]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest"
                  >
                    <span>{isGenerating ? "Forging AI Path..." : "Generate Path →"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
