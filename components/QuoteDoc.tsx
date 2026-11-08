"use client";
import "@/app/quote/print/quote.css";
import type { ReactNode } from "react";
import type { PrintPayload } from "@/components/QuoteEditor";
import type { Quote } from "@/lib/core/pricing";
import { docSo, vnd, vndComma } from "@/lib/core/words";
import { DEVICE_LABEL } from "@/lib/core/types";

const CO = "CÔNG TY TNHH ĐẦU TƯ VÀ CÔNG NGHỆ STC";
const A = "/quote-assets/";

function Head({ right }: { right: string }) {
  return (
    <div className="hd"><img className="lg" src={A + "i-000.png"} alt="" />
      <div className="co"><div className="cn">{CO}</div>
        <div className="ci"><b>Trụ sở:</b> 104 Nguyễn Thượng Hiền, Phường Tân An, Tỉnh Đắk Lắk &nbsp;|&nbsp; <b>MST:</b> 6001584831<br />
          <b>Hotline:</b> 0823 047 047 &nbsp;|&nbsp; <b>Email:</b> Stctelecom.dlk@gmail.com<br /><b>TK:</b> 0231 000 648 025 - Vietcombank CN Đắk Lắk</div></div>
      <div className="rt"><img src={A + "i-001.png"} alt="" /><div>{right}</div></div></div>
  );
}
const Foot = ({ title, pg }: { title: string; pg: string }) => <div className="ft"><img src={A + "i-002.png"} alt="" /><span>{CO} - {title}</span><span className="pg">{pg}</span></div>;
const Sign = ({ kh }: { kh: string }) => <div className="sg"><div><b>ĐẠI DIỆN KHÁCH HÀNG</b><div className="nm">{kh.toUpperCase()}</div></div><div><b>{CO}</b><div className="nm">LÊ QUANG TOÀN</div></div></div>;
const Info = ({ kh, dc, r1, r2 }: { kh: string; dc: string; r1: React.ReactNode; r2: React.ReactNode }) =>
  <div className="box info"><div><b>Kính gửi:</b> {kh}<br /><b>Địa chỉ công trình:</b> {dc}</div><div>{r1}<br />{r2}</div></div>;
const Card = ({ ic, t, children }: { ic: string; t: React.ReactNode; children: React.ReactNode }) =>
  <div className="card"><div className="ct"><img src={A + ic} alt="" />{t}</div><div className="cb">{children}</div></div>;

/** The 7-page STC CROP quote (+ optional proposal drawing pages). Shared by /quote/print and the public link /q/[id]. */
/** công tắc cửa cuốn/cổng không đi kèm bộ cổng AB Gate */
function gateSwOnly(q: Quote) { const ls = q.sections.flatMap((s) => s.lines); return ls.some((l) => l.code === "gate_ab") ? 0 : ls.filter((l) => l.code === "gate_sw").reduce((a, l) => a + l.qty, 0); }

