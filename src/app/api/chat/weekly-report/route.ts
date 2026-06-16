import { NextRequest, NextResponse } from "next/server";
import {
  createChatCompletionStream,
  createChatCompletion,
  type ChatMessage,
} from "@/lib/glm/client";
import logger from "@/lib/logger";

/**
 * POST /api/chat/weekly-report
 *
 * 根据用户选中的事项列表，调用 GLM-4.7-Flash 生成周报。
 *
 * Request body:
 * ```json
 * {
 *   "events": [
 *     { "content": "完成需求评审", "status": "done", "createdAt": 1718000000000 },
 *     { "content": "开发登录模块", "status": "todo", "createdAt": 1718100000000 }
 *   ],
 *   "length": "concise",              // "detailed" | "concise" | "minimal"
 *   "format": "text",                // "text" | "markdown"
 *   "stream": true                    // optional, default true
 * }
 * ```
 */

/* ------------------------------------------------------------------ */
/*  Prompt builder                                                      */
/* ------------------------------------------------------------------ */

type ReportLength = "detailed" | "concise" | "minimal";
type ReportFormat = "text" | "markdown";

interface ReportEvent {
  content: string;
  status: "todo" | "done" | "abandoned";
  createdAt: number;
}

const LENGTH_MAX_TOKENS: Record<ReportLength, number> = {
  detailed: 4096,
  concise: 2048,
  minimal: 1024,
};

const LENGTH_INSTRUCTIONS: Record<ReportLength, string> = {
  detailed: `篇幅：详细
- 每个事项展开描述，包含具体细节和背景信息
- 工作概览需要 3-5 句话的完整总结
- 已完成/待完成事项每项用 1-2 句话详细阐述
- 问题与风险需要深入分析根因和影响
- 下周计划包含具体行动步骤`,

  concise: `篇幅：简洁（默认）
- 每个事项用一句精炼的话概括核心内容
- 工作概览用 2-3 句话总结
- 各部分条目清晰，不冗余
- 重点突出，避免过多修饰`,

  minimal: `篇幅：极简
- 仅保留关键信息，用短语或关键词列表呈现
- 不使用长句，尽量用项目符号列出要点
- 工作概览用 1 句话概括
- 整体篇幅控制在最短`,
};

const FORMAT_INSTRUCTIONS: Record<ReportFormat, string> = {
  text: `格式：文字编排
- 不使用 Markdown 语法（如 #、**、- 等）
- 用自然的段落和缩进来组织结构
- 各部分用中文数字或标题文字分隔，如"一、工作概览"
- 适合直接粘贴到邮件、文档等纯文本场景`,

  markdown: `格式：Markdown
- 使用 Markdown 语法组织结构
- 用 # 表示标题层级，用 - 或 1. 表示列表
- 用 **加粗** 强调关键内容
- 适合在支持 Markdown 的编辑器中使用`,
};

function buildWeeklyReportPrompt(
  events: ReportEvent[],
  length: ReportLength,
  format: ReportFormat,
): ChatMessage[] {
  const statusLabel: Record<string, string> = {
    done: "已完成",
    todo: "待完成",
    abandoned: "已废弃",
  };

  const eventLines = events
    .map((ev, i) => `${i + 1}. [${statusLabel[ev.status] || ev.status}] ${ev.content}`)
    .join("\n");

  const systemMessage = `你是周报撰写助手。根据用户提供的事项列表生成周报。
结构：工作概览、已完成事项、待完成事项、问题与风险、下周计划。事项少可合并。

${LENGTH_INSTRUCTIONS[length]}

${FORMAT_INSTRUCTIONS[format]}`;

  const userMessage = `请根据以下事项列表，帮我生成一份周报：

${eventLines}`;

  return [
    { role: "system" as const, content: systemMessage },
    { role: "user" as const, content: userMessage },
  ];
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID?.() ?? Date.now().toString(36);
  const log = logger.child({ requestId, api: "POST /api/chat/weekly-report" });

  try {
    if (!process.env.GLM_API_KEY) {
      log.error("GLM_API_KEY is not configured");
      return NextResponse.json(
        { ok: false, error: "Server missing API key configuration" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const {
      events,
      length = "concise",
      format = "text",
      stream = true,
    } = body as {
      events: ReportEvent[];
      length?: ReportLength;
      format?: ReportFormat;
      stream?: boolean;
    };

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { ok: false, error: "events is required and must be a non-empty array" },
        { status: 400 },
      );
    }

    const messages = buildWeeklyReportPrompt(events, length, format);

    log.info({ eventCount: events.length, length, format, stream }, "weekly report request");

    // ---- Non-streaming ----
    if (!stream) {
      const result = await createChatCompletion({
        messages,
        model: "glm-4.7-flash",
        stream: false,
        temperature: 0.5,
        max_tokens: LENGTH_MAX_TOKENS[length],
      });

      const content = result.choices?.[0]?.message?.content ?? "";
      log.info({ usage: result.usage }, "weekly report done");
      return NextResponse.json({ ok: true, data: { content, usage: result.usage } });
    }

    // ---- Streaming (SSE) ----
    const readableStream = createChatCompletionStream({
      messages,
      model: "glm-4.7-flash",
      stream: true,
      temperature: 0.5,
      max_tokens: LENGTH_MAX_TOKENS[length],
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    log.error({ err }, "weekly report error");
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
