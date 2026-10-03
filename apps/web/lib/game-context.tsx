"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { isSoundEnabled, setSoundEnabled, playSound } from "./sound-engine";

/* ═══════════════════════════════════════════
   GAME STATE CONTEXT
   Centralized player state — tries API first,
   falls back to localStorage mock data.
   Includes AI onboarding profile data.
   ═══════════════════════════════════════════ */

export type SoundName =
  | "correct"
  | "wrong"
  | "combo"
  | "sessionComplete"
  | "xpMilestone"
  | "streakMilestone"
  | "unlock"
  | "click"
  | "hover"
  | "heartLost"
  | "coin"
  | "levelUp"
  | "transition"
  | "notification"
  | "victory"
  | "defeat"
  | "tick"
  | "tickUrgent"
  | "timeUp";

interface PlayerState {
  isAuthenticated: boolean;
  characterName: string;
  email: string;
  level: number;
  xp: number;
  xpToNext: number;
  streak: number;
  coins: number;
  realmFit: number;
  realmName: string;
  completedMissions: string[];
  /* ── Programs enrolled with coins ── */
  enrolledCourses: string[];
  /* ── Realms unlocked via program enrollment ── */
  unlockedRealms: string[];
  /* ── AI Onboarding Profile ── */
  onboardingComplete: boolean;
  recommendedDomain: string;
  domainColor: string;
  difficultyLevel: string;
  learningPathSummary: string;
  interests: string[];
  strengths: string[];
  suggestedTopics: string[];
  capacityScore: number;
  capacityLevel: "Novice" | "Apprentice" | "Specialist" | "Master";
}

interface GameContextType {
  player: PlayerState;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => void;
  demoSignIn: (name?: string) => void;
  completeMission: (missionId: string, xpEarned: number) => void;
  addXp: (amount: number) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  updateCapacity: (delta: number) => void;
  refreshProfile: () => void;
  updateProfile: (updates: Partial<PlayerState>) => void;
  /* ── Sound ── */
  soundOn: boolean;
  toggleSound: () => void;
  sfx: (name: SoundName, intensity?: number) => void;
}

const defaultPlayer: PlayerState = {
  isAuthenticated: false,
  characterName: "Learner",
  email: "",
  level: 1,
  xp: 0,
  xpToNext: 200,
  streak: 0,
  coins: 0,
  realmFit: 0,
  realmName: "Exploring",
  completedMissions: [],
  enrolledCourses: [],
  unlockedRealms: [],
  onboardingComplete: false,
  recommendedDomain: "",
  domainColor: "teal",
  difficultyLevel: "Beginner",
  learningPathSummary: "",
  interests: [],
  strengths: [],
  suggestedTopics: [],
  capacityScore: 35,
  capacityLevel: "Apprentice",
};

const GameContext = createContext<GameContextType>({
  player: defaultPlayer,
  loading: true,
  signIn: async () => ({ ok: false }),
  signUp: async () => ({ ok: false }),
  signOut: () => {},
  demoSignIn: () => {},
  completeMission: () => {},
  addXp: () => {},
  addCoins: () => {},
  spendCoins: () => false,
  updateCapacity: () => {},
  refreshProfile: () => {},
  updateProfile: () => {},
  soundOn: true,
  toggleSound: () => {},
  sfx: () => {},
});

export function useGame() {
  return useContext(GameContext);
}

function loadFromStorage(): PlayerState {
  if (typeof window === "undefined") return defaultPlayer;
  try {
    const raw = localStorage.getItem("cv_player_state");
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure new fields exist (migration)
      return { ...defaultPlayer, ...parsed };
    }
  } catch {}
  // Legacy migration
  const isAuth = localStorage.getItem("user_authenticated") === "true";
  if (isAuth) {
    return {
      ...defaultPlayer,
      isAuthenticated: true,
      characterName: localStorage.getItem("character_name") || "Learner",
      email: localStorage.getItem("user_email") || "",
      level: 1,
      xp: 100,
      xpToNext: 200,
      streak: 1,
      coins: 20,
      realmFit: 85,
      realmName: "Backend Development",
      completedMissions: [],
    };
  }
  return defaultPlayer;
}

