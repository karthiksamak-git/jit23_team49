/* ═══════════════════════════════════════════
   ADZUNA JOBS API CLIENT (REAL DATA ONLY)
   • Endpoint: /v1/api/jobs/{country}/search
   • 6-hour cache keyed by hash of exact query params
   • Each pagination page cached separately
   • NEVER fabricates jobs — empty/error states surface honestly
   ═══════════════════════════════════════════ */

export interface AdzunaFilters {
  what: string; // search bar text
  where: string; // location dropdown
  salaryMin: number | null; // salary slider (₹/year)
  contractTime: "full_time" | "part_time" | ""; // full/part-time toggle
  datePosted: "" | "1" | "3" | "7" | "14"; // date filter → max_days_old
  category: string; // category filter tag ("" = all)
  sortBy: "date" | "relevance" | "salary"; // what_order equivalent
}

export interface JobCardData {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  contractType: string; // badge text (category label)
  created: string; // ISO date
  description: string; // raw (HTML) description
  applyUrl: string;
}

interface AdzunaApiJob {
  id: string | number;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  description?: string;
  created?: string;
  redirect_url?: string;
  salary_min?: number;
  salary_max?: number;
  category?: { tag?: string; label?: string };
  contract_type?: string;
}

interface AdzunaSearchResponse {
  count?: number;
  results?: AdzunaApiJob[];
  mean?: number;
}

export const DEFAULT_FILTERS: AdzunaFilters = {
  what: "",
  where: "",
  salaryMin: null,
  contractTime: "",
  datePosted: "",
  category: "",
  sortBy: "date",
};

export const RESULTS_PER_PAGE = 10;

/* ── Config ── */
const APP_ID = process.env.NEXT_PUBLIC_ADZUNA_APP_ID || "";
const APP_KEY = process.env.NEXT_PUBLIC_ADZUNA_APP_KEY || "";
const COUNTRY = "in";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours, non-negotiable
const CACHE_KEY_PREFIX = "cv_adzuna_cache_v1";

/* ── Cache: key = hash of exact query params ── */
function buildQuery(filters: AdzunaFilters, page: number): Record<string, string> {
  const params: Record<string, string> = { results_per_page: String(RESULTS_PER_PAGE) };
  if (filters.what.trim()) params.what = filters.what.trim();
  if (filters.where.trim()) params.where = filters.where.trim();
  if (filters.salaryMin !== null && filters.salaryMin > 0) params.salary_min = String(filters.salaryMin);
  if (filters.contractTime) params[filters.contractTime] = "1"; // API uses full_time=1 / part_time=1
  if (filters.datePosted) params.max_days_old = filters.datePosted;
  if (filters.category) params.category = filters.category;
  if (filters.sortBy !== "date") params.sort_by = filters.sortBy;
  return params;
}

function cacheKey(filters: AdzunaFilters, page: number): string {
  const params = buildQuery(filters, page);
  const canonical = JSON.stringify({ ...params, page }); // exact params + page → separate cache per page
  // Simple deterministic 32-bit hash (FNV-1a) — enough for cache keys
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${CACHE_KEY_PREFIX}_${(h >>> 0).toString(36)}`;
}

interface CacheEntry {
  t: number; // stored at
  data: { jobs: JobCardData[]; totalCount: number };
}

function readCache(key: string): CacheEntry["data"] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.t > CACHE_TTL_MS) {
      localStorage.removeItem(key); // expired → zero stale serving
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: CacheEntry["data"]) {
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), data }));
  } catch {
    // storage full/blocked → fetch live instead
  }
}

/* ── Mapping ── */
function mapJob(j: AdzunaApiJob): JobCardData | null {
  if (!j || j.id === undefined || !j.title || !j.redirect_url) return null; // never fabricate
  return {
    id: String(j.id),
    title: j.title,
    company: j.company?.display_name?.trim() || "Company not disclosed",
    location:
      j.location?.display_name?.trim() ||
      (Array.isArray(j.location?.area) ? j.location.area[j.location.area.length - 1] : "") ||
      "India",
    salaryMin: typeof j.salary_min === "number" ? j.salary_min : null,
    salaryMax: typeof j.salary_max === "number" ? j.salary_max : null,
    contractType: j.contract_type || j.category?.label || "Job",
    created: j.created || "",
    description: j.description || "",
    applyUrl: j.redirect_url,
  };
}

/* ── Search: cached, paginated, real ── */
export async function searchJobs(
  filters: AdzunaFilters,
  page: number // 1-based; start increments by 10 internally
): Promise<{ jobs: JobCardData[]; totalCount: number; cached: boolean }> {
  const key = cacheKey(filters, page);
  const hit = readCache(key);
  if (hit) return { ...hit, cached: true };

  if (!APP_ID || !APP_KEY) throw new Error("Adzuna credentials not configured: set NEXT_PUBLIC_ADZUNA_APP_ID / NEXT_PUBLIC_ADZUNA_APP_KEY");

  const params = buildQuery(filters, page);
  const qs = new URLSearchParams({
    app_id: APP_ID,
    app_key: APP_KEY,
    ...params,
  }).toString();
  const url = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search${page > 1 ? `/${page}` : ""}?${qs}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Adzuna API error ${res.status}`);

  const json: AdzunaSearchResponse = await res.json();
  const jobs = (json.results || [])
    .map(mapJob)
    .filter((j): j is JobCardData => j !== null);

  const data = { jobs, totalCount: typeof json.count === "number" ? json.count : jobs.length };
  writeCache(key, data);
  return { ...data, cached: false };
}

/* ── Formatters used by the UI ── */
export function formatSalary(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null; // hide when null
  const inr = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1).replace(/\.0$/, "")}L` : `₹${Math.round(n / 1000)}K`;
  if (min !== null && max !== null) return `${inr(min)} – ${inr(max)}`;
  if (min !== null) return `From ${inr(min)}`;
  return `Up to ${inr(max as number)}`;
}

export function formatPostedAgo(created: string): string {
  if (!created) return "";
  const days = Math.floor((Date.now() - new Date(created).getTime()) / 86400000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted 1 day ago";
  return `Posted ${days} days ago`;
}

/** First 2 lines of the plain-text description, truncated */
export function descriptionExcerpt(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const lines = text.split(/(?<=\.)\s+/); // sentence-ish split
  const twoLines = lines.slice(0, 2).join(" ");
  return twoLines.length > 180 ? twoLines.slice(0, 177).trimEnd() + "…" : twoLines;
}

export const ADZUNA_CATEGORIES = [
  { tag: "", label: "All Categories" },
  { tag: "it-jobs", label: "IT & Software" },
  { tag: "engineering-jobs", label: "Engineering" },
  { tag: "accounting-finance-jobs", label: "Accounting & Finance" },
  { tag: "sales-jobs", label: "Sales" },
  { tag: "hr-jobs", label: "HR" },
  { tag: "customer-services-jobs", label: "Customer Service" },
  { tag: "logistics-warehouse-jobs", label: "Logistics & Warehouse" },
  { tag: "healthcare-nursing-jobs", label: "Healthcare & Nursing" },
  { tag: "graduate-jobs", label: "Graduate" },
];

export const ADZUNA_LOCATIONS = [
  "",
  "All India",
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Gurugram",
  "Noida",
  "Remote",
];

export const ADZUNA_SALARY_STEPS = [0, 200000, 400000, 600000, 800000, 1000000, 1500000, 2000000, 3000000];
