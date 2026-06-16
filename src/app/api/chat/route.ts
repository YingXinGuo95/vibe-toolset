import { NextRequest, NextResponse } from "next/server";
import {
  createChatCompletion,
  createChatCompletionStream,
  type ChatMessage,
} from "@/lib/glm/client";
import logger from "@/lib/logger";

/**
 * POST /api/chat
 *
 * Request body:
 * ```json
 * {
 *   "messages": [{ "role": "user", "content": "你好" }],
 *   "model": "glm-4.7-flash",   // optional
 *   "stream": true,            // optional, default true
 *   "temperature": 0.8,        // optional
 *   "max_tokens": 1024         // optional
 * }
 * ```
 *
 * - When `stream` is false → returns a JSON `ChatCompletionResponse`.
 * - When `stream` is true  → returns SSE (`text/event-stream`).
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID?.() ?? Date.now().toString(36);
  const log = logger.child({ requestId, api: "POST /api/chat" });

  try {
    // ---- Validate API key ----
    if (!process.env.GLM_API_KEY) {
      log.error("GLM_API_KEY is not configured");
      return NextResponse.json(
        { ok: false, error: "Server missing API key configuration" },
        { status: 500 },
      );
    }

    // ---- Parse body ----
    const body = await request.json();
    const { messages, model, stream = true, temperature, top_p, max_tokens, stop, request_id, user_id } = body as {
      messages: ChatMessage[];
      model?: string;
      stream?: boolean;
      temperature?: number;
      top_p?: number;
      max_tokens?: number;
      stop?: string[];
      request_id?: string;
      user_id?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { ok: false, error: "messages is required and must be a non-empty array" },
        { status: 400 },
      );
    }

    log.info({ model: model ?? "glm-4.7-flash", stream, msgCount: messages.length }, "chat request");

    // ---- Non-streaming ----
    if (!stream) {
      const result = await createChatCompletion({
        messages,
        model,
        stream: false,
        temperature,
        top_p,
        max_tokens,
        stop,
        request_id,
        user_id,
      });

      log.info({ usage: result.usage }, "chat completion done");
      return NextResponse.json({ ok: true, data: result });
    }

    // ---- Streaming (SSE) ----
    const readableStream = createChatCompletionStream({
      messages,
      model,
      stream: true,
      temperature,
      top_p,
      max_tokens,
      stop,
      request_id,
      user_id,
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    log.error({ err }, "chat error");
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
