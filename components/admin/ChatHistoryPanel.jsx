"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ADMIN_MESSAGE_LOGS_URL } from "@/lib/constants";
import { useTheme } from "@/context/ThemeContext";
import { useAdminSession } from "@/components/admin/AdminShell";

const PAGE_SIZE = 20;

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function unwrapApiResponse(payload) {
  return payload?.data ?? payload;
}

function ResponseCell({ response, theme, onSeeMore }) {
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const responseText = response || "-";

  useEffect(() => {
    const element = textRef.current;
    if (!element) return undefined;

    const checkOverflow = () => {
      setIsOverflowing(element.scrollWidth > element.clientWidth);
    };

    checkOverflow();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(checkOverflow);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [responseText]);

  return (
    <td style={{ padding: 14, fontSize: 13, lineHeight: 1.5, width: 380, maxWidth: 380 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span
          ref={textRef}
          title={responseText}
          style={{
            minWidth: 0,
            flex: "1 1 auto",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: response ? theme.text : theme.textTer,
          }}
        >
          {responseText}
        </span>
        {response && isOverflowing && (
          <button
            type="button"
            onClick={() => onSeeMore(response)}
            style={{
              border: "none",
              background: "transparent",
              color: theme.accent,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              padding: 0,
              whiteSpace: "nowrap",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            See more
          </button>
        )}
      </div>
    </td>
  );
}

function MessageCell({ message, theme, onSeeMore }) {
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const messageText = message || "-";

  useEffect(() => {
    const element = textRef.current;
    if (!element) return undefined;

    const checkOverflow = () => {
      setIsOverflowing(element.scrollHeight > element.clientHeight + 1);
    };

    checkOverflow();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(checkOverflow);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [messageText]);

  return (
    <td style={{ padding: 14, fontSize: 13, lineHeight: 1.5, width: 300, maxWidth: 300 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
        <span
          ref={textRef}
          title={messageText}
          style={{
            minWidth: 0,
            flex: "1 1 auto",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 3,
            overflow: "hidden",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: message ? theme.text : theme.textTer,
          }}
        >
          {messageText}
        </span>
        {message && isOverflowing && (
          <button
            type="button"
            onClick={() => onSeeMore(message)}
            aria-label="See full message"
            style={{
              border: "none",
              background: "transparent",
              color: theme.accent,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              padding: 0,
              whiteSpace: "nowrap",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            See more
          </button>
        )}
      </div>
    </td>
  );
}

export function ChatHistoryPanel() {
  const { theme } = useTheme();
  const { session } = useAdminSession();
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ userId: "", ipAddress: "" });
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [expandedContent, setExpandedContent] = useState(null);
  const [ipLookup, setIpLookup] = useState({
    ip: "",
    loading: false,
    error: "",
    data: null,
  });
  const isIpLookupOpen = Boolean(ipLookup.loading || ipLookup.error || ipLookup.data);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });

    if (appliedFilters.userId) params.set("userId", appliedFilters.userId);
    if (appliedFilters.ipAddress) params.set("ipAddress", appliedFilters.ipAddress);

    return params.toString();
  }, [appliedFilters, page]);

  const loadLogs = useCallback(async () => {
    if (!session?.access_token) return;

    setLogsLoading(true);
    setLogsError("");

    try {
      const response = await fetch(`${ADMIN_MESSAGE_LOGS_URL}?${queryString}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }

      const data = unwrapApiResponse(payload);
      setLogs(data.items ?? []);
      setMeta({
        total: data.total ?? 0,
        page: data.page ?? page,
        limit: data.limit ?? PAGE_SIZE,
        totalPages: data.totalPages ?? 1,
      });
    } catch (error) {
      setLogs([]);
      setLogsError(error.message || "Failed to load chat history.");
    } finally {
      setLogsLoading(false);
    }
  }, [page, queryString, session?.access_token]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({
      userId: userId.trim(),
      ipAddress: ipAddress.trim(),
    });
  };

  const handleReset = () => {
    setUserId("");
    setIpAddress("");
    setPage(1);
    setAppliedFilters({ userId: "", ipAddress: "" });
  };

  const closeIpLookup = useCallback(() => {
    setIpLookup({ ip: "", loading: false, error: "", data: null });
  }, []);

  useEffect(() => {
    if (!expandedContent && !isIpLookupOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (expandedContent) {
          setExpandedContent(null);
        } else {
          closeIpLookup();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeIpLookup, expandedContent, isIpLookupOpen]);

  const lookupIpAddress = async (ip) => {
    if (!ip) return;

    setIpLookup({ ip, loading: true, error: "", data: null });

    try {
      const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.error) {
        throw new Error(data?.reason || data?.message || "Unable to look up this IP address.");
      }

      setIpLookup({
        ip,
        loading: false,
        error: "",
        data: {
          country: data.country_name || data.country || "-",
          city: data.city || "-",
          isp: data.org || data.asn || data.network || "-",
        },
      });
    } catch (error) {
      setIpLookup({
        ip,
        loading: false,
        error: error.message || "Unable to look up this IP address.",
        data: null,
      });
    }
  };

  const inputStyle = {
    width: "100%",
    minHeight: 40,
    borderRadius: 8,
    border: `1px solid ${theme.borderMed}`,
    background: theme.inputBg,
    color: theme.text,
    padding: "0 12px",
    fontSize: 14,
    flex: "1 1 220px",
  };
  const buttonStyle = {
    minHeight: 40,
    border: "none",
    borderRadius: 8,
    background: theme.accent,
    color: "white",
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
  const secondaryButtonStyle = {
    minHeight: 40,
    borderRadius: 8,
    border: `1px solid ${theme.borderMed}`,
    background: theme.bgTer,
    color: theme.textSec,
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <section style={{ width: "100%", maxWidth: 1180, minWidth: 0, margin: "0 auto", display: "grid", gap: 16 }}>
      <style>{`
        .admin-filter-input::placeholder { color: ${theme.textTer}; opacity: 1; }
        .admin-table-scroll {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          scrollbar-width: thin;
        }
        .admin-chat-table {
          width: max-content;
          min-width: 1180px;
          border-collapse: collapse;
        }
        @media (max-width: 720px) {
          .admin-history-titlebar { align-items: flex-start !important; flex-direction: column !important; }
          .admin-history-pagination { align-items: flex-start !important; flex-direction: column !important; }
          .admin-history-actions { width: 100%; }
          .admin-history-actions button { flex: 1; }
          .admin-chat-table { min-width: 1040px; }
        }
      `}</style>

      <header className="admin-history-titlebar" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Chat History</h1>
          <p style={{ fontSize: 13, color: theme.textSec }}>Latest conversations first.</p>
        </div>
        <button type="button" onClick={loadLogs} disabled={logsLoading} style={secondaryButtonStyle}>
          Refresh
        </button>
      </header>

      <form
        onSubmit={handleSearch}
        style={{
          background: theme.bgSec,
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          boxShadow: theme.shadow,
          padding: 14,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          className="admin-filter-input"
          placeholder="Filter by userId"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          style={inputStyle}
        />
        <input
          className="admin-filter-input"
          placeholder="Search by IP address"
          value={ipAddress}
          onChange={(event) => setIpAddress(event.target.value)}
          style={inputStyle}
        />
        <div className="admin-history-actions" style={{ display: "flex", gap: 8 }}>
          <button type="submit" style={buttonStyle}>Search</button>
          <button type="button" onClick={handleReset} style={secondaryButtonStyle}>Reset</button>
        </div>
      </form>

      <section
        style={{
          background: theme.bgSec,
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          boxShadow: theme.shadow,
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <div className="admin-table-scroll">
          <table className="admin-chat-table">
            <thead>
              <tr style={{ background: theme.bgTer, color: theme.textSec, textAlign: "left" }}>
                {["Time", "User ID", "IP Address", "Source", "Message", "Response", "Failed"].map((heading) => (
                  <th key={heading} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 700 }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr><td colSpan="6" style={{ padding: 18, color: theme.textSec }}>Loading chat history...</td></tr>
              ) : logsError ? (
                <tr><td colSpan="6" style={{ padding: 18, color: "#e11d48" }}>{logsError}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 18, color: theme.textSec }}>No chat logs found.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                    <td style={{ padding: 14, fontSize: 12, color: theme.textSec, whiteSpace: "nowrap" }}>{formatDate(log.createdAt)}</td>
                    <td style={{ padding: 14, fontSize: 12, maxWidth: 180, wordBreak: "break-all" }}>{log.userId}</td>
                    <td style={{ padding: 14, fontSize: 12, whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        onClick={() => lookupIpAddress(log.ipAddress)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: theme.accent,
                          cursor: "pointer",
                          font: "inherit",
                          padding: 0,
                          textDecoration: "underline",
                          textUnderlineOffset: 3,
                        }}
                        title="Look up IP location and ISP"
                      >
                        {log.ipAddress}
                      </button>
                    </td>
                    <td style={{ padding: 14, fontSize: 12 }}>{log.source}</td>
                    <MessageCell
                      message={log.message}
                      theme={theme}
                      onSeeMore={(text) => setExpandedContent({ title: "Full message", text })}
                    />
                    <ResponseCell
                      response={log.response}
                      theme={theme}
                      onSeeMore={(text) => setExpandedContent({ title: "Full response", text })}
                    />
                    <td style={{ padding: 14, fontSize: 12}}>{log.failureReason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="admin-history-pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: theme.textSec }}>
          Page {meta.page} of {meta.totalPages} · {meta.total} logs
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || logsLoading}
            style={{ ...secondaryButtonStyle, opacity: page <= 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
            disabled={page >= meta.totalPages || logsLoading}
            style={{ ...secondaryButtonStyle, opacity: page >= meta.totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </footer>

      {isIpLookupOpen && (
        <div
          role="presentation"
          onClick={closeIpLookup}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(15, 23, 42, 0.52)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ip-lookup-modal-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              background: theme.bgSec,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              boxShadow: theme.shadow,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 16px",
                borderBottom: `1px solid ${theme.border}`,
                background: theme.bgTer,
              }}
            >
              <div>
                <h2 id="ip-lookup-modal-title" style={{ fontSize: 16, margin: 0 }}>
                  IP address lookup
                </h2>
                <div style={{ fontSize: 12, color: theme.textSec, marginTop: 3 }}>{ipLookup.ip}</div>
              </div>
              <button
                type="button"
                onClick={closeIpLookup}
                style={{ ...secondaryButtonStyle, minHeight: 32, padding: "0 10px" }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: 16 }}>
              {ipLookup.loading && <div style={{ fontSize: 13, color: theme.textSec }}>Looking up IP details...</div>}
              {ipLookup.error && <div style={{ fontSize: 13, color: "#e11d48" }}>{ipLookup.error}</div>}
              {ipLookup.data && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    ["Country", ipLookup.data.country],
                    ["City", ipLookup.data.city],
                    ["ISP", ipLookup.data.isp],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        flex: "1 1 150px",
                        border: `1px solid ${theme.border}`,
                        borderRadius: 8,
                        background: theme.bgTer,
                        padding: 12,
                      }}
                    >
                      <div style={{ fontSize: 11, color: theme.textTer, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {expandedContent && (
        <div
          role="presentation"
          onClick={() => setExpandedContent(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(15, 23, 42, 0.52)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="expanded-content-modal-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(720px, 100%)",
              maxHeight: "min(78vh, 720px)",
              background: theme.bgSec,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              boxShadow: theme.shadow,
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 16px",
                borderBottom: `1px solid ${theme.border}`,
                background: theme.bgTer,
              }}
            >
              <h2 id="expanded-content-modal-title" style={{ fontSize: 16, margin: 0 }}>
                {expandedContent.title}
              </h2>
              <button
                type="button"
                onClick={() => setExpandedContent(null)}
                style={{ ...secondaryButtonStyle, minHeight: 32, padding: "0 10px" }}
              >
                Close
              </button>
            </div>
            <div
              style={{
                padding: 16,
                overflow: "auto",
                color: theme.text,
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {expandedContent.text}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
