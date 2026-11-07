# Feature Specification: Drawing-to-Quote (Bóc BOQ từ bản vẽ điện → Báo giá STC)

**Feature Branch**: `001-drawing-to-quote`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "App: chỉ cần nhập bản vẽ điện vào và đầu ra cho kết quả báo giá theo mẫu STC CROP (PDF 7 trang + Excel); bóc tách chính xác nhất như một chuyên gia bóc BOQ của kỹ sư M&E. (Giai đoạn sau: thêm bản vẽ bố trí nội thất 3D để xuất mô phỏng 3D thiết bị.)"

## Clarifications

### Session 2026-11-06

- Q: Ai được dùng app? → A: Nội bộ STC, đăng nhập bằng 1 mật khẩu chung.
- Q: Ưu tiên độ chính xác hay chi phí AI? → A: Chính xác nhất (mô hình mạnh nhất cho cả lượt đếm và lượt soát lại; đổi được trong cài đặt).
- Q: Chạy AI đọc bản vẽ bằng nguồn nào khi chưa có API key trả phí và muốn ít/không tốn phí? → A: Kết hợp: (1) tự động qua Gemini API miễn phí (mặc định), (2) nhập kết quả bóc tách do Claude (trong gói Claude hiện có) xuất ra; key Claude API có thể cắm thêm sau.
- Q: App chạy ở đâu? → A: Vercel gói miễn phí.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bóc BOQ tự động từ bản vẽ MEP (Priority: P1)

Nhân viên kinh doanh STC tải lên file PDF hồ sơ điện/MEP của khách, nhập tên khách và địa chỉ công
trình. Hệ thống tự nhận diện các trang liên quan (bảng ký hiệu, sơ đồ tủ điện, mặt bằng chiếu sáng,
cấp nguồn, điện nhẹ, điều hòa), đọc bảng ký hiệu riêng của bộ bản vẽ, rồi đếm từng thiết bị theo phòng
và theo số mạch (Line), cho ra bảng bóc tách (BOQ) có nguồn gốc từng dòng.

**Why this priority**: Đây là phần tốn thời gian và dễ sai nhất khi làm tay (≈1–2 giờ/bộ bản vẽ); mọi
đầu ra khác phụ thuộc vào nó.

**Independent Test**: Tải bộ bản vẽ "MEP Anh Cường 27/10/2026" (19 trang) → BOQ ra đúng: 68 đèn
downlight, 11 vị trí công tắc (1×1 nút, 1×2 nút, 7×3 nút, 2×4 nút), 5 camera (3 ngoài trời, 2 trong
nhà), 3 điều hòa, 2 điểm chờ rèm, 4 đèn ốp tường, 1 đèn tuýp, 2 quạt hút.

**Acceptance Scenarios**:

1. **Given** một PDF MEP có bảng ký hiệu, **When** người dùng bấm "Phân tích", **Then** hệ thống hiển
   thị trang nào được dùng cho bộ môn nào và bảng ký hiệu đã đọc được, trước khi đếm.
2. **Given** việc đếm đã xong, **When** người dùng xem BOQ, **Then** mỗi dòng cho biết số lượng, phòng,
   số mạch, trang bản vẽ và có thể bấm để xem vị trí trên bản vẽ.
3. **Given** một thiết bị nằm đúng mép giữa hai vùng cắt ảnh, **When** đếm, **Then** thiết bị đó chỉ
   được tính đúng một lần.
4. **Given** bộ bản vẽ không có trang bảng ký hiệu, **When** phân tích, **Then** hệ thống báo thiếu và
   cho chọn dùng bảng ký hiệu chuẩn STC hoặc chỉ định trang.

---

### User Story 2 - Duyệt, sửa và đối soát chéo như kỹ sư M&E (Priority: P1)

Kỹ sư/nhân viên mở màn hình duyệt: bản vẽ hiển thị với các chấm đánh dấu từng thiết bị đã đếm (màu
theo loại), bên cạnh là BOQ và danh sách cảnh báo đối soát. Người duyệt có thể xóa chấm sai, thêm chấm
thiếu, đổi loại thiết bị, sửa số lượng ước tính (LED dây, ray rèm); BOQ cập nhật ngay.

**Why this priority**: AI chỉ là bản nháp; người chịu trách nhiệm báo giá phải kiểm được nhanh trước khi
gửi khách (Nguyên tắc IV).

