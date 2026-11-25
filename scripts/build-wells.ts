// Downloads (if missing) and processes the DPHE/BGS National Hydrochemical Survey into public/data/wells.json.
// Licence: the derived file is NOT committed (see DECISIONS.md); this runs as part of `npm run build`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { rowsToWells, packWells, type RawRow } from '../src/data/parseWells';

const SOURCE_PAGE = 'https://www.bgs.ac.uk/groundwater/download/dphe-bgs-national-hydrochemical-survey/';
const SOURCE_URL = SOURCE_PAGE + '?wpdmdl=4002';
const RAW = 'data/raw/NationalSurveyData.csv';

async function main() {
  if (!existsSync(RAW)) {
    console.log(`Downloading ${SOURCE_URL}`);
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`BGS download failed: HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes('SAMPLE_ID')) throw new Error('BGS download did not look like the survey CSV');
    mkdirSync('data/raw', { recursive: true });
    writeFileSync(RAW, text);
  }
  // Lines 1–4 are a title block; line 5 is the header; line 6 is units (dropped by rowsToWells).
  const rows = parse(readFileSync(RAW), { from_line: 5, columns: true, relax_column_count: true, skip_empty_lines: true }) as RawRow[];
  const { wells, dropped } = rowsToWells(rows);

  const pct = (n: number, d: number) => +(100 * n / d).toFixed(1);
  const shallow = wells.filter(w => w.depthM != null && w.depthM < 150);
  const stats = {
    rows: wells.length,
    dropped,
    pctAbove10: pct(wells.filter(w => w.asUgL > 10).length, wells.length),
    pctAbove50: pct(wells.filter(w => w.asUgL > 50).length, wells.length),
    shallowPctAbove50: pct(shallow.filter(w => w.asUgL > 50).length, shallow.length),
  };
  console.log('wells.json stats', stats);
  if (wells.length < 3000 || wells.length > 3600) throw new Error(`Unexpected row count ${wells.length}`);
  if (Math.abs(stats.shallowPctAbove50 - 27) > 3) console.warn('Shallow >50 µg/L share differs from BGS published ~27%');

  mkdirSync('public/data', { recursive: true });
  writeFileSync('public/data/wells.json', JSON.stringify(packWells(wells)));
  writeFileSync('public/data/wells.meta.json', JSON.stringify({
    source: 'DPHE/BGS National Hydrochemical Survey, release 25 May 2000 (fieldwork 1998–99)',
    sourcePage: SOURCE_PAGE,
    generatedAt: new Date().toISOString().slice(0, 10),
    ...stats,
    belowDetection: 'Values reported as "< x" are stored as x/2 (half the detection limit).',
    attribution: 'Contains British Geological Survey materials © UKRI. Data: DPHE/BGS (2001) Arsenic contamination of groundwater in Bangladesh, BGS Technical Report WC/00/19.',
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
