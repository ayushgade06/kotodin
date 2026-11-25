// Renders favicon/app icons and the Open Graph image into public/ (one-off; outputs are committed).
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const glass = (fill: string, stroke: string) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <clipPath id="c"><path d="M6 4h16l-2.2 20.2a2 2 0 0 1-2 1.8h-7.6a2 2 0 0 1-2-1.8z"/></clipPath>
  <g clip-path="url(#c)"><rect x="0" y="13" width="28" height="20" fill="${fill}"/><path d="M0 13c3 1.6 6 1.6 9 0s6-1.6 9 0 6 1.6 10 0v2H0z" fill="#145569"/></g>
  <path d="M6 4h16l-2.2 20.2a2 2 0 0 1-2 1.8h-7.6a2 2 0 0 1-2-1.8z" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
</svg>`;

async function main() {
  writeFileSync('public/favicon.svg', glass('#1C6E8C', '#0F1B24').trim());
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const size of [192, 512]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<body style="margin:0;background:#F7F5F0;display:grid;place-items:center;height:100vh">
      <div style="width:62%;height:62%">${glass('#1C6E8C', '#0F1B24')}</div></body>`);
    await p.screenshot({ path: `public/icon-${size}.png` });
  }
  await p.setViewportSize({ width: 1200, height: 630 });
  await p.goto('http://localhost:4173/');
  await p.waitForLoadState('networkidle');
  await p.setContent(`<html><head><link rel="stylesheet" href="http://localhost:4173/${await p.evaluate(() => (document.querySelector('link[rel=stylesheet]') as HTMLLinkElement | null)?.getAttribute('href')?.replace(/^\//, '') ?? '')}"></head>
    <body style="margin:0;width:1200px;height:630px;background:#F7F5F0;font-family:'Inter Variable',sans-serif;color:#0F1B24;position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background-image:radial-gradient(#d8d2c5 1px,transparent 1px);background-size:22px 22px;opacity:.6"></div>
      <div style="position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:14px">
        <div style="width:44px;height:44px">${glass('#1C6E8C', '#0F1B24')}</div>
        <span style="font-family:'Fraunces Variable',serif;font-size:36px;font-weight:600">Kotodin</span>
        <span style="font-family:'Noto Sans Bengali';font-size:24px;color:#5F6873">কতদিন</span>
      </div>
      <div style="position:absolute;left:72px;top:170px;width:1000px;font-family:'Fraunces Variable',serif;font-size:72px;line-height:1.04;font-weight:500;letter-spacing:-0.02em">Every arsenic filter runs out.<br/>Kotodin tells you when.</div>
      <div style="position:absolute;left:72px;bottom:64px;font-size:24px;color:#34424D;max-width:980px;line-height:1.4">Per-household forecasts with honest uncertainty · a field-test-calibrated fleet · Bangla QR cards · a Design Lab over 3,534 real Bangladeshi wells</div>
    </body></html>`);
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'public/og.png' });
  await b.close();
}
main().catch(e => { console.error(e); process.exit(1); });
