"use client";

// ============================================================
// components/FeatureVoteSection.tsx — ⑧ 功能需求投票
// 分区列出机器人功能选项，用户最多选 FEATURE_VOTE_MAX 个提交；
// 实时统计得票，提交后展示得票榜。纯投票，无 AI 生成。
// ============================================================

import { useCallback, useEffect, useState } from "react";
import type { FeatureVoteGroup } from "@/lib/featureVotes";

interface Loaded {
  max: number;
  groups: FeatureVoteGroup[];
  votes: Record<string, number>;
  voted: boolean;
}

export default function FeatureVoteSection() {
  const [data, setData] = useState<Loaded | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/feature-vote");
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "加载失败");
      setData({ max: j.max, groups: j.groups, votes: j.votes, voted: j.voted });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    if (!data || data.voted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= data.max) {
        setErr(`最多选择 ${data.max} 个你最想要的功能`);
        return prev;
      }
      next.add(id);
      setErr(null);
      return next;
    });
  };

  const submit = async () => {
    if (!data || selected.size === 0 || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/feature-vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ featureIds: [...selected] }),
      });
      const j = await res.json();
      if (!j?.ok) {
        setErr(j?.error || "提交失败");
        setBusy(false);
        return;
      }
      // 合并最新票数并进入已投票态
      setData((prev) =>
        prev ? { ...prev, votes: { ...prev.votes, ...j.votes }, voted: true } : prev
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  // 得票榜（前 12）
  const ranking = useCallback(() => {
    if (!data) return [];
    return data.groups
      .flatMap((g) => g.items.map((it) => ({ ...it, votes: data.votes[it.id] ?? 0 })))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 12);
  }, [data]);

  const totalVotes = useCallback(() => {
    if (!data) return 0;
    return data.groups
      .flatMap((g) => g.items)
      .reduce((s, it) => s + (data.votes[it.id] ?? 0), 0);
  }, [data]);

  const maxVote = useCallback(() => {
    if (!data) return 0;
    return Math.max(1, ...data.groups.flatMap((g) => g.items.map((it) => data.votes[it.id] ?? 0)));
  }, [data]);

  if (err && !data) {
    return (
      <section id="feature-vote" className="scroll-mt-20 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="panel p-6 text-center text-[13px] text-slate-500">
            投票版块加载失败（{err}），请刷新重试。
          </div>
        </div>
      </section>
    );
  }
  if (!data) return null;

  const rank = ranking();
  const sum = totalVotes();
  const mx = maxVote();

  return (
    <section id="feature-vote" className="scroll-mt-20 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">
            ⑧ 功能需求投票
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            你希望未来的具身智能机器人具备哪些功能？按区域挑出你最想要的
            {data.max} 个，你的选择将直接决定我们优先研发的方向。
            {data.voted ? (
              <span className="text-emerald-400/90"> 已参与 · 感谢投票</span>
            ) : (
              <span className="text-amber-400/90"> 匿名可投 · 每个账号/IP 限投一次</span>
            )}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* 左：分区选项 */}
          <div className="space-y-4">
            {data.groups.map((g) => (
              <div key={g.id} className="panel p-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <div className="text-[14px] font-semibold text-slate-100">
                    {g.title}
                  </div>
                  <div className="text-[11px] text-slate-600">{g.hint}</div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.items.map((it) => {
                    const on = selected.has(it.id);
                    return (
                      <button
                        key={it.id}
                        onClick={() => toggle(it.id)}
                        disabled={data.voted}
                        className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                          on
                            ? "border-accent/60 bg-accent/10 ring-1 ring-accent/30"
                            : data.voted
                              ? "border-bg-border bg-bg-soft/20 opacity-70"
                              : "border-bg-border bg-bg-soft/30 hover:border-accent/40"
                        }`}
                      >
                        <span className="text-[16px]">{it.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-100">
                            {it.name}
                            {on && (
                              <span className="rounded bg-accent/20 px-1 text-[9px] text-accent-soft">已选</span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                            {it.desc}
                          </span>
                        </span>
                        <span className="shrink-0 rounded bg-slate-800/70 px-1.5 py-0.5 text-[10px] text-slate-500">
                          {data.votes[it.id] ?? 0} 票
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="panel flex flex-wrap items-center gap-3 p-4">
              <span className="text-[13px] text-slate-300">
                已选{" "}
                <b className={selected.size > 0 ? "text-accent-soft" : "text-slate-500"}>
                  {selected.size}
                </b>
                /{data.max}
              </span>
              {err && <span className="text-[12px] text-amber-300">{err}</span>}
              {!data.voted ? (
                <button
                  onClick={submit}
                  disabled={busy || selected.size === 0}
                  className={`ml-auto rounded-lg px-5 py-2 text-[13px] font-semibold transition ${
                    busy || selected.size === 0
                      ? "cursor-not-allowed bg-slate-800 text-slate-500"
                      : "bg-accent text-black shadow-glow-sm hover:bg-accent-soft"
                  }`}
                >
                  {busy ? "提交中…" : "🚀 提交我的选择"}
                </button>
              ) : (
                <span className="ml-auto rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-[12px] text-emerald-300">
                  ✓ 已投票，实时结果见右侧榜单
                </span>
              )}
            </div>
          </div>

          {/* 右：实时得票榜 */}
          <div className="panel p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <div className="text-[14px] font-semibold text-slate-100">实时得票榜</div>
              <div className="text-[11px] text-slate-600">累计 {sum} 票</div>
            </div>
            {rank.length === 0 ? (
              <div className="py-10 text-center text-[12px] text-slate-600">
                还没有投票，成为第一个表达需求的人吧。
              </div>
            ) : (
              <div className="space-y-2">
                {rank.map((it, i) => {
                  const w = Math.round(((it.votes ?? 0) / mx) * 100);
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                  return (
                    <div key={it.id} className="flex items-center gap-2">
                      <span className="w-6 shrink-0 text-center text-[12px]">{medal}</span>
                      <span className="w-36 shrink-0 truncate text-[12px] text-slate-300">
                        {it.icon} {it.name}
                      </span>
                      <div className="h-4 flex-1 overflow-hidden rounded bg-slate-800/60">
                        <div
                          className={`h-full rounded transition-all duration-500 ${
                            i === 0 ? "bg-accent" : "bg-accent/40"
                          }`}
                          style={{ width: `${w}%` }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right text-[11px] text-slate-400">
                        {it.votes ?? 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
