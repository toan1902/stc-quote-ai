"use client";
import { useEffect, useState } from "react";
import type { PrintPayload } from "@/components/QuoteEditor";
import ContractDoc, { type PartyA } from "@/components/ContractDoc";

interface Form extends PartyA { no: string; amount: string; date: string; method: string; signDate: string }
const today = () => new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });

/** Soạn hợp đồng từ báo giá đang mở trong app – tự lấy khách, địa chỉ, hạng mục, giá; nhân viên chỉ nhập cọc & CCCD. */
export default function ContractDraft() {
  const [d, setD] = useState<PrintPayload | null>(null);
  const [f, setF] = useState<Form>({ no: "", amount: "", date: today(), method: "Chuyển khoản", signDate: today() });
  const key = d ? `stc_contract_${d.project.customer}_${d.project.address}` : "";
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("stc_print") || "null") as PrintPayload | null; setD(p);
      if (p) { const saved = JSON.parse(localStorage.getItem(`stc_contract_${p.project.customer}_${p.project.address}`) || "null"); if (saved) setF((x) => ({ ...x, ...saved })); }
    } catch { setD(null); }
  }, []);
  useEffect(() => { if (key) try { localStorage.setItem(key, JSON.stringify(f)); } catch { /* ignore */ } }, [key, f]);
  if (!d) return <p style={{ padding: 40 }}>Không có dữ liệu báo giá – quay lại app (bước 4) và bấm “Soạn hợp đồng”.</p>;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const [dd, mm, yy] = f.signDate.split("/");
  const signedIso = yy ? new Date(Number(yy), Number(mm) - 1, Number(dd), 12).toISOString() : undefined;
  const amount = Number(String(f.amount).replace(/\D/g, "")) || 0;
  const inp = (label: string, k: keyof Form, ph = "", w = 150) => <label style={{ display: "inline-flex", flexDirection: "column", fontSize: 12, marginRight: 10 }}>{label}<input value={(f[k] as string) ?? ""} placeholder={ph} onChange={set(k)} style={{ width: w, padding: 5 }} /></label>;
  return (
    <>
      <div className="noprint" style={{ maxWidth: 900, margin: "12px auto", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, fontFamily: "sans-serif" }}>
        <b>Thông tin hợp đồng – {d.project.customer}</b> <span style={{ fontSize: 12, color: "#64748b" }}>(tự lưu trên máy này)</span>
        <div style={{ marginTop: 8 }}>
          {inp("Số hợp đồng", "no", "vd 261108-01/HĐ-STC", 170)}{inp("Ngày ký (dd/mm/yyyy)", "signDate", "", 110)}
          {inp("Tiền cọc (đ)", "amount", "vd 10000000", 120)}{inp("Ngày cọc", "date", "", 100)}{inp("Hình thức cọc", "method", "", 120)}
        </div>
        <div style={{ marginTop: 6 }}>
          {inp("Điện thoại Bên A", "phone", "", 120)}{inp("Số CCCD", "cccd", "", 130)}{inp("Ngày cấp", "cccdDate", "", 100)}{inp("Nơi cấp", "cccdPlace", "", 160)}
        </div>
      </div>
      <ContractDoc draft partyA={f} rec={{ payload: d, contractNo: f.no, lockedAt: signedIso, deposit: amount ? { amount, date: f.date, method: f.method } : null }} />
    </>
  );
}
