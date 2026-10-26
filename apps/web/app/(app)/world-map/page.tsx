"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/lib/game-context";
import { chatWithGroq } from "@/lib/ai-client";
import { matchRealmId } from "@/lib/realm-match";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { Swords, AlertTriangle, Sparkles, X, Hexagon, Coins, Check, Zap, Lock, Wand2, Diamond, Circle, Star, Trash2 } from "lucide-react";

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
  /** user-starred path — pinned to the top of the switcher */
  favorite?: boolean;
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
  {
    id: "cyber",
    name: "Operation: Cybersecurity",
    subtitle: "Master threat detection, cryptography, ethical hacking & defence",
    narrativeIntro: "Think like an attacker to defend like a pro — hunt threats, crack hashes (legally) and lock down systems.",
    missions: [
      { id: "cy1", title: "Networking & Linux Basics", subtitle: "Level 1", lore: "Understand packets, ports, protocols and the command line every defender lives in.", status: "active", type: "lesson", xp: 100, iconKey: "shrine", x: 50, y: 88, connections: ["cy2"] },
      { id: "cy2", title: "Cryptography & Encryption", subtitle: "Level 2", lore: "Learn hashing, symmetric vs asymmetric encryption and how certificates work.", status: "locked", type: "lesson", xp: 160, iconKey: "scroll", x: 35, y: 72, connections: ["cy3"] },
      { id: "cy3", title: "Threats & Social Engineering", subtitle: "Level 3", lore: "Recognise malware, phishing and the human-side attacks that bypass every firewall.", status: "locked", type: "challenge", xp: 220, iconKey: "index", x: 24, y: 54, connections: ["cy4"] },
      { id: "cy4", title: "Defensive Security & Hardening", subtitle: "Level 4", lore: "Configure firewalls, harden systems and monitor incidents with SIEM tooling.", status: "locked", type: "lesson", xp: 280, iconKey: "gateway", x: 45, y: 38, connections: ["cy5"] },
      { id: "cy5", title: "Security Operations Capstone", subtitle: "Final Boss", lore: "Detect, contain and report on a live simulated attack end to end.", status: "locked", type: "boss", xp: 500, iconKey: "boss", x: 50, y: 20, connections: [] },
    ],
  },
  {
    id: "mobile",
    name: "Operation: Mobile App Development",
    subtitle: "Master Android, iOS and cross-platform app engineering",
    narrativeIntro: "Build apps that live in users' pockets — smooth screens, local storage and store-ready releases.",
    missions: [
      { id: "mb1", title: "Language & UI Foundations", subtitle: "Level 1", lore: "Learn the mobile language basics (Dart/Kotlin/Swift) and build your first screens.", status: "active", type: "lesson", xp: 100, iconKey: "shrine", x: 50, y: 88, connections: ["mb2"] },
      { id: "mb2", title: "State Management & Navigation", subtitle: "Level 2", lore: "Keep screens in sync and move users through stacks, tabs and drawers cleanly.", status: "locked", type: "challenge", xp: 160, iconKey: "scroll", x: 35, y: 72, connections: ["mb3"] },
      { id: "mb3", title: "APIs & Offline Storage", subtitle: "Level 3", lore: "Fetch backend data and persist it locally so the app works without a network.", status: "locked", type: "challenge", xp: 220, iconKey: "query", x: 24, y: 54, connections: ["mb4"] },
      { id: "mb4", title: "Native Features & App Architecture", subtitle: "Level 4", lore: "Integrate camera, notifications and permissions with a scalable project structure.", status: "locked", type: "lesson", xp: 280, iconKey: "gateway", x: 45, y: 38, connections: ["mb5"] },
      { id: "mb5", title: "Store-Ready Capstone", subtitle: "Final Boss", lore: "Build, sign and ship a production-quality app to the Play Store / App Store.", status: "locked", type: "boss", xp: 500, iconKey: "boss", x: 50, y: 20, connections: [] },
    ],
  },
  {
    id: "pm",
    name: "Operation: Project & Program Management",
    subtitle: "Master scope, scheduling, agile delivery, and stakeholder communication",
    narrativeIntro: "Plan and ship real work: define scope, run agile ceremonies, track risk, and keep stakeholders aligned.",
    missions: [
      { id: "pm1", title: "PM Basics: Scope, Schedule & Cost", subtitle: "Level 1", lore: "Learn the triple constraint and how to define scope, estimate schedule, and budget effort on a project.", status: "active", type: "lesson", xp: 100, iconKey: "shrine", x: 50, y: 88, connections: ["pm2"] },
      { id: "pm2", title: "Agile & Scrum Ceremonies (Jira)", subtitle: "Level 2", lore: "Run sprints, standups, reviews and retros — and manage the backlog in Jira like a real team.", status: "locked", type: "challenge", xp: 160, iconKey: "scroll", x: 35, y: 72, connections: ["pm3"] },
      { id: "pm3", title: "Requirements & Stakeholder Communication", subtitle: "Level 3", lore: "Elicit requirements, write user stories, and keep stakeholders aligned with clear status communication.", status: "locked", type: "challenge", xp: 220, iconKey: "query", x: 24, y: 54, connections: ["pm4"] },
      { id: "pm4", title: "Risk & Progress Tracking", subtitle: "Level 4", lore: "Maintain a risk register, track velocity and burndown, and report progress before it slips.", status: "locked", type: "lesson", xp: 280, iconKey: "index", x: 45, y: 38, connections: ["pm5"] },
      { id: "pm5", title: "Capstone: Plan & Ship a Release", subtitle: "Final Boss", lore: "Plan and deliver an actual release end to end: charter, backlog, sprint execution, and stakeholder sign-off.", status: "locked", type: "boss", xp: 500, iconKey: "boss", x: 50, y: 20, connections: [] },
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
    case "boss":
      return <span className="flex items-center gap-1.5"><Swords className="w-3 h-3" strokeWidth={2} /> Capstone Trial</span>;
    case "challenge":
      return <span className="flex items-center gap-1.5"><Diamond className="w-3 h-3" strokeWidth={2} /> Skill Challenge</span>;
    default:
      return <span className="flex items-center gap-1.5"><Circle className="w-3 h-3" strokeWidth={2} /> Practice Lesson</span>;
  }
}