**Independent Test**: Với kết quả phân tích có sẵn, xóa một chấm đèn → BOQ giảm 1; thêm một công tắc
3 nút → BOQ tăng 1; cảnh báo "mạch 15 không có tải" hiển thị cho bộ Anh Cường.

**Acceptance Scenarios**:

1. **Given** BOQ đã có, **When** mở màn hình duyệt, **Then** thấy cảnh báo đối soát: mạch đèn không có
   công tắc, công tắc có mạch không có tải, camera bản vẽ điện nhẹ khác số ổ cắm camera bản vẽ cấp
   nguồn, số dàn lạnh khác số mạch điều hòa trên sơ đồ tủ.
2. **Given** người dùng sửa một dòng, **When** lưu, **Then** lịch sử sửa (trước/sau, thời điểm) được ghi.
3. **Given** chưa mở màn hình duyệt, **When** bấm xuất báo giá, **Then** hệ thống không cho xuất.

---

### User Story 3 - Xuất báo giá theo mẫu STC (Priority: P1)

Sau khi duyệt, hệ thống ánh xạ BOQ sang sản phẩm FPT Smart Home/chiếu sáng theo bảng giá hiện hành và
xuất (a) PDF 7 trang đúng mẫu STC CROP và (b) Excel 4 sheet có công thức, tổng hai file khớp nhau,
số tiền bằng chữ tự sinh.

**Why this priority**: Đây là sản phẩm gửi khách; không có nó app không tạo ra giá trị kinh doanh.

**Independent Test**: Với BOQ Anh Cường và bảng giá mặc định → tổng Smart Home 46.531.600đ, chiếu sáng
10.961.600đ, tổng 57.493.200đ, bằng chữ "Năm mươi bảy triệu bốn trăm chín mươi ba ngàn hai trăm đồng
chẵn".

**Acceptance Scenarios**:

1. **Given** BOQ đã duyệt, **When** xuất PDF, **Then** nhận đủ 7 trang: Tổng hợp, Thuyết minh, Dự
   toán, Bố trí công tắc, Phụ lục rèm/camera/IR, Chiếu sáng, Bố trí đèn.
2. **Given** người dùng sửa đơn giá hoặc % chiết khấu trong bảng giá, **When** xuất lại, **Then** cả
   PDF và Excel dùng giá mới.
3. **Given** BOQ có hạng mục không thuộc phạm vi báo giá (LED dây, đèn ốp tường, ổ cắm thường), **When**
   xuất, **Then** các hạng mục đó được liệt kê ở ghi chú "chưa bao gồm".

---

### User Story 4 - Quản lý bảng giá & quy tắc ánh xạ (Priority: P2)

Quản trị viên chỉnh danh mục sản phẩm, đơn giá niêm yết, % giảm, tỷ lệ lắp đặt, lựa chọn mặc định
(ví dụ downlight thường → Downlight AB hay Spotlight Athena thông minh), số bộ trung tâm theo diện tích.

**Why this priority**: Giá FPT thay đổi; không cần sửa code.

**Independent Test**: Đổi giá công tắc 3 nút → dự toán và tổng cập nhật.

**Acceptance Scenarios**:

1. **Given** bảng giá mặc định, **When** sửa và lưu, **Then** lần mở sau vẫn giữ giá đã sửa trên máy đó.

---

### User Story 5 - Mô phỏng 3D bố trí thiết bị (Priority: P3, giai đoạn sau)

Khi có thêm mô hình 3D nội thất của khách, hệ thống đặt thiết bị thật (công tắc, camera, động cơ rèm,
đèn) vào đúng vị trí/độ cao theo BOQ và cho khách xem 3D qua link/QR.

**Why this priority**: Tăng tỷ lệ chốt nhưng không bắt buộc để báo giá; phụ thuộc định dạng 3D của
khách. **Ngoài phạm vi bản v1** — chỉ ghi nhận yêu cầu.

### Edge Cases

- Bản vẽ scan/ảnh chụp (không phải vector) chất lượng thấp → cảnh báo độ tin cậy, yêu cầu duyệt kỹ.
- Nhà nhiều tầng: các trang cùng bộ môn của từng tầng phải gộp đúng theo tầng, không cộng trùng.
- Một thiết bị xuất hiện trên nhiều bản vẽ (ổ cắm camera trên cấp nguồn và camera trên điện nhẹ) → chỉ
  tính theo bộ môn chủ quản (camera theo điện nhẹ), bản kia dùng để đối soát.
