import { NextResponse } from "next/server";
import { COOKIE, verifyToken } from "@/lib/auth";
import { readShare, storageReady, validId } from "@/lib/server/shares";
import { addView, deviceOf } from "@/lib/server/views";

export const runtime = "nodejs";

/** Trang khách gọi sau khi mở link vài giây (bot xem trước link của Zalo/Facebook không chạy JS nên không bị tính). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!storageReady() || !validId(id)) return NextResponse.json({ ok: false });
  const cookie = req.headers.get("cookie") || "";
  const tok = cookie.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (await verifyToken(tok ? decodeURIComponent(tok) : undefined)) return NextResponse.json({ ok: true, staff: true }); // nhân viên xem thì không tính
  if (!(await readShare(id))) return NextResponse.json({ ok: false });
  const page = new URL(req.url).searchParams.get("p") === "hd" ? "hợp đồng" : undefined;
  await addView(id, deviceOf(req.headers.get("user-agent") || ""), page);
  return NextResponse.json({ ok: true });
}
