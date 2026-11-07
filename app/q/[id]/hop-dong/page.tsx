import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ContractDoc from "@/components/ContractDoc";
import { readShare } from "@/lib/server/shares";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hợp đồng – STC CROP", robots: { index: false, follow: false } };

export default async function Contract({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = await readShare(id);
  if (!rec) notFound();
  if (rec.status !== "locked" || !rec.deposit || !rec.contractNo)
    return <p style={{ padding: 40, fontFamily: "sans-serif" }}>Hợp đồng chỉ được lập sau khi báo giá đã chốt (khách đã đặt cọc). <a href={`/q/${id}`}>Xem báo giá</a></p>;
  return <ContractDoc rec={{ payload: rec.payload, deposit: rec.deposit, contractNo: rec.contractNo, lockedAt: rec.lockedAt! }} backHref={`/q/${id}`} />;
}
