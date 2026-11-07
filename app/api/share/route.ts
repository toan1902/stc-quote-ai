import { NextResponse } from "next/server";
import { newShareId, readShare, storageReady, stripDrawings, summary, validId, writeShare, type ShareRecord } from "@/lib/server/shares";
import type { PrintPayload } from "@/components/QuoteEditor";

export const runtime = "nodejs";

/** Create or update a shared quote (staff only – protected by middleware). Locked quotes cannot change. */
export async function POST(req: Request) {
  if (!storageReady()) return NextResponse.json({ error: "Chưa bật kho lưu trữ (Vercel Blob) – xem hướng dẫn cài đặt." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { id?: string; payload?: PrintPayload } | null;
  if (!body?.payload?.quote || !body.payload.project) return NextResponse.json({ error: "Thiếu dữ liệu báo giá" }, { status: 400 });
  const payload = stripDrawings(body.payload);
  if (JSON.stringify(payload).length > 2_000_000) return NextResponse.json({ error: "Báo giá quá lớn" }, { status: 413 });
  const now = new Date().toISOString();
  let rec: ShareRecord | null = body.id && validId(body.id) ? await readShare(body.id) : null;
  if (rec?.status === "locked") return NextResponse.json({ error: "Báo giá đã chốt (khách đã cọc) – không sửa được nữa.", record: summary(rec) }, { status: 409 });
  rec = rec ? { ...rec, payload, version: rec.version + 1, updatedAt: now }
            : { id: newShareId(), version: 1, status: "live", payload, createdAt: now, updatedAt: now };
  await writeShare(rec);
  return NextResponse.json({ record: summary(rec) });
}
