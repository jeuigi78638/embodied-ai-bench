// ============================================================
// app/api/compare/route.ts — 多模型并发对比（SSE 流式）
// Edge Runtime：服务端持有 API Key，7 模型并行，单条 SSE 合并回推。
// 请求体：{ prompt, systemPrompt?, models?: string[] }
// 响应：text/event-stream，事件为 data: {"model","delta"|"error"|"done"}
// ============================================================

import { MODELS, MODEL_MAP, DEFAULT_SYSTEM_PROMPT } from "@/lib/models";
import { streamModel, type ChatMessage } from "@/lib/providers";
import { mergeStreams } from "@/lib/sse";
import { guardRequest, guardJson } from "@/lib/guard";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: {
    prompt?: unknown;
    systemPrompt?: unknown;
    models?: unknown;
    userKeys?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "请求体不是合法 JSON" }, 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return json({ error: "请先输入要对比的任务指令（prompt 不能为空）" }, 400);
  }

  const systemPrompt =
    typeof body.systemPrompt === "string" && body.systemPrompt.trim()
      ? body.systemPrompt.trim()
      : DEFAULT_SYSTEM_PROMPT;

  // BYOK：解析用户请求时自带的 Key（envKey -> key），服务端只用不存、不写日志
  const userKeys = parseUserKeys(body.userKeys);

  // 模型白名单校验：只允许配置过的模型 id，防注入
  const selectedIds = Array.isArray(body.models)
    ? body.models.filter((id): id is string => typeof id === "string")
    : [];
  const ids =
    selectedIds.length > 0
      ? selectedIds.filter((id) => MODEL_MAP[id])
      : MODELS.map((m) => m.id);

  // 防护层：来源白名单 + IP 限流 + 参数上限
  const guard = guardRequest(req, "compare", {
    modelsCount: ids.length,
    promptLen: prompt.length,
  });
  if (!guard.ok) return guardJson(guard.message, guard.status);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const sources = ids.map((id) => {
    const cfg = MODEL_MAP[id];
    return {
      model: id,
      stream: streamModel(cfg, messages, { apiKey: userKeys[cfg.envKey] }),
    };
  });

  const stream = mergeStreams(sources);

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * 严格解析用户自带的 Key：只接受「合法环境变量名 -> 短字符串」，
 * 拒绝异常值，防止注入；Key 仅用于本次请求，不落盘不写日志。
 */
function parseUserKeys(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "string") continue;
    const val = v.trim();
    if (!val || val.length > 256) continue;
    if (!/^[A-Za-z0-9_]{2,64}$/.test(k)) continue;
    out[k] = val;
  }
  return out;
}
