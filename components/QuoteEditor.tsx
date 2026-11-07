"use client";
import type { CatalogItem, CrossCheck, Project, Settings } from "@/lib/core/types";
import type { BOQResult } from "@/lib/core/boq";
import type { Quote } from "@/lib/core/pricing";
import { vnd } from "@/lib/core/words";
import { buildExcel } from "@/lib/client/excel";
import { download, slug } from "@/lib/client/store";
import { exportTakeoff } from "@/lib/core/takeoff";
import { canExport } from "@/lib/core/boq";
import { buildTechBoq } from "@/lib/client/excel";

export interface PrintPayload { project: Pick<Project, "customer" | "address" | "date" | "sourceName">; boq: BOQResult; quote: Quote; checks: CrossCheck[]; settings: Settings }

export default function QuoteEditor({ project, boq, quote, checks, catalog, settings, onCatalog, onSettings, onExported }: {
  project: Project; boq: BOQResult; quote: Quote; checks: CrossCheck[]; catalog: CatalogItem[]; settings: Settings;
  onCatalog: (c: CatalogItem[]) => void; onSettings: (s: Settings) => void; onExported: () => void;
}) {
  const reviewed = canExport(project);
  const name = `BAO_GIA_TONG_HOP_${slug(project.customer)}_STC_CROP`;
  const setItem = (code: string, patch: Partial<CatalogItem>) => onCatalog(catalog.map((c) => (c.code === code ? { ...c, ...patch } : c)));

  const printPdf = () => {
    const payload: PrintPayload = { project: { customer: project.customer, address: project.address, date: project.date, sourceName: project.sourceName }, boq, quote, checks, settings };
    localStorage.setItem("stc_print", JSON.stringify(payload));
    window.open("/quote/print", "_blank"); onExported();
  };
  const excel = async () => { download(`${name}.xlsx`, await buildExcel(project, boq, quote, settings, checks), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); onExported(); };
  const json = () => download(`TAKEOFF_${slug(project.customer)}.json`, JSON.stringify(exportTakeoff(project), null, 1), "application/json");

  return (
    <div className="grid2" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
      <div className="card">
        <h2>Bảng giá & chiết khấu (lưu trên máy này)</h2>
        <table className="t">
          <thead><tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá niêm yết</th><th>Giảm</th></tr></thead>
          <tbody>
            {quote.sections.flatMap((s) => s.lines).concat(quote.lightLines).map((l) => (
              <tr key={l.code}>
                <td>{l.name}</td><td>{l.qty}</td>
                <td><input type="number" value={l.price} style={{ width: 120 }} onChange={(e) => setItem(l.code, { price: Number(e.target.value) })} /></td>
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
          <button className="primary" disabled={!reviewed} onClick={printPdf}>In / Lưu PDF 7 trang</button>
          <button disabled={!reviewed} onClick={excel}>Tải Excel</button>
          <button disabled={!reviewed} onClick={async () => download(`BOQ_KY_THUAT_${slug(project.customer)}.xlsx`, await buildTechBoq(project, boq), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}>Tải BOQ kỹ thuật</button>
          <button onClick={json}>Xuất takeoff JSON</button>
        </div>
        <p className="note">PDF: trong hộp thoại in chọn “Lưu dưới dạng PDF”, khổ A4, lề “Không”, bật “Đồ hoạ nền”.</p>
      </div>
    </div>
  );
}