export default function QuoteDoc({ d, toolbar }: { d: PrintPayload; toolbar?: ReactNode }) {
  const { project: P, boq, quote: q, checks } = d;
  const showProp = d.settings.includeProposal !== false;
  const rooms = boq.lightsByRoom.filter((l) => showProp || !l.proposed);
  const propLine = q.lightLines.find((l) => l.proposed);
  const baseLine = q.lightLines.find((l) => !l.proposed);
  const kh = P.customer, dc = P.address;
  // số lượng lấy từ báo giá (đã gồm số sửa tay), bố trí lấy từ bản vẽ
  const qn = (...codes: string[]) => q.sections.flatMap((s) => s.lines).filter((l) => codes.includes(l.code)).reduce((a, l) => a + l.qty, 0);
  const swN = boq.switches.length, swQ = qn("sw1", "sw2", "sw3", "sw4");
  const camN = qn("cam_in", "cam_out"), curN = qn("curtain_motor"), railM = qn("rail");
  const irN = qn("ir"), hubN = qn("hub", "hub_pb650"), zbN = qn("zigbee"), doorN = gateSwOnly(q);
  const irRows = Array.from({ length: irN }, (_, i) => ({ room: boq.acRooms[i] ?? `Điều hòa ${i + 1}`, floor: boq.acFloors?.[i] ?? boq.acFloors?.[0] ?? boq.floors[0] ?? "Tầng 1" }));
  const camRows = [...boq.cameras.map((c) => ({ floor: c.floor || "Tầng 1", room: c.room || "", out: c.type === "camera_outdoor" }))];
  for (const [code, out] of [["cam_out", true], ["cam_in", false]] as const) { let extra = qn(code) - camRows.filter((c) => c.out === out).length; while (extra-- > 0) camRows.push({ floor: "", room: "vị trí bổ sung (thống nhất khi khảo sát)", out }); }
  const camList = camRows.filter((c, i) => camRows.slice(0, i + 1).filter((x) => x.out === c.out).length <= qn(c.out ? "cam_out" : "cam_in"));
  const hubName = q.sections.flatMap((s) => s.lines).find((l) => l.code === "hub" || l.code === "hub_pb650")?.name.replace(/^Bộ điều khiển trung tâm /, "") ?? "FPT T950";
  const gateLine = q.sections.flatMap((s) => s.lines).find((l) => l.code === "gate_ab");
  const gateN = gateLine?.qty ?? 0;
  const lightN = q.lightLines.reduce((a, l) => a + l.qty, 0);
  const smartN = q.lightLines.filter((l) => l.smart).reduce((a, l) => a + l.qty, 0);
  const plainN = lightN - smartN;
  const noL = q.lightLines.length === 0;
  const lightProps = (q.proposals ?? []).filter((g) => g.lines.some((l) => l.section === "light"));
  const lightTitle = !plainN ? "Smart Lighting – Đèn thông minh FPT" : !smartN ? "Chiếu sáng – đèn LED THƯỜNG thương hiệu AB" : "Chiếu sáng – đèn thông minh FPT + đèn LED thường AB";
  const lightKind = (l: { smart?: boolean }) => (l.smart ? <span className="smt">ĐÈN THÔNG MINH FPT</span> : <span className="nrm">ĐÈN THƯỜNG</span>);
  const upg = q.upgrade ?? { qty: 0, extra: 0 };
  const plainNote = plainN > 0 && <>
    <b>Lưu ý loại đèn:</b> {plainN} bộ đèn AB là <b>đèn LED THƯỜNG (không thông minh)</b> – bật/tắt theo nhóm mạch qua công tắc cảm ứng FPT (điều khiển bằng app, giọng nói, hẹn giờ, ngữ cảnh theo mạch); <b>không</b> chỉnh được độ sáng, nhiệt độ màu riêng từng đèn.
    {upg.qty > 0 && <> Nâng cấp {upg.qty} bộ lên đèn thông minh FPT Athena (Downlight CCT 484.000đ, Spotlight 869.000đ – giá bán lẻ FPT): thêm khoảng <b>{vnd(upg.extra)}</b> (sau chiết khấu).</>}
  </>;
  const excl = boq.excluded.filter((x) => !/Ổ|Tủ|Wifi|RJ45|TV|Bình/.test(x.name)).map((x) => `${x.name.toLowerCase()} ${x.unit === "m" ? `(~${x.qty}m)` : x.qty}`).join(", ");
  const warns = checks.filter((c) => c.severity !== "info");
  const camsOut = qn("cam_out");
  const roomsN = rooms.reduce((a, l) => a + l.qty, 0);
  const codeOfType = (t: string) => (t === "spotlight" ? d.settings.defaultSpotlight ?? "spotlight_ab" : d.settings.defaultDownlight);
  const nameOfType = (t: string) => q.lightLines.find((l) => l.code === codeOfType(t))?.name ?? baseLine?.name ?? DEVICE_LABEL[t as keyof typeof DEVICE_LABEL];
  let n = 0;

  return (
    <div className="qroot">
      {toolbar ?? <div className="noprint"><button onClick={() => window.print()}>In / Lưu PDF</button></div>}

      {/* 1. TỔNG HỢP */}
      <section className="page"><Head right={`BẢNG TỔNG HỢP BÁO GIÁ | ${kh}`} />
        <h1>BẢNG TỔNG HỢP BÁO GIÁ GIẢI PHÁP NHÀ THÔNG MINH</h1>
        <Info kh={kh} dc={dc} r1={<><b>Ngày lập báo giá:</b> {P.date}</>} r2={<><b>Hiệu lực báo giá:</b> 7 ngày kể từ ngày lập</>} />
        <table className="t sum"><thead><tr><th style={{ width: "5%" }}>STT</th><th>Hạng mục báo giá</th><th style={{ width: "13%" }}>Thiết bị niêm yết (đ)</th><th style={{ width: "12%" }}>Giảm giá (đ)</th><th style={{ width: "11%" }}>Lắp đặt (đ)</th><th style={{ width: "13%" }}>Tổng cộng (đ)</th><th style={{ width: "9%" }}>Chi tiết</th></tr></thead>
          <tbody>
            <tr><td className="c">1</td><td><div className="it">Smart Home FPT</div><div className="ds">{swQ} công tắc cảm ứng, {hubN > 1 ? `${hubN} ` : ""}bộ trung tâm {hubName}{zbN ? " + mở rộng sóng ZigBee" : ""}{doorN ? `, ${doorN} công tắc cửa cuốn` : ""}{irN ? `, ${irN} bộ IR điều hòa` : ""}{gateN ? `, ${gateN} bộ cổng tự động âm sàn AB` : ""}{curN ? `, ${curN} bộ rèm tự động (${railM}m ray)` : ""}{camN ? `, ${camN} camera AI` : ""}</div></td>
              <td className="r">{vnd(q.niem)}</td><td className="r">{vnd(q.giam)}</td><td className="r">{vnd(q.lapDat)}</td><td className="r b">{vnd(q.shTotal)}</td><td className="c">Phần 1<br />(4 trang)</td></tr>
{noL ? <tr><td className="c">2</td><td>{lightProps.length ? <><div className="it">Chiếu sáng – ĐỀ XUẤT (chưa tính vào tổng)</div><div className="ds">{lightProps.map((g) => `${g.group}: ${vnd(g.est)}đ`).join("; ")} – xem trang Đề xuất thêm.</div></> : <><div className="it">Chiếu sáng</div><div className="ds">Chưa báo giá – bản vẽ chưa có mặt bằng chiếu sáng. STC bổ sung khi nhận bản vẽ đèn.</div></>}</td><td className="r">–</td><td className="r">–</td><td className="r">–</td><td className="r">–</td><td className="c">{lightProps.length ? "Đề xuất" : "Bổ sung sau"}</td></tr> :             <tr><td className="c">2</td><td><div className="it">{lightTitle}</div><div className="ds">{lightN} bộ đèn: {q.lightLines.map((l) => `${l.qty} ${l.name.replace(/^Đèn (LED )?/i, "")}`).join(", ")} (khớp bản vẽ chiếu sáng){plainN > 0 ? ". Đèn thường: bật/tắt theo mạch qua công tắc FPT, không chỉnh sáng/màu từng đèn." : "."}</div></td>
              <td className="r">{vnd(q.lNiem)}</td><td className="r">{vnd(-q.lCk)}</td><td className="r">{vnd(q.lInstall)}{!q.lInstall && <><br /><span className="gr sm">(thợ điện lắp)</span></>}</td><td className="r b">{vnd(q.lTotal)}</td><td className="c">Phần 2<br />(2 trang)</td></tr>}
            <tr className="tot"><td colSpan={2}>{noL ? "TỔNG GIÁ TRỊ BÁO GIÁ" : "TỔNG GIÁ TRỊ 2 HẠNG MỤC"}</td><td className="r">{vnd(q.grandNiem)}</td><td className="r">{vnd(q.grandGiam)}</td><td className="r">{vnd(q.lapDat + q.lInstall)}</td><td className="r red">{vnd(q.grandTotal)}</td><td /></tr>
          </tbody></table>
        <div className="box grand"><div className="gl"><span>{noL ? "TỔNG CỘNG:" : "TỔNG CỘNG 2 HẠNG MỤC:"}</span><span>{vnd(q.grandTotal)}</span></div><div className="bc"><b>Bằng chữ:</b> {q.grandWords}</div></div>
        <div className="box note"><div className="nt">GHI CHÚ:</div><ul>
          {plainNote && <li>{plainNote}</li>}
          {(q.proposals ?? []).map((g) => <li key={g.group}><b>Đề xuất thêm – {g.group}:</b> dự kiến {vnd(g.est)}đ (chưa tính vào tổng, xem trang Đề xuất thêm).</li>)}
          <li><b>Hiệu lực báo giá 7 ngày</b> kể từ ngày lập. Chính sách chiết khấu áp dụng tùy thời điểm – hết hiệu lực, đơn giá và mức chiết khấu được cập nhật theo chương trình hiện hành.</li>
          <li>Chi tiết từng hạng mục xem ở các phần báo giá riêng đính kèm phía sau (Phần 1 – Smart Home, Phần 2 – Chiếu sáng).</li>
          <li>Số lượng thiết bị bóc tách từ hồ sơ thiết kế điện công trình{P.sourceName ? ` (${P.sourceName})` : ""}; khối lượng ghi “ước tính” cần đo lại thực tế.</li>
          {excl && <li>Chiếu sáng: phí lắp đặt 0đ – đèn do thợ điện công trình lắp đặt. Chưa bao gồm {excl}.</li>}
          {gateN > 0 && <li><b>Cổng tự động AB Gate:</b> miễn phí lắp đặt, cài đặt hành trình khi chọn hệ sinh thái FPT Smart Home; điều khiển cổng qua công tắc FPT &amp; app. Chưa bao gồm pin dự phòng Lithium, hố/đế âm sàn, thoát nước hố motor, ống &amp; dây điện nguồn tới chân cổng, gia cố bản lề/cánh cổng. Bảo hành theo chính sách hãng AB Gate, bảo trì tận nơi tại Đắk Lắk.</li>}
          <li><b>Ưu tiên hàng Việt Nam:</b> STC CROP đề xuất thiết bị thương hiệu Việt Nam (FPT Smart Home, FPT Camera, đèn & cổng tự động AB) – chất lượng ổn định, bảo hành tận nơi nhanh, linh kiện thay thế sẵn có trong nước.</li>
          {camN > 0 && <li>Camera: đề xuất FPT Camera Wifi lưu trữ Cloud, không cần đầu ghi, xem trực tiếp trên app FPT Camera.</li>}
          {warns.slice(0, 3).map((w, i) => <li key={i}>{w.message}</li>)}
        </ul></div>
        <Sign kh={kh} /><Foot title="BẢNG TỔNG HỢP BÁO GIÁ" pg="Trang 1 / 1" /></section>

      {/* 2. THUYẾT MINH */}
      <section className="page"><Head right="HỒ SƠ GIẢI PHÁP | Trang 1/4 (Thuyết minh)" />
        <div className="banner">GIẢI PHÁP FPT SMART HOME: NÂNG TẦM TRẢI NGHIỆM SỐNG &amp; GIÁ TRỊ ĐẦU TƯ LÂU DÀI</div>
        <div className="intro"><div><div className="kg">Kính gửi: {kh} ({dc})</div>
          <p>Việc trang bị hệ thống <b>FPT Smart Home</b> ứng dụng chuẩn kết nối <b>Bluetooth Mesh</b> cùng công tắc cảm ứng mặt kính cường lực nút lõm viền nhôm không chỉ dừng lại ở việc thay thế thiết bị điện, mà là khoản đầu tư trực tiếp vào chất lượng sống, sự an toàn tuyệt đối, đẳng cấp thẩm mỹ và giá trị vận hành bền vững của toàn bộ ngôi nhà.</p></div>
          <div className="qr"><img src={A + "i-007.png"} alt="" /><b>QUÉT QR TRẢI NGHIỆM 3D</b></div></div>
        <div className="sec">I. MỘT NGÀY TRẢI NGHIỆM TIỆN NGHI CÙNG FPT SMART HOME</div>
        <div className="grid">
          <Card ic="i-008.png" t={<><span className="or">1. Buổi Sáng (06:30)</span>&nbsp;- Thức Giấc Tự Nhiên &amp; Khởi Hành</>}>Đúng 06:30 sáng{curN ? ", rèm phòng ngủ tự động mở đón ánh nắng tự nhiên" : ", đèn phòng ngủ sáng dần đánh thức nhẹ nhàng"}. Đồng thời đèn sảnh, hiên chiếu sáng ban đêm tự động tắt để tiết kiệm điện năng.</Card>
          <Card ic="i-009.png" t="2. Buổi Chiều (18:00) - Đón Chào Gia Chủ Trở Về">Lúc 18:00 khi gia chủ đi làm về, đèn sảnh, phòng khách và khu bếp ăn tự động bật sáng ấm cúng{curN ? ", rèm phòng khách khép lại tạo sự riêng tư" : ""}.{camN ? " Camera nhận diện người và gửi thông báo về điện thoại." : ""}</Card>
          <Card ic="i-010.png" t="3. Buổi Tối (20:00 - 22:30) - Không Gian Giải Trí &amp; Kết Nối">Từ 20:00 đến 22:30 là thời gian sinh hoạt gia đình, kịch bản thư giãn kích hoạt ánh sáng dịu nhẹ{boq.ledStripM ? " và các line LED trang trí" : ""}{irN ? ", điều hòa phòng ngủ tự bật trước giờ đi ngủ" : ""}.</Card>
          <Card ic="i-011.png" t="4. Đêm Khuya (23:00) - Giấc Ngủ Sâu &amp; An Ninh Tuyệt Đối">Vào 23:00 đêm, chỉ với một chạm vào nút ngữ cảnh đi ngủ ở đầu giường, toàn bộ đèn các khu vực chung tắt hoàn toàn{curN ? ", rèm đóng kín" : ""}{camN ? ` và ${camN} Camera an ninh chuyển sang chế độ cảnh giới` : ""}.</Card>
        </div>
        <div className="sec">II. VÌ SAO ĐÂY LÀ KHOẢN ĐẦU TƯ ĐÁNG GIÁ?</div>
        <div className="grid">
          <Card ic="i-012.png" t="1. Tiết Kiệm Năng Lượng &amp; Bảo Vệ Thiết Bị">Tự động tắt máy lạnh, đèn chiếu sáng khu vực hiên, sảnh và WC khi không có người, giúp tiết kiệm 20% - 30% chi phí tiền điện hàng tháng.</Card>
          <Card ic="i-013.png" t="2. An Toàn Tối Đa Cho Người Thân">Mặt công tắc kính cường lực cách điện hoàn toàn, tay ướt chạm vẫn an toàn 100%.{camsOut ? " Camera AI ngoài trời có đèn Flash và loa hú cảnh báo chủ động, bảo vệ đa lớp 24/7." : ""}</Card>
          <Card ic="i-014.png" t="3. Giá Trị Thẩm Mỹ &amp; Sang Trọng Hiện Đại">Thay thế công tắc cơ truyền thống bằng công tắc cảm ứng mặt kính phẳng nút lõm viền nhôm tinh xảo, tối giản mặt tường và nâng tầm nội thất cao cấp.</Card>
          <Card ic="i-015.png" t="4. Nền Tảng Bluetooth Mesh Ổn Định FPT">Tốc độ phản hồi mili giây, vận hành nội mạng mượt mà ngay cả khi mất kết nối Internet. Bảo hành chính hãng tận nơi 24 tháng trên toàn quốc.</Card>
        </div>
        <Foot title="BẢNG DỰ TOÁN SMART HOME FPT" pg="Trang 1 / 4" /></section>

      {/* 3. DỰ TOÁN */}
      <section className="page"><Head right="PHỤ LỤC HỢP ĐỒNG 01 | Trang 2/4 (Dự toán chi phí)" />
        <h1>BẢNG DỰ TOÁN SMART HOME FPT</h1>
        <Info kh={kh} dc={dc} r1={<><b>Ngày lập báo giá:</b> {P.date}</>} r2={<><b>Quy cách công tắc:</b> Kính cường lực, nút lõm viền nhôm, chuẩn Bluetooth Mesh</>} />
        <table className="t dt"><thead><tr><th>STT</th><th>Ảnh</th><th>Tên Thiết Bị &amp; Tính Năng Thông Số Kỹ Thuật</th><th>ĐVT</th><th>SL</th><th>Đơn Giá (đ)</th><th>Giảm</th><th>Giá Giảm (đ)</th><th>Thành Tiền (đ)</th></tr></thead>
          <tbody>{q.sections.map((s) => [
            <tr key={s.key} className="sr"><td colSpan={8}>{s.title}</td><td className="r">{vnd(s.total)}</td></tr>,
            ...s.lines.map((l) => { n++; return (
              <tr key={l.code}><td className="c">{n}</td><td className="c">{l.img ? <img className="pi" src={l.img} alt="" /> : <span className="vnflag">AB</span>}</td><td><div className="it">{l.name}{l.vn && <span className="vn">Hàng Việt Nam</span>}</div>{l.bigImg ? <div className="ds">Trọn bộ 2 cánh, motor 24V, IP67, tải 800kg/cánh. Thông số chi tiết &amp; điều khoản: xem trang <b>Dự toán cổng tự động</b>.</div> : <div className="ds">{l.desc}</div>}</td>
                <td className="c">{l.unit}</td><td className="c">{l.qty}</td><td className="r">{vnd(l.price)}</td><td className="c">{l.salePrice ? vnd(l.after - l.price) : `${Math.round(l.discount * 100)}%`}</td><td className="r">{vnd(l.after)}</td><td className="r">{vnd(l.total)}</td></tr>); }),
          ])}</tbody></table>
        <div className="box tots">
          <div className="tl"><span>TỔNG GIÁ TRỊ THIẾT BỊ NIÊM YẾT:</span><b>{vnd(q.niem)}</b></div>
          <div className="tl gr"><span>GIẢM GIÁ ƯU ĐÃI THIẾT BỊ (động cơ rèm 30%, thiết bị mở rộng sóng 10%, còn lại 20%):</span><b>{vnd(q.giam)}</b></div>
          <div className="tl"><span>TỔNG GIÁ TRỊ THIẾT BỊ SAU GIẢM GIÁ:</span><b>{vnd(q.sau)}</b></div>
          <div className="tl"><span>CHI PHÍ LẮP ĐẶT, CÀI ĐẶT CẤU HÌNH{q.kmLapDat ? " (gồm cài đặt hành trình cổng)" : ""}:</span><b>{vnd(q.lapDat + (q.kmLapDat ?? 0))}</b></div>
          {q.kmLapDat > 0 && <div className="tl gr"><span>KHUYẾN MÃI MIỄN PHÍ LẮP ĐẶT CỔNG TỰ ĐỘNG KHI CHỌN HỆ SINH THÁI FPT SMART HOME:</span><b>{vnd(-q.kmLapDat)}</b></div>}
          <div className="gl"><span>TỔNG CỘNG GÓI GIẢI PHÁP HOÀN THIỆN:</span><span>{vnd(q.shTotal)}</span></div>
          <div className="bc"><b>Bằng chữ:</b> {q.shWords}</div></div>
        <Sign kh={kh} /><Foot title="BẢNG DỰ TOÁN SMART HOME FPT" pg="Trang 2 / 4" /></section>

      {/* 3b. DỰ TOÁN CỔNG TỰ ĐỘNG (khi có) */}
      {gateLine && (
        <section className="page"><Head right="PHỤ LỤC CỔNG TỰ ĐỘNG | Dự toán cổng âm sàn" />
          <h1>BẢNG DỰ TOÁN CỔNG TỰ ĐỘNG ÂM SÀN AB GATE</h1>
          <Info kh={kh} dc={dc} r1={<><b>Ngày lập báo giá:</b> {P.date}</>} r2={<><b>Thương hiệu:</b> AB Gate – <span className="vn">Hàng Việt Nam</span></>} />
          <table className="t dt gt"><thead><tr><th>STT</th><th>Tên Thiết Bị &amp; Thông Số Kỹ Thuật</th><th>ĐVT</th><th>SL</th><th>Đơn Giá (đ)</th><th>Giảm (đ)</th><th>Giá Giảm (đ)</th><th>Thành Tiền (đ)</th></tr></thead>
            <tbody>
              <tr className="sr"><td colSpan={7}>I. Giải pháp cổng tự động âm sàn</td><td className="r">{vnd(gateLine.total)}</td></tr>
              <tr><td className="c">1</td><td><div className="it">{gateLine.name}</div><div className="ds">{gateLine.desc}</div>{gateLine.kit && <div className="ds"><i>{gateLine.kit}</i></div>}{gateLine.warn && <div className="ds wr">{gateLine.warn}</div>}{gateLine.img && <img className="gimg" src={gateLine.img} alt="" />}</td>
                <td className="c">{gateLine.unit}</td><td className="c">{gateLine.qty}</td><td className="r">{vnd(gateLine.price)}</td><td className="r">{vnd(gateLine.after - gateLine.price)}</td><td className="r">{vnd(gateLine.after)}</td><td className="r">{vnd(gateLine.total)}</td></tr>
            </tbody></table>
          <div className="box tots">
            <div className="tl"><span>TỔNG GIÁ TRỊ THIẾT BỊ NIÊM YẾT:</span><b>{vnd(gateLine.listTotal)}</b></div>
            <div className="tl gr"><span>GIẢM GIÁ ƯU ĐÃI THIẾT BỊ:</span><b>{vnd(gateLine.total - gateLine.listTotal)}</b></div>
            <div className="tl"><span>TỔNG GIÁ TRỊ THIẾT BỊ SAU GIẢM GIÁ:</span><b>{vnd(gateLine.total)}</b></div>
            <div className="tl"><span>CHI PHÍ LẮP ĐẶT, CÀI ĐẶT HÀNH TRÌNH ({Math.round(d.settings.installRate * 100)}% giá niêm yết):</span><b>{vnd(q.kmLapDat)}</b></div>
            <div className="tl gr"><span>KHUYẾN MÃI MIỄN PHÍ LẮP ĐẶT KHI CHỌN HỆ SINH THÁI FPT SMART HOME:</span><b>{vnd(-q.kmLapDat)}</b></div>
            <div className="gl"><span>TỔNG CỘNG:</span><span>{vnd(gateLine.total)}</span></div>
            <div className="bc"><b>Bằng chữ:</b> {docSo(gateLine.total)}</div></div>
          <div className="box note"><div className="nt">GHI CHÚ &amp; ĐIỀU KHOẢN:</div><ul>
            <li><b>Khuyến mãi:</b> Miễn phí toàn bộ chi phí lắp đặt, cài đặt hành trình động cơ cổng khi khách hàng chọn hệ sinh thái FPT Smart Home của STC.</li>
            <li><b>Kết nối nhà thông minh:</b> Điều khiển cổng qua <b>Công tắc điều khiển động cơ cổng FPT</b> – đã có trong Bảng dự toán Smart Home, không tính lại ở báo giá này.</li>
            <li><b>Chưa bao gồm:</b> Pin dự phòng (lưu trữ) Lithium dùng khi mất điện; phần xây dựng hố/đế âm sàn, thoát nước hố motor, đi ống &amp; dây điện nguồn tới chân cổng; gia cố bản lề/cánh cổng (nếu cần).</li>
            <li><b>Bảo hành:</b> Theo chính sách hãng AB Gate. Bảo trì, hỗ trợ kỹ thuật tận nơi tại Đắk Lắk.</li>
            <li><b>Thanh toán:</b> 50% khi đặt hàng, 40% khi giao thiết bị tới công trình, 10% sau khi lắp đặt bàn giao nghiệm thu.</li></ul></div>
          <Sign kh={kh} /><Foot title="DỰ TOÁN CỔNG TỰ ĐỘNG ÂM SÀN" pg="Phụ lục cổng" /></section>
      )}

      {/* 4. BỐ TRÍ CÔNG TẮC */}
      <section className="page"><Head right="BẢNG ĐẶC TẢ LỘ ĐIỆN | Trang 3/4 (Mặt bằng công tắc)" />
        <h2>BỐ TRÍ CÔNG TẮC THÔNG MINH {d.settings.switchShape === "rect" ? "CHỮ NHẬT " : ""}GẮN TƯỜNG ({swN} VỊ TRÍ)</h2>
        <table className="t sw"><thead><tr><th>STT</th><th>Tầng</th><th>Vị Trí Cụ Thể</th><th>Vật Tư</th><th>Công Năng Điều Khiển Thực Tế</th></tr></thead>
          <tbody>{[...new Set(boq.switches.map((s) => s.floor))].map((fl) => [
            <tr key={fl} className="sr"><td colSpan={5}>KHU VỰC: {fl.toUpperCase()}</td></tr>,
            ...boq.switches.filter((s) => s.floor === fl).map((s, i) => (
              <tr key={fl + i}><td className="c">{boq.switches.indexOf(s) + 1}</td><td className="c">{s.floor}</td><td><b>{s.room}</b></td>
                <td className="c"><span className={`bd b${s.gangs}`}>Công tắc {s.gangs} nút</span></td><td>{s.circuits.length ? `Line ${s.circuits.join(",")}` : (s.note || "Nhóm đèn " + s.room)}{s.twoWay ? " (2 chiều)" : ""}</td></tr>)),
          ])}</tbody></table>
        {checks.filter((c) => c.code === "C1" || c.code === "C2").map((c, i) => <div key={i} className="rn">Ghi chú: {c.message}</div>)}
        {boq.switches.some((s) => s.estimated) && <div className="rn">Ghi chú: Bản vẽ chỉ thể hiện vị trí công tắc, chưa ghi số mạch – số nút được STC ước tính theo nhóm đèn, sẽ chốt lại với chủ nhà/thợ điện trước khi đặt hàng.</div>}
        {swQ !== swN && <div className="rn">Ghi chú: Số lượng công tắc trong bảng dự toán ({swQ} bộ) đã điều chỉnh theo trao đổi với chủ nhà, khác số vị trí trên bản vẽ ({swN}).</div>}
        <Foot title="BẢNG DỰ TOÁN SMART HOME FPT" pg="Trang 3 / 4" /></section>

      {/* 5. PHỤ LỤC */}
      <section className="page"><Head right="BÀN GIAO & KÝ KẾT | Trang 4/4 (Mặt bằng & Ký kết)" />
        <h1 className="h1s">PHỤ LỤC BỐ TRÍ {[curN ? "RÈM TỰ ĐỘNG" : "", doorN ? "CỬA CUỐN" : "", "ĐIỀU HÒA", camN ? "CAMERA" : ""].filter(Boolean).join(", ")} &amp; CAM KẾT DỊCH VỤ</h1>
        <div className={curN && camN ? "two" : ""}>
          {curN > 0 && <>          <div className="pn"><div className="pt">BỐ TRÍ RÈM VẢI ĐỘNG CƠ ({curN} ĐC - {railM}M RAY)</div>
            <table className="t sm2"><thead><tr><th>STT</th><th>Tầng</th><th>Phòng</th><th>Công Tắc</th><th>Động Cơ</th><th>KT Ngang</th><th>Bi Định Hình</th></tr></thead><tbody>
              {boq.curtains.map((c, i) => <tr key={i}><td className="c">{i + 1}</td><td>{c.floor}</td><td>{c.room}</td><td className="c">1</td><td className="c"><b>1</b></td><td className="c">{String(c.meters).replace(".", ",")} m</td><td className="c">7cm</td></tr>)}
              <tr className="tot"><td colSpan={3}>TỔNG RÈM VẢI</td><td className="c">{curN}</td><td className="c">{curN}</td><td colSpan={2}>Tổng {railM} m ray nhôm</td></tr></tbody></table>
            <div className="sm rn" style={{ padding: "4px 8px" }}>KT ngang ước tính theo bản vẽ – đo lại thực tế trước khi sản xuất ray.</div></div></>}
          {camN > 0 && <>          <div className="pn"><div className="pt">BỐ TRÍ CAMERA QUAN SÁT AI ({camN} BỘ)</div>
            <table className="t sm2"><thead><tr><th>STT</th><th>Tầng</th><th>Vị Trí</th><th>Vật Tư</th><th>SL</th><th>Công Năng</th></tr></thead><tbody>
              {camList.map((c, i) => <tr key={i}><td className="c">{i + 1}</td><td>{c.floor}</td><td>Camera {i + 1}</td><td className="nw"><b>{c.out ? "FPT Camera SE 2S" : "FPT Camera SE 3"}</b></td><td className="c"><b>1</b></td><td>Quan sát {c.room.toLowerCase()}</td></tr>)}</tbody></table></div></>}
        </div>
        <div className="pn"><div className="pt">BỐ TRÍ ĐIỀU KHIỂN ĐIỀU HÒA THÔNG MINH IR ({irN} BỘ) &amp; BỘ TRUNG TÂM {hubName.toUpperCase()} ({hubN} BỘ)</div>
          <table className="t sm2"><thead><tr><th>STT</th><th>Tầng</th><th>Vị Trí</th><th>Vật Tư</th><th>SL</th><th>Công Năng</th></tr></thead><tbody>
            {irRows.map((r, i) => <tr key={i}><td className="c">{i + 1}</td><td>{r.floor}</td><td>{r.room}</td><td><b>Bộ điều khiển IR IEWG011</b></td><td className="c"><b>1</b></td><td>Điều khiển điều hòa {r.room}, hẹn giờ, tự động tắt khi không có người</td></tr>)}
            {hubN > 0 && <tr><td className="c">{irN + 1}</td><td>{boq.floors.join(", ") || "Tầng 1"}</td><td>{hubN > 1 ? "Mỗi khu vực 1 bộ" : "Phòng khách"}</td><td><b>Bộ trung tâm {hubName}</b></td><td className="c"><b>{hubN}</b></td><td>Trung tâm điều khiển toàn bộ hệ thống</td></tr>}
            {zbN > 0 && <tr><td className="c">{irN + 2}</td><td>{boq.floors.join(", ") || "Tầng 1"}</td><td>Vùng sóng yếu</td><td><b>Mở rộng sóng ZigBee 3.0</b></td><td className="c"><b>{zbN}</b></td><td>Phủ sóng ổn định cho các tầng/khu xa trung tâm</td></tr>}
            {doorN > 0 && <tr><td className="c">{irN + 3}</td><td>{boq.floors[0] ?? "Tầng 1"}</td><td>Cửa cuốn / cổng</td><td><b>Công tắc điều khiển cửa cuốn</b></td><td className="c"><b>{doorN}</b></td><td>Đóng/mở/dừng cửa cuốn qua app, hẹn giờ, cảnh báo quên đóng</td></tr>}</tbody></table></div>
        <div className="box why"><div className="nt">VÌ SAO NÊN CHỌN FPT SMART HOME?</div><ul><li><b>Thương hiệu Việt Nam – Tập đoàn FPT:</b> app và điều khiển giọng nói tiếng Việt, thiết kế cho nhà Việt; linh kiện, bảo hành có sẵn trong nước, không lo hàng xách tay, hết hỗ trợ.</li><li><b>Vẫn chạy khi mất Internet:</b> chuẩn Bluetooth Mesh xử lý nội mạng tại bộ trung tâm; công tắc vẫn bấm tay như công tắc thường – không phụ thuộc wifi hay máy chủ nước ngoài.</li><li><b>An toàn, bền cho gia đình:</b> mặt kính cường lực cách điện, tay ướt chạm vẫn an toàn; tải 300W/kênh, hàng chính hãng mới 100%.</li><li><b>Mở rộng dần, không phải làm lại:</b> hôm nay công tắc, rèm, điều hòa; sau thêm cảm biến, camera, khóa cửa, cổng – cùng một app FPT Life, không thay hệ thống.</li><li><b>Tiết kiệm điện, chi phí hợp lý:</b> tự tắt đèn, điều hòa khi không có người; giá thiết bị thương hiệu Việt, lắp đặt trọn gói minh bạch theo báo giá.</li><li><b>Hỗ trợ tại chỗ ở Đắk Lắk:</b> STC là đại lý ủy quyền FPT Smart Home: bảo hành 24 tháng tận nơi, cài kịch bản theo thói quen gia đình, phần mềm FPT Life miễn phí trọn đời.</li></ul></div>
        <div className="box note"><div className="nt">QUY CHUẨN THI CÔNG, DỊCH VỤ &amp; ĐIỀU KHOẢN THƯƠNG MẠI CỦA CÔNG TY TNHH ĐẦU TƯ VÀ CÔNG NGHỆ STC:</div><ul>
          <li><b>Phạm vi dịch vụ:</b> Lắp đặt toàn bộ thiết bị điện thông minh, cài đặt vào Bộ điều khiển trung tâm, phân phòng và thiết lập kịch bản tự động hóa cho từng phòng.</li>
          <li><b>Phần mềm &amp; Bảo hành:</b> Miễn phí phần mềm FPT Life trọn đời. Bảo hành chính hãng 24 tháng tận nơi.</li>
          <li><b>Điều khoản thương mại:</b> Thanh toán 50% khi đặt hàng, 40% khi giao thiết bị tới công trình, 10% còn lại sau khi lắp đặt bàn giao nghiệm thu. Thời gian giao hàng 01-03 ngày.</li></ul></div>
        <Sign kh={kh} /><Foot title="BẢNG DỰ TOÁN SMART HOME FPT" pg="Trang 4 / 4" /></section>
      {/* ĐỀ XUẤT THÊM – không cộng vào tổng */}
      {(q.proposals ?? []).length > 0 && (
        <section className="page"><Head right={`ĐỀ XUẤT THÊM | ${kh}`} />
          <h1 className="h1s">HẠNG MỤC ĐỀ XUẤT THÊM – CHƯA TÍNH VÀO TỔNG BÁO GIÁ</h1>
          {q.proposals.map((g) => (
            <div className="pn" key={g.group}><div className="pt">{g.group.toUpperCase()}</div>
              <table className="t sm2"><thead><tr><th>STT</th><th>Hạng mục</th><th>ĐVT</th><th>SL</th><th>Đơn giá niêm yết</th><th>Giá sau giảm</th><th>Thành tiền dự kiến</th></tr></thead><tbody>
                {g.lines.map((l, i) => <tr key={l.code + i}><td className="c">{i + 1}</td><td><b>{l.name}</b>{l.vn && <span className="vn">HÀNG VIỆT NAM</span>}{l.note ? <div className="ds">{l.note}</div> : null}</td><td className="c">{l.unit}</td><td className="c">{l.qty}</td><td className="r">{vnd(l.price)}</td><td className="r">{vnd(l.after)}</td><td className="r">{vnd(l.total)}</td></tr>)}
                {g.lines.some((l) => l.install > 0) && <tr><td /><td colSpan={5}>Lắp đặt, cấu hình ({Math.round(d.settings.installRate * 100)}% giá niêm yết)</td><td className="r">{vnd(g.lines.reduce((a, l) => a + l.install, 0))}</td></tr>}
                <tr className="tot"><td colSpan={6}><b>TỔNG DỰ KIẾN – {g.group}</b></td><td className="r red"><b>{vnd(g.est)}</b></td></tr>
              </tbody></table></div>))}
          <div className="box note"><div className="nt">GHI CHÚ:</div><ul>
            <li>Các hạng mục trên là <b>đề xuất</b>, chưa cộng vào tổng báo giá {vnd(q.grandTotal)}đ và không đưa vào hợp đồng cho tới khi chủ nhà đồng ý.</li>
            {q.proposals.some((g) => g.lines.some((l) => l.section === "light" && !l.smart)) && <li>Đèn AB là đèn THƯỜNG: bật/tắt theo mạch qua công tắc cảm ứng FPT, không chỉnh độ sáng/màu từng đèn qua app. Đèn THÔNG MINH FPT chỉnh được độ sáng, màu ánh sáng từng đèn.</li>}
            {q.proposals.some((g) => g.lines.some((l) => l.section === "light")) && <li>Đèn: giá đã chiết khấu {Math.round(d.settings.lightDiscount * 100)}%, thợ điện công trình lắp.</li>}
          </ul></div>
          <Sign kh={kh} /><Foot title="ĐỀ XUẤT THÊM" pg="Trang đề xuất" /></section>)}

      {/* 6. CHIẾU SÁNG (Excel style) */}
      {!noL && <>
      <section className="page xl">
        <table className="xh"><tbody><tr><td className="xf"><img src={A + "i-001.png"} alt="" /></td>
          <td className="xc"><b>{CO}</b><br /><b>Trụ sở:</b> 104 Nguyễn Thượng Hiền, Phường Tân An, Tỉnh Đắk Lắk<br /><b>MST:</b> 6001584831<br /><b>Hotline:</b> 0823 047 047<br /><b>Email:</b> Stctelecom.dlk@gmail.com<br /><b>TK:</b> 0231 000 648 025 - Vietcombank CN Đắk Lắk<br /><b>Đại lý ủy quyền</b> FPT Smart Home khu vực Đắk Lắk</td>
          <td className="xs"><img src={A + "i-000.png"} alt="" /></td></tr></tbody></table>
        <div className="xbox"><div className="xt">{smartN ? "BẢNG DỰ TOÁN CHIẾU SÁNG" : "BẢNG DỰ TOÁN CHIẾU SÁNG – ĐÈN LED THƯỜNG"}</div>
          <div className="xk"><span>Kính gửi:</span><span>{kh}</span><span>Địa chỉ công trình:</span><span>{dc}</span></div>
          <div className="xi">Công ty chúng tôi xin trân trọng gửi tới Quý khách hàng lời chúc sức khỏe và thành đạt. Chúng tôi xin gửi tới Quý khách hàng bảng dự toán hạng mục thi công do Công ty chúng tôi cung cấp, lắp đặt hoàn thiện trong bảng dưới đây:</div></div>
        <table className="xtb"><thead><tr><th>STT</th><th>Tên thiết bị</th><th>Hình ảnh</th><th>Thương hiệu</th><th>Đơn vị</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th><th>Tính năng/thông số kỹ thuật</th></tr></thead><tbody>
          <tr className="xsec"><td>I</td><td colSpan={4}>Giải pháp chiếu sáng</td><td className="c">-</td><td /><td /><td className="r">{vndComma(q.lNiem)}</td></tr>
          {q.lightLines.map((l, i) => <tr key={l.code} className="xrow" style={{ height: q.lightLines.length > 2 ? 110 : 150 }}><td className="c">{i + 1}</td><td>{l.name}<br />{lightKind(l)}</td><td className="c"><img src={l.img} alt="" /></td><td className="c">{l.brand}{l.vn && <><br /><span className="vn">Hàng Việt Nam</span></>}</td><td className="c">{l.unit}</td><td className="c">{l.qty}</td><td className="r">{vndComma(l.price)}</td><td className="r">{vndComma(l.total)}</td><td dangerouslySetInnerHTML={{ __html: l.spec || "" }} /></tr>)}
          <tr className="xsub"><td><i>I</i></td><td colSpan={4}><i>{lightTitle}</i></td><td /><td /><td /><td className="r"><i>{vndComma(q.lNiem)}</i></td></tr>
          <tr className="xy"><td colSpan={8} className="c">TỔNG GIÁ TRỊ THIẾT BỊ</td><td className="r">{vndComma(q.lNiem)}</td></tr>
          <tr><td colSpan={8} className="xsv"><b>CHI PHÍ LẮP ĐẶT, CẤU HÌNH VÀ KẾT NỐI DỊCH VỤ</b>{smartN ? <><br />- Lắp đặt toàn bộ thiết bị điện thông minh như báo giá trên.<br />- Cài đặt và kết nối thiết bị vào Điều Khiển Trung Tâm.<br />- Thiết kế hệ thống, Cấu hình tự động hóa các thiết bị liên kết với nhau.<br />- Phân phòng, đặt tên thiết bị, cấu hình tự động cho từng phòng.<br />- Hướng dẫn khách hàng thao tác sử dụng trên máy tính, điện thoại.<br />- Chia sẻ thiết bị cho người thân, gia đình cùng sử dụng, điều khiển.<br />- Hướng dẫn cài đặt trực tuyến khi phát sinh lỗi kết nối sau khi nghiệm thu, phát sinh phí nếu có yêu cầu xử lý tận nơi.<br />- Bảo hành tận nơi trong vòng 24 tháng nếu sản phẩm phát sinh lỗi do nhà sản xuất.</> : <><br />- Đèn LED thường do thợ điện công trình lắp đặt theo bản vẽ chiếu sáng.<br />- STC cấu hình các mạch đèn (qua công tắc cảm ứng FPT) để bật/tắt bằng app, giọng nói, hẹn giờ, ngữ cảnh theo mạch.<br />- Đèn thường không chỉnh được độ sáng, màu ánh sáng riêng từng đèn.<br />- Bảo hành đèn theo chính sách của hãng AB.</>}</td>
            <td className="r xred" style={{ verticalAlign: "bottom" }}>{q.lInstall ? vndComma(q.lInstall) : <><i>(Đèn do thợ điện công trình lắp đặt)</i>&nbsp; 0</>}</td></tr>
          <tr><td colSpan={8} className="c"><b>CHIẾT KHẤU {Math.round(d.settings.lightDiscount * 100)}%</b></td><td className="r">{vndComma(q.lCk)}</td></tr>
          <tr><td colSpan={8} className="c"><b>PHẦN MỀM</b></td><td className="c xred"><b>Miễn phí</b></td></tr>
          <tr className="xy"><td colSpan={8} className="c">TỔNG CỘNG GÓI GIẢI PHÁP</td><td className="r">{vndComma(q.lTotal)}</td></tr>
          {plainNote && <tr><td colSpan={9} className="xnote">{plainNote}</td></tr>}
          {excl && <tr><td colSpan={9} className="xred">Ghi chú: Báo giá chưa bao gồm {excl} thể hiện trên bản vẽ.</td></tr>}
        </tbody></table>
        <div className="xred" style={{ fontSize: 9.5, marginTop: 3 }}>Phí lắp đặt đèn: 0đ – đèn do thợ điện công trình lắp đặt; STC hỗ trợ cấu hình hệ thống chiếu sáng vào kịch bản FPT Smart Home.</div>
        <Sign kh={kh} />
        <div className="xft"><span>{CO} – Hotline 0823 047 047</span><span>Trang 1</span><span>Báo giá - FPT SMART HOME</span></div></section>

      {/* 7. BỐ TRÍ ĐÈN */}
      <section className="page xl">
        <table className="xtb lt"><thead><tr><th colSpan={5} className="lth">{smartN ? (plainN ? "BỐ TRÍ ĐÈN THEO PHÒNG (THÔNG MINH FPT + ĐÈN THƯỜNG AB)" : "BỐ TRÍ ĐÈN THÔNG MINH ÂM TRẦN") : "BỐ TRÍ ĐÈN THEO PHÒNG – ĐÈN LED THƯỜNG AB"}</th></tr><tr className="lh"><th>STT</th><th>TẦNG</th><th>VỊ TRÍ</th><th>SỐ LƯỢNG</th><th>CÔNG NĂNG</th></tr></thead>
          <tbody>{rooms.map((l, i) => <tr key={i} className={l.proposed ? "prop" : ""}><td className="c">{i + 1}</td><td className="c">{l.floor}</td><td>{l.room}{l.proposed && <b className="or"> (đề xuất thêm)</b>}</td><td className="r">{l.qty}</td><td>{l.proposed ? propLine?.name ?? "Spotlight đề xuất" : nameOfType(l.type)}</td></tr>)}
            <tr className="xy"><td colSpan={3} className="c">TỔNG CỘNG</td><td className="r">{roomsN}</td><td /></tr></tbody></table>
        <div style={{ fontSize: 10, marginTop: 6 }}>Tổng cộng: {roomsN} bộ đèn theo bản vẽ chiếu sáng.{roomsN !== lightN && <b className="xred"> Bảng dự toán tính {lightN} bộ (đã điều chỉnh theo trao đổi với chủ nhà).</b>}</div>
        {excl && <div className="xred" style={{ fontSize: 10 }}>Ghi chú: Chưa bao gồm {excl}.</div>}
        <div className="xft"><span>{CO} – Hotline 0823 047 047</span><span>Trang 2</span><span>Báo giá - FPT SMART HOME</span></div></section>
      </>}

      {/* 8. BẢN VẼ ĐỀ XUẤT (tuỳ chọn) */}
      {showProp && (d.drawings ?? []).map((dr, k) => (
        <section key={k} className="page"><Head right={`ĐỀ XUẤT BỐ TRÍ SPOTLIGHT | ${kh}`} />
          <h2>ĐỀ XUẤT BỐ TRÍ THÊM ĐÈN SPOTLIGHT – {dr.floor.toUpperCase()}</h2>
          <div className="propimg"><img src={dr.img} alt="" /></div>
          <div className="proplg"><span className="pdot" /> Spotlight đề xuất thêm (STC) &nbsp;·&nbsp; các ký hiệu khác giữ nguyên theo bản vẽ thiết kế {P.sourceName}</div>
          <table className="t sm2"><thead><tr><th>STT</th><th>Phòng</th><th>Số lượng</th><th>Mục đích</th></tr></thead><tbody>
            {dr.byRoom.map((r, i) => <tr key={i}><td className="c">{i + 1}</td><td>{r.room}</td><td className="c"><b>{r.qty}</b></td><td>Chiếu điểm, hắt sáng tường trang trí/đầu giường; điều chỉnh độ sáng theo ngữ cảnh</td></tr>)}
            <tr className="tot"><td colSpan={2}>TỔNG ĐỀ XUẤT THÊM</td><td className="c">{dr.byRoom.reduce((a, r) => a + r.qty, 0)}</td><td>{propLine ? `${propLine.name.replace(/ – ĐỀ XUẤT THÊM$/, "")} – đã tính trong báo giá chiếu sáng` : ""}</td></tr></tbody></table>
          <div className="rn">Vị trí đề xuất mang tính tham khảo – sẽ chốt lại cùng chủ nhà và đơn vị thiết kế trước khi thi công trần.</div>
          <Foot title="ĐỀ XUẤT BỐ TRÍ SPOTLIGHT" pg={`Trang ${k + 1} / ${d.drawings!.length}`} /></section>
      ))}
    </div>
  );
}
