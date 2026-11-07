import type { CatalogItem, Settings } from "./types.ts";

const SW = "Công suất đầu ra 300W/kênh, mặt kính cường lực chống trầy, nút lõm viền nhôm, viền LED định vị 10%, chuẩn kết nối Bluetooth Mesh.";
const A = "/quote-assets/";

export const SECTIONS = {
  lighting_ctrl: "I. Giải pháp Điều khiển Chiếu sáng Thông minh",
  gate: "II. Giải pháp cổng tự động âm sàn",
  curtain: "III. Giải pháp rèm vải tự động",
  camera: "IV. Giải pháp camera quan sát",
  light: "Giải pháp chiếu sáng",
} as const;

export const DEFAULT_CATALOG: CatalogItem[] = [
  { code: "sw1", name: "Công tắc cảm ứng 1 nút", desc: SW, img: A + "i-019.png", unit: "Bộ", price: 2079000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "sw2", name: "Công tắc cảm ứng 2 nút", desc: SW, img: A + "i-020.png", unit: "Bộ", price: 2079000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "sw3", name: "Công tắc cảm ứng 3 nút", desc: SW, img: A + "i-021.png", unit: "Bộ", price: 2079000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "sw4", name: "Công tắc cảm ứng 4 nút", desc: SW, img: A + "i-022.png", unit: "Bộ", price: 2079000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "hub", name: "Bộ điều khiển trung tâm T950", desc: "Trung tâm điều khiển chuẩn Bluetooth Mesh/ZigBee, điều khiển giọng nói tiếng Việt, xử lý kịch bản tự động hóa nội mạng tốc độ cao.", img: A + "i-023.png", unit: "Bộ", price: 2409000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "zigbee", name: "Thiết bị mở rộng sóng ZigBee 3.0 (phiên bản giới hạn)", desc: "Đi kèm bộ trung tâm T950, mở rộng vùng phủ sóng ZigBee 3.0 cho toàn bộ hệ thống.", img: A + "zigbee.png", unit: "Bộ", price: 429000, discount: 0.1, section: "lighting_ctrl", vn: true },
  { code: "ir", name: "Bộ điều khiển điều hòa thông minh (IR) IEWG011", desc: "Điều khiển điều hòa/TV qua sóng hồng ngoại, hẹn giờ, kịch bản tự động tắt khi không có người, chuẩn Bluetooth Mesh, điều khiển giọng nói.", img: A + "ir.png", unit: "Bộ", price: 899000, discount: 0.2, section: "lighting_ctrl", vn: true },
  { code: "gate_ab", name: "Bộ động cơ cổng tự động âm sàn AB Gate 24V (trọn bộ cổng 2 cánh)", desc: "Nguồn 230V – motor 24V; tải trọng 800kg/cánh (cánh 1,5m); góc mở tối đa 102°, mở 90° trong 19 giây; mở 1 cánh hoặc 2 cánh; chống bụi/nước IP67 + gioăng chống rác, cản nước; mở bằng cơ cấu khóa cơ khi mất điện; vỏ sơn tàu biển 4 lớp, bánh vít – trục vít thép C45 tôi cứng; điều khiển qua ứng dụng AB Smart, kết nối hệ thống nhà thông minh.", kit: "Trọn bộ gồm: 01 tủ điều khiển AB Control Units, 02 động cơ AB Gate, 02 hộp đế inox 201 và cơ cấu quay 102°, 02 điều khiển từ xa, 01 bộ cảm biến an toàn.", warn: "Chưa bao gồm pin dự phòng (lưu trữ) Lithium.", img: A + "ab-gate.jpg", bigImg: true, unit: "Bộ", price: 38390000, salePrice: 30000000, discount: 8390000 / 38390000, section: "gate", brand: "AB Gate", vn: true, freeInstall: true },
  { code: "gate_sw", name: "Công tắc điều khiển động cơ cổng", desc: "Điện áp 220V-50Hz, khiển Đóng/Mở/Dừng, nút chạm lõm viền LED 10%, kính cường lực chống xước, chuẩn Bluetooth Mesh.", img: A + "i-024.png", unit: "Bộ", price: 1639000, discount: 0.2, section: "gate", vn: true },
  { code: "curtain_sw", name: "Công tắc điều khiển động cơ rèm", desc: "Điện áp 220V-50Hz, khiển Đóng/Mở/Dừng độc lập rèm voan và rèm vải, mặt kính cường lực nút lõm viền nhôm, chuẩn Bluetooth Mesh.", img: A + "i-024.png", unit: "Bộ", price: 1639000, discount: 0.2, section: "curtain", vn: true },
  { code: "curtain_motor", name: "Động cơ và phụ kiện rèm cửa kéo ngang", desc: "Điện áp 220V-50Hz, mô-men xoắn 1.5N.m, tốc độ 160 vòng/phút, công suất 80W, độ ồn <30dB(A), chuẩn IP41.", img: A + "i-026.png", unit: "Bộ", price: 3774000, discount: 0.3, section: "curtain", vn: true },
  { code: "rail", name: "Thanh ray rèm kéo ngang", desc: "Thanh ray hợp kim nhôm sơn tĩnh điện mở 1 bên hoặc 2 bên, dây curoa lõi thép bền bỉ, con chạy định hình 7cm.", img: A + "i-027.png", unit: "mét", price: 550000, discount: 0.2, section: "curtain", vn: true },
  { code: "cam_in", name: "FPT Camera SE 3 (Indoor 360°)", desc: "Độ phân giải 2K 3MP (2304x1296px), góc xoay 355°, đàm thoại 2 chiều, AI phân biệt người và vật thể, cảnh báo loa hú & đèn nháy.", img: A + "i-028.png", unit: "Bộ", price: 1100000, discount: 0.2, section: "camera", vn: true },
  { code: "cam_out", name: "FPT Camera SE 2S (Outdoor Cảnh Báo)", desc: "Đèn rọi Floodlight 2 chế độ ghi hình đêm có màu, hồng ngoại 30m, kháng nước IP67, cảnh báo chủ động bằng Loa hú & Đèn Flash.", img: A + "i-029.png", unit: "Bộ", price: 1300000, discount: 0.2, section: "camera", vn: true },
  // Lighting (discount applied globally via settings.lightDiscount)
  { code: "athena", name: "Đèn LED âm trần Spotlight THÔNG MINH FPT Athena 95/12W, góc 50°", desc: "", brand: "FPT Smart Home", spec: "– Mã hàng: LSBR0249 (Bluetooth Mesh)<br>– Nguồn cấp: 220V/50Hz<br>– Công suất: 12W<br>– Quang thông: 820-1030 lm<br>– Nhiệt độ màu: 2700K – 6000K<br>– CRI: 90 – Góc chiếu 50°, góc xoay 20°<br>– Kích thước: 108x65mm, khoét trần 95mm<br><b>Đèn THÔNG MINH:</b> bật/tắt, chỉnh độ sáng & nhiệt độ màu từng đèn qua app FPT Smart Home, giọng nói, hẹn giờ, ngữ cảnh", img: A + "i-040.png", unit: "Bộ", price: 869000, discount: 0, section: "light", vn: true, smart: true },
  { code: "downlight_fpt", name: "Đèn LED Downlight THÔNG MINH FPT Athena CCT 110/9W", desc: "", brand: "FPT Smart Home", spec: "– Mã hàng: LDBR026 (Bluetooth Mesh)<br>– Nguồn cấp: 220V/50Hz<br>– Công suất: 9W<br>– Quang thông: 820 lm<br>– Nhiệt độ màu: 3000K – 6500K<br>– Khoét trần: 110mm<br>– Tuổi thọ: 30.000 giờ<br><b>Đèn THÔNG MINH:</b> bật/tắt, chỉnh độ sáng & nhiệt độ màu từng đèn qua app FPT Smart Home, giọng nói, hẹn giờ, ngữ cảnh", img: A + "i-040.png", unit: "Bộ", price: 484000, discount: 0, section: "light", vn: true, smart: true },
  { code: "spotlight_ab", name: "Đèn Spotlight AB 9W – đèn THƯỜNG", desc: "", brand: "AB", spec: "9W, âm trần<br>Chip: CREE<br>Ánh sáng: 3000K/ 4000K<br>CRI 95<br>Góc chiếu 45°<br>Kích thước Φ95*H75mm<br>Lỗ khoét Φ80mm<br><b>Loại đèn THƯỜNG (không thông minh):</b> bật/tắt theo mạch qua công tắc cảm ứng FPT; không chỉnh độ sáng, màu ánh sáng riêng từng đèn qua app", img: A + "i-040.png", unit: "Bộ", price: 588000, discount: 0, section: "light", vn: true },
  { code: "downlight_ab", name: "Đèn LED Downlight AB 12W – đèn THƯỜNG", desc: "", brand: "AB", spec: "12W, âm trần<br>Chip: SANAN<br>Ánh sáng: 4000K<br>CRI 95-97<br>Góc chiếu 120°<br>Thân nhôm trắng /viền trắng<br>Kích thước D120*H29mm<br>Lỗ khoét Φ(90-100)mm<br><b>Loại đèn THƯỜNG (không thông minh):</b> bật/tắt theo mạch qua công tắc cảm ứng FPT; không chỉnh độ sáng, màu ánh sáng riêng từng đèn qua app", img: A + "i-040.png", unit: "BỘ", price: 248000, discount: 0, section: "light", vn: true },
  { code: "tube_ab", name: "Đèn LED ống bơ AB 12W, 4000K – đèn THƯỜNG", desc: "", brand: "AB", spec: "12W, gắn nổi IP65<br>Chip: CREE<br>CRI 92-95<br>Góc chiếu: 38°<br>Kích thước Ø75*100mm<br>Điện áp 220V<br><b>Loại đèn THƯỜNG (không thông minh):</b> bật/tắt theo mạch qua công tắc cảm ứng FPT; không chỉnh độ sáng, màu ánh sáng riêng từng đèn qua app", img: A + "i-040.png", unit: "Bộ", price: 968000, discount: 0, section: "light", vn: true },
];

export const DEFAULT_SETTINGS: Settings = {
  installRate: 0.15,
  lightDiscount: 0.35,
  lightInstall: 0,
  defaultDownlight: "downlight_ab",
  defaultSpotlight: "spotlight_ab",
  railPerCurtainM: 4,
  mergeAdjacentSwitches: true,
  areaPerHubM2: 200,
  proposalSpot: "athena",
  includeProposal: true,
};
