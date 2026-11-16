// Renders static/og-default.png (1200x630) with the site's own fonts and colors.
// Run when the artwork changes: node scripts/og-image.ts (needs Playwright's Chromium).
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const font = (pkg: string, file: string) =>
  readFileSync(`node_modules/@fontsource/${pkg}/files/${file}.woff2`).toString('base64');
const display = font('bricolage-grotesque', 'bricolage-grotesque-latin-800-normal');
const ui = font('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-500-normal');

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:D;src:url(data:font/woff2;base64,${display})}
@font-face{font-family:U;src:url(data:font/woff2;base64,${ui})}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#f2f4f7;font-family:U;color:#141a22;position:relative;overflow:hidden}
.band{position:absolute;left:0;top:0;bottom:0;width:24px;background:#2f45d8}
.card{position:absolute;right:-60px;top:90px;width:420px;height:420px;border-radius:64px;background:#2f45d8;transform:rotate(8deg);box-shadow:0 24px 60px rgb(47 69 216/.28)}
.card svg{width:100%;height:100%}
.text{position:absolute;left:96px;top:0;bottom:0;width:700px;display:flex;flex-direction:column;justify-content:center}
.brand{font-family:D;font-weight:800;font-size:128px;line-height:1;letter-spacing:-2px;color:#2f45d8}
.tag{font-family:D;font-weight:800;font-size:52px;line-height:1.15;margin-top:28px}
.note{margin-top:36px;font-size:32px;color:#4a5563;display:flex;align-items:center;gap:14px}
.dot{width:16px;height:16px;border-radius:50%;background:#0e6b47}
</style><div class="band"></div>
<div class="card"><svg viewBox="0 0 32 32"><rect x="7" y="7" width="18" height="18" rx="3" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="12" y="12" width="8" height="8" rx="1.5" fill="#fff"/></svg></div>
<div class="text"><div class="brand">IMG-TOOLS</div>
<div class="tag">Image tools that run in your browser</div>
<div class="note"><span class="dot"></span>Nothing is uploaded. Free and open source.</div></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'static/og-default.png' });
await browser.close();
