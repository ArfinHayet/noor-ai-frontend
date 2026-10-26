"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { AUTH_LOGIN_URL } from "@/lib/constants";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { useTheme } from "@/context/ThemeContext";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function LoginForm() {
  const router = useRouter();
  const { theme, dark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/admin");
    });
  }, [router]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    if (!captchaToken) {
      setError("Please complete the Turnstile verification.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(AUTH_LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          captchaToken,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to sign in.");
      }

      const authData = payload?.data ?? payload;
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: authData.accessToken,
        refresh_token: authData.refreshToken,
      });

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      router.replace("/admin");
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
      setCaptchaToken("");
      setCaptchaResetKey((current) => current + 1);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    minHeight: 42,
    borderRadius: 8,
    border: `1px solid ${theme.borderMed}`,
    background: theme.inputBg,
    color: theme.text,
    padding: "0 12px",
    fontSize: 14,
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: dark ? "#0f172a" : "#f6f8f7",
        color: theme.text,
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: 420,
          display: "grid",
          gap: 14,
          background: theme.bgSec,
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          padding: 22,
          boxShadow: theme.shadow,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 6 }}>Admin Login</h1>
          <p style={{ fontSize: 13, color: theme.textSec }}>Sign in with an approved Noor AI admin account.</p>
        </div>

        {!isSupabaseConfigured && (
          <div style={{ color: "#e11d48", fontSize: 13, lineHeight: 1.5 }}>
            Supabase auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={inputStyle}
          required
        />

        <TurnstileWidget
          siteKey={turnstileSiteKey}
          resetKey={captchaResetKey}
          onVerify={setCaptchaToken}
        />

        {error && <div style={{ color: "#e11d48", fontSize: 13 }}>{error}</div>}

        <button
          type="submit"
          disabled={loading || !isSupabaseConfigured || !captchaToken}
          style={{
            minHeight: 42,
            border: "none",
            borderRadius: 8,
            background: theme.accent,
            color: "white",
            padding: "0 14px",
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
            opacity: loading || !isSupabaseConfigured || !captchaToken ? 0.65 : 1,
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
