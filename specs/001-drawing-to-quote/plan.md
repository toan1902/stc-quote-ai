# Implementation Plan: Drawing-to-Quote

**Branch**: `001-drawing-to-quote` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-drawing-to-quote/spec.md`

## Summary

Internal web app for STC CROP: upload an MEP/electrical PDF → AI-assisted takeoff performed the way a
senior M&E quantity surveyor works (legend-first, frame detection, overlapping tiles with ownership
cores, two-pass detect/verify, room & circuit attribution, discipline cross-checks) → mandatory
human review over the drawing → BOQ → priced quote exported as the approved 7-page PDF and 4-sheet
Excel. AI runs on Gemini free tier by default, optionally Claude API, or by importing a takeoff JSON
produced in Claude chat (zero cost).

## Technical Context

**Language/Version**: TypeScript 5.9, Node 22

**Primary Dependencies**: Next.js 15 (App Router), React 19, pdfjs-dist 4, ExcelJS 4

**Storage**: none server-side; browser localStorage for catalog/settings/drafts

**Testing**: Node built-in test runner (`node --test`, TS via type stripping) on the pure `lib/core` modules + `next build`

**Target Platform**: Vercel (Hobby/free) + modern desktop browsers (Chrome/Edge)

**Project Type**: web application (single Next.js project, client-heavy)

**Performance Goals**: 20-page set analysed ≤ 10 min on free quota (≈ 40–80 AI calls); review UI renders a page with 300 markers at 60 fps

**Constraints**: request body < 4 MB; AI cost 0đ by default; drawings never persisted server-side

**Scale/Scope**: ≤ 10 internal users, ≤ 50 quotes/month, ≤ 50 pages per set

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. BOQ Accuracy First | legend-first, ≥24 px symbols, ownership tiling, 2-pass verify, "ước tính" labels | PASS (R2–R4, R6) |
| II. Traceable Takeoff | Detection has page/x/y/room/circuit/pass; BOQLine keeps detectionIds | PASS (data-model) |
| III. Cross-Check Before Quote | C1–C6 computed before export, shown & exported | PASS (R7) |
| IV. Human Review Gate | export disabled until status=reviewed; EditLog | PASS |
| V. Template Fidelity | port of approved HTML template; catalog editable; totals identical; words generated | PASS (R9) |
| VI. Data & Secret Safety | keys server-only; tiles not stored; free-tier privacy notice | PASS (R1, R8) |
| VII. Simplicity | one Next.js app, no DB, 3 runtime deps | PASS |

Post-design re-check: PASS — no violations, Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-drawing-to-quote/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ (api-ai.md, api-login.md, takeoff.schema.json)
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── layout.tsx, globals.css
├── login/page.tsx
├── page.tsx                  # wizard: Upload → Analyse → Review → Quote
├── quote/print/page.tsx      # 7-page printable quote (template port)
└── api/
    ├── ai/route.ts           # provider-agnostic AI proxy (gemini | claude)
    ├── login/route.ts, logout/route.ts, health/route.ts
middleware.ts                 # cookie auth
lib/
├── core/                     # PURE, unit-tested
│   ├── types.ts
│   ├── tiling.ts             # frame → grid, overlap, ownership cores, coord transforms
│   ├── merge.ts              # ownership filter, jitter dedupe, verify-pass apply
│   ├── rooms.ts              # nearest-label room attribution
│   ├── circuits.ts           # parse "13,14,15", gang count
│   ├── boq.ts                # detections → BOQ lines (M&E rules)
│   ├── crosscheck.ts         # C1–C6
│   ├── catalog.ts            # default STC catalog & settings
│   ├── pricing.ts            # BOQ → quote numbers
│   ├── words.ts              # Vietnamese amount in words
│   └── takeoff.ts            # import/export & validation of takeoff JSON
├── ai/
│   ├── prompts.ts            # expert M&E prompts per task
│   └── providers.ts          # gemini/claude adapters (server)
├── client/
│   ├── pdf.ts                # pdf.js render, tile crop → JPEG
│   ├── pipeline.ts           # orchestration + queue/back-off
│   ├── excel.ts              # ExcelJS 4-sheet export
│   └── store.ts              # localStorage drafts, catalog
└── auth.ts                   # HMAC cookie helpers
components/ (ReviewCanvas, BoqPanel = BOQ table + cross-checks + estimates, QuoteEditor)
                              # Uploader & PageClassifier live as wizard steps inside app/page.tsx (T042)
public/quote-assets/          # logos, product images, fonts from STC kit
tests/
├── fixtures/anh-cuong.takeoff.json
└── core.test.ts
```

**Structure Decision**: single Next.js project; all quantity logic isolated in `lib/core` (pure
functions, testable in Node without browser or AI), AI isolated behind one route.

## Complexity Tracking

None.
