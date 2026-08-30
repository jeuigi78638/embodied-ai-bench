// ============================================================
// app/api/compare/route.ts — 多模型并发对比（SSE 流式）
// Edge Runtime：服务端持有 API Key，7 模型并行，单条 SSE 合并回推。
// 请求体：{ prompt, systemPrompt?, models?: string[] }
// 响应：text/event-stream，事件为 data: {"model","delta"|"error"|"done"}
// ============================================================

import { MODELS, MODEL_MAP, DEFAULT_SYSTEM_PROMPT } from "@/lib/models";
import { streamModel, type ChatMessage } from "@/lib/providers";
import { mergeStreams } from "@/lib/sse";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: {
    prompt?: unknown;
    systemPrompt?: unknown;
    models?: unknown;
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

  // 模型白名单校验：只允许配置过的模型 id，防注入
  const selectedIds = Array.isArray(body.models)
    ? body.models.filter((id): id is string => typeof id === "string")
    : [];
  const ids =
    selectedIds.length > 0
      ? selectedIds.filter((id) => MODEL_MAP[id])
      : MODELS.map((m) => m.id);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const sources = ids.map((id) => ({
    model: id,
    stream: streamModel(MODEL_MAP[id], messages),
  }));

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
