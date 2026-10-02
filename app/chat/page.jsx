"use client";

import React from "react";
import { useAppShell } from "@/components/AppShell";
import { useChat } from "@/context/ChatContext";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import { Icons } from "@/components/islamic-chat/Icons";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { TypingDots } from "@/components/ui/TypingDots";
import { MarkdownMessage } from "@/components/ui/MarkdownMessage";
import { SurahAudioPlayer } from "@/components/ui/SurahAudioPlayer";
import { useApi } from "@/hooks/useApi";
import { TAFSIR_URL } from "@/lib/constants";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function ChatContent() {
  const {
    messages,
    isLoading,
    input,
    copiedId,
    copyMessage,
    ttsLoadingId,
    ttsPlayingId,
    toggleMessageAudio,
    summaryLoadingIds,
    summarizeMessage,
    captchaToken,
    captchaPass,
    verifyCaptchaToken,
    captchaResetKey,
    bottomRef,
    textareaRef,
    sendMessage,
    handleInput,
    handleKeyDown,
    handleStop,
  } = useChat();
  const { t } = useLocale();
  const { theme } = useTheme();
  const { handleFocus } = useAppShell();
  const { request } = useApi();

  const [showTafsirModal, setShowTafsirModal] = React.useState(false);
  const [tafsirData, setTafsirData] = React.useState([]);
  const [tafsirLoading, setTafsirLoading] = React.useState(false);
  const [tafsirMeta, setTafsirMeta] = React.useState(null);

  const handleViewFullTafsir = async (media) => {
    setTafsirMeta(media);
    setShowTafsirModal(true);
    setTafsirLoading(true);
    setTafsirData([]);
    try {
      const payload = await request(
        `${TAFSIR_URL}?surahNumber=${media.surahNumber}&startAyah=${media.startAyah || 1}&endAyah=${media.endAyah || ""}`
      );
      const data = payload?.data ?? payload;
      setTafsirData(data || []);
    } catch (error) {
      console.error("Failed to load Tafsir:", error);
    } finally {
      setTafsirLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {!captchaPass && (
        <TurnstileWidget
          siteKey={turnstileSiteKey}
          resetKey={captchaResetKey}
          onVerify={verifyCaptchaToken}
          fullPage
          appearance="interaction-only"
          statusText="Verifying your browser..."
        />
      )}

      {/* Messages list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Welcome screen */}
        {messages.length === 1 && (
          <div
            className="chat-column"
            style={{ textAlign: "center", padding: "32px 12px 24px", animation: "fadeSlideUp .5s ease" }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                margin: "0 auto 16px",
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(26,107,90,0.3)",
              }}
            >
              <img src="/favicon.png" alt="Noor AI" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div
              style={{ fontSize: 20, fontWeight: 600, color: theme.text, marginBottom: 6, fontFamily: "Cinzel, serif" }}
            >
              {t("welcomeTitle")}
            </div>
            <div
              style={{ fontSize: 13.5, color: theme.textSec, lineHeight: 1.7, maxWidth: 360, margin: "0 auto 20px" }}
            >
              {t("welcomeSubtitle")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {t("quickPrompts").map((q, i) => (
                <button
                  key={i}
                  className="quick-chip"
                  onClick={() => sendMessage(q)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 99,
                    background: theme.bgSec,
                    border: `1px solid ${theme.borderMed}`,
                    color: theme.textSec,
                    fontSize: 12.5,
                    cursor: "pointer",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="msg-row chat-column"
            style={{
              display: "flex",
              alignItems: "flex-start",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
            }}
          >
            <div
              style={{
                maxWidth: msg.role === "user" ? "min(78%,520px)" : "100%",
                background: msg.role === "user" ? theme.userBubble : theme.botBubble,
                color: msg.role === "user" ? theme.userText : theme.text,
                padding: msg.role === "user" ? "12px 16px" : "16px 18px",
                borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                fontSize: 14,
                lineHeight: 1.75,
                border: msg.role === "assistant" ? `1px solid ${theme.border}` : "none",
                boxShadow: theme.shadow,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <div style={{ display: "block", width: "100%" }} className="markdown-message">
                {msg.content ? (
                  <MarkdownMessage content={msg.content} theme={theme} isUser={msg.role === "user"} />
                ) : (
                  msg.streaming ? "" : "…"
                )}
              </div>
              {msg.role === "assistant" && msg.media?.type === "quran_recitation" && (
                <SurahAudioPlayer media={msg.media} theme={theme} />
              )}
              {msg.role === "assistant" && msg.media?.type === "quran_tafsir" && msg.media?.isLarge && (
                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={() => handleViewFullTafsir(msg.media)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 16px",
                      borderRadius: 10,
                      background: theme.bgSec,
                      border: `1.5px solid ${theme.accent}`,
                      color: theme.accent,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme.accent;
                      e.currentTarget.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = theme.bgSec;
                      e.currentTarget.style.color = theme.accent;
                    }}
                  >
                    <Icons.Book />
                    <span>{t("viewFullTafsir") || "View Full Tafsir"}</span>
                  </button>
                </div>
              )}
              {msg.streaming && <TypingDots />}
              {msg.role === "assistant" && msg.content && !msg.summaryError && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 4,
                    marginTop: 8,
                    paddingTop: 6,
                    borderTop: `1px solid ${theme.border}`,
                  }}
                >
                  {msg.role === "assistant" &&
                    !msg.isSummary &&
                    !msg.streaming &&
                    !msg.summaryCreated &&
                    msg.content.length >= 2000 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          summarizeMessage && summarizeMessage(msg);
                        }}
                        disabled={summaryLoadingIds.has(msg.id) || (!captchaPass && !captchaToken)}
                        title={summaryLoadingIds.has(msg.id) ? t("summarizing") : t("summarize")}
                        aria-label={summaryLoadingIds.has(msg.id) ? t("summarizing") : t("summarize")}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          marginRight: "auto",
                          background: "transparent",
                          border: "none",
                          color: theme.accent,
                          cursor: summaryLoadingIds.has(msg.id) || (!captchaPass && !captchaToken) ? "not-allowed" : "pointer",
                          padding: 6,
                          borderRadius: 8,
                          fontSize: 12,
                          opacity: summaryLoadingIds.has(msg.id) || (!captchaPass && !captchaToken) ? 0.65 : 1,
                        }}
                      >
                        <i className={summaryLoadingIds.has(msg.id) ? "pi pi-spinner pi-spin" : "pi pi-align-left"} />
                        <span>{summaryLoadingIds.has(msg.id) ? t("summarizing") : t("summarize")}</span>
                      </button>
                    )}
                  <button
                    onClick={(e) => { e.stopPropagation(); copyMessage && copyMessage(msg.id, msg.content); }}
                    title="Copy message"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: copiedId === msg.id ? theme.accent : theme.textTer,
                      cursor: "pointer",
                      padding: 6,
                      borderRadius: 8,
                      fontSize: 15,
                    }}
                  >
                    <i className={copiedId === msg.id ? "pi pi-check" : "pi pi-copy"} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMessageAudio && toggleMessageAudio(msg);
                    }}
                    disabled={ttsLoadingId === msg.id || msg.streaming || (!captchaPass && !captchaToken)}
                    title={!captchaPass && !captchaToken ? "Complete verification first" : ttsPlayingId === msg.id ? "Stop audio" : "Read aloud"}
                    aria-label={!captchaPass && !captchaToken ? "Complete verification first" : ttsPlayingId === msg.id ? "Stop audio" : "Read aloud"}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: ttsPlayingId === msg.id ? theme.accent : theme.textTer,
                      cursor: ttsLoadingId === msg.id ? "wait" : msg.streaming || (!captchaPass && !captchaToken) ? "not-allowed" : "pointer",
                      padding: 6,
                      borderRadius: 8,
                      fontSize: 15,
                      opacity: ttsLoadingId === msg.id || msg.streaming || (!captchaPass && !captchaToken) ? 0.65 : 1,
                    }}
                  >
                    <i
                      className={
                        ttsLoadingId === msg.id
                          ? "pi pi-spinner pi-spin"
                          : ttsPlayingId === msg.id
                            ? "pi pi-pause"
                            : "pi pi-volume-up"
                      }
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (navigator.share) navigator.share({ text: msg.content });
                      else copyMessage && copyMessage(msg.id, msg.content);
                    }}
                    title="Share message"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: theme.textTer,
                      cursor: "pointer",
                      padding: 6,
                      borderRadius: 8,
                      fontSize: 15,
                    }}
                  >
                    <i className="pi pi-share-alt" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "12px 16px 14px", borderTop: `1px solid ${theme.border}`, background: theme.bgSec }}>
        <div
          className="chat-column"
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            background: theme.inputBg,
            border: `1.5px solid ${theme.borderMed}`,
            borderRadius: 14,
            padding: "8px 8px 8px 14px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={t("placeholder")}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            disabled={isLoading}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: theme.text,
              fontSize: 14,
              lineHeight: 1.6,
              minHeight: 24,
              maxHeight: 180,
              overflowY: "auto",
            }}
          />
          <button
            className="send-btn"
            onClick={isLoading ? handleStop : sendMessage}
            disabled={!isLoading && !captchaPass && !captchaToken}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "none",
              cursor: !isLoading && !captchaPass && !captchaToken ? "not-allowed" : "pointer",
              flexShrink: 0,
              background: isLoading ? "#c0392b" : input.trim() && (captchaPass || captchaToken) ? theme.accent : theme.bgTer,
              color: isLoading || (input.trim() && (captchaPass || captchaToken)) ? "white" : theme.textTer,
              opacity: !isLoading && !captchaPass && !captchaToken ? 0.65 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label={isLoading ? "Stop" : "Send"}
          >
            {isLoading ? <Icons.Stop /> : <Icons.Send />}
          </button>
        </div>
        {/* <p style={{ fontSize: 11, color: theme.textTer, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
          {t("disclaimer")}
        </p> */}
        <p style={{ fontSize: 10.5, color: theme.textTer, textAlign: "center", marginTop: 2, lineHeight: 1.5 }}>
          {t("termsAgree")} <a href='/terms' target='_blank' rel='noopener noreferrer' style={{ color: theme.accent, textDecoration: "underline" }}>{t("termsSection")}</a>
        </p>
      </div>

      {showTafsirModal && tafsirMeta && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
            animation: "fadeIn 0.25s ease-out forwards",
          }}
          onClick={() => setShowTafsirModal(false)}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            .tafsir-html-content blockquote {
              border-left: 3px solid var(--accent, #1a6b5a);
              padding-left: 10px;
              margin: 10px 0;
              color: inherit;
              opacity: 0.85;
            }
            .tafsir-html-content p {
              margin: 8px 0;
            }
          `}</style>
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              maxHeight: "85vh",
              background: theme.botBubble,
              color: theme.text,
              borderRadius: 16,
              border: `1px solid ${theme.border}`,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: `1px solid ${theme.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: theme.bgSec,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icons.Book />
                <span style={{ fontSize: 16, fontWeight: 600, fontFamily: "Cinzel, serif" }}>
                  Tafsir: Surah {tafsirMeta.surahName} ({tafsirMeta.startAyah ? `Ayahs ${tafsirMeta.startAyah}-${tafsirMeta.endAyah}` : "Full Surah"})
                </span>
              </div>
              <button
                onClick={() => setShowTafsirModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.textSec,
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                <Icons.Close />
              </button>
            </div>

            {/* Modal Content */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                background: theme.bg,
              }}
            >
              {tafsirLoading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12 }}>
                  <i className="pi pi-spinner pi-spin" style={{ fontSize: "2rem", color: theme.accent }} />
                  <span style={{ color: theme.textSec, fontSize: 13 }}>Loading Tafsir...</span>
                </div>
              ) : tafsirData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: theme.textSec, fontSize: 13 }}>
                  No Tafsir details found.
                </div>
              ) : (
                tafsirData.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px",
                      background: theme.bgSec,
                      borderRadius: 12,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: theme.accent,
                        marginBottom: 10,
                        borderBottom: `1px solid ${theme.borderMed}`,
                        paddingBottom: 6,
                      }}
                    >
                      Verse {item.verse_key} (Ayah {item.verse_number})
                    </div>
                    <div
                      className="tafsir-html-content"
                      dangerouslySetInnerHTML={{ __html: item.text_html }}
                      style={{
                        fontSize: 14.5,
                        lineHeight: 1.8,
                        color: theme.text,
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return <ChatContent />;
}
