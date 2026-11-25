// Captures screenshots of every major screen into docs/screens (run against `vite preview` on :4173).
import { chromium, type Page } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.OUT ?? 'docs/screens';

async function settle(p: Page) { await p.waitForLoadState('networkidle'); await p.waitForTimeout(700); }

async function main() {
  const browser = await chromium.launch();
  const errors: string[] = [];
  const desk = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  desk.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  desk.on('pageerror', e => errors.push(String(e)));
  await desk.goto(`${BASE}/`); await settle(desk);
  await desk.screenshot({ path: `${OUT}/landing.png` });
  await desk.screenshot({ path: `${OUT}/landing-full.png`, fullPage: true });
  await desk.goto(`${BASE}/program`); await settle(desk);
  await desk.screenshot({ path: `${OUT}/dashboard.png` });
  await desk.screenshot({ path: `${OUT}/dashboard-full.png`, fullPage: true });
  await desk.getByRole('link', { name: /HH-014/ }).first().click(); await settle(desk);
  await desk.screenshot({ path: `${OUT}/household.png`, fullPage: true });
  await desk.getByLabel('Arsenic (µg/L)').fill('14');
  await desk.getByRole('button', { name: 'Log breakthrough' }).click();
  await desk.waitForTimeout(500);
  await desk.screenshot({ path: `${OUT}/household-recalibration.png` });
  await desk.goto(`${BASE}/program`); await settle(desk);
  await desk.screenshot({ path: `${OUT}/dashboard-after.png` });
  await desk.goto(`${BASE}/lab`); await settle(desk); await desk.waitForTimeout(800);
  await desk.screenshot({ path: `${OUT}/lab.png` });
  await desk.screenshot({ path: `${OUT}/lab-full.png`, fullPage: true });
  await desk.goto(`${BASE}/methods`); await settle(desk);
  await desk.screenshot({ path: `${OUT}/methods.png` });
  const ids = await desk.evaluate(() => JSON.parse(localStorage.getItem('kotodin:v1')!).households.slice(0, 8).map((h: { id: string }) => h.id).join(','));
  await desk.goto(`${BASE}/program/stickers?ids=${ids}`); await settle(desk);
  await desk.screenshot({ path: `${OUT}/stickers.png` });
  const cardHref = await (async () => { await desk.goto(`${BASE}/`); await settle(desk); return desk.getByRole('link', { name: /See a family card/ }).getAttribute('href'); })();

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  phone.on('pageerror', e => errors.push(String(e)));
  await phone.goto(`${BASE}${cardHref}`); await settle(phone);
  await phone.screenshot({ path: `${OUT}/card-bn.png` });
  await phone.goto(`${BASE}/program`); await settle(phone);
  await phone.screenshot({ path: `${OUT}/dashboard-mobile.png` });
  await phone.goto(`${BASE}/`); await settle(phone);
  await phone.screenshot({ path: `${OUT}/landing-mobile.png` });
  await browser.close();
  console.log(errors.length ? `Console errors:\n${errors.join('\n')}` : 'No console errors');
}
main().catch(e => { console.error(e); process.exit(1); });
