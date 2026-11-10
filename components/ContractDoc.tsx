import "@/app/quote/print/contract.css";
import type { PrintPayload } from "@/components/QuoteEditor";
import type { Deposit } from "@/lib/server/shares";
import { docSo, vnd } from "@/lib/core/words";
import PrintButton from "@/components/PrintButton";

const CO = "CÔNG TY TNHH ĐẦU TƯ VÀ CÔNG NGHỆ STC";
const dots = "……………………………………";

/** Tên hàng trong hợp đồng: gọn, đúng kiểu văn bản (không nhãn quảng cáo của báo giá). */
const CNAME: Record<string, string> = {
  hub: "Bộ điều khiển trung tâm FPT T950", hub_pb650: "Bộ điều khiển trung tâm FPT Play Box 650", zigbee: "Thiết bị mở rộng sóng ZigBee",
  ir: "Bộ điều khiển điều hòa hồng ngoại FPT", gate_sw: "Công tắc điều khiển cổng", curtain_sw: "Công tắc điều khiển rèm",
  curtain_motor: "Động cơ rèm kéo ngang FPT", rail: "Thanh ray rèm kéo ngang", cam_in: "Camera FPT SE 3 (trong nhà)", cam_out: "Camera FPT SE 2S (ngoài trời)",
  athena: "Đèn spotlight âm trần FPT Athena 12W, loại thông minh", downlight_fpt: "Đèn downlight FPT Athena 9W, loại thông minh",
  spotlight_ab: "Đèn spotlight âm trần AB", downlight_ab: "Đèn downlight âm trần AB", tube_ab: "Đèn ống bơ AB 12W", wall_ab: "Đèn gắn tường ngoài nhà 2×5W",
  gate_ab: "Bộ cổng tự động âm sàn AB Gate 24V, cổng 2 cánh",
};
const unitOf = (u: string) => (u === u.toUpperCase() ? u.charAt(0) + u.slice(1).toLowerCase() : u);
function cname(l: { code: string; name: string; proposed?: boolean }, rect: boolean): string {
  const base = l.code.replace(/^prop_/, "");
  const sw = /^sw([1-4])$/.exec(base);
  let t = sw ? `Công tắc cảm ứng FPT ${sw[1]} nút${rect ? ", mặt chữ nhật" : ""}` : CNAME[base]
    ?? l.name.replace(/\s*[–-]\s*(đèn )?THƯỜNG/gi, "").replace(/\s*[–-]\s*ĐỀ XUẤT THÊM/i, "").replace(/\(phiên bản giới hạn\)/i, "").replace(/\s{2,}/g, " ").trim();
  if (l.proposed || l.code.startsWith("prop_")) t += " (bổ sung theo đề xuất)";
  return t;
}

