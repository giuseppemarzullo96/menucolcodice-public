const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const IDS = [
  'aggiunto',
  'modificato',
  'prezzo',
  'eliminato',
  'foto',
  'finito',
  'tornato',
  'importato',
  'grafica',
  'qr',
  'illeggibile',
  'noncapito',
  'scaduta',
];
const FPS = 20;
const DUR = 2.6;
const N = Math.round(FPS * DUR);
const OUT_DIR = path.join(ROOT, '..', '..', 'public', 'stickers');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
  for (const id of IDS) {
    const framesDir = path.join(ROOT, 'frames', id);
    fs.rmSync(framesDir, { recursive: true, force: true });
    fs.mkdirSync(framesDir, { recursive: true });
    const html = path.join(ROOT, 'sticker.html');
    await page.goto(`file://${html}?s=${id}`);
    await page.waitForFunction(() => document.body.dataset.ready === '1');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
    for (let i = 0; i < N; i++) {
      const t = (i / FPS) * 1000;
      await page.evaluate((ms) => {
        document.getAnimations().forEach((a) => {
          try {
            a.currentTime = ms;
          } catch {
            /* noop */
          }
        });
      }, t);
      await page.screenshot({
        path: path.join(framesDir, `${String(i).padStart(3, '0')}.png`),
        omitBackground: true,
      });
    }
    const webpPath = path.join(OUT_DIR, `${id}.webp`);
    execSync(
      `ffmpeg -y -hide_banner -loglevel error -framerate ${FPS} -i "${framesDir}/%03d.png" -loop 0 -c:v libwebp -lossless 0 -compression_level 6 -q:v 72 -preset picture -an "${webpPath}"`
    );
    const size = fs.statSync(webpPath).size;
    console.log(id, `${(size / 1024).toFixed(1)} KB`);
  }
  await b.close();
})();
