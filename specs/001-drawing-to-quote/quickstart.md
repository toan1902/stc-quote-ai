# Quickstart & Validation: Drawing-to-Quote

## Prerequisites
- Node 22, `npm install`
- `.env.local`: `APP_PASSWORD`, `AUTH_SECRET`, `GEMINI_API_KEY` (free, Google AI Studio)
  — optional `ANTHROPIC_API_KEY`, `AI_PROVIDER=claude`.

## Automated validation (no AI key needed)
```bash
npm test          # deterministic core against fixture tests/fixtures/anh-cuong.takeoff.json
npm run build
```
Expected:
- Tile ownership: synthetic grid of 400 symbols incl. 60 on seams → 400 counted, 0 duplicates.
- BOQ from fixture: downlight 68; switch 1g=1, 2g=1, 3g=7, 4g=2; camera outdoor 3 / indoor 2;
  IR 3; curtain 2; wall light 4; tube 1; exhaust fan 2.
- Cross-checks: C1 warns "Line 15 không có tải".
- Quote: Smart Home 46.531.600; Lighting 10.961.600; Total 57.493.200;
  words "Năm mươi bảy triệu bốn trăm chín mươi ba ngàn hai trăm đồng chẵn".

## Manual end-to-end
1. `npm run dev`, open http://localhost:3000 → login.
2. Upload `MEP_-A_CUONG_26.10.27.pdf`, customer "Anh Cường" → Phân tích (Gemini).
3. Check page classification (ME-02 legend, ME-03 panel, ME-06 lighting, ME-04 power, ME-07 LV, ME-12 HVAC).
4. Review screen: markers over drawing; compare BOQ with expected numbers above; fix any mistakes.
5. Báo giá → adjust prices if needed → "In PDF" (7 pages) and "Tải Excel"; totals match.
6. Alternative path: Nhập kết quả Claude → load `anh-cuong.takeoff.json` → same BOQ.
