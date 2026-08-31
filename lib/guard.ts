// ============================================================
// lib/guard.ts — EAI-Bench API 防护层
// 目标：防止别人把你的 API 端点当免费 LLM 代理白嫖，保护 API 额度成本。
// 四道防线：
//   1) Host 白名单         —— 只允许本站域名请求
//   2) Origin 白名单       —— 若带 Origin，必须为本站
//   3) IP 速率限制（滑动窗口）—— 单 IP 每分钟/每日次数上限
//   4) 参数上限            —— 单次模型数 / 评测任务数 / prompt 长度
// 说明：边缘函数内存桶为进程级（Vercel Edge 单实例自洽，跨实例近似），
//       作为第一道防线足够；更强的一致限流可后续接 Upstash / Vercel KV。
// ============================================================

export type GuardKind = "compare" | "benchmark";

// ---- 1. 来源白名单（Host / Origin）----
const ALLOWED_HOSTS = new Set([
  "eai-bench.top",
  "www.eai-bench.top",
  "embodied-ai-bench.vercel.app",
  "localhost:3000",
  "localhost:3001",
  "127.0.0.1:3000",
  "127.0.0.1:3001",
]);

const ALLOWED_ORIGINS = new Set([
  "https://eai-bench.top",
  "https://www.eai-bench.top",
  "https://embodied-ai-bench.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
]);

// ---- 3. IP 速率限制配置（可用环境变量覆盖）----
function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const LIMITS: Record<GuardKind, { perMin: number; perDay: number }> = {
  compare: {
    perMin: envInt("RL_COMPARE_PER_MIN", 12),
    perDay: envInt("RL_COMPARE_PER_DAY", 200),
  },
  benchmark: {
    perMin: envInt("RL_BENCH_PER_MIN", 3),
    perDay: envInt("RL_BENCH_PER_DAY", 30),
  },
};

// 单次调用参数上限（可配置）
const MAX_MODELS = envInt("MAX_MODELS_PER_CALL", 4);
const MAX_TASKS = envInt("MAX_TASKS_PER_CALL", 4);
const MAX_PROMPT_LEN = envInt("MAX_PROMPT_LEN", 3000);

// 进程级滑动窗口桶：key -> number[]（毫秒时间戳）
const buckets = new Map<string, number[]>();

// 内存桶总量上限，防止无限增长
const MAX_BUCKETS = 10_000;
const DAY_MS = 86_400_000;
const MIN_MS = 60_000;

export interface GuardExtra {
  modelsCount?: number;
  tasksCount?: number;
  promptLen?: number;
}

export type GuardResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export function guardRequest(
  req: Request,
  kind: GuardKind,
  extra: GuardExtra = {}
): GuardResult {
  // 1) Host 白名单
  const host = (req.headers.get("host") ?? "").toLowerCase().trim();
  if (!ALLOWED_HOSTS.has(host)) {
    return {
      ok: false,
      status: 403,
      message: "来源域名未授权（Host 校验失败）",
    };
  }

  // 2) Origin 白名单（若浏览器带 Origin）
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return {
      ok: false,
      status: 403,
      message: "来源域名未授权（Origin 校验失败）",
    };
  }

  // 3) IP 速率限制（滑动窗口）
  const ip = clientIp(req);
  const key = `${kind}:${ip}`;
  const now = Date.now();
  const { perMin, perDay } = LIMITS[kind];
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < DAY_MS);
  const lastMin = arr.filter((t) => now - t < MIN_MS).length;
  if (lastMin >= perMin) {
    return { ok: false, status: 429, message: "请求过于频繁，请稍后再试" };
  }
  if (arr.length >= perDay) {
    return {
      ok: false,
      status: 429,
      message: "今日调用次数已达上限，请明天再来",
    };
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > MAX_BUCKETS) buckets.clear();

  // 4) 参数上限
  if (extra.modelsCount !== undefined && extra.modelsCount > MAX_MODELS) {
    return {
      ok: false,
      status: 400,
      message: `单次最多对比 ${MAX_MODELS} 个模型，请减少选择`,
    };
  }
  if (extra.tasksCount !== undefined && extra.tasksCount > MAX_TASKS) {
    return {
      ok: false,
      status: 400,
      message: `单次评测最多 ${MAX_TASKS} 道任务，请减少选择`,
    };
  }
  if (extra.promptLen !== undefined && extra.promptLen > MAX_PROMPT_LEN) {
    return {
      ok: false,
      status: 400,
      message: `指令过长（最多 ${MAX_PROMPT_LEN} 字），请精简`,
    };
  }

  return { ok: true };
}

// 统一输出 JSON 错误响应
export function guardJson(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
