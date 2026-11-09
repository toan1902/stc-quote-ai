import "@/app/quote/print/contract.css";
import type { PrintPayload } from "@/components/QuoteEditor";
import type { Deposit } from "@/lib/server/shares";
import { docSo, vnd } from "@/lib/core/words";
import PrintButton from "@/components/PrintButton";

const CO = "CÔNG TY TNHH ĐẦU TƯ VÀ CÔNG NGHỆ STC";
const dots = "……………………………………";

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
        <h1>HỢP ĐỒNG CUNG CẤP VÀ LẮP ĐẶT<br />THIẾT BỊ NHÀ THÔNG MINH{hasLight && <> &amp; CHIẾU SÁNG</>}</h1>
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
          <tr><td>Đại diện</td><td>Ông <b>LÊ QUANG TOÀN</b> – Chức vụ: Giám đốc</td></tr>
          <tr><td>Điện thoại</td><td>0823 047 047 – Email: Stctelecom.dlk@gmail.com</td></tr>
          <tr><td>Tài khoản</td><td>0231 000 648 025 – Ngân hàng Vietcombank CN Đắk Lắk</td></tr>
        </tbody></table>
        <p>Hai bên thống nhất ký kết hợp đồng với các điều khoản sau:</p>

        <h3>Điều 1. Nội dung hợp đồng</h3>
        <p>Bên B cung cấp thiết bị chính hãng, lắp đặt, cài đặt cấu hình hệ thống FPT Smart Home{hasLight ? " và thiết bị chiếu sáng" : ""} cho công trình của Bên A tại địa chỉ nêu trên, theo chủng loại, số lượng và đơn giá tại <b>Phụ lục 01</b> đính kèm (là một phần không tách rời của hợp đồng). Bên B ưu tiên sử dụng sản phẩm thương hiệu Việt Nam.</p>
        {rect && <p>Công tắc cảm ứng dùng kiểu <b>chữ nhật 120×72 mm</b>: Bên A (thợ điện công trình) lắp đế âm tường chữ nhật tại các vị trí công tắc theo bản vẽ.</p>}
        {hasLight && lLines.some((l) => !l.smart) && <p>Đèn chiếu sáng ghi “đèn THƯỜNG” (thương hiệu AB) là đèn LED thường, được bật/tắt theo mạch qua công tắc cảm ứng FPT; không có chức năng chỉnh độ sáng, nhiệt độ màu riêng từng đèn. Chỉ các đèn ghi “THÔNG MINH FPT” mới có các chức năng này.</p>}
        <table className="t"><thead><tr><th>STT</th><th>Hạng mục</th><th>Giá trị (đồng)</th></tr></thead><tbody>
          <tr><td className="c">1</td><td>Giải pháp FPT Smart Home (thiết bị sau giảm giá + lắp đặt, cấu hình)</td><td className="r">{vnd(q.shTotal)}</td></tr>
          {hasLight && <tr><td className="c">2</td><td>Giải pháp chiếu sáng (sau chiết khấu)</td><td className="r">{vnd(q.lTotal)}</td></tr>}
          {hasGate && <tr><td className="c">{hasLight ? 3 : 2}</td><td>Cổng tự động âm sàn AB Gate (sau giảm giá; lắp đặt, cài hành trình {q.kmLapDat > 0 ? "miễn phí" : "theo phụ lục"})</td><td className="r">{vnd(q.gTotal ?? 0)}</td></tr>}
          <tr className="b"><td colSpan={2}>TỔNG GIÁ TRỊ HỢP ĐỒNG</td><td className="r">{vnd(total)}</td></tr>
        </tbody></table>

        <h3>Điều 2. Giá trị hợp đồng</h3>
        <p>Tổng giá trị hợp đồng: <b>{vnd(total)}</b> (Bằng chữ: <i>{q.grandWords}</i>).</p>
        <p>Giá trị trên được giữ cố định theo báo giá đã chốt. Hạng mục phát sinh ngoài Phụ lục 01 (nếu có) do hai bên thống nhất bằng phụ lục bổ sung. Khối lượng ghi “ước tính” (ray rèm, LED dây…) được nghiệm thu và thanh toán theo khối lượng thực tế.</p>

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
          <li>Hai bên lập biên bản bàn giao, nghiệm thu khi hệ thống vận hành đúng chức năng như báo giá.</li>
        </ul>

        <h3>Điều 5. Bảo hành và hỗ trợ</h3>
        <ul>
          <li>Bảo hành chính hãng tận nơi <b>24 tháng</b> kể từ ngày nghiệm thu đối với lỗi do nhà sản xuất. Miễn phí phần mềm FPT Life trọn đời.</li>
          {(hasGate || shLines.some((l) => l.code === "gate_ab")) && <li>Cổng tự động AB Gate: bảo hành theo chính sách của hãng AB Gate; Bên B bảo trì, hỗ trợ kỹ thuật tận nơi tại Đắk Lắk. Hạng mục hố/đế âm sàn, thoát nước hố motor, đường điện tới chân cổng, gia cố bản lề/cánh cổng và pin dự phòng không thuộc phạm vi hợp đồng.</li>}
          <li>Không bảo hành với hư hỏng do sét đánh, nước vào, điện áp bất thường, va đập, cháy nổ hoặc tự ý tháo lắp, sửa chữa.</li>
          <li>Hỗ trợ trực tuyến khi phát sinh lỗi kết nối sau nghiệm thu; xử lý tận nơi ngoài phạm vi bảo hành có tính phí theo thỏa thuận.</li>
        </ul>

        <h3>Điều 6. Trách nhiệm của các bên</h3>
        <p><b>Bên A:</b> chuẩn bị mặt bằng, đường dây nguồn, hộp âm tường{rect ? " (đế chữ nhật)" : ""}, dây trung tính (N) tại vị trí công tắc và nguồn chờ cho động cơ rèm/thiết bị theo bản vẽ thiết kế điện; tạo điều kiện cho Bên B thi công; thanh toán đúng hạn; tham gia nghiệm thu.</p>
        <p><b>Bên B:</b> cung cấp đúng chủng loại, số lượng, hàng chính hãng mới 100%; lắp đặt, cấu hình, hướng dẫn sử dụng và bàn giao; thực hiện bảo hành theo Điều 5.</p>

        <h3>Điều 7. Xử lý tiền cọc và chấm dứt hợp đồng</h3>
        <p>Theo Điều 328 Bộ luật Dân sự 2015: nếu Bên A từ chối thực hiện hợp đồng thì tiền đặt cọc thuộc về Bên B; nếu Bên B từ chối thực hiện hợp đồng thì phải trả lại tiền đặt cọc và một khoản tiền tương đương giá trị tiền cọc cho Bên A, trừ trường hợp bất khả kháng hoặc hai bên có thỏa thuận khác.</p>

        <h3>Điều 8. Điều khoản chung</h3>
        <ul>
          <li>Mọi tranh chấp được ưu tiên giải quyết bằng thương lượng; nếu không thành, một trong hai bên có quyền khởi kiện tại Tòa án có thẩm quyền.</li>
          <li>Hợp đồng có hiệu lực kể từ ngày ký, được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</li>
        </ul>

        <div className="sg"><div><b>ĐẠI DIỆN BÊN A</b><i>(Ký, ghi rõ họ tên)</i><div className="nm">{P.customer.toUpperCase()}</div></div>
          <div><b>ĐẠI DIỆN BÊN B</b><i>(Ký, đóng dấu)</i><div className="nm">LÊ QUANG TOÀN</div></div></div>
      </article>

      <article className="a4">
        <h2>PHỤ LỤC 01 – DANH MỤC THIẾT BỊ VÀ ĐƠN GIÁ</h2>
        <div className="no">Kèm theo Hợp đồng số {contractNo}</div>
        <table className="t sm"><thead><tr><th>STT</th><th>Tên thiết bị</th><th>ĐVT</th><th>SL</th><th>Đơn giá (đ)</th><th>Thành tiền (đ)</th></tr></thead><tbody>
          <tr className="sec"><td colSpan={6}>A. GIẢI PHÁP FPT SMART HOME</td></tr>
          {shLines.map((l) => { n++; return <tr key={l.code}><td className="c">{n}</td><td>{l.name}{l.vn && <span className="vn">Hàng Việt Nam</span>}</td><td className="c">{l.unit}</td><td className="c">{l.qty}</td><td className="r">{vnd(l.after)}</td><td className="r">{vnd(l.total)}</td></tr>; })}
          <tr><td /><td>Lắp đặt, cài đặt cấu hình hệ thống</td><td className="c">Gói</td><td className="c">1</td><td className="r">{vnd(q.lapDat)}</td><td className="r">{vnd(q.lapDat)}</td></tr>
          {!hasGate && q.kmLapDat > 0 && <tr><td /><td>Lắp đặt, cài đặt hành trình cổng tự động – miễn phí (khuyến mãi hệ sinh thái FPT Smart Home)</td><td className="c">Gói</td><td className="c">1</td><td className="r">0</td><td className="r">0</td></tr>}
          <tr className="b"><td colSpan={5}>Cộng A</td><td className="r">{vnd(q.shTotal)}</td></tr>
          {hasLight && <>
          <tr className="sec"><td colSpan={6}>B. GIẢI PHÁP CHIẾU SÁNG</td></tr>
          {lLines.map((l) => { n++; return <tr key={l.code}><td className="c">{n}</td><td>{l.name}{l.vn && <span className="vn">Hàng Việt Nam</span>}</td><td className="c">{l.unit}</td><td className="c">{l.qty}</td><td className="r">{vnd(l.price)}</td><td className="r">{vnd(l.total)}</td></tr>; })}
          <tr><td /><td>Chiết khấu chiếu sáng {Math.round(d.settings.lightDiscount * 100)}%</td><td /><td /><td /><td className="r">-{vnd(q.lCk)}</td></tr>
          {q.lInstall > 0 && <tr><td /><td>Lắp đặt đèn</td><td /><td /><td /><td className="r">{vnd(q.lInstall)}</td></tr>}
          <tr className="b"><td colSpan={5}>Cộng B</td><td className="r">{vnd(q.lTotal)}</td></tr>
          </>}
          {hasGate && <>
          <tr className="sec"><td colSpan={6}>{gL}. CỔNG TỰ ĐỘNG ÂM SÀN AB GATE</td></tr>
          {gLines.map((l) => { n++; return <tr key={l.code}><td className="c">{n}</td><td>{l.name}{l.vn && <span className="vn">Hàng Việt Nam</span>}</td><td className="c">{l.unit}</td><td className="c">{l.qty}</td><td className="r">{vnd(l.after)}</td><td className="r">{vnd(l.total)}</td></tr>; })}
          <tr><td /><td>Lắp đặt, cài đặt hành trình cổng tự động{q.kmLapDat > 0 ? " – miễn phí (khuyến mãi hệ sinh thái FPT Smart Home)" : ""}</td><td className="c">Gói</td><td className="c">1</td><td className="r">{vnd(q.gInstall ?? 0)}</td><td className="r">{vnd(q.gInstall ?? 0)}</td></tr>
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
