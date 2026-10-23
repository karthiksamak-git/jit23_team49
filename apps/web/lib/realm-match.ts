/* ═══════════════════════════════════════════
   REALM MATCHING (shared)
   Maps an onboarding recommendation to a
   built-in world-map realm id. Returns null
   when nothing matches — callers must handle
   that honestly (never silently default to
   Backend).
   ═══════════════════════════════════════════ */

/** Ids of the hand-built realms in initialDomainRealms (world-map). */
export const BUILT_IN_REALM_IDS = [
  "backend",
  "frontend",
  "fullstack",
  "devops",
  "ai",
  "data",
  "cyber",
  "mobile",
  "pm",
] as const;

/** Names mirror the world-map realm list — lets the dashboard pre-match without importing the page. */
export const BUILT_IN_REALMS: { id: string; name: string }[] = [
  { id: "backend", name: "Backend Development" },
  { id: "frontend", name: "Frontend Development" },
  { id: "fullstack", name: "Full-Stack Development" },
  { id: "devops", name: "DevOps & Cloud" },
  { id: "ai", name: "AI & Machine Learning" },
  { id: "data", name: "Data Science & Analytics" },
  { id: "cyber", name: "Cybersecurity" },
  { id: "mobile", name: "Mobile App Development" },
  { id: "pm", name: "Project & Program Management" },
];

interface NamedRealm {
  id: string;
  name: string;
}

/**
 * Map a recommendation string to a realm id — exact realm-name match
 * first, then keyword match. Returns null when nothing matches so the
 * caller can be honest instead of silently switching to Backend.
 */
export function matchRealmId(rec: string, realmList: NamedRealm[]): string | null {
  const needle = rec.toLowerCase().trim();
  if (!needle) return null;

  // 1) Exact-ish match: realm name contains the recommendation (or vice versa)
  const byName = realmList.find((r) => {
    const name = r.name.replace(/^operation:\s*/i, "").toLowerCase();
    return name.includes(needle) || needle.includes(name);
  });
  if (byName) return byName.id;

  // 2) Keyword match — every branch explicit, `else` returns null (never "backend")
  if (needle.includes("frontend") || needle.includes("ui") || needle.includes("ux")) return "frontend";
  if (needle.includes("full") || needle.includes("mern") || needle.includes("mean")) return "fullstack";
  if (needle.includes("devops") || needle.includes("cloud") || needle.includes("sre") || needle.includes("terraform")) return "devops";
  if (needle.includes("cyber") || needle.includes("security") || needle.includes("penetration")) return "cyber";
  if (needle.includes("mobile") || needle.includes("android") || needle.includes("ios") || needle.includes("flutter")) return "mobile";
  if (needle.includes("machine") || needle.includes("artificial") || /\bai\b/.test(needle) || needle.includes("llm")) return "ai";
  if (needle.includes("data") || needle.includes("analytics") || needle.includes("business intelligence")) return "data";
  if (needle.includes("project") || needle.includes("program") || needle.includes("agile") || needle.includes("scrum") || needle.includes("product")) return "pm";
  if (needle.includes("backend") || needle.includes("server") || needle.includes("api") || needle.includes("database")) return "backend";

  return null;
}
