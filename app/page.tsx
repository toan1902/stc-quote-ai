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
import { clearDraft, loadCatalog, loadDraft, loadSettings, saveCatalog, saveDraft, saveSettings } from "@/lib/client/store";
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

const extrasOverrides = (x?: Project["extras"]): Record<string, number> => {
  const g = x?.gate_ab ?? 0;
  return g > 0 ? { gate_ab: g, gate_sw: g } : {};
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
  const [draft, setDraft] = useState<Project | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    setCatalog(loadCatalog()); setSettings(loadSettings()); setDraft(loadDraft());
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {});
  }, []);
  useEffect(() => { if (project) saveDraft(project); }, [project]);

  const log = (m: string, f?: number) => { setLogs((l) => [...l.slice(-200), `${new Date().toLocaleTimeString("vi-VN")}  ${m}`]); if (f != null) setProgress(f); };

  const boq = useMemo(() => (project && settings ? buildBOQ(project, settings) : null), [project, settings]);
  const checks = useMemo(() => (project ? crossCheck(project) : []), [project]);
  const quote = useMemo(() => (boq && settings && catalog.length ? computeQuote(boq, catalog, settings, extrasOverrides(project?.extras)) : null), [boq, catalog, settings, project?.extras]);

  const pick = async (f: File) => {
    setError("");
    if (f.size > 50 * 1024 * 1024) { setError("File vượt 50 MB – hãy tách bớt trang (chỉ cần các trang điện)."); return; }
    setFile(f);
    if (!form.customer) setForm((x) => ({ ...x, customer: guessCustomer(f.name) }));
    try { const d = await loadPdf(f); if (d.numPages > 50) throw new Error("Tối đa 50 trang"); setDoc(d); }
    catch (e) { setError(`Không đọc được PDF: ${(e as Error).message}`); setDoc(null); }
  };

  const newProject = (): Project => ({
    id: newId("p"), customer: form.customer.trim(), address: form.address, date: form.date, sourceName: file?.name || "",
    status: "draft", source: health?.provider === "claude" ? "claude-api" : "gemini", pages: [], legend: [], detections: [], rooms: [],
    estimates: [], edits: [], areaM2: Number(form.areaM2) || undefined,
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
      setProject({ ...p, status: "reviewed" }); setStep(2);
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
        {health && <span className="note">AI: {health.provider} · {health.model}{!health.configured && <b className="err"> (chưa có key)</b>}</span>}
        <button className="ghost" onClick={() => fetch("/api/logout", { method: "POST" }).then(() => (location.href = "/login"))}>Đăng xuất</button>
      </header>
      <main className="wrap">
        {error && <div className="card err">{error}</div>}

        {step === 0 && (
          <div className="grid2">
            <div className="card">
              <h2>Bản vẽ điện / MEP (PDF)</h2>
              <label className={`drop ${file ? "has" : ""}`}>
                <input type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
                {file ? <><b>{file.name}</b><div className="note">{doc ? `${doc.numPages} trang` : "Đang đọc…"}</div></> : <>Kéo thả hoặc bấm để chọn file PDF bản vẽ<div className="note">Tối đa 50 trang · không lưu trên máy chủ</div></>}
              </label>
              <div className="grid2" style={{ marginTop: 14 }}>
                <label className="f">Khách hàng<input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Anh Cường" /></label>
                <label className="f">Địa chỉ công trình<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
                <label className="f">Ngày lập<input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
                <label className="f">Diện tích sàn (m², tuỳ chọn)<input value={form.areaM2} onChange={(e) => setForm({ ...form, areaM2: e.target.value })} /></label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button className="primary" disabled={!doc || !form.customer || busy || !health?.configured} onClick={startAnalyse}>Phân tích bằng AI</button>
                {draft && <button onClick={() => { setProject(draft); setStep(draft.pages.some((p) => COUNT_DISCIPLINES.includes(p.discipline) && !p.analysed) && draft.source !== "claude-import" ? 1 : 2); }}>Mở bản nháp: {draft.customer}</button>}
                {draft && <button className="ghost" onClick={() => { clearDraft(); setDraft(null); }}>Xoá nháp</button>}
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
              <label className="drop"><input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />Chọn file takeoff JSON</label>
            </div>
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

        {step === 3 && project && boq && quote && settings && (
          <QuoteEditor project={project} doc={doc} boq={boq} quote={quote} checks={checks} catalog={catalog} settings={settings}
            onCatalog={(c) => { setCatalog(c); saveCatalog(c); }} onSettings={(s) => { setSettings(s); saveSettings(s); }}
            onProject={(patch) => setProject((p) => (p ? { ...p, ...patch } : p))}
            onExported={() => setProject((p) => (p ? { ...p, status: "exported" } : p))} />
        )}
      </main>
    </>
  );
}
