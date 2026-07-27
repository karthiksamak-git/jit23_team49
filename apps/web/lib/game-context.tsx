"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

/* ═══════════════════════════════════════════
   GAME STATE CONTEXT
   Centralized player state — tries API first,
   falls back to localStorage mock data.
   ═══════════════════════════════════════════ */

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
  refreshProfile: () => void;
}

const defaultPlayer: PlayerState = {
  isAuthenticated: false,
  characterName: "Master Ronin",
  email: "",
  level: 1,
  xp: 0,
  xpToNext: 200,
  streak: 0,
  coins: 0,
  realmFit: 0,
  realmName: "Uncharted",
  completedMissions: [],
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
  refreshProfile: () => {},
});

export function useGame() {
  return useContext(GameContext);
}

function loadFromStorage(): PlayerState {
  if (typeof window === "undefined") return defaultPlayer;
  try {
    const raw = localStorage.getItem("cv_player_state");
    if (raw) return JSON.parse(raw);
  } catch {}
  // Legacy migration
  const isAuth = localStorage.getItem("user_authenticated") === "true";
  if (isAuth) {
    return {
      ...defaultPlayer,
      isAuthenticated: true,
      characterName: localStorage.getItem("character_name") || "Master Ronin",
      email: localStorage.getItem("user_email") || "",
      level: 1,
      xp: 100,
      xpToNext: 200,
      streak: 1,
      coins: 20,
      realmFit: 85,
      realmName: "Backend Systems",
      completedMissions: [],
    };
  }
  return defaultPlayer;
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

  // Load on mount
  useEffect(() => {
    const state = loadFromStorage();
    setPlayer(state);
    setLoading(false);
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
    // Try real Better Auth first
    try {
      const res = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (res.ok) {
        const { level: lvl, xpToNext } = calculateLevel(0);
        setPlayer({
          ...defaultPlayer,
          isAuthenticated: true,
          characterName: name,
          email,
          level: lvl,
          xpToNext,
        });
        return { ok: true };
      }
      const data = await res.json().catch(() => null);
      return { ok: false, error: data?.message || "Signup failed" };
    } catch {
      // API unreachable — fall back to local mock
      const { level: lvl, xpToNext } = calculateLevel(0);
      setPlayer({
        ...defaultPlayer,
        isAuthenticated: true,
        characterName: name,
        email,
        level: lvl,
        xpToNext,
      });
      return { ok: true };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const stored = loadFromStorage();
        setPlayer({
          ...stored,
          isAuthenticated: true,
          email,
        });
        return { ok: true };
      }
      const data = await res.json().catch(() => null);
      return { ok: false, error: data?.message || "Invalid credentials" };
    } catch {
      // API unreachable — fall back to local mock
      const stored = loadFromStorage();
      setPlayer({
        ...(stored.email === email ? stored : defaultPlayer),
        isAuthenticated: true,
        email,
        characterName: stored.characterName || "Master Ronin",
        level: stored.level || 3,
        xp: stored.xp || 450,
        xpToNext: stored.xpToNext || 600,
        streak: stored.streak || 5,
        coins: stored.coins || 2450,
        realmFit: stored.realmFit || 92,
        realmName: stored.realmName || "Backend Systems",
        completedMissions: stored.completedMissions || ["m1", "m2"],
      });
      return { ok: true };
    }
  }, []);

  const signOut = useCallback(() => {
    setPlayer({ ...defaultPlayer });
    if (typeof window !== "undefined") {
      localStorage.removeItem("cv_player_state");
      localStorage.removeItem("user_authenticated");
    }
    // Also try API signout
    fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
  }, []);

  const demoSignIn = useCallback((name?: string) => {
    setPlayer({
      ...defaultPlayer,
      isAuthenticated: true,
      characterName: name || localStorage.getItem("character_name") || "Master Ronin",
      level: 1,
      xp: 100,
      xpToNext: 200,
      streak: 1,
      coins: 20,
      realmFit: 85,
      realmName: "Backend Systems",
      completedMissions: [],
    });
  }, []);

  const completeMission = useCallback((missionId: string, xpEarned: number) => {
    setPlayer((prev) => {
      if (prev.completedMissions.includes(missionId)) return prev;
      const newXp = prev.xp + xpEarned;
      const { level, xpToNext } = calculateLevel(newXp);
      const newCoins = prev.coins + Math.floor(xpEarned * 1.5);
      return {
        ...prev,
        xp: newXp,
        level,
        xpToNext,
        coins: newCoins,
        completedMissions: [...prev.completedMissions, missionId],
      };
    });
    // Try to sync with API
    tryApiCall("/gamification/complete-mission", {
      method: "POST",
      body: JSON.stringify({ missionId, xpEarned }),
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

  return (
    <GameContext.Provider
      value={{ player, loading, signIn, signUp, signOut, demoSignIn, completeMission, addXp, addCoins, refreshProfile }}
    >
      {children}
    </GameContext.Provider>
  );
}
