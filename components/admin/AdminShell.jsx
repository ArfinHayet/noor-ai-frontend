"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useTheme } from "@/context/ThemeContext";

const AdminSessionContext = createContext({ session: null });

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: "pi-chart-bar" },
  { href: "/admin/chat-history", label: "Chat History", icon: "pi-comments" },
];

export function useAdminSession() {
  return useContext(AdminSessionContext);
}

export function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, dark } = useTheme();
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authLoading || isLoginRoute) return;
    if (!session) router.replace("/admin/login");
  }, [authLoading, isLoginRoute, router, session]);

  const styles = useMemo(
    () => ({
      root: {
        height: "100dvh",
        minHeight: "100dvh",
        background: dark ? "#0f172a" : "#f6f8f7",
        color: theme.text,
        minWidth: 0,
        overflow: "hidden",
      },
      sidebar: {
        width: 248,
        background: theme.bgSec,
        borderRight: `1px solid ${theme.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      },
      mobileOverlay: {
        position: "fixed",
        inset: 0,
        zIndex: 40,
        background: "rgba(15,23,42,.42)",
      },
      main: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      },
      topbar: {
        height: 58,
        borderBottom: `1px solid ${theme.border}`,
        background: theme.headerBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        flexShrink: 0,
      },
      content: {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: "auto",
        padding: "20px",
      },
      iconButton: {
        width: 38,
        height: 38,
        borderRadius: 8,
        border: `1px solid ${theme.borderMed}`,
        background: theme.bgTer,
        color: theme.text,
        cursor: "pointer",
      },
      signOut: {
        minHeight: 36,
        borderRadius: 8,
        border: `1px solid ${theme.borderMed}`,
        background: theme.bgTer,
        color: theme.textSec,
        padding: "0 12px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      },
    }),
    [dark, theme],
  );

  const signOut = async () => {
    await supabase?.auth.signOut();
    router.replace("/admin/login");
  };

  if (isLoginRoute) {
    return <AdminSessionContext.Provider value={{ session }}>{children}</AdminSessionContext.Provider>;
  }

  if (!isSupabaseConfigured) {
    return (
      <main style={{ ...styles.root, display: "grid", placeItems: "center", padding: 20 }}>
        <section style={{ maxWidth: 560, background: theme.bgSec, border: `1px solid ${theme.border}`, borderRadius: 8, padding: 20 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Admin auth is not configured</h1>
          <p style={{ color: theme.textSec, lineHeight: 1.6 }}>
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the frontend environment.
          </p>
        </section>
      </main>
    );
  }

  if (authLoading || !session) {
    return <main style={{ ...styles.root, display: "grid", placeItems: "center" }}>Loading admin panel...</main>;
  }

  return (
    <AdminSessionContext.Provider value={{ session }}>
      <main style={{ ...styles.root, display: "flex" }}>
        <style>{`
          @media (max-width: 860px) {
            .admin-sidebar-desktop { display: none !important; }
            .admin-menu-button { display: inline-flex !important; }
            .admin-content { padding: 14px !important; }
          }
          @media (min-width: 861px) {
            .admin-sidebar-mobile { display: none !important; }
            .admin-menu-button { display: none !important; }
          }
        `}</style>
        <aside className="admin-sidebar-desktop" style={styles.sidebar}>
          <AdminSidebar pathname={pathname} theme={theme} />
        </aside>

        {sidebarOpen && (
          <>
            <div style={styles.mobileOverlay} onClick={() => setSidebarOpen(false)} />
            <aside
              className="admin-sidebar-mobile"
              style={{ ...styles.sidebar, position: "fixed", inset: "0 auto 0 0", zIndex: 50 }}
            >
              <AdminSidebar pathname={pathname} theme={theme} onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </>
        )}

        <section style={styles.main}>
          <header style={styles.topbar}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <button
                type="button"
                className="admin-menu-button"
                onClick={() => setSidebarOpen(true)}
                style={{ ...styles.iconButton, display: "none", alignItems: "center", justifyContent: "center" }}
                aria-label="Open admin navigation"
              >
                <i className="pi pi-bars" />
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Noor AI Admin</div>
                <div style={{ fontSize: 12, color: theme.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session.user.email}
                </div>
              </div>
            </div>
            <button type="button" onClick={signOut} style={styles.signOut}>Sign out</button>
          </header>

          <div className="admin-content" style={styles.content}>
            {children}
          </div>
        </section>
      </main>
    </AdminSessionContext.Provider>
  );
}

function AdminSidebar({ pathname, theme, onNavigate }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 18, borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Noor AI</div>
        <div style={{ fontSize: 12, color: theme.textSec, marginTop: 2 }}>Admin Panel</div>
      </div>
      <nav style={{ padding: 12, display: "grid", gap: 6 }}>
        {ADMIN_NAV.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              style={{
                minHeight: 42,
                borderRadius: 8,
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: active ? theme.accent : theme.textSec,
                background: active ? theme.accentBg : "transparent",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: active ? 700 : 600,
              }}
            >
              <i className={`pi ${item.icon}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
