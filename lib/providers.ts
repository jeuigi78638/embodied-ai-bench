// ============================================================
// lib/providers.ts — 7 大模型流式适配器
// 覆盖三种上游协议：
//  1) OpenAI 兼容  /chat/completions（GPT-4o / DeepSeek / 豆包 / 通义 / GLM）
//  2) Anthropic    /messages（Claude）
//  3) Gemini       streamGenerateContent（Gemini）
// 统一对外输出：AsyncGenerator<string>（文本增量），出错时 throw。
// ============================================================

import type { ModelConfig } from "./models";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamOpts {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

const baseHeaders = { "content-type": "application/json" };

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}

/** 统一的模型流式入口 */
export async function* streamModel(
  config: ModelConfig,
  messages: ChatMessage[],
  opts: StreamOpts = {}
): AsyncGenerator<string> {
  const apiKey = process.env[config.envKey];
  if (!apiKey) {
    throw new Error(
      `缺少 ${config.envKey}：该模型尚未配置 API Key，请在 .env.local / Vercel 环境变量中添加。`
    );
  }
  const temperature =
    opts.temperature ?? Number(process.env.MODEL_TEMPERATURE ?? 0.3);
  const maxTokens = opts.maxTokens ?? 2048;

  switch (config.provider) {
    case "anthropic":
      yield* anthropicStream(config, messages, apiKey, {
        temperature,
        maxTokens,
        signal: opts.signal,
      });
      return;
    case "gemini":
      yield* geminiStream(config, messages, apiKey, {
        temperature,
        maxTokens,
        signal: opts.signal,
      });
      return;
    default:
      yield* openAICompatible(config, messages, apiKey, {
        temperature,
        maxTokens,
        signal: opts.signal,
      });
      return;
  }
}

// ---------- 1) OpenAI 兼容协议（OpenAI / DeepSeek / Ark·豆包 / DashScope·通义 / BigModel·GLM） ----------
async function* openAICompatible(
  config: ModelConfig,
  messages: ChatMessage[],
  apiKey: string,
  opts: { temperature: number; maxTokens: number; signal?: AbortSignal }
): AsyncGenerator<string> {
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: { ...baseHeaders, authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: config.apiModel,
      messages,
      stream: true,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`请求失败 HTTP ${res.status}：${await safeText(res)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const json = JSON.parse(data);
          const delta: unknown = json?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) yield delta;
        } catch {
          // 忽略解析失败的中间行
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------- 2) Anthropic Messages 协议（Claude） ----------
async function* anthropicStream(
  config: ModelConfig,
  messages: ChatMessage[],
  apiKey: string,
  opts: { temperature: number; maxTokens: number; signal?: AbortSignal }
): AsyncGenerator<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const chat = messages.filter((m) => m.role !== "system");

  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      ...baseHeaders,
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.apiModel,
      system,
      messages: chat,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`请求失败 HTTP ${res.status}：${await safeText(res)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        try {
          const json = JSON.parse(data);
          const delta: unknown = json?.delta?.text;
          if (typeof delta === "string" && delta.length > 0) yield delta;
        } catch {
          // 忽略
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------- 3) Gemini streamGenerateContent 协议 ----------
async function* geminiStream(
  config: ModelConfig,
  messages: ChatMessage[],
  apiKey: string,
  opts: { temperature: number; maxTokens: number; signal?: AbortSignal }
): AsyncGenerator<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const sep = config.endpoint.includes("?") ? "&" : "?";
  const url = `${config.endpoint}${sep}alt=sse&key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      generationConfig: {
        temperature: opts.temperature,
        maxOutputTokens: opts.maxTokens,
      },
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`请求失败 HTTP ${res.status}：${await safeText(res)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        try {
          const json = JSON.parse(data);
          const parts: unknown[] = json?.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            const t: unknown = (part as { text?: unknown })?.text;
            if (typeof t === "string" && t.length > 0) yield t;
          }
        } catch {
          // 忽略
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** 非流式补全（用于具身评测批量跑）：内部复用流式，累加全文。 */
export async function completeModel(
  config: ModelConfig,
  messages: ChatMessage[],
  opts: StreamOpts = {}
): Promise<{ text: string; error: string | null }> {
  let text = "";
  try {
    for await (const delta of streamModel(config, messages, {
      maxTokens: opts.maxTokens ?? 1600,
      temperature: opts.temperature,
      signal: opts.signal,
    })) {
      text += delta;
    }
    return { text, error: null };
  } catch (e) {
    return { text, error: e instanceof Error ? e.message : String(e) };
  }
}
