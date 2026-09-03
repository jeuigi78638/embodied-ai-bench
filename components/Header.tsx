"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import AuthModal from "./AuthModal";

const NAV = [
  { href: "#workbench", label: "对比工作台" },
  { href: "#benchmark", label: "自助测评" },
  { href: "#radar", label: "选型雷达" },
  { href: "#decision", label: "选型决策" },
  { href: "#cost", label: "成本速查" },
  { href: "#keys", label: "API Key" },
  { href: "#community", label: "机器人社区" },
  { href: "#workshop", label: "机器人构建" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { user, loading, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all ${
          scrolled
            ? "border-b border-bg-border bg-bg/85 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent ring-1 ring-accent/30">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-[15px] font-bold tracking-wide text-slate-100">
              具身智衡
              <span className="ml-2 hidden text-[11px] font-normal text-slate-500 sm:inline">EAI-Bench</span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-1.5 text-[13px] text-slate-400 transition hover:bg-slate-800/60 hover:text-accent-soft"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-neon-green/30 bg-neon-green/10 px-2.5 py-1 text-[11px] text-neon-green sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
              7 模型在线
            </span>

            {loading ? (
              <span className="text-[11px] text-slate-600">…</span>
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] font-medium text-accent-soft transition hover:bg-accent/20"
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/25 text-[11px]">
                    {user.nickname?.[0]?.toUpperCase() ?? "U"}
                  </span>
                  <span className="max-w-24 truncate">{user.nickname}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 overflow-hidden rounded-xl border border-bg-border bg-slate-900 py-1 shadow-xl">
                    <div className="border-b border-bg-border px-3 py-2 text-[11px] text-slate-500">
                      {user.email}
                    </div>
                    <a
                      href="#keys"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-[12px] text-slate-300 hover:bg-slate-800"
                    >
                      🔑 API Key 设置
                    </a>
                    <a
                      href="#workshop"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-[12px] text-slate-300 hover:bg-slate-800"
                    >
                      🤖 我的机器人
                    </a>
                    <button
                      onClick={async () => {
                        setMenuOpen(false);
                        await logout();
                      }}
                      className="w-full px-3 py-2 text-left text-[12px] text-neon-red hover:bg-slate-800"
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-1.5 text-[12px] font-semibold text-accent-soft transition hover:bg-accent/20"
              >
                登录 / 注册
              </button>
            )}

            <a
              href="#workbench"
              className="rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-black transition hover:bg-accent-soft"
            >
              开始评测
            </a>
          </div>
        </div>
      </header>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