- Công tắc 2 chiều: mỗi đầu là 1 thiết bị; nhiều công tắc đặt cạnh nhau có thể gộp mặt (tùy chọn).
- Mạch có số nhưng không có tải trên bản vẽ → giữ nút trên công tắc, gắn cảnh báo "xác nhận với chủ nhà".
- File > 50 trang hoặc > 50 MB → từ chối với thông báo rõ.
- Mất kết nối giữa chừng → giữ kết quả các trang đã phân tích, cho chạy tiếp.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST nhận file PDF bản vẽ (tối đa 50 trang, 50 MB) cùng thông tin khách
  (tên, địa chỉ công trình, ngày lập).
- **FR-002**: Hệ thống MUST tự phân loại mỗi trang theo bộ môn (bảng ký hiệu, sơ đồ tủ điện, chiếu
  sáng, cấp nguồn, điện nhẹ, điều hòa/thông gió, khác) và theo tầng; người dùng MUST sửa được phân loại.
- **FR-003**: Hệ thống MUST đọc bảng ký hiệu của chính bộ bản vẽ và dùng nó làm từ điển nhận dạng.
- **FR-004**: Hệ thống MUST xác định khung bản vẽ (bỏ khung tên) và chỉ đếm trong vùng bản vẽ.
- **FR-005**: Việc đếm MUST chia vùng bản vẽ thành các ô chồng mép, mỗi thiết bị thuộc đúng một ô
  (ô sở hữu tâm thiết bị), để không đếm trùng hay bỏ sót ở mép.
- **FR-006**: Mỗi thiết bị đếm được MUST có: loại, vị trí trên trang, phòng, số mạch (nếu có), độ cao
  ghi chú (nếu có), trang nguồn, độ tin cậy.
- **FR-007**: Mỗi ô MUST qua bước kiểm tra lần hai độc lập (đánh dấu kết quả lên ảnh và soát lại) để
  phát hiện thiếu/thừa/sai loại; chênh lệch MUST được đánh dấu cho người duyệt.
- **FR-008**: Hệ thống MUST quy đổi thiết bị → hạng mục BOQ theo quy tắc M&E: số nút công tắc = số mạch
  khác nhau tại vị trí đó; mỗi dàn lạnh = 1 bộ điều khiển IR; mỗi điểm chờ rèm = 1 công tắc rèm + 1 động
  cơ + ray theo bề rộng cửa; camera ngoài trời/trong nhà theo vị trí; số bộ trung tâm theo diện tích/số tầng.
- **FR-009**: Chiều dài LED dây và ray rèm MUST được ước tính từ kích thước ghi trên bản vẽ và gắn nhãn
  "ước tính".
- **FR-010**: Hệ thống MUST chạy các kiểm tra đối soát (Nguyên tắc III) và hiển thị kết quả trên màn
  hình duyệt và trong ghi chú xuất.
- **FR-011**: Màn hình duyệt MUST hiển thị bản vẽ có chấm đánh dấu thiết bị, cho thêm/xóa/đổi loại,
  và cập nhật BOQ tức thì; MUST ghi lịch sử sửa.
- **FR-012**: Hệ thống MUST chặn xuất báo giá khi người dùng chưa mở màn hình duyệt.
- **FR-013**: Hệ thống MUST xuất PDF 7 trang và Excel 4 sheet đúng mẫu STC, tổng khớp nhau, bằng chữ tự sinh.
- **FR-014**: Bảng giá, % giảm, tỷ lệ lắp đặt, lựa chọn sản phẩm mặc định MUST chỉnh được trong app và
  được lưu lại trên máy.
- **FR-015**: Bản vẽ của khách MUST NOT được lưu trên máy chủ sau khi phân tích xong (Nguyên tắc VI).
- **FR-016**: Người dùng MUST lưu được bản nháp phiên làm việc (BOQ + chỉnh sửa) và mở lại trên cùng máy.
- **FR-017**: Hệ thống MUST cho xuất riêng file BOQ kỹ thuật (bóc tách đầy đủ theo phòng, gồm cả hạng
  mục ngoài báo giá) để gửi bên điện công trình.
