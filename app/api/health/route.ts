import { NextResponse } from "next/server";
import { providerInfo } from "@/lib/ai/providers";
export async function GET() {
  const { provider, model, configured } = providerInfo();
  return NextResponse.json({ ok: true, provider, model, configured, passwordSet: !!process.env.APP_PASSWORD });
}
