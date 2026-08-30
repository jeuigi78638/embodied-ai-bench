// ============================================================
// lib/scoring.ts — 具身评测「启发式自动评分」
// 基于关键词命中 + 结构（代码块/步骤/安全词）+ 篇幅，给出 0-100 参考分。
// ⚠️ 仅用于快速筛选与横向比较，真实选型请结合人工评审。
// ============================================================

import type { BenchmarkTask } from "./benchmarks";

export interface ScoreBreakdown {
  keyword: number; // 0-40 关键词命中
  structure: number; // 0-30 结构（代码块/步骤/安全词）
  length: number; // 0-20 篇幅充分度
  quality: number; // 0-10 深度润色奖励
  total: number; // 0-100
}

const SAFETY_WORDS = [
  "急停",
  "安全",
  "力矩",
  "限位",
  "避让",
  "停止",
  "确认",
  "阈值",
  "速度限制",
  "力控",
];

export function scoreAnswer(task: BenchmarkTask, text: string): ScoreBreakdown {
  const lower = text.toLowerCase();

  // 1) 关键词命中 0-40
  const kwHits = task.keywords.filter((k) =>
    lower.includes(k.toLowerCase())
  ).length;
  const keyword = Math.round((kwHits / task.keywords.length) * 40);

  // 2) 结构 0-30
  let structure = 0;
  if (task.requiredStructure.includes("code")) {
    structure += /```[\s\S]*?```/.test(text) ? 12 : 0;
  }
  if (task.requiredStructure.includes("steps")) {
    const steps = text.match(
      /(^|\n)\s*(\d+[\.、．)]|步骤\s*\d+|[一二三四五六七八九十]+[、\.．])/g
    );
    structure += Math.min(12, (steps?.length ?? 0) * 4);
  }
  if (task.requiredStructure.includes("safety")) {
    const hits = SAFETY_WORDS.filter((w) => lower.includes(w));
    structure += Math.min(10, hits.length * 2);
  }

  // 3) 篇幅充分度 0-20（≥600 字满分）
  const len = text.length;
  const length = Math.min(20, Math.round((len / 600) * 20));

  // 4) 质量奖励 0-10（同时出现代码块 + 编号步骤 + 安全词 → 高分段）
  let quality = 0;
  if (/```[\s\S]*?```/.test(text)) quality += 4;
  if (/(步骤|Step|1\.|第一步)/i.test(text)) quality += 3;
  if (SAFETY_WORDS.filter((w) => lower.includes(w)).length >= 3) quality += 3;
  quality = Math.min(10, quality);

  const total = Math.min(100, keyword + structure + length + quality);
  return { keyword, structure, length, quality, total };
}

export function scoreGrade(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "优秀", color: "#34D399" };
  if (score >= 70) return { label: "良好", color: "#22D3EE" };
  if (score >= 55) return { label: "一般", color: "#FBBF24" };
  return { label: "待改进", color: "#F87171" };
}
