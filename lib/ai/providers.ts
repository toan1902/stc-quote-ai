// Server-only provider adapters. Keys come from env and never reach the browser (Principle VI).
import { buildPrompt, type AiTask } from "./prompts.ts";

export class RateLimitError extends Error { constructor(public retryAfter = 20) { super("rate_limited"); } }
export class ProviderError extends Error {}

export function providerInfo() {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase() === "claude" ? "claude" : "gemini";
  const model = provider === "claude" ? process.env.CLAUDE_MODEL || "claude-opus-5-5" : process.env.GEMINI_MODEL || "gemini-flash-latest";
  const configured = provider === "claude" ? !!process.env.ANTHROPIC_API_KEY : !!process.env.GEMINI_API_KEY;
  return { provider, model, configured } as const;
}

export function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) return JSON.parse(t.slice(s, e + 1));
  throw new ProviderError("Model did not return JSON");
}

function splitDataUrl(dataUrl: string) {
  const m = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new ProviderError("Bad image");
  return { mime: m[1], b64: m[2] };
}

const TRANSIENT = /RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|high demand|try again later/i;

/** Gemini with automatic fallback to lighter models when the main one is overloaded (503/429). */
async function callGemini(prompt: string, image: string, model: string): Promise<string> {
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || "gemini-flash-lite-latest,gemini-2.5-flash").split(",").map((m) => m.trim()).filter(Boolean);
  const chain = [model, ...fallbacks.filter((m) => m !== model)];
  let last: unknown;
  for (const m of chain) {
    try { return await callGeminiOnce(prompt, image, m); }
    catch (e) { last = e; if (!(e instanceof RateLimitError)) throw e; }
  }
  throw last instanceof Error ? last : new RateLimitError(20);
}

// Gemini 3+ dùng thinkingLevel, Gemini 2.5 dùng thinkingBudget; model không nhận cấu hình nào thì gọi không cấu hình.
// Mức "low" để mỗi lượt trả lời nhanh, tránh Vercel cắt 504. Ghi nhớ cấu hình hợp lệ theo model.
const THINK: Record<string, number> = {};
const THINK_CFGS = [{ thinkingLevel: process.env.GEMINI_THINKING_LEVEL || "low" }, { thinkingBudget: Number(process.env.GEMINI_THINKING_BUDGET ?? 1024) }, null];

async function callGeminiOnce(prompt: string, image: string, model: string): Promise<string> {
  const img = image ? splitDataUrl(image) : null; // không ảnh = gửi văn bản (vd nội dung Excel)
  for (let k = THINK[model] ?? 0; k < THINK_CFGS.length; k++) {
    const cfg = THINK_CFGS[k];
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [...(img ? [{ inline_data: { mime_type: img.mime, data: img.b64 } }] : []), { text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json", ...(cfg ? { thinkingConfig: cfg } : {}) },
      }),
      signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS ?? 80000)),
    }).catch((e: Error) => {
      // quá thời gian → coi như quá tải để chuyển sang model nhẹ hơn / client thử lại
      if (e.name === "TimeoutError" || e.name === "AbortError") throw new RateLimitError(5);
      throw e;
    });
    if (r.status === 429 || r.status === 503 || r.status === 500) throw new RateLimitError(Number(r.headers.get("retry-after")) || 20);
    const j = await r.json().catch(() => ({}));
    if (r.status === 400 && cfg && /thinking/i.test(JSON.stringify(j))) continue; // model không nhận cấu hình này → thử cấu hình kế
    if (!r.ok) {
      if (TRANSIENT.test(JSON.stringify(j))) throw new RateLimitError(20);
      throw new ProviderError(`Gemini ${r.status}: ${j?.error?.message ?? ""}`);
    }
    THINK[model] = k;
    return (j.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? "").join("");
  }
  throw new ProviderError("Gemini: không gọi được model");
}

async function callClaude(prompt: string, image: string, model: string): Promise<string> {
  const img = image ? splitDataUrl(image) : null;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model, max_tokens: 8000, temperature: 0,
      messages: [{ role: "user", content: [...(img ? [{ type: "image", source: { type: "base64", media_type: img.mime, data: img.b64 } }] : []), { type: "text", text: prompt }] }],
    }),
  });
  if (r.status === 429 || r.status === 529) throw new RateLimitError(Number(r.headers.get("retry-after")) || 20);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ProviderError(`Claude ${r.status}: ${j?.error?.message ?? ""}`);
  return (j.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
}

export async function runTask(task: AiTask, image: string, context: Record<string, unknown>) {
  const info = providerInfo();
  if (!info.configured) throw new ProviderError(`Chưa cấu hình API key cho ${info.provider}`);
  const prompt = buildPrompt(task, context);
  const text = info.provider === "claude" ? await callClaude(prompt, image, info.model) : await callGemini(prompt, image, info.model);
  return { provider: info.provider, model: info.model, data: extractJson(text) };
}
