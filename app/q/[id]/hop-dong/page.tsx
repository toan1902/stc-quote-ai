import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ContractDoc from "@/components/ContractDoc";
import { readShare } from "@/lib/server/shares";
import ViewPing from "@/components/ViewPing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hợp đồng – STC CROP", robots: { index: false, follow: false } };

export default async function Contract({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = await readShare(id);
  if (!rec) notFound();
  // chưa chốt: cho khách xem/tải bản DỰ THẢO theo báo giá hiện tại (chưa có cọc, số HĐ)
  if (rec.status !== "locked" || !rec.deposit || !rec.contractNo)
    return <><ViewPing id={id} p="hd" /><ContractDoc draft="BẢN DỰ THẢO – nội dung lấy theo báo giá hiện tại. Hợp đồng chính thức (số hợp đồng, tiền cọc, thông tin CCCD) được lập khi Quý khách đặt cọc." rec={{ payload: rec.payload }} backHref={`/q/${id}`} /></>;
  return <><ViewPing id={id} p="hd" /><ContractDoc rec={{ payload: rec.payload, deposit: rec.deposit, contractNo: rec.contractNo, lockedAt: rec.lockedAt! }} backHref={`/q/${id}`} /></>;
}
