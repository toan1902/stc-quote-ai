import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QuoteDoc from "@/components/QuoteDoc";
import PrintButton from "@/components/PrintButton";
import { readShare } from "@/lib/server/shares";
import { vnd } from "@/lib/core/words";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Báo giá – STC CROP", robots: { index: false, follow: false } };

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "");

export default async function PublicQuote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = await readShare(id);
  if (!rec) notFound();
  const locked = rec.status === "locked";
  const banner = locked ? (
    <div className="qbanner locked">
      <b>ĐÃ CHỐT BÁO GIÁ</b> · Đã nhận cọc {vnd(rec.deposit?.amount ?? 0)} ngày {rec.deposit?.date} · Hợp đồng số {rec.contractNo}
      <a href={`/q/${id}/hop-dong`}>Xem hợp đồng</a><PrintButton />
    </div>
  ) : (
    <div className="qbanner live">
      <span><b>Báo giá trực tuyến</b> · cập nhật lần cuối {fmt(rec.updatedAt)} (bản {rec.version}). Link này luôn hiển thị bản mới nhất; giá trị chỉ cố định sau khi Quý khách đặt cọc.</span>
      <PrintButton />
    </div>
  );
  return <QuoteDoc d={rec.payload} toolbar={banner} />;
}
