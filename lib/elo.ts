// ============================================================
// lib/elo.ts — Elo 评分（LMArena / Chatbot Arena 同款思路）
// 每次投票按标准 Elo（K=32）更新两个参赛模型的分数，
// 用于生成「具身任务 × 模型」公开排行榜。
// ============================================================

export const ELO_K = 32;
export const ELO_INIT = 1500;

/** 期望胜率 */
export function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

export interface EloResult {
  deltaA: number;
  deltaB: number;
}

/**
 * 计算一次对局后双方的 Elo 变化
 * @param eloA 模型 A 当前分
 * @param eloB 模型 B 当前分
 * @param winner "a" | "b" | "tie"
 */
export function computeElo(
  eloA: number,
  eloB: number,
  winner: "a" | "b" | "tie"
): EloResult {
  const ea = expectedScore(eloA, eloB);
  const eb = expectedScore(eloB, eloA);
  let sa = 0.5;
  let sb = 0.5;
  if (winner === "a") {
    sa = 1;
    sb = 0;
  } else if (winner === "b") {
    sa = 0;
    sb = 1;
  }
  return {
    deltaA: Math.round(ELO_K * (sa - ea)),
    deltaB: Math.round(ELO_K * (sb - eb)),
  };
}

/** 从四舍五入后的分差还原（防溢出用），避免浮点误差累积异常值 */
export function clampElo(score: number, min = 100, max = 3000): number {
  return Math.min(max, Math.max(min, score));
}
