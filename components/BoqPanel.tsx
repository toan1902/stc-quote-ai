"use client";
import type { CrossCheck, Estimate, Project } from "@/lib/core/types";
import type { BOQResult } from "@/lib/core/boq";

const SCOPE = { smarthome: "Smart Home", lighting: "Chiếu sáng", excluded: "Ngoài báo giá" } as const;

export default function BoqPanel({ project, boq, checks, onHighlight, onEstimates }: {
  project: Project; boq: BOQResult; checks: CrossCheck[];
  onHighlight: (ids: string[]) => void; onEstimates: (e: Estimate[]) => void;
}) {
  const setMeters = (key: string, meters: number) => {
    const rest = project.estimates.filter((e) => e.key !== key);
    onEstimates(meters > 0 ? [...rest, { key, meters, source: "manual" }] : rest);
  };
  const ledKeys = project.estimates.filter((e) => e.key.startsWith("led_strip:"));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ padding: 14 }}>
        <h2>Đối soát chéo ({checks.length})</h2>
        {!checks.length && <p className="note">Không phát hiện bất thường.</p>}
        {checks.map((c, i) => (
          <div key={i} className={`chk ${c.severity}`} onClick={() => onHighlight(c.detectionIds)}>
            <b>{c.code}</b> {c.message}
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 14 }}>
        <h2>BOQ bóc tách</h2>
        <table className="t">
          <thead><tr><th>Hạng mục</th><th>SL</th><th>Phạm vi</th></tr></thead>
          <tbody>
            {boq.lines.filter((l) => l.qty > 0).map((l) => (
              <tr key={l.code} onClick={() => onHighlight(l.detectionIds)} style={{ cursor: "pointer" }}>
                <td>{l.name} {l.estimated && <span className="tag est">ước tính</span>}<div className="note">{l.rooms.filter((r) => r !== "?").slice(0, 6).join(", ")}</div></td>
                <td><b>{l.qty}</b> {l.unit}</td>
                <td><span className="tag">{SCOPE[l.scope]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card" style={{ padding: 14 }}>
        <h2>Vị trí công tắc ({boq.switches.length})</h2>
        <table className="t"><tbody>
          {boq.switches.map((s, i) => (
            <tr key={i} onClick={() => onHighlight(s.ids)} style={{ cursor: "pointer" }}>
              <td>{s.room}</td><td><b>{s.gangs} nút</b></td><td className="note">Line {s.circuits.join(",") || "?"}{s.twoWay ? " · 2 chiều" : ""}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
      <div className="card" style={{ padding: 14 }}>
        <h2>Khối lượng ước tính</h2>
        <p className="note">Ray rèm (mét/điểm chờ) và LED dây (mét/phòng) – đo lại thực tế nếu có.</p>
        {boq.curtains.map((c) => (
          <label key={c.room} className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ flex: 1 }}>Ray rèm – {c.room}</span>
            <input type="number" step="0.5" style={{ width: 90 }} defaultValue={c.meters} onBlur={(e) => setMeters(`rail:${c.room}`, Number(e.target.value))} /> m
          </label>
        ))}
        {ledKeys.map((e) => (
          <label key={e.key} className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ flex: 1 }}>LED dây – {e.key.slice(10)}</span>
            <input type="number" step="0.5" style={{ width: 90 }} defaultValue={e.meters} onBlur={(ev) => setMeters(e.key, Number(ev.target.value))} /> m
          </label>
        ))}
      </div>
    </div>
  );
}
