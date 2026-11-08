"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogItem, Discipline, EditLog, Project, Settings } from "@/lib/core/types";
import { buildBOQ } from "@/lib/core/boq";
import { crossCheck } from "@/lib/core/crosscheck";
import { computeQuote } from "@/lib/core/pricing";
import { importTakeoff, validateTakeoff } from "@/lib/core/takeoff";
import { newId } from "@/lib/core/merge";
import { loadPdf, type PdfDoc } from "@/lib/client/pdf";
import { analyseStructure, countDevices, COUNT_DISCIPLINES } from "@/lib/client/pipeline";
import { deleteProject, download, listProjects, makeBackup, restoreBackup, type Backup, loadCatalog, loadSettings, saveCatalog, saveProject, saveSettings, slug } from "@/lib/client/store";
import { exportTakeoff } from "@/lib/core/takeoff";
import { vnd } from "@/lib/core/words";
import ReviewCanvas from "@/components/ReviewCanvas";
import BoqPanel from "@/components/BoqPanel";
import QuoteEditor from "@/components/QuoteEditor";

type Step = 0 | 1 | 2 | 3;
const STEPS = ["1. Tải bản vẽ", "2. Nhận diện trang", "3. Duyệt BOQ", "4. Báo giá"];
const DISC: Record<Discipline, string> = { legend: "Bảng ký hiệu", panel: "Sơ đồ tủ điện", lighting: "Chiếu sáng", power: "Cấp nguồn", low_voltage: "Điện nhẹ", hvac: "Điều hòa", other: "Khác (bỏ qua)" };
const today = () => new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

function guessCustomer(file: string) {
  const m = /(?:^|[_\-\s])(A|ANH|C|CHI|CHỊ)[_\-\s]+([A-ZÀ-Ỹa-zà-ỹ]+)/i.exec(file.replace(/\.pdf$/i, ""));
  if (!m) return "";
  const who = /^c/i.test(m[1]) ? "Chị" : "Anh";
  const nm = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
  return `${who} ${nm}`;
}

/** số lượng sửa tay theo mã hàng; cổng AB Gate tự kèm công tắc cổng (trừ khi đã sửa tay gate_sw) */
const extrasOverrides = (x?: Project["extras"]): Record<string, number> => {
  const o: Record<string, number> = {};
  for (const [k, v] of Object.entries(x ?? {})) if (typeof v === "number" && v >= 0) o[k] = v;
  const g = o.gate_ab ?? 0;
  if (g > 0 && o.gate_sw == null) o.gate_sw = g;
  return o;
};

