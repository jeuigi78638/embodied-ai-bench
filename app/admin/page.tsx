"use client";

import { useCallback, useEffect, useState } from "react";

interface Stats {
  counts: { users: number; robots: number; posts: number; votes: number };
  trend7: { d: string; n: number }[];
  latestUsers: { email: string; nickname: string; created_at: string }[];
  latestPosts: {
    id: string;
    title: string;
    author: string;
    category: string;
    created_at: string;
  }[];
  roleDist: { role: string; n: number }[];
  catDist: { category: string; n: number }[];
  lbTop: { model: string; elo: number; matches: number }[];
}

function maskEmail(email: string): string {
  return email.replace(/^(..).*(@.*)$/, "$1***$2");
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDay(key: string): string {
  return key.slice(5); // MM-DD
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) {
        setAuthed(false);
        setData(null);
        return;
      }
      if (res.status === 503) {
        setAuthed(false);
        setError("管理后台未配置：请在 Vercel 环境变量中设置 ADMIN_PASSWORD 后重新部署。");
        return;
      }
      if (!res.ok) {
        setError("统计查询失败，请稍后重试。");
        return;
      }
      const j = (await res.json()) as Stats;
      setData(j);
      setAuthed(true);
      setError("");
    } catch {
      setError("网络错误，请重试。");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const login = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.status === 503) {
        setError("管理后台未配置：请在 Vercel 环境变量中设置 ADMIN_PASSWORD 后重新部署。");
        return;
      }
      if (!res.ok) {
        setError("密码错误，请重试。");
        return;
      }
      setPw("");
      await load();
    } catch {
      setError("网络错误，请重试。");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setData(null);
  };

  // ---------- 登录态未确定 ----------
  if (authed === null) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-[13px] text-slate-500">加载中…</div>
      </main>
    );
  }

  // ---------- 未登录 ----------
  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="panel w-full max-w-sm p-6">
          <h1 className="text-[16px] font-semibold text-slate-100">管理后台</h1>
          <p className="mt-1 text-[12px] text-slate-500">具身智衡 EAI-Bench · 管理员入口</p>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="管理员密码"
            className="mt-4 w-full rounded-lg border border-bg-border bg-soft px-3 py-2.5 text-[13px] text-slate-200 outline-none transition focus:border-accent"
          />
          {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
          <button
            onClick={login}
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-[13px] font-medium text-slate-900 transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "登录中…" : "登录"}
          </button>
          <a href="/" className="mt-4 block text-center text-[12px] text-slate-500 transition hover:text-accent-soft">
            ← 返回首页
          </a>
        </div>
      </main>
    );
  }

  // ---------- 已登录：看板 ----------
  const maxTrend = Math.max(1, ...data!.trend7.map((t) => t.n));
  const newUsers7 = data!.trend7.reduce((s, t) => s + t.n, 0);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-bold text-slate-100">管理后台</h1>
            <p className="mt-1 text-[12px] text-slate-500">
              具身智衡 EAI-Bench · 运营数据看板
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-[12px] text-slate-500 transition hover:text-accent-soft">
              返回首页
            </a>
            <button
              onClick={logout}
              className="rounded-lg border border-bg-border px-3 py-1.5 text-[12px] text-slate-400 transition hover:border-red-400/50 hover:text-red-400"
            >
              登出
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "注册用户", value: data!.counts.users, hint: "累计" },
            { label: "盲测投票", value: data!.counts.votes, hint: "累计" },
            { label: "云端机器人", value: data!.counts.robots, hint: "累计" },
            { label: "社区帖子", value: data!.counts.posts, hint: "累计" },
            { label: "近 7 日新增", value: newUsers7, hint: "用户" },
          ].map((c) => (
            <div key={c.label} className="panel p-4">
              <div className="text-[11px] text-slate-500">{c.label}</div>
              <div className="mt-1 text-[26px] font-bold leading-none text-slate-100">
                {c.value}
              </div>
              <div className="mt-1 text-[11px] text-slate-600">{c.hint}</div>
            </div>
          ))}
        </div>

        {/* 7 天趋势 + 分布 */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="panel p-5 lg:col-span-2">
            <h2 className="text-[14px] font-semibold text-slate-100">近 7 天注册趋势</h2>
            <div className="mt-4 flex h-[150px] items-end gap-2">
              {data!.trend7.map((t) => (
                <div key={t.d} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div className="text-[11px] text-slate-400">{t.n}</div>
                  <div
                    className="w-full max-w-[36px] rounded-t-md bg-accent/80 transition"
                    style={{ height: `${Math.max(4, (t.n / maxTrend) * 100)}px` }}
                  />
                  <div className="text-[10px] text-slate-600">{fmtDay(t.d)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="panel p-5">
              <h2 className="text-[14px] font-semibold text-slate-100">机器人角色分布</h2>
              {data!.roleDist.length === 0 ? (
                <p className="mt-3 text-[12px] text-slate-600">暂无云端机器人</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {data!.roleDist.map((r) => (
                    <div key={r.role} className="flex items-center justify-between text-[12px]">
                      <span className="text-slate-400">{r.role}</span>
                      <span className="font-medium text-slate-200">{r.n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="panel p-5">
              <h2 className="text-[14px] font-semibold text-slate-100">帖子分类分布</h2>
              {data!.catDist.length === 0 ? (
                <p className="mt-3 text-[12px] text-slate-600">暂无云端帖子</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {data!.catDist.map((c) => (
                    <div key={c.category} className="flex items-center justify-between text-[12px]">
                      <span className="text-slate-400">{c.category}</span>
                      <span className="font-medium text-slate-200">{c.n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="panel p-5">
              <h2 className="text-[14px] font-semibold text-slate-100">盲测 Elo 榜 Top5</h2>
              {data!.lbTop.length === 0 ? (
                <p className="mt-3 text-[12px] text-slate-600">暂无对战数据</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {data!.lbTop.map((m, i) => (
                    <div key={m.model} className="flex items-center justify-between text-[12px]">
                      <span className="text-slate-400">
                        {i + 1}. {m.model}
                      </span>
                      <span className="text-slate-200">
                        Elo {m.elo} · {m.matches} 场
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 最新记录 */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="panel p-5">
            <h2 className="text-[14px] font-semibold text-slate-100">最新注册用户</h2>
            {data!.latestUsers.length === 0 ? (
              <p className="mt-3 text-[12px] text-slate-600">暂无用户</p>
            ) : (
              <table className="mt-3 w-full text-left text-[12px]">
                <thead>
                  <tr className="text-slate-600">
                    <th className="pb-2 font-medium">邮箱</th>
                    <th className="pb-2 font-medium">昵称</th>
                    <th className="pb-2 font-medium">注册时间</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {data!.latestUsers.map((u) => (
                    <tr key={u.email} className="border-t border-bg-border/60">
                      <td className="py-2">{maskEmail(u.email)}</td>
                      <td className="py-2">{u.nickname}</td>
                      <td className="py-2 text-slate-500">{fmtTime(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel p-5">
            <h2 className="text-[14px] font-semibold text-slate-100">最新帖子</h2>
            {data!.latestPosts.length === 0 ? (
              <p className="mt-3 text-[12px] text-slate-600">暂无帖子</p>
            ) : (
              <table className="mt-3 w-full text-left text-[12px]">
                <thead>
                  <tr className="text-slate-600">
                    <th className="pb-2 font-medium">标题</th>
                    <th className="pb-2 font-medium">作者</th>
                    <th className="pb-2 font-medium">分类</th>
                    <th className="pb-2 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {data!.latestPosts.map((p) => (
                    <tr key={p.id} className="border-t border-bg-border/60">
                      <td className="max-w-[160px] truncate py-2">{p.title}</td>
                      <td className="py-2">{p.author}</td>
                      <td className="py-2">{p.category}</td>
                      <td className="py-2 text-slate-500">{fmtTime(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <p className="mt-6 text-[11px] text-slate-600">
          管理后台地址 /admin · 仅限站长本人使用 · 统计来自云端数据库（Neon Postgres）
        </p>
      </div>
    </main>
  );
}
