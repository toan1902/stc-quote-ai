# Research: Drawing-to-Quote

## R1. AI provider for zero-cost default
- **Decision**: Gemini API free tier, model id from env `GEMINI_MODEL`, default `gemini-flash-latest`
  (Google's documented "latest" alias for the Flash line; current Flash ids include
  `gemini-3.8-flash`, `gemini-3.6-flash`). Optional `ANTHROPIC_API_KEY` + `CLAUDE_MODEL`
  (default `claude-opus-5-5`) switches the automatic path to Claude.
- **Rationale**: Clarify session chose "C + A" — free automatic path plus Claude-chat import.
  Pro models left the Gemini free tier in 2026; Flash/Flash-Lite remain free with per-project
  RPM/RPD quotas visible only in AI Studio. Free-tier inputs may be used by Google to improve
  products → FR-021 privacy notice.
- **Alternatives**: Claude API only (paid, rejected for default cost); local open-source vision model
  (no GPU on Vercel, accuracy unknown); Groq (no strong vision model for line drawings).

## R2. How to locate symbols reliably with a general vision model
- **Decision**: Ask for **point + bounding box** per instance in the provider's native convention
  (Gemini: `box_2d = [ymin, xmin, ymax, xmax]` normalised 0–1000 per image; Claude: same schema
  enforced by prompt). Convert to page coordinates client-side.
- **Rationale**: Gemini is trained to emit 0–1000 normalised boxes; one schema for both providers
  keeps the merge code provider-agnostic.

## R3. Tiling without double counting (M&E "ownership" rule)
- **Decision**: (1) detect the drawing frame on a low-res page (exclude title block/legend);
  (2) choose grid so each tile covers ≤ ~1/9 of the frame and the smallest symbol is ≥ 24 px at the
  sent resolution (tile long side 1536 px); (3) tiles overlap by 12 % for context; (4) a detection
  is kept only if its centre lies in the tile's **core** (the non-overlap partition) → each device
  belongs to exactly one tile. A secondary dedupe (same type, centres < 0.6 % of page diagonal)
  guards against model jitter.
- **Alternatives**: plain NMS over overlapping tiles (fails when model boxes jitter > overlap);
  whole-page single call (symbols too small, measured miss rate high on the Anh Cường set).

## R4. Verification pass
- **Decision**: For each tile, draw numbered red markers for pass-1 detections onto the tile image
  and ask the model to return `{remove:[ids], retype:[{id,type}], add:[detections]}`. Items changed by
  pass 2 get `status = "disputed"` and are highlighted in review.
- **Rationale**: self-check on an annotated image catches misses and false positives far better than
  a second blind count; disagreements are surfaced, not hidden (Principle I).

## R5. Room & circuit attribution
- **Decision**: model returns `room` text per detection when the room label is visible in the tile,
  plus a separate list of room labels with positions; fallback = nearest room label on the same page.
  Circuit labels (numbers next to luminaires/switch points, e.g. "13,14,15") are captured as strings
  and parsed into integer lists.

## R6. BOQ derivation rules (expert M&E)
- Switch position with circuits list C → `switch_{|C|}g` (cap 4; >4 → split 4+rest).
- Two adjacent single/double switches on the same wall (≤ 0.5 % page distance) → offer "gộp mặt" merge.
- AC indoor unit → 1 IR controller; curtain power point "J rèm" → 1 curtain switch + 1 motor +
  rail (default 4 m, editable, `estimated`).
- Camera on LV plan: outdoor if outside the building envelope label / marked outdoor → SE 2S, else SE 3.
- Hub: 1 T950 + 1 ZigBee repeater per floor up to 200 m²; +1 hub per extra floor.
- LED strip: model estimates metres per room from dimension strings → `estimated`.

## R7. Cross-checks (Principle III)
1. Light circuits without a switch; switch circuits without load.
2. Gang count vs distinct circuits.
3. Camera count (LV) vs "ổ cắm camera" (power).
4. AC indoor units (HVAC plan) vs panel-schedule AC circuits vs IR count.
5. Same device type within 0.6 % on the same page (possible duplicate).
6. Pages classified as the same discipline & floor twice (possible double sheet).

## R8. Hosting & limits (Vercel free)
- **Decision**: one serverless route per AI call; client sends one JPEG tile (≤ 1.2 MB) per request,
  well under the 4.5 MB body limit; sequential queue with exponential back-off on 429/RESOURCE_EXHAUSTED.
- PDF never uploaded whole; tiles are discarded server-side after each response (FR-015).

## R9. PDF / Excel generation
- **Decision**: PDF = dedicated `/quote/print` page reproducing the approved 7-page HTML template,
  printed via the browser (Save as PDF). Excel = ExcelJS in the browser with live formulas.
- **Rationale**: the template is already proven in Chrome print; no headless browser on the server.

## R10. Auth
- **Decision**: `APP_PASSWORD` env; `/api/login` sets an HMAC-signed httpOnly cookie
  (`AUTH_SECRET`); middleware protects pages and `/api/ai`.
