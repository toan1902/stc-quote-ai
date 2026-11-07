---
description: "Task list for Drawing-to-Quote"
---

# Tasks: Drawing-to-Quote

**Input**: Design documents from `/specs/001-drawing-to-quote/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required by constitution (deterministic core tested against the Anh Cường fixture).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Create Next.js structure (app/, lib/, components/, tests/, public/quote-assets/) with tsconfig.json, next.config.mjs, .gitignore, .env.example
- [X] T002 [P] Copy STC kit assets (logos, product images, Noto Sans woff2, fonts.css) into public/quote-assets/
- [X] T003 [P] Add npm scripts `test` (node --test with type stripping) and `typecheck`

## Phase 2: Foundational

- [X] T004 Define shared types in lib/core/types.ts (Page, LegendSymbol, DeviceType, Detection, RoomLabel, Estimate, BOQLine, CrossCheck, CatalogItem, Settings, Quote)
- [X] T005 [P] Implement cookie auth helpers lib/auth.ts + middleware.ts + app/api/login, logout, health routes; app/login/page.tsx
- [X] T006 [P] Implement Vietnamese amount-in-words lib/core/words.ts
- [X] T007 [P] Implement default catalog & settings lib/core/catalog.ts (prices from spec Assumptions)
- [X] T008 Create fixture tests/fixtures/anh-cuong.takeoff.json from the manual takeoff (68 downlights with rooms/circuits, 11 switches, 5 cameras, 3 AC, 2 curtain points, wall/tube/fan)

**Checkpoint**: types, auth, words, catalog, fixture ready

## Phase 3: User Story 1 – Bóc BOQ tự động (P1) 🎯 MVP

**Goal**: PDF → classified pages → legend → tiled 2-pass detection → merged detections with rooms/circuits.

**Independent Test**: tiling/merge unit tests (seam test 0 duplicates); fixture → BOQ quantities match spec.

- [X] T009 [P] [US1] lib/core/tiling.ts: frame → grid (≥24 px symbol rule), 12 % overlap, ownership cores, tile↔page coordinate transforms
- [X] T010 [P] [US1] lib/core/merge.ts: box_2d → page coords, ownership filter, jitter dedupe, apply verify result (remove/retype/add → disputed)
- [X] T011 [P] [US1] lib/core/circuits.ts + lib/core/rooms.ts: circuit parsing, gang count, nearest-room attribution
- [X] T012 [US1] lib/core/boq.ts: M&E derivation rules (R6), estimated flags, scope assignment
- [X] T013 [P] [US1] lib/core/takeoff.ts: import/export + validation against contracts/takeoff.schema.json (qty expansion for position-less imports)
- [X] T014 [P] [US1] lib/ai/prompts.ts: expert prompts for classify, frame, legend, detect, verify, panel, estimate
- [X] T015 [US1] lib/ai/providers.ts + app/api/ai/route.ts: Gemini (default) & Claude adapters, JSON extraction, 429 mapping (contracts/api-ai.md)
- [X] T016 [US1] lib/client/pdf.ts: pdf.js render page → canvas, crop tile → JPEG ≤1.2 MB, draw numbered markers for verify pass
- [X] T017 [US1] lib/client/pipeline.ts: orchestration (classify → legend → panel → frame → tiles detect → verify → estimate), sequential queue, back-off, resumable progress
- [X] T018 [US1] components/Uploader.tsx + components/PageClassifier.tsx + wizard step in app/page.tsx (upload, customer info, provider choice + privacy notice, progress)
- [X] T019 [US1] tests/core.test.ts: seam test (400 synthetic symbols, 60 on seams), fixture BOQ quantities

## Phase 4: User Story 2 – Duyệt & đối soát (P1)

**Goal**: review over drawing, edits with log, cross-checks, export gate.

**Independent Test**: delete/add marker changes BOQ; C1 warns Line 15; export blocked before review.

- [X] T020 [P] [US2] lib/core/crosscheck.ts: C1–C6 (research R7)
- [X] T021 [US2] components/ReviewCanvas.tsx: page image + coloured markers, click to select/retype/delete, alt-click to add, zoom/pan, disputed highlight
- [X] T022 [P] [US2] components/BoqTable.tsx (editable estimates, room breakdown) + components/CrossChecks.tsx
- [X] T023 [US2] Edit log + status=reviewed + export gate in app/page.tsx; drafts in lib/client/store.ts
- [X] T024 [US2] tests: cross-check C1 on fixture; edit changes BOQ

## Phase 5: User Story 3 – Xuất báo giá theo mẫu (P1)

**Goal**: priced quote → 7-page PDF + 4-sheet Excel, identical totals.

**Independent Test**: fixture → 46.531.600 / 10.961.600 / 57.493.200 + words.

- [X] T025 [P] [US3] lib/core/pricing.ts: catalog × BOQ → quote numbers (rounding identical to Excel)
- [X] T026 [US3] app/quote/print/page.tsx + app/quote/print/quote.css: port of the approved 7-page template (data from sessionStorage)
- [X] T027 [P] [US3] lib/client/excel.ts: 4 sheets (Tổng hợp, Bóc tách, Smart Home, Chiếu sáng) with live formulas
- [X] T028 [US3] components/QuoteEditor.tsx: quote preview, buttons In PDF / Tải Excel / Tải BOQ kỹ thuật / Xuất takeoff JSON
- [X] T029 [US3] tests: pricing totals + words for fixture

## Phase 6: User Story 4 – Bảng giá (P2)

- [X] T030 [US4] Catalog/settings editor in components/QuoteEditor.tsx persisted via lib/client/store.ts

## Phase 7: Polish

- [X] T031 [P] README.md (setup, env vars, Gemini key how-to, Claude import how-to)
- [X] T032 Run `npm test`, `npm run typecheck`, `next build`; fix issues
- [ ] T033 Deploy to Vercel (project stc-quote-ai) — env vars set by owner in dashboard

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2 → US3 → US4 → Polish.
- US2 needs detections from US1 (or fixture import T013); US3 needs BOQ (T012) — testable from fixture without AI.

## Parallel Example: User Story 1

```text
T009 tiling.ts | T010 merge.ts | T011 circuits/rooms | T013 takeoff.ts | T014 prompts.ts
```

## Implementation Strategy

MVP = Phases 1–5 (fixture/import path works end-to-end even before any AI key exists); the Gemini
path is validated by the owner once `GEMINI_API_KEY` is set. 3D (US5) is out of scope.

## Phase 8: Convergence

- [X] T034 Record estimate edits (LED/rail metres) and page-classification edits in Project.edits with before/after per Constitution IV (partial)
- [X] T035 Resume an interrupted count: skip pages already `analysed`, keep their detections, continue remaining pages per FR-020 (partial)
- [X] T036 Add takeoff-JSON output instructions + schema to the `bao-gia-ban-ve-stc` Claude skill so the Claude-chat path produces an importable file per FR-019 (partial)
- [ ] T037 Validate the live Gemini path on the Anh Cường drawing and compare against tests/fixtures/anh-cuong.takeoff.json per SC-001 (missing)
- [X] T038 Add "Tải BOQ kỹ thuật" export (full takeoff by room incl. excluded items, separate .xlsx) per FR-017 (missing)
- [X] T039 Add tests: removing/adding a detection changes BOQ; export gate blocks before review per US2/AC2–AC3 (missing)
- [X] T040 Use each item's floor (not hard-coded "Tầng 1") in curtain/IR/hub tables of the print page per Edge Case "nhà nhiều tầng" (partial)
- [X] T041 Enforce 50 MB file limit and warn on low-resolution/scanned pages (low classify confidence) per FR-001 & Edge Case "bản vẽ scan" (partial)
- [X] T042 Reconcile plan structure: Uploader/PageClassifier/CrossChecks were merged into app/page.tsx and components/BoqPanel.tsx — document in plan or split components per plan: Project Structure (partial)
