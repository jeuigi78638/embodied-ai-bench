"use client";

import { useState } from "react";
import { MODELS, MODEL_MAP } from "@/lib/models";
import { buildDemoAnswer } from "@/lib/demo";
import { getUserKeys } from "@/lib/userkeys";
import {
  type Robot,
  ROBOT_ROLES,
  ROBOT_SKILLS,
  ROBOT_STYLES,
  buildSystemPrompt,
  genId,
  loadRobots,
  saveRobot,
  deleteRobot,
} from "@/lib/robots";
import Markdown from "./Markdown";

const AVATARS = ["🤖", "🦾", "🛠", "🧠", "🔬", "🛰", "🤝", "⚙️"];

type View = "list" | "builder" | "chat";
interface Msg {
  role: "user" | "bot";
  text: string;
}

export default function RobotWorkshop() {
  const [view, setView] = useState<View>("list");
  const [robots, setRobots] = useState<Robot[]>(() => loadRobots());

  // builder
  const [editing, setEditing] = useState<Robot | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🤖");
  const [role, setRole] = useState("arm");
  const [skills, setSkills] = useState<Set<string>>(new Set(["任务规划"]));
  const [style, setStyle] = useState("rigor");
  const [model, setModel] = useState("deepseek");
  const [sysPrompt, setSysPrompt] = useState("");
  const [builderErr, setBuilderErr] = useState<string | null>(null);

  // chat
  const [chatRobot, setChatRobot] = useState<Robot | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatErr, setChatErr] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setAvatar("🤖");
    setRole("arm");
    setSkills(new Set(["任务规划"]));
    setStyle("rigor");
    setModel("deepseek");
    setSysPrompt(buildSystemPrompt("新机器人", "arm", ["任务规划"], "rigor"));
    setBuilderErr(null);
    setView("builder");
  };

  const openEdit = (r: Robot) => {
    setEditing(r);
    setName(r.name);
    setAvatar(r.avatar);
    setRole(r.role);
    setSkills(new Set(r.skills));
    setStyle(r.style);
    setModel(r.model);
    setSysPrompt(r.systemPrompt);
    setBuilderErr(null);
    setView("builder");
  };

  const regenPrompt = () => {
    const n = name.trim() || "新机器人";
    setSysPrompt(buildSystemPrompt(n, role, [...skills], style));
  };

  const toggleSkill = (s: string) =>
    setSkills((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const handleSave = () => {
    const n = name.trim();
    if (!n) {
      setBuilderErr("请先给机器人起个名字。");
      return;
    }
    if (skills.size === 0) {
      setBuilderErr("请至少勾选一项能力。");
      return;
    }
    const robot: Robot = {
      id: editing?.id ?? genId(),
      name: n,
      avatar,
      role,
      skills: [...skills],
      style,
      model,
      systemPrompt:
        sysPrompt.trim() ||
        buildSystemPrompt(n, role, [...skills], style),
      createdAt: editing?.createdAt ?? Date.now(),
    };
    setRobots(saveRobot(robot));
    setView("list");
  };

  const openChat = (r: Robot) => {
    setChatRobot(r);
    setMsgs([]);
    setChatErr(null);
    setIsDemo(false);
    setView("chat");
  };

  const remove = (id: string) => {
    if (window.confirm("确定删除这个机器人吗？")) {
      setRobots(deleteRobot(id));
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy || !chatRobot) return;
    setInput("");
    setMsgs((prev) => [...prev, { role: "user", text }]);
    setBusy(true);
    setChatErr(null);
    setIsDemo(false);

    const history = msgs
      .slice(-6)
      .map((m) => `${m.role === "user" ? "用户" : "机器人"}：${m.text}`)
      .join("\n");
    const prompt = history ? `${history}\n用户：${text}` : text;
    const r = chatRobot;
    let got = "";

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemPrompt: r.systemPrompt,
          models: [r.model],
          userKeys: getUserKeys(),
        }),
      });
      const raw = await res.text();
      for (const line of raw.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          const j = JSON.parse(line.slice(6));
          if (j.model !== r.model) continue;
          if (j.error) throw new Error(j.error);
          if (typeof j.text === "string") got += j.text;
        } catch (e) {
          throw e;
        }
      }
    } catch (e) {
      setChatErr(e instanceof Error ? e.message : String(e));
    }

    if (got) {
      setMsgs((prev) => [...prev, { role: "bot", text: got }]);
    } else {
      const cfg = MODEL_MAP[r.model];
      setMsgs((prev) => [
        ...prev,
        {
          role: "bot",
          text:
            buildDemoAnswer(cfg, text) +
            "\n\n> ⚠️ 当前为本地演示回答（未连接真实模型 Key）。请在「API Key」设置中配置「" +
            r.model +
            "」对应的 Key 后获取真实回答。",
        },
      ]);
      setIsDemo(true);
    }
    setBusy(false);
  };

  return (
    <section id="workshop" className="scroll-mt-20 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">
            ⑦ 机器人构建专区
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            捏一个属于你的具身智能机器人：定角色、点技能、选风格、绑模型，
            <span className="text-emerald-400">对话用你自己的 Key（BYOK）</span>，未配置则演示模式。
            构建完成后可在「机器人社区」分享你的机器人。
          </p>
        </div>

        {/* ===== 列表视图 ===== */}
        {view === "list" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-300">
                我的机器人（{robots.length}）
              </span>
              <button
                onClick={openCreate}
                className="rounded-lg bg-accent px-5 py-2 text-[13px] font-semibold text-black shadow-glow-sm transition hover:bg-accent-soft"
              >
                ＋ 新建机器人
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {robots.map((r) => {
                const cfg = MODEL_MAP[r.model];
                const roleLabel =
                  ROBOT_ROLES.find((x) => x.id === r.role)?.label ??
                  "具身智能机器人";
                const styleLabel =
                  ROBOT_STYLES.find((x) => x.id === r.style)?.label ?? "严谨";
                return (
                  <div key={r.id} className="panel p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-800/70 text-2xl ring-1 ring-bg-border">
                          {r.avatar}
                        </span>
                        <div>
                          <div className="text-[15px] font-semibold text-slate-100">
                            {r.name}
                          </div>
                          <div className="text-[12px] text-slate-500">
                            {roleLabel} · {styleLabel}
                          </div>
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cfg?.color ?? "#22D3EE" }}
                        />
                        {cfg?.name ?? r.model}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {r.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-bg-border bg-bg-soft/40 px-2 py-0.5 text-[11px] text-slate-400"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openChat(r)}
                        className="flex-1 rounded-lg bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-black transition hover:bg-accent-soft"
                      >
                        💬 对话
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        className="rounded-lg border border-bg-border px-3 py-1.5 text-[12px] text-slate-400 transition hover:text-accent-soft"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => remove(r.id)}
                        className="rounded-lg border border-bg-border px-3 py-1.5 text-[12px] text-slate-500 transition hover:border-neon-red/40 hover:text-neon-red"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== 构建视图 ===== */}
        {view === "builder" && (
          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-slate-200">
                {editing ? "编辑机器人" : "新建机器人"}
              </h3>
              <button
                onClick={() => setView("list")}
                className="text-[12px] text-slate-500 hover:text-slate-300"
              >
                ← 返回列表
              </button>
            </div>

            {/* 名字 + 头像 */}
            <div className="mb-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12px] text-slate-400">
                  机器人名字 *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：老张·机械臂"
                  className="w-full rounded-xl border border-bg-border bg-bg-soft/40 px-3 py-2.5 text-[13.5px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-accent/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-slate-400">
                  头像
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`grid h-10 w-10 place-items-center rounded-xl text-xl transition ${
                        avatar === a
                          ? "bg-accent/20 ring-2 ring-accent"
                          : "bg-slate-800/60 hover:bg-slate-700"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 角色定位 */}
            <div className="mb-5">
              <label className="mb-1.5 block text-[12px] text-slate-400">
                角色定位
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                {ROBOT_ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition ${
                      role === r.id
                        ? "border-accent/50 bg-accent/10"
                        : "border-bg-border bg-bg-soft/30 hover:border-slate-600"
                    }`}
                  >
                    <div
                      className={`text-[13px] font-medium ${
                        role === r.id ? "text-accent-soft" : "text-slate-300"
                      }`}
                    >
                      {r.label}
                    </div>
                    <div className="text-[11px] text-slate-500">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 能力 */}
            <div className="mb-5">
              <label className="mb-1.5 block text-[12px] text-slate-400">
                能力标签（至少 1 项）
              </label>
              <div className="flex flex-wrap gap-2">
                {ROBOT_SKILLS.map((s) => {
                  const on = skills.has(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSkill(s)}
                      className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
                        on
                          ? "border-accent/50 bg-accent/10 text-accent-soft"
                          : "border-bg-border text-slate-500 hover:border-slate-600"
                      }`}
                    >
                      {on ? "✓ " : ""}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 风格 + 模型 */}
            <div className="mb-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12px] text-slate-400">
                  回答风格
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROBOT_STYLES.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setStyle(st.id)}
                      className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
                        style === st.id
                          ? "border-accent/50 bg-accent/10 text-accent-soft"
                          : "border-bg-border text-slate-500 hover:border-slate-600"
                      }`}
                      title={st.desc}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-slate-400">
                  绑定模型（用你自己的 Key）
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-xl border border-bg-border bg-bg-soft/40 px-3 py-2.5 text-[13.5px] text-slate-200 outline-none focus:border-accent/50"
                >
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900">
                      {m.name}（{m.category}）
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[10.5px] text-slate-600">
                  对话时优先使用你在「API Key」设置中填的 Key；未配置则演示模式。
                </div>
              </div>
            </div>

            {/* 系统提示词 */}
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[12px] text-slate-400">
                  系统提示词（可编辑）
                </label>
                <button
                  onClick={regenPrompt}
                  className="text-[11.5px] text-accent-soft hover:underline"
                >
                  ↻ 按角色/技能/风格重新生成
                </button>
              </div>
              <textarea
                value={sysPrompt}
                onChange={(e) => setSysPrompt(e.target.value)}
                rows={5}
                className="w-full resize-y rounded-xl border border-bg-border bg-bg-soft/40 px-3 py-2.5 font-mono text-[12px] text-slate-300 outline-none transition focus:border-accent/50"
              />
            </div>

            {builderErr && (
              <div className="mb-3 rounded-lg border border-neon-red/30 bg-neon-red/10 px-3 py-2 text-[12px] text-neon-red">
                {builderErr}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setView("list")}
                className="rounded-lg border border-bg-border px-5 py-2 text-[12px] text-slate-400 hover:text-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-accent px-6 py-2 text-[12px] font-semibold text-black shadow-glow-sm transition hover:bg-accent-soft"
              >
                保存机器人
              </button>
            </div>
          </div>
        )}

        {/* ===== 对话视图 ===== */}
        {view === "chat" && chatRobot && (
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-bg-border px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{chatRobot.avatar}</span>
                <div>
                  <div className="text-[14px] font-semibold text-slate-100">
                    {chatRobot.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {MODEL_MAP[chatRobot.model]?.name ?? chatRobot.model} ·{" "}
                    {isDemo ? "演示模式" : "真实模型"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setView("list")}
                className="text-[12px] text-slate-500 hover:text-slate-300"
              >
                ✕ 关闭
              </button>
            </div>

            <div className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
              {msgs.length === 0 && (
                <div className="rounded-xl border border-dashed border-bg-border bg-bg-soft/20 p-4 text-center text-[12.5px] text-slate-500">
                  和「{chatRobot.name}」聊聊你的具身智能任务吧，例如：
                  <div className="mt-1.5 text-slate-400">
                    「帮我写一个 ROS2 激光避障节点」
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-accent/90 text-black"
                        : "border border-bg-border bg-slate-800/60 text-slate-200"
                    }`}
                  >
                    {m.role === "bot" ? (
                      <Markdown text={m.text} />
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-bg-border bg-slate-800/60 px-3.5 py-2.5 text-[12px] text-slate-400">
                    思考中…
                  </div>
                </div>
              )}
            </div>

            {chatErr && (
              <div className="mx-4 mb-2 rounded-lg border border-neon-red/30 bg-neon-red/10 px-3 py-2 text-[12px] text-neon-red">
                {chatErr}
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-bg-border px-4 py-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`给 ${chatRobot.name} 发消息…`}
                className="flex-1 rounded-xl border border-bg-border bg-bg-soft/40 px-3 py-2.5 text-[13px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-accent/50"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className={`rounded-xl px-5 py-2.5 text-[13px] font-semibold transition ${
                  busy || !input.trim()
                    ? "cursor-not-allowed bg-slate-800 text-slate-600"
                    : "bg-accent text-black shadow-glow-sm hover:bg-accent-soft"
                }`}
              >
                发送
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
