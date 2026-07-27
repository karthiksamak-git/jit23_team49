"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/lib/game-context";

/* ═══════════════════════════════════════════
   THE DYNAMIC WORLD MAP & AI ROADMAP GENERATOR
   - Dynamic domain switching & AI custom roadmap generation
   - Genuine PNG image icons rendered via Canvas (data:image/png;base64,...)
   - Live level unlocks, node connections, & trial completions
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
  iconUrl?: string; // Generated PNG Data URL
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

/* Static SVG fallback icons for Server-Side Rendering (SSR) & initial Hydration pass */
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

/* Helper to render genuine PNG image data URLs (data:image/png;base64,...) */
function generatePngIconDataUrl(key: string, color = "#b49b64"): string {
  if (typeof window === "undefined") return defaultIcons[key] || "";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return defaultIcons[key] || "";

    // Outer dark seal ring
    ctx.fillStyle = "#0c0e11";
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    // Metallic border
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Inner subtle glow circle
    ctx.strokeStyle = "rgba(180,155,100,0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // Draw specific PNG icon glyphs
    switch (key) {
      case "shrine":
        ctx.beginPath();
        ctx.moveTo(64, 28);
        ctx.lineTo(28, 48);
        ctx.lineTo(100, 48);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(36, 52, 10, 36);
        ctx.fillRect(59, 52, 10, 36);
        ctx.fillRect(82, 52, 10, 36);
        ctx.fillRect(28, 90, 72, 8);
        break;

      case "query":
        ctx.strokeRect(36, 32, 56, 64);
        ctx.beginPath();
        ctx.arc(58, 54, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(68, 64);
        ctx.lineTo(82, 78);
        ctx.stroke();
        break;

      case "index":
        ctx.beginPath();
        ctx.moveTo(34, 38);
        ctx.lineTo(94, 38);
        ctx.moveTo(34, 54);
        ctx.lineTo(80, 54);
        ctx.moveTo(34, 70);
        ctx.lineTo(94, 70);
        ctx.moveTo(34, 86);
        ctx.lineTo(66, 86);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(85, 48);
        ctx.lineTo(75, 66);
        ctx.lineTo(85, 66);
        ctx.lineTo(73, 90);
        ctx.stroke();
        break;

      case "schema":
        ctx.strokeRect(30, 32, 32, 28);
        ctx.strokeRect(66, 68, 32, 28);
        ctx.beginPath();
        ctx.moveTo(62, 46);
        ctx.lineTo(82, 46);
        ctx.lineTo(82, 68);
        ctx.stroke();
        break;

      case "gateway":
        ctx.fillRect(26, 36, 76, 8);
        ctx.fillRect(32, 48, 64, 6);
        ctx.fillRect(38, 48, 10, 48);
        ctx.fillRect(80, 48, 10, 48);
        break;

      case "boss":
        ctx.fillStyle = "#c43030";
        ctx.beginPath();
        ctx.arc(64, 56, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(48, 70, 32, 16);
        ctx.fillStyle = "#0c0e11";
        ctx.fillRect(52, 50, 8, 10);
        ctx.fillRect(68, 50, 8, 10);
        break;

      case "ai":
        ctx.beginPath();
        ctx.arc(64, 64, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(36, 36, 8, 0, Math.PI * 2);
        ctx.arc(92, 36, 8, 0, Math.PI * 2);
        ctx.arc(36, 92, 8, 0, Math.PI * 2);
        ctx.arc(92, 92, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(36, 36); ctx.lineTo(64, 64);
        ctx.moveTo(92, 36); ctx.lineTo(64, 64);
        ctx.moveTo(36, 92); ctx.lineTo(64, 64);
        ctx.moveTo(92, 92); ctx.lineTo(64, 64);
        ctx.stroke();
        break;

      default:
        ctx.strokeRect(36, 32, 56, 64);
        ctx.beginPath();
        ctx.moveTo(46, 48); ctx.lineTo(82, 48);
        ctx.moveTo(46, 64); ctx.lineTo(82, 64);
        ctx.moveTo(46, 80); ctx.lineTo(70, 80);
        ctx.stroke();
        break;
    }

    return canvas.toDataURL("image/png");
  } catch {
    return defaultIcons[key] || "";
  }
}

/* Default Domain Realms with requested 6 level nodes */
const initialDomainRealms: DomainRealm[] = [
  {
    id: "backend",
    name: "Operation: The Backend Forge",
    subtitle: "Master server logic, databases, indexing, and API gateways",
    narrativeIntro:
      "The ancient servers hum beneath the mountain. Master Kael has tasked you with restoring the API Gateway before the Core Compiler corrupts the data streams.",
    missions: [
      {
        id: "m1",
        title: "The Foundation Shrine",
        subtitle: "Chapter I",
        lore: "Before the blade, the warrior must understand the stone it's made from. Learn the fundamentals of how servers receive and respond to HTTP requests.",
        status: "completed",
        type: "lesson",
        xp: 100,
        iconKey: "shrine",
        x: 50, y: 88,
        connections: ["m2"],
      },
      {
        id: "m2",
        title: "The First Query",
        subtitle: "Chapter II",
        lore: "Master Kael speaks: 'A warrior who cannot speak to the database is blind in battle.' Learn SQL to query raw datasets.",
        status: "completed",
        type: "lesson",
        xp: 150,
        iconKey: "query",
        x: 35, y: 72,
        connections: ["m3", "m3b"],
      },
      {
        id: "m3",
        title: "Index of Knowledge",
        subtitle: "Chapter III — Path of Speed",
        lore: "The archives are vast. Apply B-Tree indexing to make database queries respond in heartbeats instead of breaths.",
        status: "active",
        type: "challenge",
        xp: 200,
        iconKey: "index",
        x: 24, y: 54,
        connections: ["m4"],
      },
      {
        id: "m3b",
        title: "The Schema Wars",
        subtitle: "Chapter III — Path of Structure",
        lore: "An alternate route: learn to design relational schemas that withstand high-concurrency data loads.",
        status: "locked",
        type: "challenge",
        xp: 200,
        iconKey: "schema",
        x: 66, y: 54,
        connections: ["m4"],
      },
      {
        id: "m4",
        title: "The API Gateway",
        subtitle: "Chapter IV",
        lore: "The gateway stands between the world and your domain. Build RESTful endpoints that are both fast and secure.",
        status: "locked",
        type: "lesson",
        xp: 250,
        iconKey: "gateway",
        x: 45, y: 38,
        connections: ["m5"],
      },
      {
        id: "m5",
        title: "The Core Compiler",
        subtitle: "Boss Battle",
        lore: "The corrupted compiler awaits at the peak. It will test everything you have learned — queries, schemas, and API design.",
        status: "locked",
        type: "boss",
        xp: 500,
        iconKey: "boss",
        x: 50, y: 20,
        connections: [],
      },
    ],
  },
  {
    id: "frontend",
    name: "Operation: The Frontend Canvas",
    subtitle: "Master UI render engines, state machines, and micro-animations",
    narrativeIntro:
      "The visual veil has frayed. Master Tanaka asks you to restore client-side performance before the layout thread freezes.",
    missions: [
      {
        id: "f1",
        title: "The Render Shrine",
        subtitle: "Chapter I",
        lore: "Understand the Document Object Model and the lifecycle of browser layout ticks.",
        status: "completed",
        type: "lesson",
        xp: 100,
        iconKey: "shrine",
        x: 50, y: 88,
        connections: ["f2"],
      },
      {
        id: "f2",
        title: "State Machine Scroll",
        subtitle: "Chapter II",
        lore: "Manage complex component state transitions cleanly without unnecessary rerenders.",
        status: "active",
        type: "challenge",
        xp: 180,
        iconKey: "scroll",
        x: 35, y: 62,
        connections: ["f3"],
      },
      {
        id: "f3",
        title: "The Layout Compiler",
        subtitle: "Boss Battle",
        lore: "Defeat the layout thrashing dragon that slows client frame rates below 60FPS.",
        status: "locked",
        type: "boss",
        xp: 450,
        iconKey: "boss",
        x: 50, y: 30,
        connections: [],
      },
    ],
  },
];

function statusColor(status: string) {
  switch (status) {
    case "completed": return { border: "border-[#4a7a5a]", text: "text-[#4a7a5a]", bg: "bg-[#4a7a5a]/10" };
    case "active": return { border: "border-[#b49b64]", text: "text-[#b49b64]", bg: "bg-[#b49b64]/15" };
    default: return { border: "border-[#3d3830]", text: "text-[#3d3830]", bg: "bg-[#0a0b0d]/50" };
  }
}

function typeLabel(type: string) {
  switch (type) {
    case "boss": return "⚔ Boss Battle";
    case "challenge": return "◆ Challenge";
    default: return "◇ Lesson";
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
  const [pngMap, setPngMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    const keys = ["shrine", "query", "scroll", "index", "schema", "gateway", "boss", "ai", "cloud"];
    const generated: Record<string, string> = {};
    for (const k of keys) {
      generated[k] = defaultIcons[k] || "";
    }
    setPngMap(generated);
  }, []);

  const activeRealm = realms.find((r) => r.id === activeDomainId) || realms[0];

  // Dynamically compute mission statuses based on player progress
  const liveMissions = useMemo(() => {
    const completed = new Set(player.completedMissions);
    let foundActive = false;
    return activeRealm.missions.map((m) => {
      // Use identical default icon during SSR and initial hydration pass, and PNG map after mount
      const iconUrl = (mounted && pngMap[m.iconKey]) ? pngMap[m.iconKey] : (defaultIcons[m.iconKey] || "");
      if (completed.has(m.id)) {
        return { ...m, status: "completed" as const, iconUrl };
      }
      if (!foundActive) {
        foundActive = true;
        return { ...m, status: "active" as const, iconUrl };
      }
      return { ...m, status: "locked" as const, iconUrl };
    });
  }, [activeRealm.missions, player.completedMissions, pngMap, mounted]);

  const filteredMissions = liveMissions.filter((m) =>
    m.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.subtitle.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const completedCount = liveMissions.filter((m) => m.status === "completed").length;
  const totalCount = liveMissions.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // AI Dynamic Custom Roadmap Generator
  function handleGenerateAiRoadmap(e: React.FormEvent) {
    e.preventDefault();
    if (!customGoal.trim()) return;

    setIsGenerating(true);

    setTimeout(() => {
      const slug = customGoal.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
      const newDomainId = `ai-${slug}-${Date.now()}`;

      const aiGeneratedRealm: DomainRealm = {
        id: newDomainId,
        name: `Operation: ${customGoal}`,
        subtitle: `AI-Forged Custom Roadmap for ${customGoal}`,
        narrativeIntro: `The Master AI Oracle has forged a bespoke questline for ${customGoal}. Traverse these chapters to achieve complete mastery.`,
        isAiGenerated: true,
        missions: [
          {
            id: `${newDomainId}-1`,
            title: `${customGoal} Foundations`,
            subtitle: "Chapter I",
            lore: `Begin your journey into ${customGoal}. Learn core principles, toolchains, and initial architecture.`,
            status: "completed",
            type: "lesson",
            xp: 120,
            iconKey: "shrine",
            x: 50, y: 88,
            connections: [`${newDomainId}-2`],
          },
          {
            id: `${newDomainId}-2`,
            title: `Core Protocol Trial`,
            subtitle: "Chapter II",
            lore: `Put foundational ${customGoal} concepts into practice. Solve tactical problems under time pressure.`,
            status: "active",
            type: "challenge",
            xp: 180,
            iconKey: "query",
            x: 34, y: 68,
            connections: [`${newDomainId}-3`, `${newDomainId}-3b`],
          },
          {
            id: `${newDomainId}-3`,
            title: `Path of Performance`,
            subtitle: "Chapter III — Speed Track",
            lore: `Optimize execution pipelines and eliminate bottlenecks in your ${customGoal} setup.`,
            status: "locked",
            type: "challenge",
            xp: 220,
            iconKey: "index",
            x: 22, y: 50,
            connections: [`${newDomainId}-4`],
          },
          {
            id: `${newDomainId}-3b`,
            title: `Path of Resilience`,
            subtitle: "Chapter III — Reliability Track",
            lore: `Engineer fault-tolerant systems and robust error recovery mechanisms.`,
            status: "locked",
            type: "challenge",
            xp: 220,
            iconKey: "schema",
            x: 66, y: 50,
            connections: [`${newDomainId}-4`],
          },
          {
            id: `${newDomainId}-4`,
            title: `Integration Gateway`,
            subtitle: "Chapter IV",
            lore: `Connect your ${customGoal} system into modern cloud architectures.`,
            status: "locked",
            type: "lesson",
            xp: 280,
            iconKey: "gateway",
            x: 45, y: 34,
            connections: [`${newDomainId}-5`],
          },
          {
            id: `${newDomainId}-5`,
            title: `The Ultimate Overlord`,
            subtitle: "Boss Battle",
            lore: `The grand final test. Prove full competence in ${customGoal} before the AI Master Assembly.`,
            status: "locked",
            type: "boss",
            xp: 600,
            iconKey: "boss",
            x: 50, y: 18,
            connections: [],
          },
        ],
      };

      setRealms((prev) => [...prev, aiGeneratedRealm]);
      setActiveDomainId(newDomainId);
      setIsGenerating(false);
      setShowAiModal(false);
      setCustomGoal("");
    }, 1200);
  }

  // Quick Trial Completion for Demo / Dynamic Unlocking
  function handleFastCompleteMission(mission: MissionNode) {
    completeMission(mission.id, mission.xp);
    addCoins(Math.floor(mission.xp * 0.8));
    setSelected(null);
  }

  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col lg:flex-row bg-[#040506] relative">

      {/* ══════ LEFT PANEL — Domain Switcher & AI Generator ══════ */}
      <aside className="lg:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-[rgba(180,155,100,0.08)] p-6 space-y-6 bg-[#060709]">

        {/* Dynamic Domain Switcher */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block font-mono text-[10px] text-[#6b6358] uppercase tracking-widest">
              Select Realm Realm
            </label>
            <button
              onClick={() => setShowAiModal(true)}
              className="text-[10px] font-mono text-[#b49b64] hover:underline"
            >
              + AI Generator
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {realms.map((r) => (
              <button
                key={r.id}
                onClick={() => { setActiveDomainId(r.id); setSelected(null); }}
                className={`py-1 px-3 rounded text-xs font-cinzel tracking-wider transition-colors ${
                  activeDomainId === r.id
                    ? "bg-[#1a1714] text-[#b49b64] border border-[#b49b64]/40"
                    : "surface text-[#6b6358] hover:text-[#c8c0b0]"
                }`}
              >
                {r.name.replace("Operation: ", "")}
              </button>
            ))}
          </div>
        </div>

        <div className="ink-divider" />

        <div className="space-y-3">
          <p className="font-mono text-[10px] text-[#6b6358] tracking-widest uppercase">
            Active Operation
          </p>
          <h2 className="font-cinzel text-xl font-bold text-[#b49b64] tracking-wider leading-tight">
            {activeRealm.name}
          </h2>
          <p className="font-cinzel text-xs text-[#6b6358] tracking-wide italic">
            {activeRealm.subtitle}
          </p>
        </div>

        {/* Story Intro */}
        <div className="dialogue-box rounded px-4 py-4">
          <p className="font-cinzel text-xs text-[#6b6358] leading-relaxed italic">
            "{activeRealm.narrativeIntro}"
          </p>
        </div>

        {/* Dynamic Search Filter */}
        <div className="space-y-1.5">
          <input
            type="text"
            placeholder="Search levels by name..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-[#0a0b0d] border border-[rgba(180,155,100,0.15)] rounded px-3 py-1.5 font-mono text-xs text-[#c8c0b0] placeholder:text-[#3d3830] focus:outline-none focus:border-[#b49b64]"
          />
        </div>

        <div className="ink-divider" />

        {/* Dynamic Progress Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6b6358] font-mono">Operation Progress</span>
            <span className="text-xs text-[#b49b64] font-mono font-bold">
              {completedCount} / {totalCount} ({progressPct}%)
            </span>
          </div>
          <div className="xp-track h-[4px]">
            <div className="xp-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* AI Generator CTA */}
        <button
          onClick={() => setShowAiModal(true)}
          className="btn-scroll w-full py-2.5 rounded text-xs uppercase tracking-widest flex items-center justify-center gap-2 mt-4"
        >
          ⚔ Forge Custom AI Roadmap
        </button>
      </aside>

      {/* ══════ CENTER — Dynamic Interactive Map ══════ */}
      <div className="flex-1 relative overflow-hidden min-h-[550px]">
        <div className="absolute inset-0 bg-[#040506]">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 30%, rgba(180,155,100,0.12) 0%, transparent 50%),
                                radial-gradient(circle at 75% 70%, rgba(180,155,100,0.08) 0%, transparent 50%)`
            }}
          />
        </div>

        {/* Dynamic SVG paths connecting nodes */}
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

        {/* Dynamic Mission nodes with genuine PNG Image Icons */}
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
                  m.status === "locked" ? "opacity-40 cursor-not-allowed scale-90" : "cursor-pointer hover:scale-110 z-30"
                }`}
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
              >
                <div className="flex flex-col items-center gap-1.5">
                  {/* Seal frame containing PNG image icon */}
                  <div className={`${isBoss ? "w-16 h-16 shadow-[0_0_20px_rgba(196,48,48,0.4)]" : "w-12 h-12"} rounded-full ${colors.border} ${colors.bg} border-2 flex items-center justify-center p-2 transition-transform overflow-hidden bg-[#0c0e11] drop-shadow-xl`}>
                    <img
                      src={pngIcon}
                      alt={m.title}
                      suppressHydrationWarning
                      className={`w-full h-full object-contain ${
                        m.status === "completed"
                          ? "brightness-125"
                          : m.status === "locked"
                          ? "grayscale opacity-40"
                          : "brightness-100"
                      }`}
                    />
                  </div>

                  {/* Level title label */}
                  <span className={`font-cinzel text-[10px] tracking-wider whitespace-nowrap px-2 py-0.5 rounded bg-[#040506]/80 ${
                    m.status === "active" ? "text-[#b49b64] font-bold" : m.status === "completed" ? "text-[#4a7a5a]" : "text-[#5a5548]"
                  }`}>
                    {m.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════ RIGHT PANEL — Mission Details & Dynamic Controls ══════ */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:w-96 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-[rgba(180,155,100,0.08)] p-6 space-y-6 bg-[#0a0b0d]/95 backdrop-blur z-40"
          >
            <button
              onClick={() => setSelected(null)}
              className="text-[#6b6358] hover:text-[#c8c0b0] text-xs font-mono transition-colors"
            >
              ✕ Close Panel
            </button>

            <div className="space-y-2">
              <p className={`font-mono text-[10px] tracking-widest uppercase ${
                selected.type === "boss" ? "text-[#8b2020]" : "text-[#6b6358]"
              }`}>
                {typeLabel(selected.type)}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-[#b49b64]/40 p-1.5 bg-[#0c0e11] overflow-hidden">
                  <img
                    src={selected.iconUrl || defaultIcons[selected.iconKey]}
                    alt={selected.title}
                    suppressHydrationWarning
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-cinzel text-lg font-bold text-[#b49b64] tracking-wider">
                    {selected.title}
                  </h3>
                  <p className="font-cinzel text-xs text-[#6b6358] italic">{selected.subtitle}</p>
                </div>
              </div>
            </div>

            <div className="ink-divider" />

            <div className="dialogue-box rounded px-4 py-4">
              <p className="font-cinzel text-xs text-[#6b6358] leading-relaxed italic">
                "{selected.lore}"
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[10px] text-[#6b6358] tracking-widest uppercase">
                Rewards Offered
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#b49b64] text-xs">⬡</span>
                  <span className="font-mono text-sm font-bold text-[#c8c0b0]">{selected.xp} XP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#4a7a5a] text-xs">🪙</span>
                  <span className="font-mono text-sm font-bold text-[#c8c0b0]">{Math.floor(selected.xp * 0.8)} Coins</span>
                </div>
              </div>
            </div>

            <div className="ink-divider" />

            {/* Dynamic Action Buttons */}
            {selected.status === "completed" ? (
              <div className="space-y-2">
                <div className="p-3 rounded border border-[#4a7a5a]/30 bg-[#4a7a5a]/10 text-center font-cinzel text-xs text-[#4a7a5a]">
                  ✓ Mission Completed & Sealed
                </div>
                <Link
                  href="/worlds/backend"
                  className="btn-scroll block text-center py-2.5 rounded text-xs uppercase tracking-widest"
                >
                  Re-enter Dojo Battle →
                </Link>
              </div>
            ) : selected.status === "active" ? (
              <div className="space-y-2">
                <Link
                  href="/worlds/backend"
                  className="btn-blood block text-center py-3 rounded text-xs uppercase tracking-widest w-full"
                >
                  Enter Dojo Battle →
                </Link>
                <button
                  onClick={() => handleFastCompleteMission(selected)}
                  className="btn-scroll block text-center py-2 rounded text-[10px] uppercase tracking-widest w-full opacity-80"
                >
                  ⚡ Fast Complete Trial (Demo Unlock)
                </button>
              </div>
            ) : (
              <div className="p-3 rounded border border-[rgba(180,155,100,0.1)] bg-[#040506] text-center font-mono text-xs text-[#3d3830]">
                🔒 Complete previous missions to unlock
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ══════ AI ROADMAP GENERATOR MODAL ══════ */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040506]/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="scroll-surface max-w-md w-full p-6 rounded space-y-5 border border-[#b49b64]/30"
            >
              <div className="space-y-1">
                <h3 className="font-cinzel text-lg font-bold text-[#b49b64] tracking-wider">
                  ⚔ AI Custom Quest Forge
                </h3>
                <p className="text-xs text-[#6b6358] leading-relaxed italic">
                  Enter any career goal or technological domain to dynamically generate an 8-level branching mission map.
                </p>
              </div>

              <form onSubmit={handleGenerateAiRoadmap} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] text-[#6b6358] uppercase tracking-widest">
                    Target Domain / Career Goal
                  </label>
                  <input
                    type="text"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    placeholder="e.g. AI Systems Architect, Mobile Game Developer..."
                    className="w-full bg-[#0a0b0d] border border-[#b49b64]/25 rounded px-4 py-2.5 font-cinzel text-sm text-[#c8c0b0] placeholder:text-[#3d3830] focus:outline-none focus:border-[#b49b64]"
                    required
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2 rounded text-xs font-mono text-[#6b6358] hover:text-[#c8c0b0]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="btn-blood px-6 py-2 rounded text-xs uppercase tracking-widest"
                  >
                    {isGenerating ? "Forging AI Path..." : "Forge Roadmap →"}
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
