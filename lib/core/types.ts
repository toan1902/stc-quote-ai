// Shared domain types (data-model.md). Coordinates are page-normalised 0..1.

export type Discipline = "legend" | "panel" | "lighting" | "power" | "low_voltage" | "hvac" | "other";

export const DEVICE_TYPES = [
  "downlight", "spotlight", "panel_light", "ceiling_light", "chandelier", "wall_light", "tube_light",
  "led_strip", "exhaust_fan", "ceiling_fan", "switch", "socket", "socket_wp", "floor_socket",
  "junction_box", "curtain_point", "camera_indoor", "camera_outdoor", "data_outlet", "tv_outlet",
  "wifi_ap", "ac_indoor", "water_heater", "db_panel",
] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const DEVICE_LABEL: Record<DeviceType, string> = {
  downlight: "Đèn downlight âm trần", spotlight: "Đèn spotlight âm trần", panel_light: "Đèn vuông âm trần",
  ceiling_light: "Đèn ốp trần", chandelier: "Đèn chùm", wall_light: "Đèn ốp tường", tube_light: "Đèn tuýp LED",
  led_strip: "LED dây", exhaust_fan: "Quạt hút mùi", ceiling_fan: "Quạt trần", switch: "Công tắc",
  socket: "Ổ cắm", socket_wp: "Ổ cắm chống nước", floor_socket: "Ổ cắm âm sàn", junction_box: "Hộp chờ (J)",
  curtain_point: "Nguồn chờ rèm điện", camera_indoor: "Camera trong nhà", camera_outdoor: "Camera ngoài trời",
  data_outlet: "Ổ mạng RJ45", tv_outlet: "Ổ TV", wifi_ap: "Wifi/Modem", ac_indoor: "Điều hòa (dàn lạnh)",
  water_heater: "Bình nóng lạnh", db_panel: "Tủ điện",
};

export interface Rect { x: number; y: number; w: number; h: number }

export interface Page {
  index: number;               // 1-based PDF page number
  discipline: Discipline;
  floor: string;               // "Tầng 1"
  title?: string;
  frame?: Rect;                // drawing area, normalised
  confidence: number;
  analysed: boolean;
}

export interface LegendSymbol { name: string; deviceType: DeviceType | "ignore"; note?: string }

export interface Detection {
  id: string;
  page: number;
  type: DeviceType;
  x: number; y: number;                  // centre
  box?: [number, number, number, number]; // x1,y1,x2,y2
  room?: string;
  circuits?: string;                      // raw, e.g. "13,14,15"
  gangs?: number;                         // số nút khi bản vẽ không ghi số mạch (nhập tay/ước tính)
  twoWay?: boolean;
  note?: string;
  proposed?: boolean;                     // STC đề xuất thêm (không có trên bản vẽ gốc)
  pass: 1 | 2 | "manual" | "import";
  status: "ok" | "disputed" | "removed";
  confidence?: number;
  floor?: string;
}

export interface RoomLabel { page: number; name: string; x: number; y: number; floor?: string }

export interface Estimate { key: string; meters: number; source: "ai" | "manual" | "import" }

export interface EditLog { at: string; detectionId?: string; action: string; before?: unknown; after?: unknown }

export type Scope = "smarthome" | "lighting" | "excluded";

export interface BOQLine {
  code: string; name: string; unit: string; qty: number;
  rooms: string[]; detectionIds: string[]; estimated: boolean; scope: Scope;
}

export interface CrossCheck {
  code: "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
  severity: "info" | "warn" | "error";
  message: string;
  detectionIds: string[];
}

export interface CatalogItem {
  code: string; name: string; desc: string; img: string; unit: string;
  price: number; discount: number; section: string; brand?: string; spec?: string;
  vn?: boolean;                 // thương hiệu Việt Nam (ưu tiên)
  salePrice?: number;           // giá bán chốt sẵn (thay cho % giảm)
  freeInstall?: boolean;        // miễn phí lắp đặt khi chọn hệ sinh thái FPT Smart Home
  kit?: string; warn?: string; bigImg?: boolean;
  smart?: boolean;              // đèn thông minh FPT (true) / đèn thường (false)
}

export interface Settings {
  installRate: number;          // smart home install % of list price
  lightDiscount: number;        // lighting discount
  lightInstall: number;         // lighting install %
  defaultDownlight: "downlight_ab" | "downlight_fpt" | "athena" | "spotlight_ab";
  defaultSpotlight: "spotlight_ab" | "athena" | "tube_ab";
  hubModel: "hub" | "hub_pb650";
  switchShape?: "square" | "rect";  // kiểu công tắc Athena: vuông (2.079.000) / chữ nhật 120×72 (1.969.000)   // mã bộ trung tâm: T950 hoặc Play Box 650 (giá theo mã)
  railPerCurtainM: number;      // default rail metres per curtain point
  mergeAdjacentSwitches: boolean;
  areaPerHubM2: number;
  proposalSpot: "athena" | "spotlight_ab" | "downlight_fpt";  // loại đèn cho spotlight đề xuất
  includeProposal: boolean;                  // đưa đề xuất (giá + trang bản vẽ) vào báo giá
}

export interface Project {
  id: string;
  customer: string; address: string; date: string; sourceName: string;
  status: "draft" | "reviewed" | "exported";
  source: "gemini" | "claude-api" | "claude-import";
  pages: Page[];
  legend: LegendSymbol[];
  detections: Detection[];
  rooms: RoomLabel[];
  estimates: Estimate[];
  acUnits?: number;            // from HVAC plan / panel if not detected individually
  panelAcCircuits?: number;
  edits: EditLog[];
  floors?: number;
  areaM2?: number;
  shareId?: string;            // link báo giá online
  extras?: Record<string, number>;  // số lượng sửa tay theo mã hàng (sw1, hub, gate_ab, gate_sw, light_downlight_ab…) + hạng mục ngoài bản vẽ
  options?: Partial<Settings>;    // lựa chọn riêng của khách này (loại đèn, bộ trung tâm, % chiết khấu…)
  shareStatus?: "live" | "locked"; // trạng thái link online (ghi lại để hiện trong danh sách)
  updatedAt?: string;
}
