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

async function callGemini(prompt: string, image: string, model: string): Promise<string> {
  const { mime, b64 } = splitDataUrl(image);
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });
  if (r.status === 429) throw new RateLimitError(Number(r.headers.get("retry-after")) || 30);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (JSON.stringify(j).includes("RESOURCE_EXHAUSTED")) throw new RateLimitError(30);
    throw new ProviderError(`Gemini ${r.status}: ${j?.error?.message ?? ""}`);
  }
  return (j.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}

async function callClaude(prompt: string, image: string, model: string): Promise<string> {
  const { mime, b64 } = splitDataUrl(image);
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model, max_tokens: 8000, temperature: 0,
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data: b64 } }, { type: "text", text: prompt }] }],
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
