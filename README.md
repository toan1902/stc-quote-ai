# STC Quote AI

App nội bộ STC CROP: tải bản vẽ điện/MEP (PDF) → AI bóc BOQ theo quy trình kỹ sư M&E → duyệt trên bản vẽ →
báo giá PDF 7 trang + Excel 4 sheet theo mẫu STC.

## Quy trình bóc tách (chuẩn kỹ sư M&E)
1. Phân loại từng trang (bảng ký hiệu, tủ điện, chiếu sáng, cấp nguồn, điện nhẹ, điều hòa) + tầng → người dùng xác nhận.
2. Đọc **bảng ký hiệu của chính bộ bản vẽ** làm từ điển nhận dạng; đọc sơ đồ tủ để đối soát số mạch điều hòa.
3. Xác định khung bản vẽ (bỏ khung tên), chia **ô chồng mép có vùng sở hữu** → không đếm trùng/sót ở mép.
4. Mỗi ô **đếm 2 lượt**: lượt 1 đếm có toạ độ, số mạch, phòng; lượt 2 AI soát lại trên ảnh đã đánh dấu (xoá/đổi loại/bổ sung).
5. Quy tắc BOQ: số nút công tắc = số mạch; gộp công tắc sát nhau; bộ môn chủ quản (đèn/công tắc theo chiếu sáng,
   camera theo điện nhẹ, điều hòa theo HVAC); rèm = công tắc + động cơ + ray; LED dây/ray gắn nhãn *ước tính*.
6. Đối soát chéo C1–C6 (mạch không tải, đèn không công tắc, camera ĐN vs ổ cắm camera, dàn lạnh vs tủ điện, trùng, trang trùng).
7. Duyệt bắt buộc trên bản vẽ (chấm màu theo loại, Alt+click thêm, click sửa/xoá, lịch sử sửa) → mới cho xuất.

## Chạy local
```bash
npm install
cp .env.example .env.local   # điền APP_PASSWORD, AUTH_SECRET, GEMINI_API_KEY
npm run dev
npm test                      # 10 bài test lõi với bộ bản vẽ mẫu Anh Cường
```

## Biến môi trường (Vercel → Project → Settings → Environment Variables)
| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `APP_PASSWORD` | ✔ | mật khẩu chung nội bộ |
| `AUTH_SECRET` | ✔ | chuỗi ngẫu nhiên ≥ 32 ký tự |
| `GEMINI_API_KEY` | ✔ (mặc định) | miễn phí tại https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | | mặc định `gemini-flash-latest` |
| `AI_PROVIDER` | | `gemini` (mặc định) hoặc `claude` |
| `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` | | tuỳ chọn, trả phí, chính xác hơn |

## Nhập kết quả từ Claude (miễn phí, bảo mật)
Trong Claude gõ “báo giá” + đính kèm bản vẽ, yêu cầu “xuất takeoff JSON cho app” → ở bước 1 chọn file JSON.
Định dạng: `specs/001-drawing-to-quote/contracts/takeoff.schema.json`.

## Tài liệu thiết kế (Spec Kit)
`.specify/memory/constitution.md` · `specs/001-drawing-to-quote/` (spec, plan, research, data-model, contracts, quickstart, tasks).