/** Hợp đồng cung cấp & lắp đặt – sinh từ báo giá đã chốt (sau khi khách đặt cọc). */
export interface PartyA { phone?: string; cccd?: string; cccdDate?: string; cccdPlace?: string; rep?: string }
export default function ContractDoc({ rec, backHref, partyA, draft }: { rec: { payload: PrintPayload; deposit?: Deposit | null; contractNo?: string; lockedAt?: string }; backHref?: string; partyA?: PartyA; draft?: boolean | string }) {
  const { payload: d } = rec;
  const dep: Deposit = rec.deposit ?? { amount: 0, date: "", method: "" };
  const hasDep = dep.amount > 0;
  const contractNo = rec.contractNo || "………/HĐ-STC";
  const A = partyA ?? {};
  const P = d.project, q = d.quote;
  const signed = rec.lockedAt ? new Date(rec.lockedAt) : null;
  const fmt = (o: Intl.DateTimeFormatOptions) => (signed ? signed.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", ...o }) : "……");
  const day = fmt({ day: "2-digit" }), mon = fmt({ month: "2-digit" }), yr = signed ? fmt({ year: "numeric" }) : "20……";
  const total = q.grandTotal;
  const t1 = Math.round(total * 0.5), t2 = Math.round(total * 0.4), t3 = total - t1 - t2;
  const rest1 = Math.max(0, t1 - dep.amount);
  const shLines = q.sections.flatMap((s) => s.lines.map((l) => ({ ...l, sec: s.title })));
  const showProp = d.settings.includeProposal !== false;
  const lLines = q.lightLines.filter((l) => showProp || !l.proposed);
  const hasLight = lLines.length > 0 && q.lTotal > 0;
  const rect = d.settings.switchShape === "rect";
  const gLines = q.gateLines ?? [];
  const hasGate = gLines.length > 0;
  const gL = hasLight ? "C" : "B";
  const parts = ["A", ...(hasLight ? ["B"] : []), ...(hasGate ? [gL] : [])];
  let n = 0;

  return (
    <div className="ctr">
      <div className="noprint bar">{backHref && <a href={backHref}>← Xem báo giá</a>}<PrintButton label="In / Lưu PDF hợp đồng" /></div>
      {draft && <div className="noprint" style={{ maxWidth: 794, margin: "0 auto 8px", color: "#b45309", fontSize: 13 }}>{typeof draft === "string" ? draft : "Bản soạn thảo – thông tin lấy tự động theo báo giá đang mở trong app. Số liệu cọc/CCCD nhập ở ô phía trên."}</div>}
      <article className="a4">
        <div className="qh"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br /><u><b>Độc lập – Tự do – Hạnh phúc</b></u></div>
        <h1>HỢP ĐỒNG CUNG CẤP VÀ LẮP ĐẶT<br />THIẾT BỊ NHÀ THÔNG MINH{hasLight && <> VÀ THIẾT BỊ CHIẾU SÁNG</>}</h1>
        <div className="no">Số: {contractNo}</div>
        <ul className="cc">
          <li>Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;</li>
          <li>Căn cứ Luật Thương mại số 36/2005/QH11 ngày 14/06/2005;</li>
          <li>Căn cứ báo giá lập ngày {P.date} đã được Bên A chấp thuận{hasDep ? ` và đặt cọc ngày ${dep.date}` : ""};</li>
          <li>Căn cứ nhu cầu và khả năng của hai bên.</li>
        </ul>
        <p>Hôm nay, ngày {day} tháng {mon} năm {yr}, chúng tôi gồm:</p>

        <h3>BÊN A (BÊN MUA): {P.customer.toUpperCase()}</h3>
        <table className="kv"><tbody>
          <tr><td>Địa chỉ công trình</td><td>{P.address}</td></tr>
          {A.rep && <tr><td>Người đại diện</td><td>{A.rep}</td></tr>}
          <tr><td>Điện thoại</td><td>{A.phone || dep.phone || dots}</td></tr>
          <tr><td>Số CCCD</td><td>{A.cccd || dots} cấp ngày {A.cccdDate || dots}{A.cccdPlace ? ` tại ${A.cccdPlace}` : ""}</td></tr>
        </tbody></table>

        <h3>BÊN B (BÊN BÁN): {CO}</h3>
        <table className="kv"><tbody>
          <tr><td>Địa chỉ</td><td>104 Nguyễn Thượng Hiền, Phường Tân An, Tỉnh Đắk Lắk</td></tr>
          <tr><td>Mã số thuế</td><td>6001584831</td></tr>
          <tr><td>Đại diện</td><td>Ông <b>LÊ QUANG TOÀN</b>, chức vụ Giám đốc</td></tr>
          <tr><td>Điện thoại</td><td>0823 047 047</td></tr>
          <tr><td>Email</td><td>Stctelecom.dlk@gmail.com</td></tr>
          <tr><td>Tài khoản</td><td>0231 000 648 025 tại Ngân hàng Vietcombank, Chi nhánh Đắk Lắk</td></tr>
        </tbody></table>
        <p>Hai bên thống nhất ký kết hợp đồng với các điều khoản sau:</p>

        <h3>Điều 1. Nội dung hợp đồng</h3>
        <p>Bên B bán, lắp đặt và cài đặt hệ thống nhà thông minh FPT{hasLight ? ", thiết bị chiếu sáng" : ""}{hasGate ? ", cổng tự động âm sàn" : ""} cho công trình của Bên A tại địa chỉ nêu trên. Chủng loại, số lượng và đơn giá theo <b>Phụ lục 01</b> kèm theo hợp đồng này.</p>
        {rect && <p>Công tắc cảm ứng dùng mặt chữ nhật 120×72 mm. Bên A lắp đế âm tường chữ nhật tại các vị trí công tắc theo bản vẽ.</p>}
        {hasLight && lLines.some((l) => !l.smart) && <p>Đèn AB là đèn LED loại thường, bật/tắt theo nhóm qua công tắc cảm ứng, không chỉnh được độ sáng và màu ánh sáng của từng đèn. Chỉ đèn FPT Athena (ghi “loại thông minh”) có chức năng này.</p>}
        <table className="t"><thead><tr><th>STT</th><th>Hạng mục</th><th>Giá trị (đồng)</th></tr></thead><tbody>
          <tr><td className="c">1</td><td>Thiết bị nhà thông minh FPT (đã giảm giá, gồm lắp đặt và cài đặt)</td><td className="r">{vnd(q.shTotal)}</td></tr>
          {hasLight && <tr><td className="c">2</td><td>Thiết bị chiếu sáng (đã chiết khấu{q.lInstall > 0 ? ", gồm lắp đặt" : ""})</td><td className="r">{vnd(q.lTotal)}</td></tr>}
          {hasGate && <tr><td className="c">{hasLight ? 3 : 2}</td><td>Cổng tự động âm sàn AB Gate (đã giảm giá{q.kmLapDat > 0 ? ", miễn phí lắp đặt" : ", gồm lắp đặt"})</td><td className="r">{vnd(q.gTotal ?? 0)}</td></tr>}
          <tr className="b"><td colSpan={2}>TỔNG GIÁ TRỊ HỢP ĐỒNG</td><td className="r">{vnd(total)}</td></tr>
        </tbody></table>

        <h3>Điều 2. Giá trị hợp đồng</h3>
        <p>Tổng giá trị hợp đồng: <b>{vnd(total)}</b> (Bằng chữ: <i>{q.grandWords}</i>).</p>
        <p>Giá trị trên không thay đổi trong thời gian thực hiện hợp đồng. Hạng mục phát sinh ngoài Phụ lục 01 (nếu có) được hai bên thống nhất bằng phụ lục bổ sung. Riêng ray rèm được nghiệm thu và thanh toán theo số mét thực tế.</p>

        <h3>Điều 3. Đặt cọc và thanh toán</h3>
        {hasDep ? <p>Bên A đã đặt cọc cho Bên B số tiền <b>{vnd(dep.amount)}</b> (Bằng chữ: <i>{docSo(dep.amount)}</i>) ngày {dep.date}, hình thức: {dep.method}{dep.note ? ` (${dep.note})` : ""}. Tiền cọc được trừ vào đợt thanh toán 1.</p>
          : <p>Bên A đặt cọc cho Bên B số tiền {dots} đồng ngày {dots}, hình thức: {dots}. Tiền cọc được trừ vào đợt thanh toán 1.</p>}
        <table className="t"><thead><tr><th>Đợt</th><th>Thời điểm</th><th>Tỷ lệ</th><th>Số tiền (đồng)</th></tr></thead><tbody>
          <tr><td className="c">1</td><td>Khi ký hợp đồng / đặt hàng{hasDep ? ` (đã trừ cọc, còn phải thanh toán ${vnd(rest1)})` : " (trừ tiền cọc)"}</td><td className="c">50%</td><td className="r">{vnd(t1)}</td></tr>
          <tr><td className="c">2</td><td>Khi Bên B giao thiết bị tới công trình</td><td className="c">40%</td><td className="r">{vnd(t2)}</td></tr>
          <tr><td className="c">3</td><td>Sau khi lắp đặt, bàn giao, nghiệm thu</td><td className="c">10%</td><td className="r">{vnd(t3)}</td></tr>
        </tbody></table>
        <p>Hình thức thanh toán: chuyển khoản vào tài khoản của Bên B nêu trên hoặc tiền mặt. Nội dung chuyển khoản ghi rõ số hợp đồng {contractNo}.</p>

        <h3>Điều 4. Thời gian, địa điểm giao hàng và lắp đặt</h3>
        <ul>
          <li>Giao thiết bị trong 01–03 ngày làm việc kể từ khi Bên B nhận thanh toán đợt 1, tại công trình của Bên A.</li>
          <li>Lắp đặt theo tiến độ hoàn thiện công trình; Bên A báo trước cho Bên B ít nhất 02 ngày khi mặt bằng sẵn sàng.</li>
          <li>Hai bên lập biên bản bàn giao, nghiệm thu khi hệ thống chạy đúng các chức năng đã thống nhất.</li>
        </ul>

        <h3>Điều 5. Bảo hành và hỗ trợ</h3>
        <ul>
          <li>Bảo hành tận nơi <b>24 tháng</b> kể từ ngày nghiệm thu đối với lỗi của nhà sản xuất. Phần mềm điều khiển FPT Life không thu phí.</li>
          {(hasGate || shLines.some((l) => l.code === "gate_ab")) && <li>Cổng tự động AB Gate bảo hành theo chính sách của hãng AB Gate, Bên B hỗ trợ kỹ thuật tận nơi. Không thuộc phạm vi hợp đồng: xây hố và đế âm sàn, thoát nước hố motor, kéo điện tới chân cổng, gia cố bản lề hoặc cánh cổng, pin dự phòng.</li>}
          <li>Không bảo hành với hư hỏng do sét đánh, nước vào, điện áp bất thường, va đập, cháy nổ hoặc tự ý tháo lắp, sửa chữa.</li>
          <li>Sau nghiệm thu, Bên B hỗ trợ qua điện thoại khi hệ thống mất kết nối. Sửa chữa ngoài phạm vi bảo hành có tính phí theo thỏa thuận.</li>
        </ul>

        <h3>Điều 6. Trách nhiệm của các bên</h3>
        <p><b>Bên A:</b> chuẩn bị mặt bằng, đường dây nguồn, hộp âm tường{rect ? " (đế chữ nhật)" : ""}, dây trung tính (N) tại vị trí công tắc và nguồn chờ cho động cơ rèm/thiết bị theo bản vẽ thiết kế điện; tạo điều kiện cho Bên B thi công; thanh toán đúng hạn; tham gia nghiệm thu.</p>
        <p><b>Bên B:</b> giao đúng chủng loại, số lượng, hàng chính hãng mới 100%; lắp đặt, cài đặt, hướng dẫn sử dụng và bàn giao; bảo hành theo Điều 5.</p>

        <h3>Điều 7. Xử lý tiền cọc và chấm dứt hợp đồng</h3>
        <p>Theo Điều 328 Bộ luật Dân sự 2015: nếu Bên A từ chối thực hiện hợp đồng thì tiền đặt cọc thuộc về Bên B; nếu Bên B từ chối thực hiện hợp đồng thì phải trả lại tiền đặt cọc và một khoản tiền tương đương giá trị tiền cọc cho Bên A, trừ trường hợp bất khả kháng hoặc hai bên có thỏa thuận khác.</p>

        <h3>Điều 8. Điều khoản chung</h3>
        <ul>
          <li>Tranh chấp phát sinh được giải quyết bằng thương lượng. Nếu không thương lượng được, mỗi bên có quyền khởi kiện tại Tòa án có thẩm quyền.</li>
          <li>Hợp đồng có hiệu lực từ ngày ký, lập thành 02 bản có giá trị như nhau, mỗi bên giữ 01 bản.</li>
        </ul>

        <div className="sg"><div><b>ĐẠI DIỆN BÊN A</b><i>(Ký, ghi rõ họ tên)</i><div className="nm">{P.customer.toUpperCase()}</div></div>
          <div><b>ĐẠI DIỆN BÊN B</b><i>(Ký, đóng dấu)</i><div className="nm">LÊ QUANG TOÀN</div></div></div>
      </article>

      <article className="a4">
        <h2>PHỤ LỤC 01<br />DANH MỤC THIẾT BỊ VÀ ĐƠN GIÁ</h2>
        <div className="no">Kèm theo Hợp đồng số {contractNo}</div>
        <table className="t sm"><thead><tr><th>STT</th><th>Tên thiết bị</th><th>ĐVT</th><th>SL</th><th>Đơn giá (đ)</th><th>Thành tiền (đ)</th></tr></thead><tbody>
          <tr className="sec"><td colSpan={6}>A. THIẾT BỊ NHÀ THÔNG MINH FPT</td></tr>
          {shLines.map((l) => { n++; return <tr key={l.code}><td className="c">{n}</td><td>{cname(l, rect)}</td><td className="c">{unitOf(l.unit)}</td><td className="c">{l.qty}</td><td className="r">{vnd(l.after)}</td><td className="r">{vnd(l.total)}</td></tr>; })}
          <tr><td /><td>Lắp đặt, cài đặt hệ thống</td><td className="c">Gói</td><td className="c">1</td><td className="r">{vnd(q.lapDat)}</td><td className="r">{vnd(q.lapDat)}</td></tr>
          {!hasGate && q.kmLapDat > 0 && <tr><td /><td>Lắp đặt, cài đặt cổng tự động (miễn phí)</td><td className="c">Gói</td><td className="c">1</td><td className="r">0</td><td className="r">0</td></tr>}
          <tr className="b"><td colSpan={5}>Cộng A</td><td className="r">{vnd(q.shTotal)}</td></tr>
          {hasLight && <>
          <tr className="sec"><td colSpan={6}>B. THIẾT BỊ CHIẾU SÁNG</td></tr>
          {lLines.map((l) => { n++; return <tr key={l.code}><td className="c">{n}</td><td>{cname(l, rect)}</td><td className="c">{unitOf(l.unit)}</td><td className="c">{l.qty}</td><td className="r">{vnd(l.price)}</td><td className="r">{vnd(l.total)}</td></tr>; })}
          <tr><td /><td>Chiết khấu {Math.round(d.settings.lightDiscount * 100)}%</td><td /><td /><td /><td className="r">-{vnd(q.lCk)}</td></tr>
          {q.lInstall > 0 && <tr><td /><td>Lắp đặt đèn</td><td /><td /><td /><td className="r">{vnd(q.lInstall)}</td></tr>}
          <tr className="b"><td colSpan={5}>Cộng B</td><td className="r">{vnd(q.lTotal)}</td></tr>
          </>}
          {hasGate && <>
          <tr className="sec"><td colSpan={6}>{gL}. CỔNG TỰ ĐỘNG ÂM SÀN</td></tr>
          {gLines.map((l) => { n++; return <tr key={l.code}><td className="c">{n}</td><td>{cname(l, rect)}</td><td className="c">{unitOf(l.unit)}</td><td className="c">{l.qty}</td><td className="r">{vnd(l.after)}</td><td className="r">{vnd(l.total)}</td></tr>; })}
          <tr><td /><td>Lắp đặt, cài đặt cổng tự động{q.kmLapDat > 0 ? " (miễn phí)" : ""}</td><td className="c">Gói</td><td className="c">1</td><td className="r">{vnd(q.gInstall ?? 0)}</td><td className="r">{vnd(q.gInstall ?? 0)}</td></tr>
          <tr className="b"><td colSpan={5}>Cộng {gL}</td><td className="r">{vnd(q.gTotal ?? 0)}</td></tr>
          </>}
          <tr className="b red"><td colSpan={5}>{parts.length > 1 ? `TỔNG CỘNG (${parts.join(" + ")})` : "TỔNG CỘNG"}</td><td className="r">{vnd(total)}</td></tr>
        </tbody></table>
        <p className="sm">Bằng chữ: <i>{q.grandWords}</i></p>
        <div className="sg"><div><b>ĐẠI DIỆN BÊN A</b><div className="nm">{P.customer.toUpperCase()}</div></div><div><b>ĐẠI DIỆN BÊN B</b><div className="nm">LÊ QUANG TOÀN</div></div></div>
      </article>
    </div>
  );
}