export default function Home() {
  const [step, setStep] = useState<Step>(0);
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ customer: "", address: "Đắk Lắk", date: today(), areaM2: "" });
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<{ provider: string; model: string; configured: boolean } | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [saved, setSaved] = useState<Project[]>([]);
  const [q, setQ] = useState("");
  const [storageFull, setStorageFull] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    setCatalog(loadCatalog()); setSettings(loadSettings()); setSaved(listProjects());
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {});
  }, []);
  // every change is saved into this customer's own record (never overwrites another customer)
  useEffect(() => { if (project) { setStorageFull(!saveProject(project)); } }, [project]);
  useEffect(() => { if (step === 0) setSaved(listProjects()); }, [step]);

  const [showList, setShowList] = useState(false);
  const savedList = () => (<>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0 }}>Hồ sơ khách hàng ({saved.length})</h2>
                <input placeholder="Tìm tên khách / địa chỉ…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
                <span className="note">Lưu trên trình duyệt máy này. Mỗi khách 1 hồ sơ riêng – sửa khách này không ảnh hưởng khách khác.</span>
                <span style={{ flex: 1 }} />
                <button onClick={() => { const b = makeBackup(); const d = new Date(); download(`SAOLUU_STC_QUOTE_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}.json`, JSON.stringify(b), "application/json"); localStorage.setItem("stc_last_backup", b.at); setSaved(listProjects()); }}>💾 Sao lưu toàn bộ</button>
                <label className="btn ghost" style={{ cursor: "pointer" }}>♻ Khôi phục từ file sao lưu
                  <input type="file" accept="application/json" hidden onChange={async (e) => {
                    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
                    try {
                      const b = JSON.parse(await f.text()) as Backup;
                      const withPrices = confirm(`File sao lưu ngày ${new Date(b.at).toLocaleString("vi-VN")} có ${b.projects?.length ?? 0} hồ sơ khách.\n\nBấm OK: khôi phục cả bảng giá & cài đặt trong file.\nBấm Huỷ: chỉ khôi phục hồ sơ khách (giữ bảng giá hiện tại).`);
                      const r = restoreBackup(b, withPrices);
                      setSaved(listProjects()); if (withPrices) { setCatalog(loadCatalog()); setSettings(loadSettings()); }
                      alert(`Đã khôi phục: thêm ${r.added} khách, cập nhật ${r.updated} khách (bản trong file mới hơn), giữ nguyên ${r.kept} khách (bản trên máy mới hơn).`);
                    } catch (err) { alert(`Không khôi phục được: ${(err as Error).message}`); }
                  }} /></label>
              </div>
              <div className="note" style={{ marginTop: 6 }}>
                {(() => { const last = typeof window !== "undefined" ? localStorage.getItem("stc_last_backup") : null; const days = last ? Math.floor((Date.now() - Date.parse(last)) / 864e5) : null;
                  return last ? <>Sao lưu gần nhất: <b>{new Date(last).toLocaleString("vi-VN")}</b>{days! >= 7 && <b className="err"> – đã {days} ngày, nên sao lưu lại</b>}</> : <b className="err">Chưa sao lưu lần nào – hồ sơ chỉ nằm trên trình duyệt này, xoá lịch sử duyệt web là mất. Bấm “💾 Sao lưu toàn bộ”.</b>; })()}
              </div>
              {saved.length === 0 ? <p className="note">Chưa có hồ sơ nào.</p> : (
                <table className="t" style={{ marginTop: 10 }}>
                  <thead><tr><th>Khách hàng</th><th>Địa chỉ</th><th>Ngày lập</th><th>Tổng báo giá</th><th>Link online</th><th>Sửa lần cuối</th><th /></tr></thead>
                  <tbody>{saved.filter((p) => !q || `${p.customer} ${p.address}`.toLowerCase().includes(q.toLowerCase())).map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.customer}</b></td><td>{p.address}</td><td>{p.date}</td>
                      <td style={{ textAlign: "right" }}>{settings && catalog.length ? vnd(totalOf(p)) : ""}</td>
                      <td>{p.shareId ? (p.shareStatus === "locked" ? <b style={{ color: "var(--green)" }}>ĐÃ CHỐT</b> : "Đang gửi khách") : <span className="note">chưa tạo</span>}</td>
                      <td className="note">{p.updatedAt ? new Date(p.updatedAt).toLocaleString("vi-VN") : ""}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="primary" onClick={() => { openProject(p); setShowList(false); }}>{p.shareStatus === "locked" ? "Xem (đã chốt)" : "Mở / Sửa"}</button>{" "}
                        <button onClick={() => download(`HOSO_${slug(p.customer)}_${slug(p.address)}.json`, JSON.stringify(exportTakeoff(p), null, 1), "application/json")}>Tải hồ sơ</button>{" "}
                        <button className="ghost" onClick={() => { if (confirm(`Xoá hồ sơ “${p.customer} – ${p.address}” khỏi máy này?${p.shareId ? "\nLink online của khách vẫn còn; muốn sửa lại cần file HOSO đã tải." : ""}`)) { deleteProject(p.id); setSaved(listProjects()); } }}>Xoá</button>
                      </td>
                    </tr>))}</tbody>
                </table>
              )}
  </>);

  const log = (m: string, f?: number) => { setLogs((l) => [...l.slice(-200), `${new Date().toLocaleTimeString("vi-VN")}  ${m}`]); if (f != null) setProgress(f); };

  const eff = useMemo(() => (settings ? { ...settings, ...(project?.options ?? {}) } : null), [settings, project?.options]);
  const boq = useMemo(() => (project && eff ? buildBOQ(project, eff) : null), [project, eff]);
  const checks = useMemo(() => (project ? crossCheck(project) : []), [project]);
  const quote = useMemo(() => (boq && settings && catalog.length ? computeQuote(boq, catalog, eff!, extrasOverrides(project?.extras), project?.proposals) : null), [boq, catalog, eff, project?.extras, project?.proposals]);
  const totalOf = (p: Project) => { try { const s = { ...settings!, ...(p.options ?? {}) }; return computeQuote(buildBOQ(p, s), catalog, s, extrasOverrides(p.extras)).grandTotal; } catch { return 0; } };
  const openProject = (p: Project) => { setProject(p.options || !settings ? p : { ...p, options: { ...settings } }); setFile(null); setDoc(null); setStep(p.pages.some((x) => COUNT_DISCIPLINES.includes(x.discipline) && !x.analysed) && p.source !== "claude-import" ? 1 : 2); };
  const newCustomer = () => { setProject(null); setFile(null); setDoc(null); setForm({ customer: "", address: "Đắk Lắk", date: today(), areaM2: "" }); setLogs([]); setStep(0); setError(""); };

  const pick = async (f: File) => {
    setError("");
    if (f.size > 50 * 1024 * 1024) { setError("File vượt 50 MB – hãy tách bớt trang (chỉ cần các trang điện)."); return; }
    setFile(f);
    if (!form.customer) setForm((x) => ({ ...x, customer: guessCustomer(f.name) }));
    try { const d = await loadPdf(f); if (d.numPages > 300) throw new Error("Tối đa 300 trang – hãy tách bớt phần không liên quan"); setDoc(d); }
    catch (e) { setError(`Không đọc được PDF: ${(e as Error).message}`); setDoc(null); }
  };

  const newProject = (): Project => ({
    id: newId("p"), customer: form.customer.trim(), address: form.address, date: form.date, sourceName: file?.name || "",
    status: "draft", source: health?.provider === "claude" ? "claude-api" : "gemini", pages: [], legend: [], detections: [], rooms: [],
    estimates: [], edits: [], areaM2: Number(form.areaM2) || undefined,
    options: settings ? { ...settings } : undefined,   // snapshot: later changes to defaults don't move this customer's quote
  });

  const run = async (fn: (signal: AbortSignal) => Promise<void>) => {
    setBusy(true); setError(""); abort.current = new AbortController();
    try { await fn(abort.current.signal); } catch (e) { setError((e as Error).message); log(`LỖI: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };

  const startAnalyse = () => run(async (signal) => {
    if (!doc) return;
    setStep(1); setLogs([]);
    const p = await analyseStructure(doc, newProject(), log, signal);
    setProject(p);
  });

  const startCount = () => run(async (signal) => {
    if (!doc || !project) return;
    const p = await countDevices(doc, project, log, signal, (partial) => setProject(partial));
    setProject({ ...p, status: "reviewed" }); setStep(2);
  });

  const importJson = async (f: File) => {
    setError("");
    try {
      const j = JSON.parse(await f.text());
      const errs = validateTakeoff(j);
      if (errs.length) throw new Error(errs.slice(0, 5).join("; "));
      const p = importTakeoff(j, today());
      if (!p.customer && form.customer) p.customer = form.customer;
      if (saved.some((x) => x.id === p.id) && !confirm(`Hồ sơ “${p.customer}” đã có trong danh sách. Thay bằng nội dung file này?`)) return;
      setProject({ ...p, options: p.options ?? (settings ? { ...settings } : undefined), status: "reviewed" }); setStep(2);
    } catch (e) { setError(`File JSON không hợp lệ: ${(e as Error).message}`); }
  };

  const onEdit = (detections: Project["detections"], l: Omit<EditLog, "at">) =>
    setProject((p) => (p ? { ...p, detections, edits: [...p.edits, { ...l, at: new Date().toISOString() }] } : p));

  const setPageField = (index: number, patch: Partial<Project["pages"][number]>) =>
    setProject((p) => (p ? { ...p, pages: p.pages.map((x) => (x.index === index ? { ...x, ...patch } : x)),
      edits: [...p.edits, { at: new Date().toISOString(), action: `page ${index}`, before: p.pages.find((x) => x.index === index), after: patch }] } : p));
  const setEstimates = (estimates: Project["estimates"]) =>
    setProject((p) => (p ? { ...p, estimates, edits: [...p.edits, { at: new Date().toISOString(), action: "estimates", before: p.estimates, after: estimates }] } : p));

  return (
    <>
      <header className="top">
        <img src="/quote-assets/i-000.png" alt="STC" />
        <h1>STC Quote AI</h1>
        <div className="steps">{STEPS.map((s, i) => <span key={s} className={i === step ? "on" : i < step ? "done" : ""} onClick={() => project && i >= 2 && setStep(i as Step)}>{s}</span>)}</div>
        <div className="sp" />
        {project && <span className="cur">Đang làm: <b>{project.customer}</b> · {project.address}</span>}
        <button onClick={() => { setSaved(listProjects()); setShowList(true); }}>📁 Hồ sơ khách ({saved.length})</button>
        <button onClick={() => { newCustomer(); setShowList(false); }}>＋ Khách mới</button>
        {health && <span className="note">AI: {health.provider} · {health.model}{!health.configured && <b className="err"> (chưa có key)</b>}</span>}
        <button className="ghost" onClick={() => fetch("/api/logout", { method: "POST" }).then(() => (location.href = "/login"))}>Đăng xuất</button>
      </header>
      {showList && (
        <div className="modalBg" onClick={() => setShowList(false)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <button className="ghost" style={{ float: "right" }} onClick={() => setShowList(false)}>✕ Đóng</button>
            {savedList()}
          </div>
        </div>)}
      <main className="wrap">
        {error && <div className="card err">{error}</div>}
        {storageFull && <div className="card err">Bộ nhớ trình duyệt đã đầy – hãy “Tải hồ sơ” các khách cũ về máy rồi xoá bớt trong danh sách.</div>}

        {step === 0 && (
          <div className="grid2">
            <div className="card">
              <h2>Bản vẽ điện / MEP (PDF)</h2>
              <label className={`drop ${file ? "has" : ""}`}>
                <input type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
                {file ? <><b>{file.name}</b><div className="note">{doc ? `${doc.numPages} trang` : "Đang đọc…"}</div></> : <>Kéo thả hoặc bấm để chọn file PDF bản vẽ<div className="note">Hồ sơ đầy đủ (kiến trúc + điện + nước) tới 300 trang – app tự bỏ trang không liên quan điện · không lưu trên máy chủ</div></>}
              </label>
              <div className="grid2" style={{ marginTop: 14 }}>
                <label className="f">Khách hàng<input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Anh Cường" /></label>
                <label className="f">Địa chỉ công trình<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
                <label className="f">Ngày lập<input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
                <label className="f">Diện tích sàn (m², tuỳ chọn)<input value={form.areaM2} onChange={(e) => setForm({ ...form, areaM2: e.target.value })} /></label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button className="primary" disabled={!doc || !form.customer || busy || !health?.configured} onClick={startAnalyse}>Phân tích bằng AI</button>

              </div>
              {health?.provider === "gemini" && <p className="note warn" style={{ marginTop: 10 }}>Lưu ý bảo mật: AI miễn phí (Gemini free tier) – Google có thể dùng dữ liệu gói miễn phí để cải tiến dịch vụ. Với bản vẽ nhạy cảm, dùng cách “Nhập kết quả Claude” bên phải.</p>}
              {health && !health.configured && <p className="err">Máy chủ chưa có API key AI – nhờ quản trị thêm GEMINI_API_KEY trên Vercel, hoặc dùng cách nhập kết quả Claude.</p>}
            </div>
            <div className="card">
              <h2>Hoặc: nhập kết quả bóc tách từ Claude (miễn phí, bảo mật)</h2>
              <ol className="note" style={{ lineHeight: 1.7 }}>
                <li>Trong Claude, gõ <b>“báo giá”</b> và đính kèm bản vẽ (skill <i>bao-gia-ban-ve-stc</i>).</li>
                <li>Yêu cầu Claude <b>“xuất takeoff JSON cho app”</b> → tải file <code>TAKEOFF_….json</code>.</li>
                <li>Chọn file đó bên dưới (có thể kèm PDF bên trái để xem bản vẽ).</li>
              </ol>
              <label className="drop"><input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />Chọn file takeoff JSON hoặc file hồ sơ <code>HOSO_….json</code></label>
            </div>
            <div className="card" style={{ gridColumn: "1 / -1" }}>{savedList()}</div>
          </div>
        )}

        {step === 1 && (
          <div className="card">
            <h2>Nhận diện trang & bảng ký hiệu</h2>
            <div className="bar"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <div className="log">{logs.map((l, i) => <div key={i}>{l}</div>)}</div>
            {busy && <button style={{ marginTop: 10 }} onClick={() => abort.current?.abort()}>Dừng</button>}
            {project && !busy && (
              <>
                <p className="note" style={{ marginTop: 14 }}>Kiểm tra phân loại như kỹ sư trước khi đếm (sửa nếu AI nhầm). Chỉ các trang Chiếu sáng / Cấp nguồn / Điện nhẹ / Điều hòa được đếm thiết bị.</p>
                <table className="t">
                  <thead><tr><th>Trang</th><th>Tên bản vẽ (AI đọc)</th><th>Bộ môn</th><th>Tầng</th><th>Tin cậy</th></tr></thead>
                  <tbody>{project.pages.map((p) => (
                    <tr key={p.index} style={{ opacity: ["other"].includes(p.discipline) ? 0.45 : 1 }}>
                      <td>{p.index}</td><td>{p.title}</td>
                      <td><select value={p.discipline} onChange={(e) => setPageField(p.index, { discipline: e.target.value as Discipline })}>{Object.entries(DISC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                      <td><input value={p.floor} style={{ width: 100 }} onChange={(e) => setPageField(p.index, { floor: e.target.value })} /></td>
                      <td className={p.confidence < 0.5 ? "warn" : ""}>{Math.round(p.confidence * 100)}%{p.confidence < 0.5 && " – kiểm tra lại (bản scan/mờ?)"}</td>
                    </tr>))}</tbody>
                </table>
                <p className="note">Bảng ký hiệu đọc được: {project.legend.length ? project.legend.map((l) => `${l.name} → ${l.deviceType}`).join(" · ") : <b className="warn">không tìm thấy – dùng ký hiệu chuẩn</b>}</p>
                <button className="primary" onClick={startCount} disabled={!project.pages.some((p) => COUNT_DISCIPLINES.includes(p.discipline))}>{project.pages.some((p) => p.analysed) ? "Tiếp tục đếm các trang còn lại" : "Đếm thiết bị (2 lượt: đếm + soát lại)"}</button>
              </>
            )}
          </div>
        )}

        {step === 2 && project && boq && (
          <div className="review">
            <ReviewCanvas doc={doc} project={project} highlight={highlight} onEdit={onEdit} />
            <div>
              <BoqPanel project={project} boq={boq} checks={checks} onHighlight={setHighlight} onEstimates={setEstimates} />
              <button className="primary" style={{ width: "100%" }} onClick={() => setStep(3)}>Sang bước báo giá →</button>
            </div>
          </div>
        )}

        {step === 3 && project && boq && quote && eff && (
          <QuoteEditor project={project} doc={doc} boq={boq} quote={quote} checks={checks} catalog={catalog} settings={eff}
            onCatalog={(c) => { setCatalog(c); saveCatalog(c); }}
            onSettings={(s) => setProject((p) => (p ? { ...p, options: s } : p))}
            onSaveDefaults={() => { setSettings(eff); saveSettings(eff); }}
            onProject={(patch) => setProject((p) => (p ? { ...p, ...patch } : p))}
            onExported={() => setProject((p) => (p ? { ...p, status: "exported" } : p))} />
        )}
      </main>
    </>
  );
}
