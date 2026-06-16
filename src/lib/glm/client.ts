/**
 * GLM API client — wraps the Zhipu AI Chat Completion API.
 *
 * - Default model: `glm-4.7-flash` (free tier, vision-capable)
 * - Supports both streaming (SSE) and non-streaming responses
 * - API base: https://open.bigmodel.cn/api/paas/v4/chat/completions
 *
 * @see https://docs.bigmodel.cn/api-reference/模型-api/对话补全
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Text content item */
export interface TextContent {
  type: "text";
  text: string;
}

/** Image URL content item */
export interface ImageUrlContent {
  type: "image_url";
  image_url: { url: string };
}

/** A single chat message sent to the API */
export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | (TextContent | ImageUrlContent)[] }
  | { role: "assistant"; content: string };

/** Parameters for creating a chat completion */
export interface ChatCompletionParams {
  /** Model name, defaults to `glm-4.7-flash` */
  model?: string;
  /** Conversation messages */
  messages: ChatMessage[];
  /** Enable streaming (SSE) output — default `true` */
  stream?: boolean;
  /** Sampling temperature [0, 1] — default `0.8` for vision models */
  temperature?: number;
  /** Nucleus sampling parameter [0.01, 1] */
  top_p?: number;
  /** Max tokens for the response */
  max_tokens?: number;
  /** Stop words */
  stop?: string[];
  /** Request ID */
  request_id?: string;
  /** End-user ID */
  user_id?: string;
}

/** Non-streaming response from the API */
export interface ChatCompletionResponse {
  id: string;
  request_id?: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
      reasoning_content?: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Streaming chunk from the API */
export interface ChatCompletionChunk {
  id: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string | null;
      reasoning_content?: string;
    };
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const GLM_API_BASE =
  process.env.GLM_API_BASE ?? "https://open.bigmodel.cn/api/paas/v4/chat/completions";

const GLM_API_KEY = process.env.GLM_API_KEY ?? "";

const DEFAULT_MODEL = "glm-4.7-flash";

/* ------------------------------------------------------------------ */
/*  Non-streaming request                                              */
/* ------------------------------------------------------------------ */

export async function createChatCompletion(
  params: ChatCompletionParams,
): Promise<ChatCompletionResponse> {
  const { model = DEFAULT_MODEL, stream = false, ...rest } = params;

  const res = await fetch(GLM_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GLM_API_KEY}`,
    },
    body: JSON.stringify({ model, stream, ...rest }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`GLM API error ${res.status}: ${errText}`);
  }

  return res.json() as Promise<ChatCompletionResponse>;
}

/* ------------------------------------------------------------------ */
/*  Streaming request (SSE)                                            */
/* ------------------------------------------------------------------ */

/**
 * Create a streaming chat completion.
 *
 * Returns a `ReadableStream<Uint8Array>` that yields SSE `data:` lines.
 * Each line is a JSON `ChatCompletionChunk`, the stream ends with `data: [DONE]`.
 *
 * Usage (in a Next.js Route Handler):
 * ```ts
 * return new Response(stream, {
 *   headers: { "Content-Type": "text/event-stream" },
 * });
 * ```
 */
export function createChatCompletionStream(
  params: ChatCompletionParams,
): ReadableStream<Uint8Array> {
  const { model = DEFAULT_MODEL, stream = true, ...rest } = params;

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const res = await fetch(GLM_API_BASE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GLM_API_KEY}`,
          },
          body: JSON.stringify({ model, stream, ...rest }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          controller.error(
            new Error(`GLM API error ${res.status}: ${errText}`),
          );
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          controller.error(new Error("GLM API returned no body"));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // keep incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }

            // Forward the SSE line as-is
            controller.enqueue(encoder.encode(`${trimmed}\n\n`));
          }
        }

        // Flush remaining buffer
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith("data:")) {
            controller.enqueue(encoder.encode(`${trimmed}\n\n`));
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
