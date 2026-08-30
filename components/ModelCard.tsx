"use client";

import { useRef, useState } from "react";
import type { ModelConfig } from "@/lib/models";
import Markdown from "./Markdown";

export type CardStatus = "idle" | "streaming" | "done" | "error";

export interface CardState {
  text: string;
  status: CardStatus;
  error?: string;
}

interface Props {
  config: ModelConfig;
  state: CardState;
  onClear: (id: string) => void;
}

export default function ModelCard({ config, state, onClear }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { text, status, error } = state;
  const streaming = status === "streaming";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时忽略
    }
  };

  return (
    <div
      className={`panel flex flex-col overflow-hidden transition ${
        streaming ? "animate-pulseGlow" : ""
      }`}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-bg-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}` }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-slate-100">{config.name}</span>
              <span className="rounded bg-slate-800/70 px-1.5 py-0.5 text-[10px] text-slate-400">
                {config.vendor}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              {config.supportsVision && (
                <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent-soft">VLM</span>
              )}
              <span className="rounded bg-slate-800/70 px-1.5 py-0.5 text-[10px] text-slate-500">
                {config.category}
              </span>
            </div>
          </div>
        </div>

        {/* 状态 */}
        <div className="flex items-center gap-1.5">
          {status === "idle" && (
            <span className="text-[11px] text-slate-600">等待</span>
          )}
          {streaming && (
            <span className="flex items-center gap-1 text-[11px] text-accent-soft">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-accent" />
              生成中
            </span>
          )}
          {status === "done" && (
            <span className="text-[11px] text-neon-green">✓ 完成</span>
          )}
          {status === "error" && (
            <span className="text-[11px] text-neon-red">✕ 失败</span>
          )}
        </div>
      </div>

      {/* 正文 */}
      <div className="min-h-[120px] flex-1 px-4 py-3">
        {status === "idle" && (
          <div className="text-[13px] text-slate-600">
            等待任务下发……勾选该模型后输入指令即可并发生成。
          </div>
        )}
        {status === "error" && (
          <div className="rounded-lg border border-neon-red/30 bg-neon-red/10 p-3 text-[12.5px] leading-relaxed text-neon-red">
            {error || "请求失败"}
          </div>
        )}
        {text.length > 0 && (
          <div className={streaming ? "cursor-blink" : ""}>
            <Markdown text={text} />
          </div>
        )}
      </div>

      {/* 底部操作 */}
      {(text.length > 0 || status === "done" || status === "error") && (
        <div className="flex items-center justify-between border-t border-bg-border px-4 py-2">
          <span className="text-[11px] text-slate-600">{text.length} 字</span>
          <div className="flex items-center gap-1.5">
            {text.length > 0 && (
              <button
                onClick={handleCopy}
                className="rounded-md border border-bg-border px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-accent/40 hover:text-accent-soft"
              >
                {copied ? "已复制 ✓" : "复制"}
              </button>
            )}
            <button
              onClick={() => onClear(config.id)}
              className="rounded-md border border-bg-border px-2.5 py-1 text-[11px] text-slate-500 transition hover:border-neon-red/40 hover:text-neon-red"
            >
              清空
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