export default function DynamicWorldMapPage() {
  const { player, completeMission, addCoins, sfx } = useGame();
  const [mounted, setMounted] = useState(false);
  const [realms, setRealms] = useState<DomainRealm[]>([]);
  const [realmsHydrated, setRealmsHydrated] = useState(false);
  const [activeDomainId, setActiveDomainId] = useState("");
  /** recommendation with no built-in realm — shown as an honest banner, not silently mapped */
  const [noMatchDomain, setNoMatchDomain] = useState<string | null>(null);
  const [selected, setSelected] = useState<MissionNode | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [showAiModal, setShowAiModal] = useState(false);
  const [customGoal, setCustomGoal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  /* Paths are user-owned: a NEW user starts with an EMPTY list and forges
     whatever path they actually want. Saved lists hydrate back in and every
     change (create / delete / favorite) persists to localStorage. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cv_world_realms");
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) setRealms(saved);
      }
    } catch {
      /* corrupt payload → start fresh, still empty */
    }
    setRealmsHydrated(true);
  }, []);

  useEffect(() => {
    if (!realmsHydrated) return;
    try {
      localStorage.setItem("cv_world_realms", JSON.stringify(realms));
    } catch {
      /* storage full/blocked — state still works for this session */
    }
  }, [realms, realmsHydrated]);

  /* Keep the active selection pointing at a realm that still exists */
  useEffect(() => {
    if (!realmsHydrated || realms.length === 0) return;
    if (!realms.some((r) => r.id === activeDomainId)) {
      setActiveDomainId((realms.find((r) => r.favorite) || realms[0]).id);
    }
  }, [realmsHydrated, realms, activeDomainId]);

  function toggleFavorite(id: string) {
    sfx("click");
    setRealms((prev) => prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)));
  }

  function deleteRealm(id: string) {
    sfx("click");
    const next = realms.filter((r) => r.id !== id);
    setRealms(next);
    if (id === activeDomainId) setActiveDomainId(next[0]?.id ?? "");
    if (selected?.id === id) setSelected(null);
  }

  /** GSAP scope — node entrances, ink-path draw-on, terrain parallax */
  const mapRef = useRef<HTMLDivElement>(null);
  const terrainRef = useRef<HTMLDivElement>(null);

  // Deep-link: /world-map?forge=1 opens the AI forge pre-filled with the
  // user's recommendation (used by the dashboard when no realm matches).
  // window.location avoids useSearchParams, which would force this page
  // out of static prerendering.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("forge")) {
      const rec = player.recommendedDomain || player.realmName || "";
      setCustomGoal(rec);
      setShowAiModal(true);
      // strip the query so a refresh doesn't reopen the modal
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync active realm with user's AI recommended domain from onboarding.
  // If no realm matches the recommendation, keep the current realm and flag
  // it — we never silently claim the user's path is Backend.
  useEffect(() => {
    setMounted(true);
    const rec = player.recommendedDomain || player.realmName || "";
    if (!rec.trim()) return;
    const match = matchRealmId(rec, realms);
    if (match) {
      setActiveDomainId(match);
      setNoMatchDomain(null);
    } else {
      setNoMatchDomain(rec);
    }
  }, [player.recommendedDomain, player.realmName, realms]);

  const activeRealm = realms.find((r) => r.id === activeDomainId) || realms[0];

  /** favourites pin to the top of the realm switcher */
  const orderedRealms = useMemo(
    () => [...realms].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite)),
    [realms]
  );

  /** built-in starter matching the onboarding recommendation — offered as a
      one-click ADD in the empty state, never pre-populated */
  const starterTemplate = useMemo(() => {
    const rec = player.recommendedDomain || player.realmName || "";
    if (!rec.trim()) return null;
    const id = matchRealmId(rec, initialDomainRealms);
    return id ? initialDomainRealms.find((r) => r.id === id) ?? null : null;
  }, [player.recommendedDomain, player.realmName]);

  /* ═══════ GSAP: ink-path draw-on, node stagger, terrain parallax ═══════
     Runs only on the client; auto-reverts on unmount. Re-runs whenever
     the active realm changes so switching domains replays the reveal.
     Respects prefers-reduced-motion (nothing is hidden if it's on). */
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const scope = mapRef.current;
      if (!scope) return;

      // Ink paths draw on — animate stroke-dashoffset from hidden to shown.
      const paths = scope.querySelectorAll<SVGLineElement>(".ink-path, .ink-path-active");
      if (paths.length) {
        paths.forEach((p) => {
          const len = (p as SVGLineElement).getTotalLength?.() || 200;
          gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        });
        gsap.to(paths, {
          strokeDashoffset: 0,
          duration: 1.1,
          ease: "power2.inOut",
          stagger: 0.08,
          delay: 0.15,
          onComplete: () => {
            // Restore the CSS dashed style for inactive paths once drawn.
            paths.forEach((p) => {
              if (p.classList.contains("ink-path")) {
                gsap.set(p, { strokeDasharray: "6 4", strokeDashoffset: 0 });
              } else {
                gsap.set(p, { strokeDasharray: "none", strokeDashoffset: 0 });
              }
            });
          },
        });
      }

      // Nodes cascade up along the path order.
      const nodes = scope.querySelectorAll<HTMLElement>("[data-map-node]");
      if (nodes.length) {
        gsap.from(nodes, {
          autoAlpha: 0,
          y: 26,
          scale: 0.7,
          duration: 0.6,
          ease: "back.out(1.6)",
          stagger: 0.09,
          delay: 0.2,
          clearProps: "opacity,visibility,transform",
        });
      }
    },
    { scope: mapRef, dependencies: [activeDomainId] }
  );

  /* Terrain parallax lives in its own effect so the pointer listeners are
     added exactly once and removed on unmount (useGSAP only reverts
     tweens, not manually-added listeners). */
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const scope = mapRef.current;
    const terrain = terrainRef.current;
    if (!scope || !terrain) return;

    const qx = gsap.quickTo(terrain, "x", { duration: 0.8, ease: "power3.out" });
    const qy = gsap.quickTo(terrain, "y", { duration: 0.8, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const r = scope.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      qx(dx * -18);
      qy(dy * -14);
    };
    const onLeave = () => { qx(0); qy(0); };

    scope.addEventListener("pointermove", onMove);
    scope.addEventListener("pointerleave", onLeave);
    return () => {
      scope.removeEventListener("pointermove", onMove);
      scope.removeEventListener("pointerleave", onLeave);
      qx(0); qy(0);
    };
  }, []);

  // Dynamic Level Unlocking Logic
  const liveMissions = useMemo(() => {
    const completed = new Set(player.completedMissions);
    const missions = activeRealm?.missions ?? [];

    return missions.map((m, idx) => {
      const iconUrl = defaultIcons[m.iconKey] || "";

      if (completed.has(m.id)) {
        return { ...m, status: "completed" as const, iconUrl };
      }

      // Node is active if:
      // 1. It is the starting level (idx === 0)
      // 2. OR any prerequisite connected to it is completed
      const isPrereqCompleted = missions.some(
        (prev) => prev.connections.includes(m.id) && completed.has(prev.id)
      );

      if (idx === 0 || isPrereqCompleted) {
        return { ...m, status: "active" as const, iconUrl };
      }

      return { ...m, status: "locked" as const, iconUrl };
    });
  }, [activeRealm?.missions, player.completedMissions]);

  const filteredMissions = liveMissions.filter((m) =>
    m.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.subtitle.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const completedCount = liveMissions.filter((m) => m.status === "completed").length;
  const totalCount = liveMissions.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  /* Animated count-up on the progress readout */
  const progressCountRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = progressCountRef.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = String(completedCount);
      return;
    }
    const obj = { v: Number(el.textContent) || 0 };
    const tw = gsap.to(obj, {
      v: completedCount,
      duration: 0.7,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = String(Math.round(obj.v));
      },
    });
    return () => {
      tw.kill();
    };
  }, [completedCount]);

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
      setNoMatchDomain(null);
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
    <div className="min-h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)] lg:overflow-hidden flex flex-col lg:flex-row relative">

      {/* ══════ LEFT PANEL — Domain Switcher (compact) ══════ */}
      <aside className="lg:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-[#2a2520]/40 p-4 lg:p-5 space-y-3 bg-[#060709]/70 backdrop-blur-md lg:h-full lg:overflow-y-auto">

        {/* Dynamic Domain Switcher */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="block font-mono text-[10px] text-[#6b6358] uppercase tracking-widest">
              Domain Realms
            </label>
            <button
              onClick={() => setShowAiModal(true)}
              className="text-[10px] font-mono text-[#06b6d4] hover:underline"
            >
              + AI Generator
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {orderedRealms.length === 0 && (
              <p className="text-[11px] text-[#6b6358] leading-relaxed surface rounded-lg px-3 py-3">
                No paths yet — forge your first learning path with the AI Generator above.
              </p>
            )}
            {orderedRealms.map((r) => {
              const isActive = activeDomainId === r.id;
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-0.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-[#06b6d4]/15 border border-[#06b6d4]/40"
                      : "surface border border-transparent"
                  }`}
                >
                  <button
                    onClick={() => { setActiveDomainId(r.id); setSelected(null); sfx("click"); }}
                    className={`flex-1 min-w-0 py-1.5 px-2.5 text-xs font-medium tracking-wider text-left truncate ${
                      isActive ? "text-[#22d3ee] font-semibold" : "text-[#6b6358] hover:text-[#c8c0b0]"
                    }`}
                    title={r.name}
                  >
                    {r.favorite && (
                      <Star className="w-3 h-3 inline mr-1 -mt-0.5 text-[#fbbf24]" strokeWidth={2} fill="currentColor" />
                    )}
                    {r.name.replace("Operation: ", "")}
                  </button>
                  <button
                    onClick={() => toggleFavorite(r.id)}
                    aria-label={r.favorite ? "Unpin path" : "Pin path"}
                    title={r.favorite ? "Remove from favourites" : "Mark as favourite"}
                    className={`p-1.5 transition-colors shrink-0 ${
                      r.favorite ? "text-[#fbbf24]" : "text-[#3d3830] hover:text-[#fbbf24]"
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" strokeWidth={2} fill={r.favorite ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => deleteRealm(r.id)}
                    aria-label="Delete path"
                    title="Delete this path"
                    className="p-1.5 text-[#3d3830] hover:text-[#fb7185] transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ══════ CENTER — Dynamic Interactive Map ══════ */}
      <div className="flex-1 relative overflow-hidden min-h-[550px] lg:h-full" ref={mapRef}>
        <div className="absolute inset-0 bg-[#040506]/25" ref={terrainRef}>
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
              backgroundImage: `radial-gradient(circle at 25% 30%, rgba(6,182,212,0.14) 0%, transparent 50%),
                                radial-gradient(circle at 75% 70%, rgba(168,85,247,0.12) 0%, transparent 50%)`
            }}
          />
        </div>

        {/* ══════ DOMAIN PROGRESS — wide single-line overlay, sword rides the fill ══════ */}
        {activeRealm && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-4 md:gap-6 px-5 md:px-7 py-3 rounded-2xl bg-[#060709]/92 border border-[#2a2520]/60 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)] w-[min(660px,calc(100vw-2rem))]">
              <div className="shrink-0">
                <p className="font-mono text-[9px] text-[#6b6358] uppercase tracking-[0.2em] leading-none mb-1.5">
                  Domain Progress
                </p>
                <p className="font-mono text-sm text-[#e8dfc8] whitespace-nowrap leading-none">
                  <span ref={progressCountRef} className="font-bold text-[#34d399]">
                    {completedCount}
                  </span>
                  <span className="text-[#6b6358]"> / {totalCount} levels</span>
                  <span className="text-[#3d3830]"> · {progressPct}%</span>
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="relative">
                  <div className="xp-track h-2 rounded-full">
                    <div
                      className="xp-fill-emerald h-2 rounded-full transition-[width] duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.45)]"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  {/* Sword rides the leading edge of the fill */}
                  <span
                    className="absolute top-1/2 pointer-events-none transition-[left] duration-700 ease-out"
                    style={{ left: `${progressPct}%`, transform: "translate(-50%,-50%)" }}
                  >
                    <Swords
                      className="w-4 h-4 text-[#e8dfc8] animate-pulse drop-shadow-[0_0_6px_rgba(52,211,153,0.85)]"
                      strokeWidth={2}
                    />
                  </span>
                </div>
              </div>

              <p className="font-mono text-[9px] text-[#3d3830] shrink-0 max-w-[130px] truncate">
                {activeRealm.name.replace("Operation: ", "")}
              </p>
            </div>
          </div>
        )}

        {/* Connecting SVG lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {activeRealm?.missions.map((m) =>
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
                {/* GSAP animates THIS wrapper (no transform classes), so it never
                    fights Tailwind's translate/scale on the button above. */}
                <div className="flex flex-col items-center gap-1.5" data-map-node>
                  <img
                    src={pngIcon}
                    alt={m.title}
                    suppressHydrationWarning
                    className={`${isBoss ? "w-24 h-24" : "w-20 h-20"} object-contain transition-transform drop-shadow-xl ${
                      m.status === "completed"
                        ? "brightness-125"
                        : m.status === "locked"
                        ? "grayscale opacity-55"
                        : "brightness-110"
                    }`}
                  />

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

      {/* ══════ RIGHT PANEL — Domain Details (or Mission Detail when selected) ══════ */}
      <aside className="lg:w-72 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-[#2a2520]/40 p-5 space-y-4 bg-[#060709]/70 backdrop-blur-md lg:h-full lg:overflow-y-auto z-30">
        <AnimatePresence mode="wait">
          {!activeRealm ? (
            /* ── Empty state: brand-new user, no paths yet ── */
            <motion.div
              key="no-paths"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-[#06b6d4] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10 inline-block">
                  Your Paths
                </span>
                <h2 className="font-cinzel text-xl font-bold text-[#e8dfc8] tracking-wider leading-tight">
                  No learning paths yet
                </h2>
                <p className="text-xs text-[#6b6358] leading-relaxed">
                  You are in control — forge a custom roadmap for any IT goal, then favourite or delete paths as your journey changes.
                </p>
              </div>

              <div className="dialogue-box-teal rounded-xl px-4 py-3.5">
                <p className="text-xs text-[#9a9182] leading-relaxed">
                  {noMatchDomain
                    ? <>We don't have a ready-made path for <strong className="text-[#e8dfc8]">{noMatchDomain}</strong> — forge it below.</>
                    : "Enter any IT domain or career goal and AI will build a 5-level path for you."}
                </p>
              </div>

              {starterTemplate && (
                <button
                  onClick={() => {
                    sfx("unlock");
                    const t = starterTemplate;
                    setRealms((prev) =>
                      prev.some((r) => r.id === t.id)
                        ? prev
                        : [...prev, { ...t, favorite: true, missions: t.missions.map((m) => ({ ...m })) }]
                    );
                    setActiveDomainId(t.id);
                    setNoMatchDomain(null);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider border border-[#b49b64]/40 text-[#b49b64] hover:text-[#e8dfc8] hover:border-[#b49b64] transition-colors"
                >
                  Add “{starterTemplate.name.replace("Operation: ", "")}” starter path
                </button>
              )}

              <button
                onClick={() => {
                  if (noMatchDomain) setCustomGoal(noMatchDomain);
                  setShowAiModal(true);
                  sfx("click");
                }}
                className="btn-teal w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                Forge Custom AI Roadmap
              </button>
            </motion.div>
          ) : selected ? (
            /* ── Mission Detail ── */
            <motion.div
              key={`mission-${selected.id}`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <button
                onClick={() => setSelected(null)}
                className="text-[#6b6358] hover:text-[#e8dfc8] text-xs font-mono transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
                Close Panel
              </button>

              <div className="space-y-2">
                <span className={`text-[10px] font-mono uppercase tracking-widest ${
                  selected.type === "boss" ? "text-[#fb7185]" : "text-[#06b6d4]"
                }`}>
                  {typeLabel(selected.type)}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-[#06b6d4]/40 p-2 bg-[#0c0e11] overflow-hidden shrink-0">
                    <img
                      src={selected.iconUrl || defaultIcons[selected.iconKey]}
                      alt={selected.title}
                      suppressHydrationWarning
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-cinzel text-lg font-bold text-[#e8dfc8] tracking-wider leading-tight">
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
                    <Hexagon className="w-3.5 h-3.5 text-[#22d3ee]" strokeWidth={2} />
                    <span className="font-bold text-[#22d3ee]">+{selected.xp} XP</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#c084fc]" strokeWidth={2} />
                    <span className="font-bold text-[#c084fc]">+{Math.floor(selected.xp * 0.8)} Coins</span>
                  </div>
                </div>
              </div>

              <div className="ink-divider-teal" />

              {/* Dynamic Action Buttons linking to Dojo */}
              {selected.status === "completed" ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 text-center text-xs text-[#34d399] font-medium flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Level Completed
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
                    <Zap className="w-3 h-3 inline" strokeWidth={2} /> Fast Complete (Demo Unlock)
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-[#2a2520] bg-[#040506] text-center text-xs text-[#6b6358] flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" strokeWidth={2} />
                  Complete previous levels to unlock
                </div>
              )}
            </motion.div>
          ) : (
            /* ── Domain Details ── */
            activeRealm && (
            <motion.div
              key="domain-info"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Honest fallback: recommendation has no built-in realm yet */}
              {noMatchDomain && (
                <div className="rounded-xl px-4 py-4 space-y-2 border border-[#f59e0b]/30 bg-[#f59e0b]/[0.06]">
                  <p className="text-[10px] font-mono text-[#fbbf24] uppercase tracking-widest flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                    No learning path yet
                  </p>
                  <p className="text-xs text-[#9a9182] leading-relaxed">
                    We don&apos;t have a built-in realm for <strong className="text-[#e8dfc8]">{noMatchDomain}</strong>.
                    Forge a custom AI roadmap for it below — or pick any realm from the list.
                  </p>
                  <button
                    onClick={() => { setCustomGoal(noMatchDomain); setShowAiModal(true); sfx("click"); }}
                    className="btn-teal w-full py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider"
                  >
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                    Forge {noMatchDomain} Roadmap
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[10px] font-mono text-[#06b6d4] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10 inline-block">
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
              <div className="dialogue-box-teal rounded-xl px-4 py-3.5">
                <p className="text-xs text-[#9a9182] leading-relaxed">
                  {activeRealm.narrativeIntro}
                </p>
              </div>

              {/* Search Filter */}
              <input
                type="text"
                placeholder="Search levels..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-[#0a0b0d] border border-[#2a2520] rounded-lg px-3 py-2 text-xs text-[#e8dfc8] placeholder:text-[#3d3830] focus:outline-none focus:border-[#06b6d4]"
              />

              {/* AI Generator CTA */}
              <button
                onClick={() => setShowAiModal(true)}
                className="btn-teal w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span>Forge Custom AI Roadmap</span>
              </button>
            </motion.div>
            )
          )}
        </AnimatePresence>
      </aside>

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
                <h3 className="font-cinzel text-lg font-bold text-[#22d3ee] tracking-wider flex items-center gap-2">
                  <Wand2 className="w-4 h-4" strokeWidth={2} />
                  AI Custom Roadmap Generator
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
