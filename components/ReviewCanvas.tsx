"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Detection, DeviceType, Project } from "@/lib/core/types";
import { DEVICE_LABEL, DEVICE_TYPES } from "@/lib/core/types";
import { renderRegion, type PdfDoc } from "@/lib/client/pdf";
import { newId } from "@/lib/core/merge";
import { COUNT_DISCIPLINES } from "@/lib/client/pipeline";

export const TYPE_COLOR: Partial<Record<DeviceType, string>> = {
  downlight: "#2563eb", spotlight: "#1d4ed8", switch: "#dc2626", wall_light: "#7c3aed", tube_light: "#9333ea", led_strip: "#db2777",
  exhaust_fan: "#0891b2", socket: "#64748b", socket_wp: "#475569", junction_box: "#ea580c", curtain_point: "#ea580c",
  camera_indoor: "#16a34a", camera_outdoor: "#15803d", data_outlet: "#ca8a04", wifi_ap: "#a16207", ac_indoor: "#0d9488",
};
const color = (t: DeviceType) => TYPE_COLOR[t] ?? "#334155";

interface Props {
  doc: PdfDoc | null; project: Project; highlight: string[];
  onEdit: (dets: Detection[], log: { action: string; detectionId?: string; before?: unknown; after?: unknown }) => void;
}