- **FR-018**: Truy cập app MUST yêu cầu mật khẩu nội bộ chung; chưa đăng nhập thì không gọi được AI.
- **FR-019**: Hệ thống MUST hỗ trợ hai nguồn phân tích AI có cùng định dạng kết quả: (a) tự động qua
  nhà cung cấp AI cấu hình phía máy chủ (mặc định Gemini miễn phí, tùy chọn Claude khi có key); (b) nhập
  file kết quả bóc tách (JSON) do Claude tạo trong phiên chat. Cả hai đều đi qua cùng màn hình duyệt.
- **FR-020**: Khi nhà cung cấp AI báo vượt hạn mức miễn phí, hệ thống MUST tự chờ và thử lại, hiển thị
  tiến độ, và cho phép tiếp tục phân tích phần còn lại sau đó mà không mất kết quả đã có.
- **FR-021**: App MUST hiển thị lưu ý bảo mật khi dùng nguồn AI miễn phí (nhà cung cấp có thể dùng dữ
  liệu gói miễn phí để cải tiến dịch vụ) và cho chọn nguồn Claude cho bản vẽ nhạy cảm.

### Key Entities

- **Dự án báo giá**: khách hàng, địa chỉ, ngày, file nguồn, trạng thái (nháp/đã duyệt/đã xuất).
- **Trang bản vẽ**: số trang, bộ môn, tầng, khung bản vẽ, độ tin cậy phân loại.
- **Ký hiệu**: tên ký hiệu theo bảng ký hiệu, loại thiết bị chuẩn tương ứng, ghi chú độ cao.
- **Thiết bị phát hiện**: loại, vị trí, phòng, mạch, trang, lượt phát hiện, độ tin cậy, trạng thái duyệt.
- **Dòng BOQ**: hạng mục, đơn vị, số lượng, nguồn gốc (danh sách thiết bị), cờ ước tính, phạm vi báo giá.
- **Cảnh báo đối soát**: loại kiểm tra, mô tả, mức độ, liên kết thiết bị, đã xử lý hay chưa.
- **Danh mục sản phẩm**: mã, tên, ảnh, mô tả kỹ thuật, đơn vị, giá niêm yết, % giảm, nhóm báo giá.
- **Báo giá**: các dòng sản phẩm đã định giá, tổng, giảm giá, lắp đặt, bằng chữ.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Trên bộ bản vẽ chuẩn Anh Cường, sai số đếm trước khi người duyệt sửa ≤ 3% với đèn và
  = 0 với công tắc, camera, điều hòa, điểm chờ rèm.
- **SC-002**: 100% thiết bị nằm ở mép vùng cắt được tính đúng một lần (kiểm bằng bộ dữ liệu thử).
- **SC-003**: Từ lúc tải bản vẽ đến khi có PDF + Excel ≤ 15 phút cho bộ 20 trang, gồm cả thời gian duyệt
  (so với 1–2 giờ làm tay).
- **SC-004**: Tổng tiền trên PDF và Excel trùng khớp 100% các lần xuất.
- **SC-005**: ≥ 90% cảnh báo đối soát đúng là điểm cần người kiểm tra (không báo nhiễu).
- **SC-006**: Người dùng mới hoàn thành một báo giá đầu tiên không cần hướng dẫn trong ≤ 20 phút.
- **SC-007**: Chi phí AI phát sinh cho mỗi báo giá ở cấu hình mặc định = 0đ.

## Assumptions

- Người dùng là nhân viên/kỹ sư STC CROP (nội bộ), dùng máy tính có trình duyệt hiện đại.
- Bản vẽ đầu vào chủ yếu là PDF xuất từ CAD (vector hoặc raster ≥ 150 dpi); ảnh chụp tay là ngoại lệ.
- Bảng giá mặc định lấy theo báo giá STC hiện hành (công tắc 2.079.000đ, T950 2.409.000đ, …; giảm 20%,
  động cơ rèm 30%, mở rộng sóng 10%; lắp đặt 15%; chiếu sáng chiết khấu 35%, lắp đặt 0đ).
- Camera đề xuất mặc định là FPT Camera wifi (SE 2S ngoài trời, SE 3 trong nhà) kể cả khi bản vẽ thiết kế PoE.
- v1 không có tài khoản người dùng/phân quyền nhiều cấp; truy cập bảo vệ bằng mật khẩu chung nội bộ.
- App chạy trên Vercel gói miễn phí; chi phí AI mặc định = 0 (hạn mức miễn phí Gemini); thời gian
  phân tích có thể dài hơn khi chạm giới hạn lượt/phút.
- Mô phỏng 3D (User Story 5) thuộc giai đoạn sau.
