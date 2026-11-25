# Devpost submission text — Kotodin

**Tagline:** Every arsenic filter runs out. Kotodin tells you when.

**Links:** Live app _LIVE_URL_ · Source https://github.com/ayushgade06/kotodin

**Built with:** TypeScript, React, Vite, Tailwind CSS, Leaflet, OpenStreetMap, qrcode, vite-plugin-pwa, Vitest, Playwright, DPHE/BGS National Hydrochemical Survey data.

**SDGs:** 6.1 (safe drinking water), 3.9 (illness from hazardous chemicals and water contamination), 6.b (community participation in water management).

---

## Inspiration
In Bangladesh about 17.5 million people drink water above the national arsenic standard of 50 µg/L (MICS 2019). Household filters with replaceable adsorbent media are one answer, and student teams such as the one behind PureHusk are building new low-cost ones. But studies keep finding the same ending: once field maintenance stops, filters are abandoned. In one 622-person study, 95% of households had abandoned their filter a year after support ended (Sanchez et al., 2016).

The cruel detail is that **a saturated filter looks exactly like a working one**. Arsenic has no colour or taste. And because well arsenic ranges from under 10 to over 500 µg/L, a fixed “change it every three months” schedule is dangerously late for some families and wastefully early for others.

## What it does
Kotodin turns every filter into a forecast and runs the maintenance around it.
- **Program dashboard:** a *Visit this week* queue ranked by exposure × urgency, each with a plain reason (“Overdue 5 days · 180 µg/L well · 6 people”); a status map; a sortable table; a pouch-stock forecast; export/import; WhatsApp sharing of the visit list.
- **Household forecast:** a cautious replace-by date with a low–mid–high band, a capacity chart, and “How is this calculated?” showing the formula with the household’s real numbers substituted.
- **Fleet calibration:** when a field test catches a breakthrough, Kotodin compares how much arsenic that pouch actually held with what the lab-based model predicted. After three such tests the median ratio, k, rescales every filter in the program. In the demo, one test moves k from 1.00 to 0.70 and three households move into this week’s visits.
- **Bangla family card:** a QR sticker on the filter opens a phone card with a big Bangla countdown (“১৫ দিন বাকি”) and three plain instructions. Its numbers live in the URL fragment, so there is no server, no account and no personal data.
- **Design Lab:** for filter designers. Pick a pouch mass and media parameters and see the replacement interval and yearly cost across all 3,534 wells in the national survey, or ask “how big must the pouch be so 90% of families change it at most monthly?”

## How we built it
A pure TypeScript forecasting engine (no React, fully unit-tested) sits under a static React app. A build script downloads the DPHE/BGS National Hydrochemical Survey CSV, handles below-detection values, and writes a compact 48 KB (gzipped) well file. Program data lives in the browser (localStorage, versioned and validated); everything shown is recomputed from state and today’s date. The app is an installable offline PWA, because field work happens on patchy data.

## The model, explained
`qe = qmax·b·C/(1+b·C)` (Langmuir) → `Q = mass·qe·derate·fBT·k` → `days = Q / (C × litres per day)`, computed for low, mid and high parameter sets. The replace-by date uses the **low** band, so the forecast is cautious by design. Example: a 1 kg pouch, a 180 µg/L well and 6 people (30 L/day) gives 16 / 77 / 235 days; the replace-by date is day 16.

## Challenges
- **Uncertain science.** Published capacities for iron-modified rice-husk media vary more than 10×. Instead of hiding that, Kotodin shows bands, labels every parameter as an assumption, and learns from field tests.
- **Privacy without a backend.** Households are codes; the family card is stateless.
- **Bangla.** Self-hosted Noto Sans Bengali, Bangla numerals and dates via `Intl`, checked for conjunct rendering.
- **Honest demo data.** The 40 demo households are synthetic, but they sit on real survey wells with their real arsenic values, and every program screen says so.

## Accomplishments
- 43 unit/component tests plus 4 end-to-end flows on desktop and mobile; the engine’s golden test reproduces a hand calculation (24.3 days).
- Design Lab sweep of 3,534 wells in about 3 ms.
- Headline finding at the default 250 g pouch (central estimate): **75.5% of the 1,487 survey wells above 10 µg/L would need a new pouch more often than monthly**, about 13 pouches (৳1,968) per household per year. A 394 g pouch gets 90% of households to monthly or longer.
- The data sanity check matches BGS’s own figure: 27.4% of shallow wells exceed 50 µg/L (BGS: ~27%).

## What we learned
That the hardest part of a water filter isn’t the filter; it’s knowing when it has stopped working. And that showing uncertainty honestly is more useful than one confident number.

## Limitations
Kotodin is a planning aid, not a safety certification; only a water test confirms safety. The model has not been validated against a real filter program. Media parameters are literature-based placeholders. Langmuir equilibrium capacity is a proxy for a flow-through pouch. Water use is assumed. Survey values are single samples from 1998–99. The family card can’t know about tests logged after it was printed.

## What’s next
Plug in measured isotherms (for example from PureHusk’s planned lab testing); a field pilot to validate and calibrate; SMS reminders; multi-device sync for program teams.

## Disclosures
Independent student project, not affiliated with or endorsed by KeebsforWater, PureHusk, BGS or DPHE. Code written with substantial help from an AI coding assistant (Anthropic’s Claude). Survey data: Contains British Geological Survey materials © UKRI.
