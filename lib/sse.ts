// ============================================================
// lib/sse.ts — 多路流式合并为单条 SSE
// 每个模型一路 AsyncGenerator，合并成一条 ReadableStream，
// 每帧事件：`data: {"model":"deepseek","delta":"...","done":true}\n\n`
// 单模型失败不影响其他模型（错误隔离）。
// ============================================================

export interface StreamSource {
  model: string;
  stream: AsyncGenerator<string>;
}

export interface SseEvent {
  model: string;
  delta?: string;
  done?: boolean;
  error?: string;
}

export function mergeStreams(
  sources: StreamSource[]
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const queue: SseEvent[] = [];
  const waiters: (() => void)[] = [];
  let remaining = sources.length;

  const push = (ev: SseEvent) => {
    queue.push(ev);
    const w = waiters.shift();
    if (w) w();
  };

  // 每个模型一路：读增量 → 推入队列；异常 → 推 error + done
  sources.forEach(({ model, stream }) => {
    (async () => {
      try {
        for await (const delta of stream) {
          push({ model, delta });
        }
      } catch (e) {
        push({
          model,
          error: e instanceof Error ? e.message : String(e),
        });
      } finally {
        push({ model, done: true });
      }
    })();
  });

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      return new Promise<void>((resolve) => {
        const dequeue = () => {
          const ev = queue.shift();
          if (!ev) return false;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
          if (ev.done) remaining--;
          if (remaining <= 0) controller.close();
          return true;
        };

        if (dequeue()) {
          resolve();
          return;
        }
        // 队列空 → 挂起，等 push 唤醒
        waiters.push(() => {
          dequeue();
          resolve();
        });
      });
    },
    cancel() {
      // 客户端断开：各来源的 for-await 会随 reader 自然终止
    },
  });
}
