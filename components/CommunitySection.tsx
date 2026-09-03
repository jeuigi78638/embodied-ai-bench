"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  loadPosts,
  savePosts,
  loadCloudPosts,
  saveCloudPost,
  genId,
  demoSummarize,
  type Post,
  type Comment,
  type TopicCategory,
} from "@/lib/community";
import { MODEL_MAP } from "@/lib/models";
import { buildDemoAnswer } from "@/lib/demo";
import { getUserKeys } from "@/lib/userkeys";
import { useAuth } from "./AuthContext";
import Markdown from "./Markdown";

const CAT_STYLE: Record<TopicCategory, string> = {
  行业动态: "text-cyan-300 bg-cyan-400/10 border-cyan-400/30",
  技术问答: "text-violet-300 bg-violet-400/10 border-violet-400/30",
  产品讨论: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30",
  学习求职: "text-amber-300 bg-amber-400/10 border-amber-400/30",
  自由闲聊: "text-rose-300 bg-rose-400/10 border-rose-400/30",
};

function fmtTime(ts: number): string {
  const d = Date.now() - ts;
  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  if (d < MIN) return "刚刚";
  if (d < HOUR) return `${Math.floor(d / MIN)} 分钟前`;
  if (d < DAY) return `${Math.floor(d / HOUR)} 小时前`;
  if (d < 7 * DAY) return `${Math.floor(d / DAY)} 天前`;
  return new Date(ts).toLocaleDateString();
}

interface ComposerProps {
  onClose: () => void;
  onPublish: (title: string, cat: TopicCategory, content: string) => void;
}

function Composer({ onClose, onPublish }: ComposerProps) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<TopicCategory>("技术问答");
  const [content, setContent] = useState("");
  const canPub = title.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="panel mb-4 border-accent/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[14px] font-semibold text-slate-100">发布新话题</span>
        <button
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-[12px] text-slate-500 transition hover:bg-slate-800/60 hover:text-slate-200"
        >
          ✕ 关闭
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="话题标题（一句话说清楚）"
        className="w-full rounded-xl border border-bg-border bg-bg-soft/40 px-3 py-2.5 text-[13.5px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-accent/50"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full border px-3 py-1 text-[12px] transition ${
              cat === c
                ? "border-accent/50 bg-accent/10 text-accent-soft"
                : "border-bg-border text-slate-500 hover:border-slate-600"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="详细描述你的问题 / 观点 / 经验…（支持 Markdown）"
        rows={4}
        className="mt-3 w-full resize-y rounded-xl border border-bg-border bg-bg-soft/40 px-3 py-2.5 text-[13.5px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-accent/50"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-slate-600">
          AI 将自动为话题生成摘要标签
        </span>
        <button
          onClick={() => canPub && onPublish(title.trim(), cat, content.trim())}
          disabled={!canPub}
          className={`rounded-lg px-5 py-2 text-[13px] font-semibold transition ${
            canPub
              ? "bg-accent text-black shadow-glow-sm hover:bg-accent-soft"
              : "cursor-not-allowed bg-slate-800 text-slate-500"
          }`}
        >
          发布
        </button>
      </div>
    </div>
  );
}

interface AiPanelProps {
  onClose: () => void;
}

