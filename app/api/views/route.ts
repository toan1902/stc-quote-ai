import { NextResponse } from "next/server";
import { storageReady, validId } from "@/lib/server/shares";
import { readViews } from "@/lib/server/views";

export const runtime = "nodejs";

/** Nhân viên: lượt khách xem các link. GET /api/views?ids=a,b */
export async function GET(req: Request) {
  if (!storageReady()) return NextResponse.json({ views: {} });
  const ids = (new URL(req.url).searchParams.get("ids") || "").split(",").filter(validId).slice(0, 100);
  const out: Record<string, Awaited<ReturnType<typeof readViews>>> = {};
  await Promise.all(ids.map(async (id) => { out[id] = await readViews(id).catch(() => ({ count: 0, recent: [] })); }));
  return NextResponse.json({ views: out }, { headers: { "cache-control": "no-store" } });
}
