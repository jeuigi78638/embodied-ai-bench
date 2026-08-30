"use client";

import { useMemo, type ReactNode } from "react";

// 轻量 Markdown 渲染（无需额外依赖）：代码块 / 标题 / 列表 / 引用 / 段落 / 行内样式

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code key={key++} className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[12px] text-accent-soft">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(
        <em key={key++} className="italic text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => {
    const lines = text.split("\n");
    const out: ReactNode[] = [];
    let i = 0;
    let key = 0;
    while (i < lines.length) {
      const line = lines[i];

      // 代码块
      if (line.trim().startsWith("```")) {
        const lang = line.trim().slice(3).trim();
        const buf: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          buf.push(lines[i]);
          i++;
        }
        i++; // 跳过结束 ```
        out.push(
          <pre key={key++} className="my-3 rounded-xl border border-bg-border bg-black/40 p-3 overflow-x-auto">
            <code className="font-mono text-[12px] leading-relaxed text-emerald-300">
              {buf.join("\n")}
            </code>
            {lang && (
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">{lang}</span>
            )}
          </pre>
        );
        continue;
      }

      const trimmed = line.trim();

      // 标题
      const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
      if (heading) {
        const level = heading[1].length;
        const Tag = (["h1", "h2", "h3", "h4"] as const)[level - 1];
        out.push(
          <Tag key={key++} className="mt-4 mb-2 font-semibold text-slate-100">
            {inline(heading[2])}
          </Tag>
        );
        i++;
        continue;
      }

      // 引用
      if (trimmed.startsWith(">")) {
        out.push(
          <blockquote key={key++} className="my-3 border-l-2 border-accent-dim pl-3 text-slate-400">
            {inline(trimmed.slice(1).trim())}
          </blockquote>
        );
        i++;
        continue;
      }

      // 无序列表
      if (/^[-*•]\s+/.test(trimmed)) {
        const items: ReactNode[] = [];
        while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
          items.push(
            <li key={key++} className="my-0.5">
              {inline(lines[i].trim().replace(/^[-*•]\s+/, ""))}
            </li>
          );
          i++;
        }
        out.push(
          <ul key={key++} className="my-2 space-y-1 pl-5 list-disc">
            {items}
          </ul>
        );
        continue;
      }

      // 有序列表
      if (/^\d+[.、．)]\s+/.test(trimmed)) {
        const items: ReactNode[] = [];
        while (i < lines.length && /^\d+[.、．)]\s+/.test(lines[i].trim())) {
          items.push(
            <li key={key++} className="my-0.5">
              {inline(lines[i].trim().replace(/^\d+[.、．)]\s+/, ""))}
            </li>
          );
          i++;
        }
        out.push(
          <ol key={key++} className="my-2 space-y-1 pl-5 list-decimal">
            {items}
          </ol>
        );
        continue;
      }

      // 空行 → 段落分隔
      if (!trimmed) {
        i++;
        continue;
      }

      // 普通段落（合并连续非空非特殊行）
      const para: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().startsWith("```") &&
        !/^(#{1,4})\s/.test(lines[i].trim()) &&
        !/^[-*•]\s/.test(lines[i].trim()) &&
        !/^\d+[.、．)]\s/.test(lines[i].trim()) &&
        !lines[i].trim().startsWith(">")
      ) {
        para.push(lines[i]);
        i++;
      }
      out.push(
        <p key={key++} className="my-2">
          {inline(para.join("\n"))}
        </p>
      );
    }
    return out;
  }, [text]);

  return <div className="prose-dark">{blocks}</div>;
}
