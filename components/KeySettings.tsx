"use client";

import { useState } from "react";
import { MODELS } from "@/lib/models";
import {
  getUserKeys,
  setUserKeys,
  clearUserKeys,
  type UserKeys,
} from "@/lib/userkeys";

const KEY_HINT: Record<string, string> = {
  ARK_API_KEY: "火山方舟控制台 → API Key 管理",
  DEEPSEEK_API_KEY: "platform.deepseek.com → API Keys",
  DASHSCOPE_API_KEY: "阿里云百炼 → API-KEY 管理",
  OPENAI_API_KEY: "platform.openai.com → API keys",
  ANTHROPIC_API_KEY: "console.anthropic.com → API Keys",
  GEMINI_API_KEY: "aistudio.google.com → API key",
  ZHIPU_API_KEY: "open.bigmodel.cn → API 密钥",
};

function maskKey(v: string): string {
  if (v.length <= 8) return "••••••••";
  return `${v.slice(0, 4)}••••••••${v.slice(-4)}`;
}

export default function KeySettings() {
  const [keys, setKeys] = useState<UserKeys>(() => getUserKeys());
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const configured = MODELS.filter((m) => {
    const v = keys[m.envKey];
    return typeof v === "string" && v.trim().length > 0;
  });

  const update = (envKey: string, value: string) =>
    setKeys((prev) => ({ ...prev, [envKey]: value }));

  const save = () => {
    setUserKeys(keys);
    setSavedAt(Date.now());
  };

  const clear = () => {
    clearUserKeys();
    setKeys({});
    setSavedAt(null);
  };

  return (
    <section id="keys" className="scroll-mt-20 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">
            API Key 设置
            <span className="ml-2 align-middle rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent-soft">
              BYOK · 自带 Key 免费用
            </span>
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            <span className="text-emerald-400">用自己的 Key 测自己的任务，费用你自理，平台不碰你的钱。</span>
            Key 只保存在<b>你的浏览器</b>（localStorage），请求时经服务端临时转发给对应模型，
            <b>服务器不存储、不写日志</b>。清空缓存或点「清空全部」即可抹掉。
          </p>
        </div>

        <div className="panel overflow-hidden">
          <div className="hidden grid-cols-[150px_190px_1fr_120px] gap-2 border-b border-bg-border bg-slate-800/40 px-4 py-2.5 text-[12px] font-medium text-slate-400 sm:grid">
            <span>模型</span>
            <span>环境变量</span>
            <span>API Key</span>
            <span className="text-right">状态</span>
          </div>
          <div className="divide-y divide-bg-border/50">
            {MODELS.map((m) => {
              const val = keys[m.envKey] ?? "";
              const has = val.trim().length > 0;
              const isShow = show[m.envKey];
              return (
                <div key={m.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[150px_190px_1fr_120px] sm:items-center">
                  <div>
                    <div className="flex items-center gap-2 text-[13px] font-medium text-slate-200">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                      {m.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-600">{m.vendor}</div>
                  </div>
                  <div className="font-mono text-[12px] text-slate-400">{m.envKey}</div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type={isShow ? "text" : "password"}
                        value={val}
                        onChange={(e) => update(m.envKey, e.target.value)}
                        placeholder={has ? maskKey(val) : `填入 ${m.envKey}`}
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full rounded-lg border border-bg-border bg-bg-soft/40 px-3 py-2 font-mono text-[12.5px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-accent/50"
                      />
                      <button
                        onClick={() => setShow((p) => ({ ...p, [m.envKey]: !p[m.envKey] }))}
                        className="shrink-0 rounded-lg border border-bg-border px-2 py-2 text-[11px] text-slate-500 hover:text-slate-200"
                        title={isShow ? "隐藏" : "显示"}
                      >
                        {isShow ? "🙈" : "👁"}
                      </button>
                    </div>
                    <div className="mt-1 text-[10.5px] text-slate-600">
                      {KEY_HINT[m.envKey] ?? "在对应平台获取"}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {has ? (
                      <>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-400">
                          ✓ 已配置
                        </span>
                        <button
                          onClick={() => update(m.envKey, "")}
                          className="text-[11px] text-slate-500 hover:text-neon-red"
                        >
                          清除
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-500">
                        未配置 → 演示
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bg-border bg-slate-800/30 px-4 py-3">
            <div className="text-[12px] text-slate-500">
              已配置 <b className="text-slate-200">{configured.length}</b> / {MODELS.length} 个模型
              {savedAt && (
                <span className="ml-2 text-emerald-400">
                  ✓ 已保存到本地浏览器
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={clear}
                className="rounded-lg border border-bg-border px-4 py-2 text-[12px] text-slate-500 transition hover:border-neon-red/40 hover:text-neon-red"
              >
                清空全部
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-accent px-6 py-2 text-[12px] font-semibold text-black shadow-glow-sm transition hover:bg-accent-soft"
              >
                保存到浏览器
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-bg-border bg-bg-soft/30 p-3.5 text-[12px] leading-relaxed text-slate-500">
          <b className="text-slate-300">说明：</b>
          ① 未配置 Key 的模型，在对比/测评时显示「演示模式」本地模拟回答；② 配置 Key 后，
          对比工作台/自助测评/社区 AI 助手会<b className="text-slate-300">优先使用你自己的 Key</b> 获取真实回答；
          ③ 平台服务器<b className="text-slate-300">不保存任何 Key</b>，只在收到请求的瞬间转发给对应模型后即弃；
          ④ 建议先配 2-3 个国产模型（豆包 / DeepSeek / 通义），便宜、免费额度多。
        </div>
      </div>
    </section>
  );
}
