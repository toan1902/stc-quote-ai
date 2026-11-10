import type { CatalogItem, Settings } from "./types.ts";

const SW = "Công suất đầu ra 300W/kênh, mặt kính cường lực chống trầy, nút lõm viền nhôm, viền LED định vị 10%, chuẩn kết nối Bluetooth Mesh.";
const A = "/quote-assets/";

export const SECTIONS = {
  lighting_ctrl: "I. Giải pháp Điều khiển Chiếu sáng Thông minh",
  gate: "II. Giải pháp cổng tự động âm sàn",
  curtain: "III. Giải pháp rèm vải tự động",
  sensor: "V. Giải pháp cảm biến & an ninh",
  camera: "IV. Giải pháp camera quan sát",
  light: "Giải pháp chiếu sáng",
} as const;

export const DEFAULT_CATALOG: CatalogItem[] = [
  { code: "sw1", name: "Công tắc cảm ứng 1 nút", desc: SW, img: A + "i-019.png", unit: "Bộ", price: 2079000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "sw2", name: "Công tắc cảm ứng 2 nút", desc: SW, img: A + "i-020.png", unit: "Bộ", price: 2079000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "sw3", name: "Công tắc cảm ứng 3 nút", desc: SW, img: A + "i-021.png", unit: "Bộ", price: 2079000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "sw4", name: "Công tắc cảm ứng 4 nút", desc: SW, img: A + "i-022.png", unit: "Bộ", price: 2079000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "hub", name: "Bộ điều khiển trung tâm FPT T950", desc: "Trung tâm điều khiển chuẩn Bluetooth Mesh/ZigBee, điều khiển giọng nói tiếng Việt, xử lý kịch bản tự động hóa nội mạng tốc độ cao.", img: A + "i-023.png", unit: "Bộ", price: 2409000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "hub_pb650", name: "Bộ điều khiển trung tâm FPT Play Box 650", desc: "Trung tâm điều khiển nhà thông minh kiêm Android TV Box: RAM 2GB, ROM 8GB, Android 11, Wi-Fi 2.4 & 5GHz, Bluetooth 5.2, HDMI 2.1; điều khiển giọng nói tiếng Việt, xử lý kịch bản tự động hóa. Mã hệ thống 20044287.", img: A + "i-023.png", unit: "Bộ", price: 3900000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "zigbee", name: "Thiết bị mở rộng sóng ZigBee 3.0 (phiên bản giới hạn)", desc: "Đi kèm bộ trung tâm T950, mở rộng vùng phủ sóng ZigBee 3.0 cho toàn bộ hệ thống.", img: A + "zigbee.png", unit: "Bộ", price: 429000, discount: 0.1, section: "lighting_ctrl", vn: true },
  { code: "ir", name: "Bộ điều khiển điều hòa thông minh (IR) IEWG011", desc: "Điều khiển điều hòa/TV qua sóng hồng ngoại, hẹn giờ, kịch bản tự động tắt khi không có người, chuẩn Bluetooth Mesh, điều khiển giọng nói.", img: A + "ir.png", unit: "Bộ", price: 759000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "gate_ab", name: "Bộ động cơ cổng tự động âm sàn AB Gate 24V (trọn bộ cổng 2 cánh)", desc: "Nguồn 230V – motor 24V; tải trọng 800kg/cánh (cánh 1,5m); góc mở tối đa 102°, mở 90° trong 19 giây; mở 1 cánh hoặc 2 cánh; chống bụi/nước IP67 + gioăng chống rác, cản nước; mở bằng cơ cấu khóa cơ khi mất điện; vỏ sơn tàu biển 4 lớp, bánh vít – trục vít thép C45 tôi cứng; điều khiển qua ứng dụng AB Smart, kết nối hệ thống nhà thông minh.", kit: "Trọn bộ gồm: 01 tủ điều khiển AB Control Units, 02 động cơ AB Gate, 02 hộp đế inox 201 và cơ cấu quay 102°, 02 điều khiển từ xa, 01 bộ cảm biến an toàn.", warn: "Chưa bao gồm pin dự phòng (lưu trữ) Lithium.", img: A + "ab-gate.jpg", bigImg: true, unit: "Bộ", price: 38390000, salePrice: 30000000, discount: 8390000 / 38390000, section: "gate", brand: "AB Gate", vn: true, freeInstall: true },
  { code: "gate_sw", name: "Công tắc điều khiển cổng (cửa cuốn vuông Athena)", desc: "Dùng công tắc cửa cuốn vuông Athena (4 ngõ ra COM, 2 NO, 1 NC) điều khiển tủ cổng: Đóng/Mở/Dừng; 220V-50Hz, nút chạm lõm viền LED 10%, kính cường lực chống xước, chuẩn Bluetooth Mesh.", img: A + "i-024.png", unit: "Bộ", price: 2079000, discount: 0.2, section: "gate", vn: true },
  { code: "curtain_sw", name: "Công tắc điều khiển động cơ rèm", desc: "Điện áp 220V-50Hz, khiển Đóng/Mở/Dừng độc lập rèm voan và rèm vải, mặt kính cường lực nút lõm viền nhôm, chuẩn Bluetooth Mesh.", img: A + "i-024.png", unit: "Bộ", price: 1639000, discount: 0.2, section: "curtain", vn: true },
  { code: "curtain_motor", name: "Động cơ rèm kéo ngang FPT (AOK)", desc: "Điện áp 220-240V, công suất 65W, sức kéo tối đa 30kg, mô-men 1.5Nm, siêu êm 35dB; rèm tự chạy khi kéo nhẹ tay; tích hợp Smart Home qua dry-contact (loại 3 dây).", img: A + "i-026.png", unit: "Bộ", price: 3300000, discount: 0.3, section: "curtain", vn: true },
  { code: "rail", name: "Thanh ray rèm kéo ngang", desc: "Thanh ray hợp kim nhôm sơn tĩnh điện mở 1 bên hoặc 2 bên, dây curoa lõi thép bền bỉ, con chạy định hình 7cm.", img: A + "i-027.png", unit: "mét", price: 550000, discount: 0.2, section: "curtain", vn: true },
  { code: "cam_in", name: "FPT Camera SE 3 (Indoor 360°)", desc: "Độ phân giải 2K 3MP (2304x1296px), góc xoay 355°, đàm thoại 2 chiều, AI phân biệt người và vật thể, cảnh báo loa hú & đèn nháy.", img: A + "i-028.png", unit: "Bộ", price: 1100000, discount: 0.2, section: "camera", vn: true },
  { code: "cam_out", name: "FPT Camera SE 2S (Outdoor Cảnh Báo)", desc: "Đèn rọi Floodlight 2 chế độ ghi hình đêm có màu, hồng ngoại 30m, kháng nước IP67, cảnh báo chủ động bằng Loa hú & Đèn Flash.", img: A + "i-029.png", unit: "Bộ", price: 1300000, discount: 0.2, section: "camera", vn: true },
  // Cảm biến & an ninh (bảng giá bán lẻ FPT 07/11/2026) – thêm qua "＋ Thêm hạng mục ngoài bản vẽ"
  { code: "presence", name: "Cảm biến hiện diện âm trần Athena AC", desc: "Phát hiện người cả khi ngồi yên (WC, phòng làm việc), tự bật/tắt đèn; khoảng cách tối đa 6m, góc 90°, khoét trần 90mm, đo ánh sáng 0–10.000 lux, tải tối đa 300W, chuẩn WiFi – BLE.", img: A + "sensor.png", unit: "Bộ", price: 1309000, discount: 0.2, section: "sensor", vn: true },
  { code: "motion_ceil", name: "Cảm biến chuyển động âm trần AC Athena", desc: "Nguồn 220V, phát hiện chuyển động <7m, góc 90/360°, đo ánh sáng 0–1000 lux, khoét trần 90mm – bật đèn hành lang, cầu thang, kho khi có người.", img: A + "sensor.png", unit: "Bộ", price: 1034000, discount: 0.2, section: "sensor", vn: true },
  { code: "motion_v2", name: "Cảm biến chuyển động Athena – V2", desc: "Nguồn 220V, chuẩn Bluetooth Mesh – kích hoạt kịch bản bật đèn, báo động khi có người.", img: A + "sensor.png", unit: "Bộ", price: 649000, discount: 0.2, section: "sensor", vn: true },
  { code: "door_sensor", name: "Cảm biến cửa Athena", desc: "Pin CR2032, chuẩn Bluetooth Mesh – báo cửa mở/đóng, kích hoạt kịch bản an ninh, bật đèn khi mở cửa.", img: A + "sensor.png", unit: "Bộ", price: 979000, discount: 0.2, section: "sensor", vn: true },
  { code: "smoke", name: "Cảm biến khói Athena", desc: "Pin CR123A, còi 85dB, đầu dò khói 0.12–0.2 dB/m, nhựa ABS chống cháy, chuẩn Bluetooth Mesh – báo cháy về điện thoại.", img: A + "sensor.png", unit: "Bộ", price: 1364000, discount: 0.2, section: "sensor", vn: true },
  { code: "siren", name: "Còi hú báo động", desc: "Nguồn 220V, 40W – hú báo động khi cảm biến phát hiện xâm nhập.", img: A + "sensor.png", unit: "Bộ", price: 319000, discount: 0.2, section: "sensor", vn: true },
  { code: "scene6", name: "Công tắc bấm ngữ cảnh vuông 6 nút Athena", desc: "Dùng pin CR2330, tối đa 12 ngữ cảnh (Về nhà, Đi ngủ, Xem phim…), dán tường không cần đi dây, chuẩn Bluetooth Mesh.", img: A + "i-022.png", unit: "Bộ", price: 979000, discount: 0.2, section: "sensor", vn: true },
  { code: "smart_socket", name: "Ổ cắm đơn thông minh 16A Athena", desc: "220V, 3500W, 16A – bật/tắt, hẹn giờ thiết bị (bình nóng lạnh, máy bơm…) qua app.", img: A + "sensor.png", unit: "Bộ", price: 385000, discount: 0.2, section: "sensor", vn: true },
  // Lighting (discount applied globally via settings.lightDiscount)
  { code: "athena", name: "Đèn LED âm trần Spotlight THÔNG MINH FPT Athena 95/12W, góc 50°", desc: "", brand: "FPT Smart Home", spec: "– Mã hàng: LSBR0249 (Bluetooth Mesh)<br>– Nguồn cấp: 220V/50Hz<br>– Công suất: 12W<br>– Quang thông: 820-1030 lm<br>– Nhiệt độ màu: 2700K – 6000K<br>– CRI: 90 – Góc chiếu 50°, góc xoay 20°<br>– Kích thước: 108x65mm, khoét trần 95mm<br><b>Đèn THÔNG MINH:</b> bật/tắt, chỉnh độ sáng & nhiệt độ màu từng đèn qua app FPT Smart Home, giọng nói, hẹn giờ, ngữ cảnh", img: A + "i-040.png", unit: "Bộ", price: 869000, discount: 0, section: "light", vn: true, smart: true },
  { code: "downlight_fpt", name: "Đèn LED Downlight THÔNG MINH FPT Athena CCT 110/9W", desc: "", brand: "FPT Smart Home", spec: "– Mã hàng: LDBR026 (Bluetooth Mesh)<br>– Nguồn cấp: 220V/50Hz<br>– Công suất: 9W<br>– Quang thông: 820 lm<br>– Nhiệt độ màu: 3000K – 6500K<br>– Khoét trần: 110mm<br>– Tuổi thọ: 30.000 giờ<br><b>Đèn THÔNG MINH:</b> bật/tắt, chỉnh độ sáng & nhiệt độ màu từng đèn qua app FPT Smart Home, giọng nói, hẹn giờ, ngữ cảnh", img: A + "i-040.png", unit: "Bộ", price: 484000, discount: 0, section: "light", vn: true, smart: true },
  { code: "spotlight_ab", name: "Đèn Spotlight AB 9W – đèn THƯỜNG", desc: "", brand: "AB", spec: "9W, âm trần<br>Chip: CREE<br>Ánh sáng: 3000K/ 4000K<br>CRI 95<br>Góc chiếu 45°<br>Kích thước Φ95*H75mm<br>Lỗ khoét Φ80mm<br><b>Loại đèn THƯỜNG (không thông minh):</b> bật/tắt theo mạch qua công tắc cảm ứng FPT; không chỉnh độ sáng, màu ánh sáng riêng từng đèn qua app", img: A + "i-040.png", unit: "Bộ", price: 588000, discount: 0, section: "light", vn: true },
  { code: "downlight_ab", name: "Đèn LED Downlight AB 12W – đèn THƯỜNG", desc: "", brand: "AB", spec: "12W, âm trần<br>Chip: SANAN<br>Ánh sáng: 4000K<br>CRI 95-97<br>Góc chiếu 120°<br>Thân nhôm trắng /viền trắng<br>Kích thước D120*H29mm<br>Lỗ khoét Φ(90-100)mm<br><b>Loại đèn THƯỜNG (không thông minh):</b> bật/tắt theo mạch qua công tắc cảm ứng FPT; không chỉnh độ sáng, màu ánh sáng riêng từng đèn qua app", img: A + "i-040.png", unit: "BỘ", price: 248000, discount: 0, section: "light", vn: true },
  { code: "tube_ab", name: "Đèn LED ống bơ AB 12W, 4000K – đèn THƯỜNG", desc: "", brand: "AB", spec: "12W, gắn nổi IP65<br>Chip: CREE<br>CRI 92-95<br>Góc chiếu: 38°<br>Kích thước Ø75*100mm<br>Điện áp 220V<br><b>Loại đèn THƯỜNG (không thông minh):</b> bật/tắt theo mạch qua công tắc cảm ứng FPT; không chỉnh độ sáng, màu ánh sáng riêng từng đèn qua app", img: A + "i-040.png", unit: "Bộ", price: 968000, discount: 0, section: "light", vn: true },
  { code: "wall_ab", name: "Đèn gắn tường ngoài nhà 2×5W – đèn THƯỜNG", desc: "", brand: "", spec: "2×5W, gắn tường IP65<br>Chip: Bridgelux<br>CRI 80<br>Ánh sáng: 3000K<br>Thân nhôm trắng/đen<br>Kích thước 70×80×150mm<br>Điện áp 220V", img: A + "wall_ab.png", unit: "Bộ", price: 888000, discount: 0, section: "light", vn: false },
];

