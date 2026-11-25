# Progress

Live URL: https://kotodin-cyan.vercel.app · Repo: https://github.com/ayushgade06/kotodin

| Milestone | Status | Notes |
|---|---|---|
| M1 Repo foundation | ✅ | Vite + React 19 + TS strict, Tailwind v4, Vitest, Playwright, `vercel.json` SPA rewrite + security headers/CSP, MIT |
| M2 BGS data pipeline | ✅ | 3,534 wells, 0 dropped. >10 µg/L 42.1%, >50 µg/L 24.9%, shallow (<150 m) >50 µg/L **27.4%** (BGS ≈ 27%). 160 KB raw / 48 KB gz. Generated at build time (DECISIONS #1) |
| M3 Forecast engine | ✅ | 28 engine tests incl. golden 24.3 days, monotonicity, bands, statuses, calibration, queue, stock, geo, card codec, sweep perf. No React in `src/engine`. Formula table lives on the in-app Methods page and in README (no separate docs/methods.md) |
| M4 Design system & shell | ✅ | Tokens per plan §18 + Fraunces display face; nav/footer/status/card strings in EN + বাংলা |
| M5 State & demo seed | ✅ | Seed status mix exactly 25 ok / 6 due / 5 overdue / 2 failed / 2 not needed (test-enforced ±2); deterministic; export→import round-trip tested |
| M6 Dashboard | ✅ | KPIs, queue with why-lines, status-shaped map markers, sortable/filterable table, add-household dialog with map click and nearest-wells estimate, export/import/reset, sticker selection |
| M7 Household & recalibration | ✅ | Demo: logging 14 µg/L effluent on HH-014 → **k 1.00 → 0.70, 3 filters move into the queue**, toast + highlighted rows. e2e green |
| M8 Card & stickers | ✅ | Bangla-first card, Bangla numerals, tampered payload → error. A4 8-up sticker sheet. **Manual phone QR scan still to do (user)** |
| M9 Design Lab | ✅ | Sweep ≈ 3 ms / 3,534 wells. Params in URL. Headline (250 g, 5 × 5 L, central): 75.5% < 30 days, median 27.8 days, 13.1 pouches & ৳1,968 / household / year; 58% of wells need no filter; 394 g reaches 90% ≥ 30 days (cautious: 1,853 g) |
| M10 Landing & Methods | ✅ | Cited stats with working links; every assumption labelled; no-affiliation and AI disclosures |
| M11 Reliability / PWA / a11y | ✅ | PWA precaches app + wells.json; error boundary per route; corrupt-storage recovery; stock forecast; WhatsApp share; mobile overflow bugs fixed. Lighthouse scores: see below |
| M12 Deploy & submission | ✅ | README, SUBMISSION.md, VIDEO_SCRIPT.md, screenshots in docs/screens |

## Test status
- `npm test`: 43/43 passing (engine 28, data/state/seed 14, dashboard queue render 1)
- `npx playwright test`: 7 passed, 1 skipped (add-household on mobile) across desktop 1440×900 and Pixel 7
- `npm run build` / `npm run typecheck`: green

## Known issues / manual checks remaining
- Scan a printed sticker with a real phone camera (QR verified only by decoding round-trip tests and the card route e2e).
- Print preview of the sticker sheet in a real browser print dialog.
- Offline verified on the live site in desktop Chromium (program, lab, landing load with network off); not yet checked on a real phone.
