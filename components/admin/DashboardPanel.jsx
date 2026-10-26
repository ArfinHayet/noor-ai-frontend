"use client";

import { useEffect, useState } from "react";
import { ADMIN_QUESTION_STATS_URL } from "@/lib/constants";
import { useTheme } from "@/context/ThemeContext";
import { useAdminSession } from "@/components/admin/AdminShell";

const RANGES = [7, 15, 30, 90];
const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "Asia/Dhaka",
});

function fullDate(date) {
  return dateFormatter.format(new Date(`${date}T00:00:00+06:00`));
}

export function DashboardPanel() {
  const { theme } = useTheme();
  const { session } = useAdminSession();
  const [days, setDays] = useState(7);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [activeDay, setActiveDay] = useState(null);

  const current = result?.days === days && result?.revision === revision;
  const loading = !current;
  const data = current ? result.data : null;
  const error = current ? result.error : "";

  useEffect(() => {
    if (!session?.access_token) return undefined;

    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`${ADMIN_QUESTION_STATS_URL}?days=${days}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || `HTTP ${response.status}`);
        }

        const stats = payload?.data ?? payload;

        if (
          !stats ||
          !Array.isArray(stats.series) ||
          stats.series.length !== days ||
          !Number.isFinite(stats.totalQuestions) ||
          stats.series.some((day) =>
            !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
            !Number.isInteger(day.count) || day.count < 0)
        ) {
          throw new Error("Invalid dashboard response.");
        }

        if (!controller.signal.aborted) {
          setResult({ days, revision, data: stats, error: "" });
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setResult({
            days,
            revision,
            data: null,
            error: requestError.message || "Failed to load question statistics.",
          });
        }
      }
    }

    load();
    return () => controller.abort();
  }, [days, revision, session?.access_token]);

  const series = data?.series ?? [];
  const maximum = Math.max(1, ...series.map((day) => day.count));
  const step = Math.max(48, 840 / Math.max(1, series.length));
  const width = 64 + step * series.length;
  const baseline = 252;
  const plotHeight = 200;
  const selectedDay = series.find((day) => day.date === activeDay);
  const controlStyle = {
    minHeight: 40,
    padding: "0 12px",
    borderRadius: 8,
    border: `1px solid ${theme.borderMed}`,
    background: theme.inputBg,
    color: theme.text,
  };

  return (
    <section style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 16, minWidth: 0, color: theme.text }}>
      <style>{`
        .admin-question-day:focus-visible {
          outline: 2px solid ${theme.accent};
          outline-offset: 2px;
        }
      `}</style>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24 }}>Dashboard</h1>
          <p style={{ color: theme.textSec, fontSize: 13 }}>
            Daily questions · Bangladesh time · Includes today
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <label htmlFor="question-range">Date range</label>
          <select
            id="question-range"
            value={days}
            onChange={(event) => {
              setActiveDay(null);
              setDays(Number(event.target.value));
            }}
            style={controlStyle}
          >
            {RANGES.map((range) => (
              <option key={range} value={range}>Last {range} days</option>
            ))}
          </select>
          <button type="button" style={controlStyle} disabled={loading} onClick={() => setRevision((value) => value + 1)}>
            Refresh
          </button>
        </div>
      </header>

      {loading && <p role="status">Loading question statistics...</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" style={controlStyle} onClick={() => setRevision((value) => value + 1)}>Retry</button>
        </div>
      )}

      {data && (
        <section aria-label="Daily question statistics" style={{ padding: 16, background: theme.bgSec, border: `1px solid ${theme.border}`, borderRadius: 8, minWidth: 0 }}>
          <h2 style={{ fontSize: 18 }}>Questions per day</h2>
          <p style={{ color: theme.textSec }}>
            {fullDate(series[0].date)} – {fullDate(series[series.length - 1].date)}
            {" · "}{data.totalQuestions.toLocaleString()} questions
          </p>
          {data.totalQuestions === 0 && <p>No questions during this period.</p>}

          <div role="region" aria-label="Daily question bar chart; scroll for more dates" tabIndex={0} style={{ overflowX: "auto", maxWidth: "100%" }}>
            <svg role="group" aria-label={`Questions per day for the last ${days} days`} width={width} height={320} style={{ display: "block", fontFamily: "inherit" }}>
              <title>Daily question counts</title>
              {[...new Set([0, Math.ceil(maximum / 2), maximum])].map((tick) => {
                const y = baseline - (tick / maximum) * plotHeight;
                return (
                  <g key={tick}>
                    <line x1={48} x2={width - 8} y1={y} y2={y} stroke={theme.borderMed} />
                    <text x={40} y={y + 4} textAnchor="end" fontSize={11} fill={theme.textSec}>{tick}</text>
                  </g>
                );
              })}
              {series.map(({ date, count }, index) => {
                const x = 56 + index * step;
                const height = (count / maximum) * plotHeight;
                const label = `${fullDate(date)}: ${count === 0 ? "No questions (0)" : `${count} questions`}`;

                return (
                  <g
                    key={date}
                    className="admin-question-day"
                    tabIndex={0}
                    role="img"
                    aria-label={label}
                    onMouseEnter={() => setActiveDay(date)}
                    onMouseLeave={() => setActiveDay(null)}
                    onFocus={() => setActiveDay(date)}
                    onBlur={() => setActiveDay(null)}
                  >
                    <title>{label}</title>
                    <rect x={x} y={40} width={step - 16} height={238} fill="transparent" />
                    <rect x={x} y={baseline - height} width={step - 16} height={height} rx={3} fill={theme.accent} />
                    {count === 0 && (
                      <line x1={x} x2={x + step - 16} y1={baseline} y2={baseline} stroke={theme.textSec} strokeWidth={3} />
                    )}
                    <text x={x + (step - 16) / 2} y={baseline - height - 8} textAnchor="middle" fontSize={11} fill={theme.text}>{count}</text>
                    <text x={x + (step - 16) / 2} y={baseline + 20} textAnchor="middle" fontSize={11} fill={theme.textSec}>{date.slice(5)}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <p role="status" style={{ minHeight: 20, color: theme.textSec, fontSize: 13 }}>
            {selectedDay
              ? `${fullDate(selectedDay.date)}: ${selectedDay.count === 0 ? "No questions (0)" : `${selectedDay.count} questions`}`
              : "Hover or focus a date to see its question count."}
          </p>
          <p style={{ color: theme.textSec, fontSize: 12 }}>
            Dates use MM-DD. A baseline marker means 0 questions. Summary requests are excluded.
          </p>
        </section>
      )}
    </section>
  );
}
