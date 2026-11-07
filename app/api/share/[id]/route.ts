import { NextResponse } from "next/server";
import { contractNoFor, readShare, storageReady, summary, writeShare, type Deposit } from "@/lib/server/shares";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const rec = await readShare((await params).id);
  return rec ? NextResponse.json({ record: summary(rec) }) : NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
}

/** Staff actions: { action: "lock", deposit } → chốt sau khi cọc (sinh số hợp đồng); { action: "unlock" } → mở lại. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!storageReady()) return NextResponse.json({ error: "Chưa bật kho lưu trữ" }, { status: 503 });
  const rec = await readShare((await params).id);
  if (!rec) return NextResponse.json({ error: "Không tìm thấy báo giá" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; deposit?: Partial<Deposit> };
  const now = new Date();
  if (body.action === "lock") {
    const d = body.deposit ?? {};
    const amount = Math.round(Number(d.amount) || 0);
    if (amount <= 0) return NextResponse.json({ error: "Nhập số tiền cọc" }, { status: 400 });
    rec.status = "locked";
    rec.deposit = { amount, date: String(d.date || now.toLocaleDateString("vi-VN")), method: String(d.method || "Chuyển khoản"), phone: d.phone ? String(d.phone).slice(0, 20) : undefined, note: d.note ? String(d.note).slice(0, 300) : undefined };
    rec.lockedAt = now.toISOString();
    rec.contractNo = rec.contractNo ?? contractNoFor(rec.id, now);
  } else if (body.action === "unlock") {
    rec.status = "live"; rec.lockedAt = undefined; // keep deposit + contract no. for history
  } else return NextResponse.json({ error: "action không hợp lệ" }, { status: 400 });
  rec.version++; rec.updatedAt = now.toISOString();
  await writeShare(rec);
  return NextResponse.json({ record: summary(rec) });
}