function AiPanel({ onClose }: AiPanelProps) {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [real, setReal] = useState(false);

  const ask = async () => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    setAns("");
    setReal(false);
    let got = "";
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          models: ["deepseek"],
          userKeys: getUserKeys(),
        }),
      });
      const raw = await res.text();
      for (const line of raw.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          const j = JSON.parse(line.slice(6));
          if (j.model !== "deepseek") continue;
          if (j.error) throw new Error(j.error);
          if (typeof j.text === "string") got += j.text;
        } catch (e) {
          throw e;
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
    if (got) {
      setAns(got);
      setReal(true);
    } else {
      setAns(
        buildDemoAnswer(MODEL_MAP.deepseek, text) +
          "\n\n> ⚠️ 当前为本地演示回答（未连接真实模型 Key）。配置 Key 后即可获得真实回答。"
      );
    }
    setBusy(false);
  };

  return (
    <div className="panel mb-4 border-violet-400/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-slate-100">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-violet-400/15 text-violet-300">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-2 4v3h-6v-3a5 5 0 0 1-2-4V7a5 5 0 0 1 5-5Z" strokeLinejoin="round" />
              <path d="M8 21h8M10 9h.01M14 9h.01" strokeLinecap="round" />
            </svg>
          </span>
          AI 机器人助手
          <span className="rounded bg-violet-400/10 px-1.5 py-0.5 text-[10px] text-violet-300">
            深色科技 · DeepSeek
          </span>
        </span>
        <button
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-[12px] text-slate-500 transition hover:bg-slate-800/60 hover:text-slate-200"
        >
          ✕ 收起
        </button>
      </div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="问问机器人圈的事，比如：ROS2 和 ROS1 选哪个？"
          className="flex-1 rounded-xl border border-bg-border bg-bg-soft/40 px-3 py-2.5 text-[13.5px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
        />
        <button
          onClick={ask}
          disabled={busy}
          className={`shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold transition ${
            busy
              ? "cursor-not-allowed bg-slate-800 text-slate-500"
              : "bg-violet-400/90 text-black hover:bg-violet-300"
          }`}
        >
          {busy ? "思考中…" : "提问"}
        </button>
      </div>
      {err && (
        <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-300">
          真实模型未连通（{err}），已切换为本地演示回答。
        </div>
      )}
      {ans && (
        <div className="mt-3 max-h-96 overflow-y-auto rounded-xl border border-bg-border bg-bg-soft/30 p-3">
          {real ? (
            <Markdown text={ans} />
          ) : (
            <>
              <div className="mb-1 text-[10px] text-amber-400/80">【演示回答】</div>
              <Markdown text={ans} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommunitySection() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCat, setActiveCat] = useState<TopicCategory | "全部">("全部");
  const [showComposer, setShowComposer] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    if (user) {
      // 登录：云端帖子 + 本地种子合并
      Promise.all([loadCloudPosts(), Promise.resolve(loadPosts())]).then(
        ([cloud, local]) => {
          if (cancelled) return;
          if (cloud && cloud.length > 0) {
            const seeds = local.filter((p) => p.isSeed);
            const cloudIds = new Set(cloud.map((p) => p.id));
            setPosts([...cloud, ...seeds.filter((p) => !cloudIds.has(p.id))]);
          } else {
            setPosts(local);
          }
        }
      );
    } else {
      setPosts(loadPosts());
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  const persist = (next: Post[]) => {
    setPosts(next);
    if (user) {
      // 登录：非种子帖子全部上云（新建/点赞/评论都全量同步）
      next
        .filter((p) => !p.isSeed)
        .forEach((p) => {
          void saveCloudPost(p);
        });
    } else {
      savePosts(next);
    }
  };

  const toggleLike = (id: string) => {
    persist(
      posts.map((p) =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p
      )
    );
  };

  const publish = (title: string, cat: TopicCategory, content: string) => {
    const p: Post = {
      id: genId(),
      title,
      content,
      category: cat,
      author: user?.nickname || "我",
      createdAt: Date.now(),
      likes: 0,
      liked: false,
      aiSummary: demoSummarize(title, content),
      comments: [],
    };
    persist([p, ...posts]);
    setShowComposer(false);
    setExpanded((prev) => new Set(prev).add(p.id));
  };

  const addComment = (postId: string, text: string) => {
    const c: Comment = {
      id: genId(),
      author: user?.nickname || "我",
      content: text,
      createdAt: Date.now(),
    };
    persist(posts.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, c] } : p)));
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(
    () => (activeCat === "全部" ? posts : posts.filter((p) => p.category === activeCat)),
    [posts, activeCat]
  );

  const hot = useMemo(
    () => [...posts].sort((a, b) => b.likes + b.comments.length * 2 - (a.likes + a.comments.length * 2)).slice(0, 5),
    [posts]
  );

  return (
    <section id="community" className="scroll-mt-20 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">
            ⑥ 机器人讨论区
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            具身智能 × 机器人大众社区：行业动态、技术问答、产品讨论、学习求职，随时开聊。
            {user ? (
              <span className="text-emerald-400/90">
                {" "}
                已登录 · 帖子云端同步，换设备不丢失
              </span>
            ) : (
              <span className="text-amber-400/90">
                {" "}
                未登录 · 数据存于本浏览器（登录后云端同步）
              </span>
            )}
          </p>
        </div>

        {/* 工具条 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(["全部", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
                  activeCat === c
                    ? "border-accent/50 bg-accent/10 text-accent-soft"
                    : "border-bg-border text-slate-500 hover:border-slate-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowAi((v) => !v)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                showAi
                  ? "bg-violet-400/20 text-violet-200 ring-1 ring-violet-400/40"
                  : "border border-bg-border text-slate-400 hover:border-violet-400/40 hover:text-violet-300"
              }`}
            >
              ✦ AI 机器人助手
            </button>
            <button
              onClick={() => setShowComposer((v) => !v)}
              className={`rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition ${
                showComposer
                  ? "bg-slate-800 text-slate-400"
                  : "bg-accent text-black shadow-glow-sm hover:bg-accent-soft"
              }`}
            >
              + 发帖
            </button>
          </div>
        </div>

        {showAi && <AiPanel onClose={() => setShowAi(false)} />}
        {showComposer && (
          <Composer
            onClose={() => setShowComposer(false)}
            onPublish={publish}
          />
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {/* 帖子列表 */}
          <div className="space-y-3 lg:col-span-2">
            {filtered.length === 0 && (
              <div className="panel p-8 text-center text-[13px] text-slate-500">
                该分类下还没有话题，点击「+ 发帖」开个头吧。
              </div>
            )}
            {filtered.map((p) => {
              const open = expanded.has(p.id);
              return (
                <div key={p.id} className="panel overflow-hidden">
                  <button
                    onClick={() => toggleExpand(p.id)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-800/20"
                  >
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${CAT_STYLE[p.category]}`}
                        >
                          {p.category}
                        </span>
                        {p.isSeed && (
                          <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-500">
                            示例
                          </span>
                        )}
                      </div>
                      <div className="text-[14px] font-semibold text-slate-100">{p.title}</div>
                      {p.aiSummary && (
                        <div className="mt-1 text-[12px] text-slate-500">
                          <span className="text-violet-400/80">AI 摘要</span> · {p.aiSummary}
                        </div>
                      )}
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className={`mt-1 h-4 w-4 shrink-0 text-slate-600 transition ${open ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-4 border-t border-bg-border/60 px-4 py-2 text-[12px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="h-4 w-4 rounded-full bg-gradient-to-br from-accent to-neon-purple" />
                      {p.author}
                    </span>
                    <span>{fmtTime(p.createdAt)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(p.id);
                      }}
                      className={`ml-auto flex items-center gap-1 transition ${
                        p.liked ? "text-accent-soft" : "hover:text-accent-soft"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={p.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
                        <path d="M7 10v11M7 10 4 10c-1 0-1-1-1-1s0-3 2-5c1.5-1.5 4-2 4-2 .5 0 1 .5 1 1.5 0 2 .5 3.5 2 3.5H19c1 0 2 1 2 2l-1 7c-.2 1.2-1.2 2-2.5 2H9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {p.likes}
                    </button>
                    <span className="flex items-center gap-1">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {p.comments.length}
                    </span>
                  </div>

                  {open && (
                    <div className="border-t border-bg-border bg-bg-soft/20">
                      <div className="px-4 py-3">
                        <div className="prose-dark">
                          <Markdown text={p.content} />
                        </div>
                      </div>

                      {/* 评论 */}
                      <div className="space-y-2 border-t border-bg-border/60 px-4 py-3">
                        {p.comments.length === 0 && (
                          <div className="text-[12px] text-slate-600">还没有评论，来说两句。</div>
                        )}
                        {p.comments.map((c) => (
                          <div key={c.id} className="rounded-xl border border-bg-border/70 bg-bg/40 px-3 py-2">
                            <div className="mb-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[9px] text-slate-300">
                                {c.author.slice(0, 1)}
                              </span>
                              <span className="text-slate-400">{c.author}</span>
                              <span>{fmtTime(c.createdAt)}</span>
                            </div>
                            <div className="whitespace-pre-wrap text-[13px] text-slate-300">{c.content}</div>
                          </div>
                        ))}
                        <CommentBox onAdd={(t) => addComment(p.id, t)} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 右侧热度榜 */}
          <div className="hidden lg:block">
            <div className="panel p-4">
              <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-slate-200">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-400" fill="currentColor">
                  <path d="M12 2 14.5 9H22l-6 5 2.5 8L12 17l-6.5 5L8 14l-6-5h7.5Z" />
                </svg>
                热门话题
              </h3>
              <div className="space-y-2">
                {hot.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveCat(p.category === activeCat ? "全部" : "全部");
                      toggleExpand(p.id);
                      document.getElementById("community")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="group flex w-full items-start gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition hover:border-bg-border hover:bg-slate-800/30"
                  >
                    <span
                      className={`mt-0.5 shrink-0 text-[15px] font-bold ${
                        i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-600"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-slate-200 group-hover:text-accent-soft">
                        {p.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-600">
                        {p.category} · {p.likes} 赞 · {p.comments.length} 评论
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommentBox({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText("");
  };
  return (
    <div className="flex gap-2 pt-1">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="写下你的看法…"
        className="flex-1 rounded-lg border border-bg-border bg-bg/50 px-3 py-1.5 text-[12.5px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-accent/50"
      />
      <button
        onClick={submit}
        disabled={!text.trim()}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
          text.trim()
            ? "bg-accent/90 text-black hover:bg-accent-soft"
            : "cursor-not-allowed bg-slate-800 text-slate-600"
        }`}
      >
        评论
      </button>
    </div>
  );
}
