import { NextResponse } from "next/server";
import { runTask, RateLimitError, ProviderError } from "@/lib/ai/providers";
import type { AiTask } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;
const TASKS: AiTask[] = ["classify", "classify_sheet", "frame", "legend", "detect", "verify", "panel", "estimate"];

export async function POST(req: Request) {
  // Image is processed in memory only and never stored (FR-015).
  let body: { task?: AiTask; image?: string; context?: Record<string, unknown> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  if (!body.task || !TASKS.includes(body.task) || typeof body.image !== "string")
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    return NextResponse.json(await runTask(body.task, body.image, body.context ?? {}));
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: "rate_limited", retryAfter: e.retryAfter }, { status: 429 });
    const detail = e instanceof ProviderError ? e.message : "Lỗi gọi AI";
    return NextResponse.json({ error: "provider", detail }, { status: 502 });
  }
}
