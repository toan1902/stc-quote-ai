import { DEVICE_TYPES } from "../core/types.ts";

export type AiTask = "classify" | "classify_sheet" | "frame" | "legend" | "detect" | "verify" | "panel" | "estimate" | "quote_read";

const ROLE = `Bạn là kỹ sư M&E (cơ điện) cao cấp, chuyên bóc khối lượng (BOQ) từ bản vẽ điện dân dụng Việt Nam.
Nguyên tắc: chỉ báo những gì THẤY RÕ trên ảnh; không đoán; không bỏ sót; mỗi thiết bị vật lý = đúng 1 mục.
Toạ độ: box_2d = [ymin, xmin, ymax, xmax] chuẩn hoá 0–1000 theo ảnh được gửi; point = [y, x] chuẩn hoá 0–1000.
Chỉ trả về JSON hợp lệ, không giải thích, không markdown.`;

const TYPES = DEVICE_TYPES.join(", ");

export function buildPrompt(task: AiTask, ctx: Record<string, unknown> = {}): string {
  const legend = Array.isArray(ctx.legend) && ctx.legend.length
    ? `\nBẢNG KÝ HIỆU CỦA BỘ BẢN VẼ NÀY (dùng làm từ điển nhận dạng, ưu tiên hơn kiến thức chung):\n${(ctx.legend as { name: string; deviceType: string; note?: string }[]).map((l) => `- "${l.name}" → ${l.deviceType}${l.note ? ` (${l.note})` : ""}`).join("\n")}`
    : "\nKhông có bảng ký hiệu riêng: dùng ký hiệu điện TCVN phổ biến.";

  switch (task) {
    case "quote_read":
      return `Bạn là nhân viên báo giá thiết bị điện thông minh. ${ctx.text ? "Dưới đây là nội dung bảng tính (Excel) của một BÁO GIÁ có sẵn, mỗi dòng là một hàng ô cách nhau bằng dấu |:\n" + String(ctx.text).slice(0, 60000) : "Ảnh là MỘT TRANG của một BÁO GIÁ có sẵn (PDF)."}
Đọc chính xác từng con số (đơn vị đồng, bỏ dấu chấm ngăn cách nghìn). Không đoán, không tự tính lại; ô không có ghi null.
1) items: MỌI dòng hàng hoá/thiết bị có số lượng (bỏ dòng tiêu đề nhóm, dòng tổng). Mỗi dòng:
 {"name": tên thiết bị nguyên văn (không kèm thông số dài), "unit": ĐVT, "qty": số lượng, "price": đơn giá niêm yết, "discount": % giảm dạng 0–1 hoặc null,
  "after": đơn giá sau giảm hoặc null, "total": thành tiền hoặc null,
  "group": "smarthome" (công tắc, trung tâm, rèm, camera, cảm biến, cổng…) | "light" (đèn chiếu sáng) | "other"}
2) totals (chỉ ghi số in trên trang, không có thì null): {"shList","shDiscount","shInstall","shTotal","lightList","lightDiscount","lightInstall","lightTotal","grandTotal"}
   – sh* là phần Smart Home/thiết bị thông minh, light* là phần chiếu sáng; *Install = chi phí lắp đặt/cấu hình; *Discount ghi số dương.
3) customer: tên khách sau "Kính gửi" (vd "Anh Mạnh"), address, date (dd/mm/yyyy) nếu có.
Trả về JSON: {"customer":...,"address":...,"date":...,"items":[...],"totals":{...}}`;

    case "classify":
      return `${ROLE}
Phân loại trang bản vẽ này. Đọc tên bản vẽ trong khung tên (title block) và nội dung.
discipline ∈ legend (bảng ký hiệu chung), panel (sơ đồ nguyên lý tủ điện), lighting (mặt bằng chiếu sáng),
power (mặt bằng cấp nguồn/ổ cắm), low_voltage (điện nhẹ: mạng, camera, wifi, TV), hvac (điều hòa thông gió),
other (bìa, danh mục, cấp/thoát nước, chi tiết lắp đặt, mặt bằng mái không có thiết bị điện trong nhà).
floor: tên tầng (vd "Tầng 1", "Tầng 2", "Mái"); nếu nhà 1 tầng ghi "Tầng 1".
Trả về: {"discipline":"...","floor":"...","title":"tên bản vẽ đọc được","confidence":0.0-1.0}`;

    case "classify_sheet":
      return `${ROLE}
Ảnh là bảng ghép ảnh thu nhỏ nhiều trang bản vẽ; mỗi ô có SỐ TRANG lớn màu đỏ ở góc trên trái: ${JSON.stringify(ctx.pages ?? [])}.
Với TỪNG trang, đọc tên bản vẽ trong khung tên và phân loại:
discipline ∈ legend (bảng ký hiệu), panel (sơ đồ nguyên lý tủ điện), lighting (mặt bằng chiếu sáng), power (mặt bằng cấp nguồn/ổ cắm),
low_voltage (điện nhẹ: mạng, camera, wifi), hvac (điều hòa/thông gió), other (bìa, danh mục, cấp/thoát nước, kết cấu, chi tiết, mặt bằng mái không có thiết bị trong nhà).
floor: "Tầng 1", "Tầng 2", "Mái"…; nhà 1 tầng ghi "Tầng 1".
Trả về: {"pages":[{"page":số,"discipline":"...","floor":"...","title":"tên bản vẽ","confidence":0.0-1.0}]}`;

    case "frame":
      return `${ROLE}
Xác định khung vùng bản vẽ mặt bằng (chứa tường, phòng, thiết bị), LOẠI TRỪ khung tên bên phải/dưới, bảng ghi chú,
bảng chú thích ký hiệu và lề giấy. Trả về: {"box_2d":[ymin,xmin,ymax,xmax]}`;

    case "legend":
      return `${ROLE}
Đây là trang/khung BẢNG KÝ HIỆU. Liệt kê TỪNG ký hiệu kèm chú thích, ánh xạ sang loại chuẩn:
${TYPES}, hoặc "ignore" nếu không phải thiết bị cần đếm (dây, ống, tủ...).
Quy ước: công tắc đơn/đôi/ba/bốn, 1 chiều hay 2 chiều đều là "switch"; ổ cắm thường "socket"; ổ cắm chống nước (WP) "socket_wp";
ổ cắm âm sàn "floor_socket"; box chờ nguồn (J) "junction_box"; camera bán cầu/thân: camera_indoor hoặc camera_outdoor theo mô tả;
đèn ốp tường chống nước "wall_light"; đèn tuýp "tube_light"; LED dây "led_strip"; quạt hút "exhaust_fan".
Trả về: {"symbols":[{"name":"chú thích nguyên văn","deviceType":"...","note":"độ cao/công suất nếu có"}]}`;

    case "detect":
      return `${ROLE}${legend}
Bộ môn của trang: ${ctx.discipline ?? "không rõ"}. Đây là MỘT Ô cắt từ mặt bằng; thiết bị ở sát mép có thể bị cắt dở – vẫn báo nếu nhận ra.
Nhiệm vụ: liệt kê TẤT CẢ thiết bị điện trong ô theo đúng ký hiệu, mỗi ký hiệu một mục:
- type ∈ ${TYPES}
- box_2d bao sát ký hiệu (không bao chữ số mạch)
- circuits: số mạch/line ghi cạnh thiết bị (vd "5"; với công tắc là chuỗi số ghi cạnh, vd "13,14,15"); "" nếu không có
- room: tên phòng chứa thiết bị nếu nhãn phòng nhìn thấy trong ô (vd "P.NGỦ 1", "WC", "P.KHÁCH", "SẢNH"); "" nếu không thấy
- twoWay: true nếu ký hiệu công tắc 2 chiều
- note: độ cao "H=..." hoặc chữ đi kèm (vd "Ổ CẮM CAMERA", "nguồn rèm điện", "DB-L2", "WP")
Lưu ý chuyên môn:
- Các đèn nối nhau bằng nét đứt cùng một số mạch: mỗi đèn vẫn là 1 mục riêng.
- Nhóm công tắc đặt sát nhau ghi "1,2" và "3,4" là 2 công tắc riêng.
- Ký hiệu "J" kèm chữ rèm → junction_box với note "nguồn rèm điện"; "J" trong khung LED → led_strip (1 mục cho cả dải, ghi circuits).
- Không đếm ký hiệu trong bảng chú thích, khung tên, chi tiết phóng to.
- Bỏ qua đồ nội thất (giường, sofa, bàn ăn, thiết bị vệ sinh).
Ngoài ra liệt kê nhãn phòng thấy trong ô: rooms:[{"name":"...","point":[y,x]}].
Trả về: {"items":[{"type":"...","box_2d":[...],"circuits":"","room":"","twoWay":false,"note":""}],"rooms":[...]}`;

    case "verify":
      return `${ROLE}${legend}
Ảnh là MỘT Ô mặt bằng (${ctx.discipline ?? ""}) đã được đánh dấu kết quả đếm lần 1: mỗi thiết bị có vòng tròn đỏ kèm mã số.
Danh sách lần 1: ${JSON.stringify(ctx.candidates ?? [])}
Hãy SOÁT LẠI như kỹ sư kiểm tra chéo:
1. remove: mã số các vòng đỏ đặt sai (không có ký hiệu thiết bị, đánh trùng 2 vòng cho 1 ký hiệu, là chữ/ký hiệu trong khung tên).
2. retype: vòng đỏ đúng vị trí nhưng sai loại → {"id":"...","type":"loại đúng"}.
3. add: ký hiệu thiết bị CHƯA có vòng đỏ (bị bỏ sót) → cùng định dạng mục như lần đếm.
Không lặp lại các mục đã đúng. Trả về: {"remove":[],"retype":[],"add":[]}`;

    case "panel":
      return `${ROLE}
Đây là SƠ ĐỒ NGUYÊN LÝ TỦ ĐIỆN. Đọc bảng các lộ ra: tên lộ (L1, S1, CDU1...), công năng, công suất.
Trả về: {"circuits":[{"name":"L1","function":"Chiếu sáng","load_w":400}],"ac_circuits":số lộ cấp nguồn dàn nóng/điều hòa}`;

    case "estimate":
      return `${ROLE}
Đây là mặt bằng chiếu sáng. Với mỗi phòng có LED dây (ký hiệu ─LED─) hãy ước tính tổng chiều dài LED dây (mét)
dựa trên kích thước ghi trên bản vẽ (mm) và chu vi khung trần. Với mỗi cửa có nguồn chờ rèm, ước tính bề rộng cửa (mét) nếu đọc được.
Trả về: {"led_strip":[{"room":"...","meters":0}],"rails":[{"room":"...","meters":0}]}`;
  }
}