export const DEFAULT_SETTINGS: Settings = {
  installRate: 0.15,
  lightDiscount: 0.35,
  lightInstall: 0,
  defaultDownlight: "downlight_ab",
  defaultSpotlight: "spotlight_ab",
  hubModel: "hub",
  switchShape: "square",
  railPerCurtainM: 4,
  mergeAdjacentSwitches: true,
  areaPerHubM2: 200,
  proposalSpot: "athena",
  includeProposal: true,
};

const SWR = "Kiểu CHỮ NHẬT 120×72 mm (đế âm chữ nhật), công suất 300W/kênh, mặt kính cường lực chống trầy, viền LED định vị, chuẩn Bluetooth Mesh. Màu trắng/đen.";
/** Công tắc Athena kiểu chữ nhật: thay tên, ảnh, đơn giá các mã công tắc theo bảng giá FPT (bán lẻ 07/11/2026). */
export function applySwitchShape(cat: CatalogItem[], shape?: Settings["switchShape"]): CatalogItem[] {
  if (shape !== "rect") return cat;
  return cat.map((c) => {
    const m = /^sw([1-4])$/.exec(c.code);
    if (m) return { ...c, name: `Công tắc cảm ứng ${m[1]} nút CHỮ NHẬT Athena`, desc: SWR, img: A + `rect${m[1]}.png`, price: 1969000 };
    if (c.code === "curtain_sw") return { ...c, name: "Công tắc điều khiển rèm CHỮ NHẬT Athena", desc: "Kiểu chữ nhật 120×72 mm đồng bộ công tắc đèn; điều khiển Mở/Đóng/Dừng rèm, hẹn giờ, kịch bản, chuẩn Bluetooth Mesh.", img: A + "rectcur.png", price: 1529000 };
    if (c.code === "gate_sw") return { ...c, name: "Công tắc điều khiển cổng (cửa cuốn CHỮ NHẬT Athena)", img: A + "rectcur.png", price: 1969000 };
    return c;
  });
}
