"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/game-context";
import {
  searchJobs,
  formatSalary,
  formatPostedAgo,
  descriptionExcerpt,
  DEFAULT_FILTERS,
  RESULTS_PER_PAGE,
  ADZUNA_CATEGORIES,
  ADZUNA_LOCATIONS,
  ADZUNA_SALARY_STEPS,
  type AdzunaFilters,
  type JobCardData,
} from "@/lib/adzuna";

/* ═══════════════════════════════════════════
   JOBS — REAL DATA VIA ADZUNA (country: in)
   Live listings, 6h cache, zero fake jobs
   ═══════════════════════════════════════════ */

const SAVED_KEY = "cv_saved_jobs";

function readSaved(): JobCardData[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function OpportunitiesPage() {
  const { sfx } = useGame();

  const [draft, setDraft] = useState<AdzunaFilters>({ ...DEFAULT_FILTERS, what: "software developer" });
  const [filters, setFilters] = useState<AdzunaFilters>({ ...DEFAULT_FILTERS, what: "software developer" });
  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<JobCardData | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    setSavedIds(readSaved().map((j) => j.id));
  }, []);

  /* ── Fetch (cache-aware) ── */
  const fetchPage = useCallback(async (f: AdzunaFilters, p: number, append: boolean) => {
    const id = ++reqId.current;
    append ? setLoadingMore(true) : setLoading(true);
    setError(false);
    try {
      const res = await searchJobs(f, p);
      if (id !== reqId.current) return; // stale response
      setTotalCount(res.totalCount);
      setJobs((prev) => {
        const next = append ? [...prev, ...res.jobs] : res.jobs;
        const seen = new Set<string>();
        return next.filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)));
      });
      setPage(p);
    } catch {
      if (id === reqId.current) setError(true);
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchPage(filters, 1, false);
  }, [filters, fetchPage]);

  const applyFilters = (patch: Partial<AdzunaFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    sfx("click");
  };

  const toggleSave = (job: JobCardData) => {
    const saved = readSaved();
    const exists = saved.some((j) => j.id === job.id);
    const next = exists ? saved.filter((j) => j.id !== job.id) : [...saved, job];
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    setSavedIds(next.map((j) => j.id));
    sfx(exists ? "click" : "coin");
  };

  const visibleJobs = showSavedOnly ? readSaved() : jobs;
  const hasMore = !showSavedOnly && jobs.length < totalCount && jobs.length > 0;
  const activeSalaryIdx = ADZUNA_SALARY_STEPS.indexOf(draft.salaryMin ?? 0);

  const selectClass =
    "bg-[#0a0b0d] border border-[#2a2520] rounded-lg px-3 py-2 text-xs text-[#c8c0b0] focus:outline-none focus:border-[#10b981]/50 cursor-pointer";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="chip-glow text-[10px] font-mono text-[#34d399] uppercase tracking-widest px-3 py-1 rounded-full border border-[#10b981]/30 bg-[#10b981]/10">
          ⚡ Live from Adzuna · India
        </span>
        <h1 className="font-cinzel text-3xl font-bold aurora-text tracking-wider">Jobs & Internships</h1>
        <p className="text-xs text-[#6b6358] max-w-xl mx-auto">
          Real openings, updated daily. No fake listings — ever.
          {totalCount > 0 && !showSavedOnly && (
            <>
              {" "}
              <strong className="text-[#34d399]">{totalCount.toLocaleString("en-IN")}</strong> match your filters.
            </>
          )}
        </p>
      </div>

      {/* Search bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters({ what: draft.what });
        }}
        className="flex gap-2"
      >
        <input
          value={draft.what}
          onChange={(e) => setDraft((d) => ({ ...d, what: e.target.value }))}
          placeholder="Search job title, skill, or company…"
          className="flex-1 bg-[#0a0b0d] border border-[#2a2520] rounded-xl px-4 py-3 text-sm text-[#e8dfc8] placeholder:text-[#3d3830] focus:outline-none focus:border-[#10b981]/50"
        />
        <button type="submit" className="btn-emerald px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer">
          Search
        </button>
      </form>

      {/* Filters */}
      <div className="surface rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select
            value={draft.where}
            onChange={(e) => setDraft((d) => ({ ...d, where: e.target.value }))}
            onBlur={() => applyFilters({ where: draft.where })}
            className={selectClass}
          >
            {ADZUNA_LOCATIONS.map((l) => (
              <option key={l || "all"} value={l}>
                {l === "" ? "📍 All India" : l === "All India" ? "📍 All India" : `📍 ${l}`}
              </option>
            ))}
          </select>

          <select
            value={draft.category}
            onChange={(e) => applyFilters({ category: e.target.value })}
            className={selectClass}
          >
            {ADZUNA_CATEGORIES.map((c) => (
              <option key={c.tag || "all"} value={c.tag}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={draft.datePosted}
            onChange={(e) => applyFilters({ datePosted: e.target.value as AdzunaFilters["datePosted"] })}
            className={selectClass}
          >
            <option value="">📅 Any time</option>
            <option value="1">Last 24 hours</option>
            <option value="3">Last 3 days</option>
            <option value="7">Last week</option>
            <option value="14">Last fortnight</option>
          </select>

          <select
            value={draft.sortBy}
            onChange={(e) => applyFilters({ sortBy: e.target.value as AdzunaFilters["sortBy"] })}
            className={selectClass}
          >
            <option value="date">↕ Newest first</option>
            <option value="salary">↕ Highest salary</option>
            <option value="relevance">↕ Most relevant</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Full/Part-time toggle */}
          <div className="flex items-center gap-1.5">
            {(["", "full_time", "part_time"] as const).map((t) => (
              <button
                key={t || "any"}
                onClick={() => applyFilters({ contractTime: t })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  draft.contractTime === t
                    ? "bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/30"
                    : "text-[#6b6358] hover:text-[#c8c0b0] hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                {t === "" ? "Any" : t === "full_time" ? "Full-time" : "Part-time"}
              </button>
            ))}
          </div>

          {/* Salary slider */}
          <div className="flex-1 flex items-center gap-3 min-w-[220px]">
            <span className="text-[10px] font-mono text-[#6b6358] whitespace-nowrap">
              💰 {draft.salaryMin ? `Min ₹${(draft.salaryMin / 100000).toFixed(0)}L+` : "Any salary"}
            </span>
            <input
              type="range"
              min={0}
              max={ADZUNA_SALARY_STEPS.length - 1}
              step={1}
              value={activeSalaryIdx >= 0 ? activeSalaryIdx : 0}
              onChange={(e) => setDraft((d) => ({ ...d, salaryMin: ADZUNA_SALARY_STEPS[Number(e.target.value)] }))}
              onMouseUp={() => applyFilters({ salaryMin: draft.salaryMin })}
              onTouchEnd={() => applyFilters({ salaryMin: draft.salaryMin })}
              className="flex-1 accent-[#10b981] cursor-pointer"
            />
          </div>

          <button
            onClick={() => {
              const fresh = { ...DEFAULT_FILTERS, what: "software developer" };
              setDraft(fresh);
              setFilters(fresh);
              sfx("click");
            }}
            className="text-[10px] font-mono text-[#6b6358] hover:text-[#fb7185] transition-colors cursor-pointer whitespace-nowrap"
          >
            ↺ Reset filters
          </button>
        </div>
      </div>

      {/* Saved toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setShowSavedOnly((s) => !s);
            sfx("click");
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            showSavedOnly
              ? "bg-[#fb7185]/15 text-[#fb7185] border border-[#fb7185]/30"
              : "text-[#6b6358] hover:text-[#c8c0b0] hover:bg-white/[0.03]"
          }`}
        >
          ❤ Saved ({savedIds.length})
        </button>
        {loading && !showSavedOnly && <span className="text-[10px] font-mono text-[#6b6358] animate-pulse">fetching live listings…</span>}
      </div>

      {/* Loading */}
      {loading && !showSavedOnly ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface rounded-xl p-6 space-y-3 animate-pulse">
              <div className="h-4 w-3/4 bg-[#2a2520]/60 rounded" />
              <div className="h-3 w-1/2 bg-[#2a2520]/40 rounded" />
              <div className="h-3 w-2/3 bg-[#2a2520]/40 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 surface rounded-xl space-y-3">
          <span className="text-3xl">📡</span>
          <p className="text-sm text-[#fb7185]">Couldn&apos;t load jobs. Try again.</p>
          <button
            onClick={() => fetchPage(filters, 1, false)}
            className="btn-emerald px-6 py-2 rounded-lg text-xs uppercase tracking-wider cursor-pointer"
          >
            ↻ Retry
          </button>
        </div>
      ) : visibleJobs.length === 0 ? (
        <div className="text-center py-12 surface rounded-xl space-y-3">
          <span className="text-3xl">🔍</span>
          <p className="text-sm text-[#c8c0b0]">
            {showSavedOnly ? "No saved jobs yet — tap ❤ on any listing." : "No real jobs match these filters right now."}
          </p>
          {!showSavedOnly && (
            <>
              <p className="text-xs text-[#6b6358]">Try relaxing your salary, location, or date filters.</p>
              <button
                onClick={() => {
                  const fresh = { ...DEFAULT_FILTERS, what: draft.what };
                  setDraft(fresh);
                  setFilters(fresh);
                  sfx("click");
                }}
                className="text-xs text-[#34d399] hover:text-[#10b981] underline underline-offset-4 cursor-pointer"
              >
                Relax all filters
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {visibleJobs.map((job) => {
                const salary = formatSalary(job.salaryMin, job.salaryMax);
                const isSaved = savedIds.includes(job.id);
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onMouseEnter={() => sfx("hover")}
                    onClick={() => {
                      setDetail(job);
                      sfx("click");
                    }}
                    className="surface card-lift rounded-xl p-5 space-y-3 hover:border-[#10b981]/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <h3 className="text-sm font-semibold text-[#e8dfc8] leading-snug">{job.title}</h3>
                        <p className="text-xs text-[#6b6358]">
                          {job.company} • 📍 {job.location}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(job);
                        }}
                        className={`text-lg shrink-0 transition-transform hover:scale-125 cursor-pointer ${isSaved ? "" : "grayscale opacity-40"}`}
                        aria-label={isSaved ? "Unsave job" : "Save job"}
                      >
                        ❤
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10 text-[#22d3ee] uppercase tracking-wide">
                        {job.contractType}
                      </span>
                      {salary && (
                        <span className="px-2 py-0.5 rounded-full border border-[#10b981]/30 bg-[#10b981]/10 text-[#34d399]">
                          {salary}
                        </span>
                      )}
                      {job.created && <span className="text-[#6b6358]">{formatPostedAgo(job.created)}</span>}
                    </div>

                    {job.description && (
                      <p className="text-xs text-[#9a9182] leading-relaxed line-clamp-2">{descriptionExcerpt(job.description)}</p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] font-mono text-[#3d3830]">ID {job.id} · via Adzuna</span>
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="btn-emerald px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider"
                      >
                        Apply →
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={() => {
                  fetchPage(filters, page + 1, true);
                  sfx("click");
                }}
                disabled={loadingMore}
                className="px-8 py-3 rounded-xl border border-[#10b981]/30 text-[#34d399] hover:bg-[#10b981]/10 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer"
              >
                {loadingMore ? "Loading…" : `Load 10 more (of ${totalCount.toLocaleString("en-IN")})`}
              </button>
              <p className="text-[9px] font-mono text-[#3d3830] mt-2">
                showing {jobs.length} of {totalCount.toLocaleString("en-IN")} · {RESULTS_PER_PAGE} per page
              </p>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDetail(null)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a0b0d] border border-[#2a2520] rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-[#0a0b0d]/95 backdrop-blur border-b border-[#2a2520] p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold text-[#e8dfc8] leading-snug">{detail.title}</h2>
                  <button onClick={() => setDetail(null)} className="text-[#6b6358] hover:text-[#e8dfc8] text-xl leading-none cursor-pointer">
                    ✕
                  </button>
                </div>
                <p className="text-xs text-[#6b6358]">
                  {detail.company} • 📍 {detail.location}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono pt-1">
                  <span className="px-2 py-0.5 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10 text-[#22d3ee] uppercase">
                    {detail.contractType}
                  </span>
                  {formatSalary(detail.salaryMin, detail.salaryMax) && (
                    <span className="px-2 py-0.5 rounded-full border border-[#10b981]/30 bg-[#10b981]/10 text-[#34d399]">
                      {formatSalary(detail.salaryMin, detail.salaryMax)}
                    </span>
                  )}
                  {detail.created && <span className="text-[#6b6358]">{formatPostedAgo(detail.created)}</span>}
                  <span className="text-[#3d3830]">ID {detail.id}</span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div
                  className="adzuna-desc text-xs text-[#c8c0b0] leading-relaxed space-y-2"
                  dangerouslySetInnerHTML={{ __html: detail.description || "<p>No description provided.</p>" }}
                />

                <div className="flex items-center gap-2 pt-2">
                  <a
                    href={detail.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-emerald flex-1 text-center px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider"
                  >
                    Apply on Adzuna →
                  </a>
                  <button
                    onClick={() => toggleSave(detail)}
                    className={`px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      savedIds.includes(detail.id)
                        ? "border-[#fb7185]/40 bg-[#fb7185]/10 text-[#fb7185]"
                        : "border-[#2a2520] text-[#6b6358] hover:text-[#c8c0b0]"
                    }`}
                  >
                    ❤ {savedIds.includes(detail.id) ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
