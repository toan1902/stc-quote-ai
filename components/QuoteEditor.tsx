"use client";
import { useEffect, useRef, useState } from "react";
import type { CatalogItem, CrossCheck, Project, Settings } from "@/lib/core/types";
import type { BOQResult } from "@/lib/core/boq";
import type { Quote } from "@/lib/core/pricing";
import { vnd } from "@/lib/core/words";
import { buildExcel } from "@/lib/client/excel";
import { download, slug } from "@/lib/client/store";
import { exportTakeoff } from "@/lib/core/takeoff";
import { canExport } from "@/lib/core/boq";
import { buildTechBoq } from "@/lib/client/excel";
import type { PdfDoc } from "@/lib/client/pdf";
import { buildProposalDrawings, type ProposalDrawing } from "@/lib/client/proposal";

export interface PrintPayload {
  project: Pick<Project, "customer" | "address" | "date" | "sourceName">; boq: BOQResult; quote: Quote; checks: CrossCheck[]; settings: Settings;
  drawings?: ProposalDrawing[];   // proposal drawing pages – local PDF only, never uploaded
}
interface ShareInfo { id: string; version: number; status: "live" | "locked"; updatedAt: string; deposit?: { amount: number; date: string; method: string; phone?: string }; contractNo?: string }

export default function QuoteEditor({ project, doc, boq, quote, checks, catalog, settings, onCatalog, onSettings, onProject, onExported }: {
  project: Project; doc: PdfDoc | null; boq: BOQResult; quote: Quote; checks: CrossCheck[]; catalog: CatalogItem[]; settings: Settings;
  onCatalog: (c: CatalogItem[]) => void; onSettings: (s: Settings) => void; onProject: (patch: Partial<Project>) => void; onExported: () => void;
}) {
  const reviewed = canExport(project);
  const name = `BAO_GIA_TONG_HOP_${slug(project.customer)}_STC_CROP`;
  const setItem = (code: string, patch: Partial<CatalogItem>) => onCatalog(catalog.map((c) => (c.code === code ? { ...c, ...patch } : c)));
  const propN = boq.proposals.reduce((a, p) => a + p.ids.length, 0);
  const gate = catalog.find((c) => c.code === "gate_ab");
  const gateN = project.extras?.gate_ab ?? 0;
  const [busyPdf, setBusyPdf] = useState(false);

  const payload = (): PrintPayload => ({ project: { customer: project.customer, address: project.address, date: project.date, sourceName: project.sourceName }, boq, quote, checks, settings });

  const printPdf = async () => {
    const p = payload();
    localStorage.setItem("stc_print", JSON.stringify(p));
    if (settings.includeProposal && propN && doc) {
      setBusyPdf(true);
      try { p.drawings = await buildProposalDrawings(doc, project, boq); } finally { setBusyPdf(false); }
    }
    (window as Window & { stcPrint?: PrintPayload }).stcPrint = p;
    window.open("/quote/print", "_blank"); onExported();
  };
  const excel = async () => { download(`${name}.xlsx`, await buildExcel(project, boq, quote, settings, checks), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); onExported(); };
  const json = () => download(`TAKEOFF_${slug(project.customer)}.json`, JSON.stringify(exportTakeoff(project), null, 1), "application/json");

  // ---------- online link ----------
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [shareMsg, setShareMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [dep, setDep] = useState({ amount: "", date: new Date().toLocaleDateString("vi-VN"), method: "Chuyển khoản", phone: "", note: "" });
  const link = share ? `${location.origin}/q/${share.id}` : "";
  const locked = share?.status === "locked";
  const lastSent = useRef("");

  useEffect(() => { // load status of an existing link
    if (!project.shareId) { setShare(null); return; }
    fetch(`/api/share/${project.shareId}`).then((r) => r.json()).then((j) => j.record && setShare(j.record)).catch(() => {});
  }, [project.shareId]);

  const push = async (auto = false) => {
    const body = JSON.stringify({ id: project.shareId, payload: payload() });
    if (auto && body === lastSent.current) return;
    setSyncing(true); setShareMsg("");
    try {
      const r = await fetch("/api/share", { method: "POST", headers: { "content-type": "application/json" }, body });
      const j = await r.json();
      if (j.record) { setShare(j.record); if (j.record.id !== project.shareId) onProject({ shareId: j.record.id }); }
      if (!r.ok) setShareMsg(j.error || `Lỗi ${r.status}`); else lastSent.current = body;
    } catch (e) { setShareMsg((e as Error).message); } finally { setSyncing(false); }
  };
  // auto-update the live link 2.5 s after any change (prices, quantities, settings)
  useEffect(() => {
    if (!project.shareId || locked || !reviewed) return;
    const t = setTimeout(() => push(true), 2500);
    return () => clearTimeout(t);
  }, [quote, settings, project.customer, project.address, project.date, project.shareId, locked]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action: "lock" | "unlock") => {
    if (!share) return;
    if (action === "lock" && !confirm(`Xác nhận khách đã cọc ${vnd(Number(dep.amount) || 0)} và CHỐT báo giá?\nSau khi chốt, link báo giá không thay đổi nữa và hợp đồng được lập.`)) return;
    if (action === "unlock" && !confirm("Mở khoá để sửa báo giá? Link khách đang xem sẽ cập nhật lại theo thay đổi mới.")) return;
    if (action === "lock") await push(); // send the final numbers before freezing
    const r = await fetch(`/api/share/${share.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, deposit: { ...dep, amount: Number(dep.amount) } }) });
    const j = await r.json(); if (j.record) setShare(j.record); setShareMsg(r.ok ? "" : j.error);
  };

  return (
    <div className="grid2" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
      <div>
        <div className="card">
          <h2>Bảng giá & chiết khấu (lưu trên máy này)</h2>
          <table className="t">
            <thead><tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá niêm yết</th><th>Giảm</th></tr></thead>
            <tbody>
              {quote.sections.flatMap((s) => s.lines).concat(quote.lightLines).map((l) => (
                <tr key={l.code}>
                  <td>{l.name}{l.vn && <span className="vnTag">VN</span>}</td><td>{l.qty}</td>
                  <td><input type="number" value={l.price} style={{ width: 120 }} onChange={(e) => setItem(l.code.replace(/^prop_/, ""), { price: Number(e.target.value) })} /></td>
                  <td>{l.section === "light" ? "–" : <input type="number" step="1" value={Math.round(l.discount * 100)} style={{ width: 64 }} onChange={(e) => setItem(l.code, { discount: Number(e.target.value) / 100 })} />}{l.section !== "light" && "%"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid3" style={{ marginTop: 12 }}>
            <label className="f">Phí lắp đặt Smart Home (%)<input type="number" value={settings.installRate * 100} onChange={(e) => onSettings({ ...settings, installRate: Number(e.target.value) / 100 })} /></label>
            <label className="f">Chiết khấu đèn (%)<input type="number" value={settings.lightDiscount * 100} onChange={(e) => onSettings({ ...settings, lightDiscount: Number(e.target.value) / 100 })} /></label>
            <label className="f">Downlight báo giá bằng
              <select value={settings.defaultDownlight} onChange={(e) => onSettings({ ...settings, defaultDownlight: e.target.value as Settings["defaultDownlight"] })}>
                <option value="downlight_ab">Downlight AB (thường)</option><option value="athena">Spotlight Athena thông minh</option><option value="spotlight_ab">Spotlight AB</option>
              </select></label>
            <label className="f">Gộp công tắc đặt sát nhau
              <select value={settings.mergeAdjacentSwitches ? "1" : "0"} onChange={(e) => onSettings({ ...settings, mergeAdjacentSwitches: e.target.value === "1" })}>
                <option value="1">Có (1 mặt nhiều nút)</option><option value="0">Không</option></select></label>
            <label className="f">Ray rèm mặc định (m/điểm)<input type="number" step="0.5" value={settings.railPerCurtainM} onChange={(e) => onSettings({ ...settings, railPerCurtainM: Number(e.target.value) })} /></label>
          </div>
        </div>

        <div className="card">
          <h2>Đề xuất thêm & hạng mục ngoài bản vẽ</h2>
          <label className="chk"><input type="checkbox" checked={settings.includeProposal} onChange={(e) => onSettings({ ...settings, includeProposal: e.target.checked })} />
            <span><b>Đưa đề xuất spotlight vào báo giá</b> – cộng tiền đèn đề xuất + thêm trang bản vẽ đánh dấu vị trí (vòng cam).<br />
              <span className="note">{propN ? `Đang có ${propN} spotlight đề xuất trên ${boq.proposals.length} trang.` : "Chưa có điểm đề xuất – ở bước Duyệt BOQ chọn “★ Spotlight đề xuất thêm” rồi Alt + click lên bản vẽ."}{propN > 0 && !doc && " (Cần mở kèm file PDF bản vẽ để in trang bản vẽ đề xuất.)"}</span></span></label>
          <label className="f" style={{ maxWidth: 320 }}>Loại đèn cho spotlight đề xuất
            <select value={settings.proposalSpot} onChange={(e) => onSettings({ ...settings, proposalSpot: e.target.value as Settings["proposalSpot"] })}>
              <option value="athena">Spotlight Athena thông minh (chỉnh sáng/màu qua app)</option><option value="spotlight_ab">Spotlight AB thường</option></select></label>
          <hr />
          <div className="grid3">
            <label className="f"><span>Cổng tự động âm sàn AB Gate (số bộ) <span className="vnTag">Hàng Việt Nam</span></span>
              <input type="number" min={0} value={gateN} onChange={(e) => onProject({ extras: { ...project.extras, gate_ab: Math.max(0, Number(e.target.value) || 0) } })} /></label>
            <label className="f">Giá niêm yết 1 bộ (đ)
              <input type="number" min={0} value={gate?.price ?? 0} onChange={(e) => setItem("gate_ab", { price: Number(e.target.value) })} /></label>
            <label className="f">Giá bán sau giảm 1 bộ (đ)
              <input type="number" min={0} value={gate?.salePrice ?? 0} onChange={(e) => { const v = Number(e.target.value) || 0; setItem("gate_ab", { salePrice: v, discount: gate?.price ? Math.max(0, 1 - v / gate.price) : 0 }); }} /></label>
          </div>
          {gateN > 0 && !(gate?.price) && <p className="warn">Nhập đơn giá bộ cổng AB – chưa có giá thì cổng chưa được đưa vào báo giá.</p>}
          {gateN > 0 && !!gate?.price && <p className="note">Báo giá tự thêm {gateN} công tắc điều khiển cổng FPT (mở cổng qua app/kịch bản) và 1 trang “Dự toán cổng tự động AB Gate”. Lắp đặt, cài hành trình cổng: <b>miễn phí</b> khi chọn hệ sinh thái FPT Smart Home. Chưa gồm pin Lithium, xây hố/đế âm sàn, thoát nước, đường điện tới chân cổng.</p>}
        </div>
      </div>

      <div>
        <div className="card">
          <h2>Tổng hợp báo giá – {project.customer}</h2>
          <div className="kpi"><span>Smart Home – niêm yết</span><b>{vnd(quote.niem)}</b></div>
          <div className="kpi"><span>Giảm giá</span><b style={{ color: "var(--green)" }}>{vnd(quote.giam)}</b></div>
          <div className="kpi"><span>Lắp đặt, cấu hình</span><b>{vnd(quote.lapDat)}</b></div>
          <div className="kpi"><span>Smart Home</span><b>{vnd(quote.shTotal)}</b></div>
          <div className="kpi"><span>Chiếu sáng (sau chiết khấu)</span><b>{vnd(quote.lTotal)}</b></div>
          <hr />
          <div className="kpi big"><span>TỔNG CỘNG</span><span>{vnd(quote.grandTotal)}</span></div>
          <p className="note"><i>{quote.grandWords}</i></p>
          {checks.some((c) => c.severity !== "info") && <p className="warn">Còn {checks.filter((c) => c.severity !== "info").length} cảnh báo đối soát – sẽ được ghi vào ghi chú báo giá.</p>}
          {!reviewed && <p className="err">Cần mở bước Duyệt BOQ trước khi xuất (Nguyên tắc IV).</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button className="primary" disabled={!reviewed || busyPdf} onClick={printPdf}>{busyPdf ? "Đang dựng bản vẽ đề xuất…" : `In / Lưu PDF${settings.includeProposal && propN ? " (kèm bản vẽ đề xuất)" : " 7 trang"}`}</button>
            <button disabled={!reviewed} onClick={excel}>Tải Excel</button>
            <button disabled={!reviewed} onClick={async () => download(`BOQ_KY_THUAT_${slug(project.customer)}.xlsx`, await buildTechBoq(project, boq), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}>Tải BOQ kỹ thuật</button>
            <button onClick={json}>Xuất takeoff JSON</button>
          </div>
          <p className="note">PDF: trong hộp thoại in chọn “Lưu dưới dạng PDF”, khổ A4, lề “Không”, bật “Đồ hoạ nền”.</p>
        </div>

        <div className="card">
          <h2>Link báo giá online cho khách</h2>
          {!share ? (
            <>
              <p className="note">Tạo 1 link duy nhất gửi khách (Zalo). Mỗi lần anh sửa giá/số lượng, link tự cập nhật – không cần gửi lại. Chỉ lưu số liệu báo giá, <b>không</b> lưu bản vẽ.</p>
              <button className="primary" disabled={!reviewed || syncing} onClick={() => push()}>{syncing ? "Đang tạo…" : "Tạo link báo giá"}</button>
            </>
          ) : (
            <>
              <div className="linkrow"><input readOnly value={link} onFocus={(e) => e.target.select()} />
                <button onClick={() => navigator.clipboard.writeText(link).then(() => setShareMsg("Đã chép link"))}>Chép</button>
                <a className="btn" href={link} target="_blank" rel="noreferrer">Mở</a></div>
              {locked ? (
                <div className="okbox">
                  <b>ĐÃ CHỐT</b> – cọc {vnd(share.deposit?.amount ?? 0)} ngày {share.deposit?.date}. Hợp đồng số <b>{share.contractNo}</b>.
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <a className="btn primary" href={`/q/${share.id}/hop-dong`} target="_blank" rel="noreferrer">Mở hợp đồng</a>
                    <button className="ghost" onClick={() => act("unlock")}>Mở khoá để sửa</button>
                  </div>
                  <p className="note">Đã chốt: sửa trong app không làm đổi link khách đang xem.</p>
                </div>
              ) : (
                <>
                  <p className="note">{syncing ? "Đang cập nhật link…" : `Link đang tự cập nhật · bản ${share.version} · ${new Date(share.updatedAt).toLocaleTimeString("vi-VN")}`}</p>
                  <h3 style={{ marginTop: 10 }}>Khách đã cọc → chốt & lập hợp đồng</h3>
                  <div className="grid2">
                    <label className="f">Số tiền cọc (đ)<input type="number" value={dep.amount} placeholder={String(Math.round(quote.grandTotal * 0.5))} onChange={(e) => setDep({ ...dep, amount: e.target.value })} /></label>
                    <label className="f">Ngày cọc<input value={dep.date} onChange={(e) => setDep({ ...dep, date: e.target.value })} /></label>
                    <label className="f">Hình thức<select value={dep.method} onChange={(e) => setDep({ ...dep, method: e.target.value })}><option>Chuyển khoản</option><option>Tiền mặt</option></select></label>
                    <label className="f">SĐT khách (ghi vào HĐ)<input value={dep.phone} onChange={(e) => setDep({ ...dep, phone: e.target.value })} /></label>
                  </div>
                  <label className="f">Ghi chú (vd mã giao dịch)<input value={dep.note} onChange={(e) => setDep({ ...dep, note: e.target.value })} /></label>
                  <button className="primary" style={{ marginTop: 8 }} disabled={!Number(dep.amount)} onClick={() => act("lock")}>Xác nhận đã cọc & chốt báo giá</button>
                </>
              )}
            </>
          )}
          {shareMsg && <p className={/Đã chép/.test(shareMsg) ? "note" : "err"}>{shareMsg}</p>}
        </div>
      </div>
    </div>
  );
}
