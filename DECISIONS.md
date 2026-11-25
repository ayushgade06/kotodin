# Decisions

| # | Decision | Reason |
|---|---|---|
| 1 | **Survey data is generated at build time, not committed.** `npm run build` runs `scripts/build-wells.ts`, which downloads `NationalSurveyData.csv` from the BGS download page (`?wpdmdl=4002`) when `data/raw/` is empty. | The dataset page states no specific licence; BGS’s general terms reserve rights and forbid commercial use without a licence. The plan’s rule: if unclear, don’t commit. Attribution (“Contains British Geological Survey materials © UKRI”) is in the footer, Methods page and README. |
| 2 | All 3,534 rows have coordinates and arsenic, so the admin-centroid fallback was not needed. | Inspected the CSV (lat/long columns present). |
| 3 | wells.json uses a compact columnar format (`{districts, upazilas, rows: [...]}`), unpacked by `unpackWells`. | 160 KB raw / 48 KB gzipped vs ~390 KB for plain objects; plan limit is ≤ 400 KB raw. |
| 4 | **High qmax band = 12 mg/g, not 25.06.** | The 25.06 mg/g value comes from a secondary listing whose primary source could not be verified (plan §22, open question 2 fallback). |
| 5 | **Demo pouch mass = 1,000 g**; Design Lab default stays 250 g. | With the literature low band, a 250 g pouch at ~150 µg/L lasts ~5 days on the cautious forecast, which makes the operational demo meaningless. The Design Lab keeps 250 g because showing that it is too small (75.5% replace more than monthly) is the insight. Documented on the Methods page. |
| 6 | **Demo upazila: Sonargaon (Narayanganj), centre 23.66 N 90.61 E, 18 km radius** (20 survey wells above 10 µg/L, 22 at or below). | Matches the plan’s persona; dense high-arsenic area. 12 km gave only 8 high wells and repeated values. |
| 7 | **Seed install dates are chosen per household to hit the target status mix** (22 ok + 3 borderline ok, 6 due, 5 overdue, 2 failed, 2 not needed) instead of uniform 0–120 days. | Uniform dates cannot produce the plan’s mix because pouch life varies 10× between wells. The 2 pre-seeded breakthroughs have observed/predicted ratios ≈ 0.70 and 0.74, so a third failing test anywhere yields k between them (median), and 3 borderline households move into the queue. Tested in `state.test.ts`. |
| 8 | Effluent tests dated after `today` are ignored by the engine; the UI also blocks future dates. | A future-dated test cannot be evidence of a breakthrough today. |
| 9 | `findMassForTarget` is solved exactly (D is linear in mass, so mass = target ÷ quantile of days-per-gram) instead of binary search. | Simpler and exact. |
| 10 | Dependencies beyond the plan: `lucide-react` (icons), `@fontsource*` (self-hosted fonts so the PWA works offline and CSP stays `font-src 'self'`). React 19 / react-router 7 / react-leaflet 5 instead of 18 / 6 / 4. | Current stable versions; same APIs used. No component or chart library added. |
| 11 | Map tiles: OpenStreetMap standard tiles, desaturated with a CSS filter. | CARTO basemaps now require an API key (seen during testing). OSM needs only attribution. |
| 12 | No Anthropic/LLM integration. | The plan explicitly excludes LLM features (§13, §14.6); the core is deterministic and explainable. No API keys are used or stored. |
| 13 | Toast + 1.6 s row highlight implemented with CSS keyframes, not a motion library. | Respects `prefers-reduced-motion` via one CSS rule; no dependency needed. |
