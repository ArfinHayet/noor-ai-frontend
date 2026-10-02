"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { CHAT_STREAM_URL, CHAT_SUMMARIZE_STREAM_URL, CHAT_TTS_URL, TURNSTILE_PASS_URL } from "@/lib/constants";
import { TRANSLATIONS } from "@/lib/translations";
import { useLocale } from "@/context/LocaleContext";

const ChatContext = createContext(null);
const CAPTCHA_PASS_STORAGE_KEY = "noorAiCaptchaPass";

function unwrapApiResponse(payload) {
  return payload?.data ?? payload;
}

function genUserId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `user_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
}

function readStoredCaptchaPass() {
  if (typeof window === "undefined") return null;

  try {
    const storedValue = window.localStorage.getItem(CAPTCHA_PASS_STORAGE_KEY);
    if (!storedValue) return null;

    const storedPass = unwrapApiResponse(JSON.parse(storedValue));
    const expiresAtMs = Date.parse(storedPass?.expiresAt);
    if (!storedPass?.captchaPass || !expiresAtMs || expiresAtMs <= Date.now()) {
      window.localStorage.removeItem(CAPTCHA_PASS_STORAGE_KEY);
      return null;
    }

    return storedPass;
  } catch {
    return null;
  }
}

function writeStoredCaptchaPass(pass) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(CAPTCHA_PASS_STORAGE_KEY, JSON.stringify(pass));
  } catch {
    // Storage can be unavailable in private browsing; the in-memory pass still works for this tab.
  }
}

function clearStoredCaptchaPass() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(CAPTCHA_PASS_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function ChatProvider({ children }) {
  const { lang, t } = useLocale();
  const { request } = useApi();
  const [userId, setUserId] = useState(() => genUserId());
  const [messages, setMessages] = useState(() => [
    { id: 0, role: "assistant", content: TRANSLATIONS[lang].greeting, streaming: false },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaPass, setCaptchaPass] = useState(() => readStoredCaptchaPass()?.captchaPass ?? "");
  const [captchaPassExpiresAt, setCaptchaPassExpiresAt] = useState(() => readStoredCaptchaPass()?.expiresAt ?? "");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [ttsLoadingId, setTtsLoadingId] = useState(null);
  const [ttsPlayingId, setTtsPlayingId] = useState(null);
  const [summaryLoadingIds, setSummaryLoadingIds] = useState(() => new Set());

  const bottomRef = useRef(null);
  const scrollThrottleRef = useRef(0);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);
  const ttsAudioRef = useRef(null);
  const ttsUrlCacheRef = useRef(new Map());
  const summaryLoadingIdsRef = useRef(new Set());
  const summaryAbortControllersRef = useRef(new Map());

  const copyMessage = useCallback(async (id, text) => {
    try {
      const str = String(text ?? "");
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(str);
      } else if (typeof document !== "undefined") {
        const ta = document.createElement("textarea");
        ta.value = str;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1400);
    } catch (e) {
      console.error("copy failed", e);
    }
  }, []);

  const stopTtsAudio = useCallback(() => {
    const audio = ttsAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    }
    ttsAudioRef.current = null;
    setTtsPlayingId(null);
  }, []);

  const revokeTtsAudio = useCallback(() => {
    stopTtsAudio();
    ttsUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
    ttsUrlCacheRef.current.clear();
    setTtsLoadingId(null);
  }, [stopTtsAudio]);

  useEffect(
    () => () => {
      revokeTtsAudio();
      summaryAbortControllersRef.current.forEach((controller) => controller.abort());
      summaryAbortControllersRef.current.clear();
    },
    [revokeTtsAudio],
  );

  const playTtsUrl = useCallback(
    async (messageId, url) => {
      stopTtsAudio();

      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.onended = () => {
        if (ttsAudioRef.current === audio) {
          ttsAudioRef.current = null;
          setTtsPlayingId(null);
        }
      };
      audio.onerror = audio.onended;

      try {
        await audio.play();
        setTtsPlayingId(messageId);
      } catch (error) {
        if (ttsAudioRef.current === audio) {
          audio.src = "";
          ttsAudioRef.current = null;
        }
        throw error;
      }
    },
    [stopTtsAudio],
  );

  const toggleMessageAudio = useCallback(
    async (message) => {
      const text = String(message?.content ?? "").trim();
      if (message?.id == null || !text || message.streaming || ttsLoadingId === message.id) return;

      if (ttsPlayingId === message.id) {
        stopTtsAudio();
        return;
      }

      const cachedUrl = ttsUrlCacheRef.current.get(message.id);
      if (cachedUrl) {
        try {
          await playTtsUrl(message.id, cachedUrl);
        } catch (error) {
          console.error("TTS playback failed", error);
          setTtsPlayingId(null);
        }
        return;
      }

      setTtsLoadingId(message.id);
      try {
        let accessCaptchaPass = captchaPass;
        let accessCaptchaToken = captchaToken;

        if (!accessCaptchaPass && accessCaptchaToken) {
          const payload = await request(TURNSTILE_PASS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ captchaToken: accessCaptchaToken }),
          });
          const pass = unwrapApiResponse(payload);

          if (!pass?.captchaPass || !pass?.expiresAt) {
            throw new Error("Invalid Turnstile pass response.");
          }

          accessCaptchaPass = pass.captchaPass;
          accessCaptchaToken = "";
          setCaptchaToken("");
          setCaptchaPass(pass.captchaPass);
          setCaptchaPassExpiresAt(pass.expiresAt);
          writeStoredCaptchaPass(pass);
        }

        if (!accessCaptchaPass && !accessCaptchaToken) {
          setCaptchaResetKey((current) => current + 1);
          return;
        }

        const blob = await request(CHAT_TTS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            text: text.slice(0, 4000),
            captchaToken: accessCaptchaToken,
            captchaPass: accessCaptchaPass,
          }),
          parse: "blob",
        });
        const url = URL.createObjectURL(blob);
        ttsUrlCacheRef.current.set(message.id, url);
        await playTtsUrl(message.id, url);
      } catch (error) {
        if (error.status === 401 || (error.status === 400 && !captchaPass)) {
          setCaptchaToken("");
          setCaptchaPass("");
          setCaptchaPassExpiresAt("");
          clearStoredCaptchaPass();
          setCaptchaResetKey((current) => current + 1);
        }
        console.error("TTS generation failed", error);
        setTtsPlayingId(null);
      } finally {
        setTtsLoadingId(null);
      }
    },
    [captchaPass, captchaToken, playTtsUrl, request, stopTtsAudio, ttsLoadingId, ttsPlayingId, userId],
  );

  const verifyCaptchaToken = useCallback(
    async (token) => {
      if (!token) {
        setCaptchaToken("");
        setCaptchaPass("");
        setCaptchaPassExpiresAt("");
        clearStoredCaptchaPass();
        return;
      }

      setCaptchaToken(token);

      try {
        const payload = await request(TURNSTILE_PASS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ captchaToken: token }),
        });
        const pass = unwrapApiResponse(payload);

        if (!pass?.captchaPass || !pass?.expiresAt) {
          throw new Error("Invalid Turnstile pass response.");
        }

        setCaptchaToken("");
        setCaptchaPass(pass.captchaPass);
        setCaptchaPassExpiresAt(pass.expiresAt);
        writeStoredCaptchaPass(pass);
      } catch (error) {
        console.error("Turnstile pass exchange failed", error);
        setCaptchaToken("");
        setCaptchaPass("");
        setCaptchaPassExpiresAt("");
        clearStoredCaptchaPass();
        setCaptchaResetKey((current) => current + 1);
      }
    },
    [request],
  );

  useEffect(() => {
    const now = Date.now();
    const isStreaming = messages.some((m) => m.streaming);
    if (isStreaming) {
      if (now - scrollThrottleRef.current > 120) {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
        scrollThrottleRef.current = now;
      }
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      scrollThrottleRef.current = now;
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (promptText) => {
      const text = (typeof promptText === "string" ? promptText : input).trim();
      if (!text || isLoading) return;
      if (!captchaPass && !captchaToken) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: "assistant", content: "Please complete the Turnstile verification first.", streaming: false },
        ]);
        return;
      }
      const userMsg = { id: Date.now(), role: "user", content: text, streaming: false };
      const aId = Date.now() + 1;
      const assistantMsg = { id: aId, role: "assistant", content: "", streaming: true };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsLoading(true);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      abortRef.current = new AbortController();
      try {
        const res = await request(CHAT_STREAM_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, message: text, captchaToken, captchaPass }),
          signal: abortRef.current.signal,
          parse: "response",
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let contentAcc = "";
        const applyAssistantUpdate = (patch) => {
          setMessages((prev) => prev.map((m) => (m.id === aId ? { ...m, ...patch } : m)));
        };
        const readEventText = (eventText) =>
          eventText
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s*/, ""))
            .join("\n")
            .trim();
        const handleStreamPayload = (payloadText) => {
          if (!payloadText || payloadText === "[DONE]") return;

          try {
            const payload = JSON.parse(payloadText);

            if (payload.type === "chunk") {
              contentAcc += payload.text ?? payload.content ?? "";
              applyAssistantUpdate({ content: contentAcc });
              return;
            }

            if (payload.type === "media" && payload.media) {
              applyAssistantUpdate({ media: payload.media });
              return;
            }

            if (payload.type === "done") {
              if (payload.media) applyAssistantUpdate({ media: payload.media });
              return;
            }

            if (payload.type === "error") {
              contentAcc = payload.message || t("errorMsg");
              applyAssistantUpdate({ content: contentAcc, streaming: false });
              return;
            }

            const text =
              payload.content ??
              payload.text ??
              (payload.delta && (payload.delta.content ?? payload.delta)) ??
              payload.choices?.[0]?.delta?.content ??
              payload.choices?.[0]?.text ??
              "";

            if (text) {
              contentAcc += text;
              applyAssistantUpdate({ content: contentAcc });
            }
          } catch {
            contentAcc += payloadText;
            applyAssistantUpdate({ content: contentAcc });
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          events.map(readEventText).forEach(handleStreamPayload);
        }

        const finalPayload = readEventText(buffer);
        handleStreamPayload(finalPayload);
      } catch (err) {
        if (err.status === 400 || err.status === 401) {
          setCaptchaToken("");
          setCaptchaPass("");
          setCaptchaPassExpiresAt("");
          clearStoredCaptchaPass();
          setCaptchaResetKey((current) => current + 1);
        }
        if (err.name !== "AbortError") {
          let errorMsg = t("errorMsg");
          if (err.response) {
            try {
              const errBody = await err.response.clone().json();
              if (errBody && errBody.error) {
                errorMsg = errBody.error;
              }
            } catch (e) {
              console.error("Failed to parse error response JSON", e);
            }
          }
          setMessages((prev) =>
            prev.map((m) => (m.id === aId ? { ...m, content: errorMsg, streaming: false } : m)),
          );
        }
      } finally {
        setMessages((prev) =>
          prev
            .map((m) => (m.id === aId ? { ...m, streaming: false } : m))
            .filter((m) => !(m.role === "assistant" && !m.media && (!m.content || String(m.content).trim() === ""))),
        );
        if (!captchaPass) {
          setCaptchaToken("");
          setCaptchaResetKey((current) => current + 1);
        }
        setIsLoading(false);
      }
    },
    [captchaPass, captchaToken, input, isLoading, request, userId, t],
  );

  const summarizeMessage = useCallback(
    async (message) => {
      const sourceText = String(message?.content ?? "").trim();
      if (
        message?.role !== "assistant" ||
        message?.isSummary ||
        message?.streaming ||
        message?.summaryCreated ||
        sourceText.length < 2000 ||
        summaryLoadingIdsRef.current.has(message.id)
      ) {
        return;
      }

      if (!captchaPass && !captchaToken) {
        setCaptchaResetKey((current) => current + 1);
        return;
      }

      const sourceId = message.id;
      const summaryId = `summary-${sourceId}`;
      const controller = new AbortController();
      summaryLoadingIdsRef.current.add(sourceId);
      summaryAbortControllersRef.current.set(sourceId, controller);
      setSummaryLoadingIds((current) => new Set(current).add(sourceId));

      const summaryMessage = {
        id: summaryId,
        role: "assistant",
        content: "",
        streaming: true,
        isSummary: true,
        summaryFor: sourceId,
      };
      setMessages((previous) => {
        const next = [...previous];
        const existingSummaryIndex = next.findIndex((item) => item.id === summaryId);
        if (existingSummaryIndex >= 0) {
          next[existingSummaryIndex] = summaryMessage;
          return next;
        }

        const sourceIndex = next.findIndex((item) => item.id === sourceId);
        if (sourceIndex >= 0) next.splice(sourceIndex + 1, 0, summaryMessage);
        return next;
      });

      let contentAcc = "";
      let streamFailed = false;
      const updateSummary = (patch) => {
        setMessages((previous) =>
          previous.map((item) => (item.id === summaryId ? { ...item, ...patch } : item)),
        );
      };
      const readEventText = (eventText) =>
        eventText
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.replace(/^data:\s*/, ""))
          .join("\n")
          .trim();
      const handleStreamPayload = (payloadText) => {
        if (!payloadText || payloadText === "[DONE]") return;

        try {
          const payload = JSON.parse(payloadText);
          if (payload.type === "chunk") {
            contentAcc += payload.text ?? payload.content ?? "";
            updateSummary({ content: contentAcc });
            return;
          }

          if (payload.type === "error") {
            streamFailed = true;
            updateSummary({ content: t("summaryError"), streaming: false, summaryError: true });
          }
        } catch {
          contentAcc += payloadText;
          updateSummary({ content: contentAcc });
        }
      };

      try {
        const response = await request(CHAT_SUMMARIZE_STREAM_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, content: sourceText, captchaToken, captchaPass }),
          signal: controller.signal,
          parse: "response",
        });

        if (!response.body) throw new Error("The summary stream was empty.");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          events.map(readEventText).forEach(handleStreamPayload);
        }

        buffer += decoder.decode();
        const finalEvent = readEventText(buffer);
        handleStreamPayload(finalEvent);

        if (!streamFailed && contentAcc.trim()) {
          updateSummary({ streaming: false });
          setMessages((previous) =>
            previous.map((item) => (item.id === sourceId ? { ...item, summaryCreated: true } : item)),
          );
        } else if (!streamFailed) {
          streamFailed = true;
          updateSummary({ content: t("summaryError"), streaming: false, summaryError: true });
        }
      } catch (error) {
        if (error.status === 400 || error.status === 401) {
          setCaptchaToken("");
          setCaptchaPass("");
          setCaptchaPassExpiresAt("");
          clearStoredCaptchaPass();
          setCaptchaResetKey((current) => current + 1);
        }

        if (error.name !== "AbortError") {
          streamFailed = true;
          updateSummary({ content: t("summaryError"), streaming: false, summaryError: true });
        }
      } finally {
        summaryLoadingIdsRef.current.delete(sourceId);
        if (summaryAbortControllersRef.current.get(sourceId) === controller) {
          summaryAbortControllersRef.current.delete(sourceId);
        }
        setSummaryLoadingIds((current) => {
          const next = new Set(current);
          next.delete(sourceId);
          return next;
        });
        if (!captchaPass) {
          setCaptchaToken("");
          setCaptchaResetKey((current) => current + 1);
        }
      }
    },
    [captchaPass, captchaToken, request, t, userId],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const handleStop = () => abortRef.current?.abort();

  const handleInput = useCallback((e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  }, []);

  const clearChat = useCallback(() => {
    revokeTtsAudio();
    summaryAbortControllersRef.current.forEach((controller) => controller.abort());
    summaryAbortControllersRef.current.clear();
    summaryLoadingIdsRef.current.clear();
    setSummaryLoadingIds(new Set());
    setMessages([{ id: 0, role: "assistant", content: t("resetMsg"), streaming: false }]);
    setUserId(genUserId());
  }, [revokeTtsAudio, t]);

  const value = useMemo(
    () => ({
      userId,
      setUserId,
      messages,
      setMessages,
      isLoading,
      input,
      setInput,
      copiedId,
      copyMessage,
      ttsLoadingId,
      ttsPlayingId,
      toggleMessageAudio,
      summaryLoadingIds,
      summarizeMessage,
      captchaToken,
      setCaptchaToken,
      captchaPass,
      captchaPassExpiresAt,
      verifyCaptchaToken,
      captchaResetKey,
      bottomRef,
      textareaRef,
      abortRef,
      sendMessage,
      handleInput,
      handleKeyDown,
      handleStop,
      clearChat,
    }),
    [
      userId,
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
      captchaPassExpiresAt,
      captchaResetKey,
      verifyCaptchaToken,
      sendMessage,
      handleInput,
      handleKeyDown,
      clearChat,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