export default function ReviewCanvas({ doc, project, highlight, onEdit }: Props) {
  const pages = project.pages.filter((p) => COUNT_DISCIPLINES.includes(p.discipline));
  const [page, setPage] = useState<number>(pages[0]?.index ?? 0);
  const [img, setImg] = useState<Record<number, string>>({});
  const [zoom, setZoom] = useState(1);
  const [sel, setSel] = useState<string | null>(null);
  const [addType, setAddType] = useState<DeviceType | "spotlight_proposed">("downlight");
  const [showRemoved, setShowRemoved] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!pages.some((p) => p.index === page) && pages[0]) setPage(pages[0].index); }, [pages, page]);
  useEffect(() => {
    if (!doc || !page || img[page]) return;
    renderRegion(doc, page, { x: 0, y: 0, w: 1, h: 1 }, 3000).then((c) => setImg((m) => ({ ...m, [page]: c.toDataURL("image/png") })));
  }, [doc, page, img]);
  useEffect(() => { // jump to page of highlighted detections
    const d = project.detections.find((x) => highlight.includes(x.id) && x.page);
    if (d && d.page !== page && pages.some((p) => p.index === d.page)) setPage(d.page);
  }, [highlight]); // eslint-disable-line react-hooks/exhaustive-deps

  const dets = useMemo(() => project.detections.filter((d) => d.page === page && d.x >= 0 && (showRemoved || d.status !== "removed")), [project.detections, page, showRemoved]);
  const counts = useMemo(() => {
    const m = new Map<DeviceType, number>();
    project.detections.filter((d) => d.page === page && d.status !== "removed").forEach((d) => m.set(d.type, (m.get(d.type) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [project.detections, page]);
  const selected = project.detections.find((d) => d.id === sel);

  const update = (id: string, patch: Partial<Detection>, action: string) => {
    const before = project.detections.find((d) => d.id === id);
    onEdit(project.detections.map((d) => (d.id === id ? { ...d, ...patch } : d)), { action, detectionId: id, before, after: patch });
  };
  const addAt = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!e.altKey && !e.ctrlKey) { setSel(null); return; }
    const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const pg = project.pages.find((p) => p.index === page);
    const prop = addType === "spotlight_proposed";
    const d: Detection = { id: newId(prop ? "s" : "m"), page, type: prop ? "spotlight" : addType, x, y, pass: "manual", status: "ok", floor: pg?.floor, room: nearestRoom(x, y), ...(prop ? { proposed: true, note: "STC đề xuất thêm" } : {}) };
    onEdit([...project.detections, d], { action: "add", detectionId: d.id, after: d });
    setSel(d.id);
  };
  const nearestRoom = (x: number, y: number) => {
    let best: string | undefined, bd = Infinity;
    for (const d of project.detections) if (d.page === page && d.room && d.x >= 0) { const dd = Math.hypot(d.x - x, d.y - y); if (dd < bd) { bd = dd; best = d.room; } }
    return best;
  };

  if (!pages.length) return <div className="card">Không có trang mặt bằng nào để duyệt (dữ liệu nhập không kèm bản vẽ). Dùng bảng BOQ bên phải để kiểm tra.</div>;

  return (
    <div>
      <div className="toolbar">
        <select value={page} onChange={(e) => { setPage(Number(e.target.value)); setSel(null); }}>
          {pages.map((p) => <option key={p.index} value={p.index}>Trang {p.index} – {p.title || p.discipline} ({p.floor})</option>)}
        </select>
        <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>－</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(5, z + 0.5))}>＋</button>
        <span className="note">Thêm thiết bị: chọn loại rồi <b>Alt + click</b> lên bản vẽ</span>
        <select value={addType} onChange={(e) => setAddType(e.target.value as DeviceType | "spotlight_proposed")}>
          <option value="spotlight_proposed">★ Spotlight đề xuất thêm (vòng cam)</option>
          {DEVICE_TYPES.map((t) => <option key={t} value={t}>{DEVICE_LABEL[t]}</option>)}
        </select>
        <label className="note"><input type="checkbox" checked={showRemoved} onChange={(e) => setShowRemoved(e.target.checked)} /> hiện điểm đã xoá</label>
      </div>
      <div className="legendDots" style={{ marginBottom: 8 }}>
        {counts.map(([t, n]) => <span key={t}><b style={{ background: color(t) }} />{DEVICE_LABEL[t]}: {n}</span>)}
        <span><b style={{ background: "#facc15" }} />AI soát lại có thay đổi</span>
        {project.detections.some((d) => d.page === page && d.proposed && d.status !== "removed") && <span><b style={{ background: "#ea580c" }} />Spotlight đề xuất: {project.detections.filter((d) => d.page === page && d.proposed && d.status !== "removed").length}</span>}
      </div>
      <div className="canvasBox" ref={box}>
        <div className="canvasInner" style={{ width: `${zoom * 100}%` }} onClick={addAt}>
          {img[page] ? <img src={img[page]} alt="" draggable={false} /> : <div style={{ padding: 40 }} className="note">{doc ? "Đang dựng bản vẽ…" : "Không có file bản vẽ (chế độ nhập JSON)."}</div>}
          {dets.map((d) => (
            <div key={d.id} title={`${d.proposed ? "★ ĐỀ XUẤT – " : ""}${DEVICE_LABEL[d.type]}${d.circuits ? " – Line " + d.circuits : ""}${d.room ? " – " + d.room : ""}`}
              className={`mk ${d.status} ${d.proposed ? "prop" : ""} ${highlight.includes(d.id) || sel === d.id ? "hl" : ""}`}
              style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, borderColor: d.proposed ? "#ea580c" : color(d.type) }}
              onClick={(e) => { e.stopPropagation(); setSel(d.id); }} />
          ))}
          {selected && selected.page === page && (
            <div className="pop" style={{ left: `calc(${selected.x * 100}% + 12px)`, top: `calc(${selected.y * 100}% + 12px)` }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "grid", gap: 6 }}>
                <select value={selected.type} onChange={(e) => update(selected.id, { type: e.target.value as DeviceType, status: "ok" }, "retype")}>
                  {DEVICE_TYPES.map((t) => <option key={t} value={t}>{DEVICE_LABEL[t]}</option>)}
                </select>
                <input placeholder="Phòng" defaultValue={selected.room} onBlur={(e) => update(selected.id, { room: e.target.value }, "room")} />
                <input placeholder="Số mạch (vd 13,14,15)" defaultValue={selected.circuits} onBlur={(e) => update(selected.id, { circuits: e.target.value }, "circuits")} />
                {["downlight", "spotlight"].includes(selected.type) && <label><input type="checkbox" checked={!!selected.proposed} onChange={(e) => update(selected.id, { proposed: e.target.checked }, "proposed")} /> STC đề xuất thêm (không có trên bản vẽ)</label>}
                {selected.type === "switch" && <label>Số nút (khi bản vẽ không ghi số mạch) <input type="number" min={0} max={4} style={{ width: 56 }} defaultValue={selected.gangs ?? ""} onBlur={(e) => update(selected.id, { gangs: Number(e.target.value) || undefined }, "gangs")} /></label>}
                {selected.type === "switch" && <label><input type="checkbox" checked={!!selected.twoWay} onChange={(e) => update(selected.id, { twoWay: e.target.checked }, "twoWay")} /> 2 chiều</label>}
                <div style={{ display: "flex", gap: 6 }}>
                  {selected.status === "removed"
                    ? <button onClick={() => update(selected.id, { status: "ok" }, "restore")}>Khôi phục</button>
                    : <button onClick={() => { update(selected.id, { status: "removed" }, "remove"); setSel(null); }} style={{ color: "#b91c1c" }}>Xoá</button>}
                  {selected.status === "disputed" && <button onClick={() => update(selected.id, { status: "ok" }, "accept")}>Đúng</button>}
                  <button className="ghost" onClick={() => setSel(null)}>Đóng</button>
                </div>
                <span className="note">Nguồn: lượt {String(selected.pass)} · trang {selected.page}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