function loadOnboardingProfile(): Partial<PlayerState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("cv_onboarding_profile");
    if (raw) {
      const profile = JSON.parse(raw);
      return {
        onboardingComplete: true,
        recommendedDomain: profile.recommendedDomain || "",
        domainColor: profile.domainColor || "teal",
        difficultyLevel: profile.difficultyLevel || "Beginner",
        learningPathSummary: profile.learningPathSummary || "",
        interests: profile.interests || [],
        strengths: profile.strengths || [],
        suggestedTopics: profile.suggestedTopics || [],
        realmName: profile.recommendedDomain || "Exploring",
        characterName: profile.name || "Learner",
      };
    }
  } catch {}
  return {};
}

function saveToStorage(state: PlayerState) {
  if (typeof window === "undefined") return;
  localStorage.setItem("cv_player_state", JSON.stringify(state));
  // Keep legacy keys in sync
  localStorage.setItem("user_authenticated", state.isAuthenticated ? "true" : "false");
  localStorage.setItem("character_name", state.characterName);
  localStorage.setItem("user_email", state.email);
}

function calculateLevel(xp: number): { level: number; xpToNext: number } {
  // Each level requires level * 200 XP
  let level = 1;
  let remaining = xp;
  while (remaining >= level * 200) {
    remaining -= level * 200;
    level++;
  }
  return { level, xpToNext: level * 200 };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<PlayerState>(defaultPlayer);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);

  // Load on mount
  useEffect(() => {
    const state = loadFromStorage();
    setPlayer(state);
    setLoading(false);
    setSoundOn(isSoundEnabled());
  }, []);

  // Persist on change
  useEffect(() => {
    if (!loading) saveToStorage(player);
  }, [player, loading]);

  const tryApiCall = useCallback(async (path: string, options?: RequestInit) => {
    try {
      const res = await fetch(`/api${path}`, {
        ...options,
        headers: { "Content-Type": "application/json", ...options?.headers },
      });
      if (res.ok) return await res.json();
    } catch {
      // API unavailable — silent fallback
    }
    return null;
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const onboardingData = loadOnboardingProfile();
    const characterName = onboardingData.characterName || name || "Learner";

    try {
      const res = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: characterName, email, password }),
      });
      if (res.ok) {
        const { level: lvl, xpToNext } = calculateLevel(0);
        const newState: PlayerState = {
          ...defaultPlayer,
          ...onboardingData,
          isAuthenticated: true,
          characterName,
          email,
          level: lvl,
          xpToNext,
        };
        setPlayer(newState);
        saveToStorage(newState);
        return { ok: true };
      }
    } catch {
      // API call failed
    }

    // Local authentication fallback
    const { level: lvl, xpToNext } = calculateLevel(0);
    const newState: PlayerState = {
      ...defaultPlayer,
      ...onboardingData,
      isAuthenticated: true,
      characterName,
      email,
      level: lvl,
      xpToNext,
    };
    setPlayer(newState);
    saveToStorage(newState);
    return { ok: true };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const stored = loadFromStorage();
    const onboardingData = loadOnboardingProfile();

    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const newState: PlayerState = {
          ...stored,
          ...onboardingData,
          isAuthenticated: true,
          email,
          characterName: onboardingData.characterName || stored.characterName || email.split("@")[0] || "Learner",
        };
        setPlayer(newState);
        saveToStorage(newState);
        return { ok: true };
      }
    } catch {
      // API call failed
    }

    // Local authentication fallback
    const newState: PlayerState = {
      ...(stored.email === email ? stored : defaultPlayer),
      ...onboardingData,
      isAuthenticated: true,
      email,
      characterName: onboardingData.characterName || stored.characterName || email.split("@")[0] || "Learner",
      level: stored.level || 1,
      xp: stored.xp || 100,
      xpToNext: stored.xpToNext || 200,
      streak: Math.max(stored.streak || 1, 1),
      coins: stored.coins || 20,
      realmFit: stored.realmFit || 85,
      realmName: onboardingData.recommendedDomain || stored.realmName || "Full-Stack Development",
      completedMissions: stored.completedMissions || [],
    };
    setPlayer(newState);
    saveToStorage(newState);
    return { ok: true };
  }, []);


  const signOut = useCallback(() => {
    setPlayer({ ...defaultPlayer });
    if (typeof window !== "undefined") {
      localStorage.removeItem("cv_player_state");
      localStorage.removeItem("user_authenticated");
      localStorage.removeItem("cv_onboarding_profile");
      localStorage.removeItem("character_name");
      localStorage.removeItem("user_email");
      window.location.href = "/auth";
    }
    fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
  }, []);

  const demoSignIn = useCallback((name?: string) => {
    const onboardingData = loadOnboardingProfile();
    setPlayer({
      ...defaultPlayer,
      ...onboardingData,
      isAuthenticated: true,
      characterName: name || onboardingData.characterName || localStorage.getItem("character_name") || "Learner",
      level: 1,
      xp: 100,
      xpToNext: 200,
      streak: 1,
      coins: 20,
      realmFit: 85,
      realmName: onboardingData.recommendedDomain || "Full-Stack Development",
      completedMissions: [],
    });
  }, []);

  const completeMission = useCallback((missionId: string, _xpEarned?: number) => {
    // Coins-only economy: completing a mission for the FIRST time grants program credit
    setPlayer((prev) => {
      if (prev.completedMissions.includes(missionId)) return prev;
      return {
        ...prev,
        coins: prev.coins + 15, // first-completion program credit
        completedMissions: [...prev.completedMissions, missionId],
      };
    });
    tryApiCall("/gamification/complete-mission", {
      method: "POST",
      body: JSON.stringify({ missionId }),
    });
  }, [tryApiCall]);

  const addXp = useCallback((amount: number) => {
    setPlayer((prev) => {
      const newXp = prev.xp + amount;
      const { level, xpToNext } = calculateLevel(newXp);
      return { ...prev, xp: newXp, level, xpToNext };
    });
  }, []);

  const addCoins = useCallback((amount: number) => {
    setPlayer((prev) => ({ ...prev, coins: prev.coins + amount }));
  }, []);

  const spendCoins = useCallback((amount: number) => {
    let ok = false;
    setPlayer((prev) => {
      if (prev.coins < amount) return prev; // insufficient funds — no-op
      ok = true;
      return { ...prev, coins: prev.coins - amount };
    });
    return ok;
  }, []);

  const updateCapacity = useCallback((delta: number) => {
    setPlayer((prev) => {
      const newScore = Math.max(0, Math.min(100, (prev.capacityScore || 35) + delta));
      let newLevel: "Novice" | "Apprentice" | "Specialist" | "Master" = "Apprentice";
      if (newScore < 30) newLevel = "Novice";
      else if (newScore <= 55) newLevel = "Apprentice";
      else if (newScore <= 80) newLevel = "Specialist";
      else newLevel = "Master";
      return { ...prev, capacityScore: newScore, capacityLevel: newLevel };
    });
  }, []);

  const updateProfile = useCallback((updates: Partial<PlayerState>) => {
    setPlayer((prev) => ({ ...prev, ...updates }));
  }, []);

  const refreshProfile = useCallback(async () => {
    const data = await tryApiCall("/gamification/profile");
    if (data) {
      setPlayer((prev) => ({
        ...prev,
        xp: data.xp ?? prev.xp,
        level: data.level ?? prev.level,
        streak: data.streak ?? prev.streak,
        coins: data.coins ?? prev.coins,
        completedMissions: data.completedMissions ?? prev.completedMissions,
      }));
    }
  }, [tryApiCall]);

  /* ── Sound controls ── */
  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      if (next) playSound("click");
      return next;
    });
  }, []);

  const sfx = useCallback((name: SoundName, intensity = 0) => {
    playSound(name, intensity);
  }, []);

  const value = useMemo(
    () => ({
      player,
      loading,
      signIn,
      signUp,
      signOut,
      demoSignIn,
      completeMission,
      addXp,
      addCoins,
      spendCoins,
      updateCapacity,
      refreshProfile,
      updateProfile,
      soundOn,
      toggleSound,
      sfx,
    }),
    [player, loading, signIn, signUp, signOut, demoSignIn, completeMission, addXp, addCoins, spendCoins, updateCapacity, refreshProfile, updateProfile, soundOn, toggleSound, sfx]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
