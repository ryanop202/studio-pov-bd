// Rendu image par image avec Chrome sans fenêtre, puis assemblage ffmpeg.
//   node render.js --stills 0.5,2.4,5      -> images fixes dans out/stills
//   node render.js                         -> out/video-1080p.mp4 + out/video-720p.mp4
//   node render.js --encode                -> réassemble le son et la vidéo sans refaire les images
//   node render.js --audio                 -> seulement out/sfx.wav (bruitages)
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 5178, FPS = 30;
const CHROME = [process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean).find(fs.existsSync);
if (!CHROME) { console.error('Chrome introuvable : installe Google Chrome ou indique son chemin dans la variable CHROME_PATH.'); process.exit(1); }
const DUREE = JSON.parse(fs.readFileSync(path.join(__dirname, 'dialogue.json'), 'utf8')).duree || 55;
const out = path.join(__dirname, 'out');
const args = process.argv.slice(2);
const stills = args.includes('--stills') ? args[args.indexOf('--stills') + 1].split(',').map(Number) : null;
const { buildAudio } = require('./sound');

if (args.includes('--audio')) { // seulement la bande son
  fs.mkdirSync(out, { recursive: true });
  console.log('sons :', buildAudio(ffmpeg, path.join(out, 'sfx.wav'), DUREE));
  process.exit(0);
}
if (args.includes('--encode')) { // réassembler sans refaire les images
  encode(); process.exit(0);
}
function encode() {
  const frames = path.join(out, 'frames'), wav = path.join(out, 'sfx.wav');
  console.log('sons :', buildAudio(ffmpeg, wav, DUREE));
  const voices = path.join(out, 'voices.wav');
  if (fs.existsSync(voices)) { // voix par-dessus les bruitages, légèrement baissés
    const mixed = path.join(out, 'mix.wav');
    execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-i', voices, '-filter_complex',
      '[0]volume=0.72[s];[1]volume=1.15[v];[s][v]amix=inputs=2:normalize=0,alimiter=limit=0.92[o]', '-map', '[o]', '-ar', '48000', mixed], { stdio: 'inherit' });
    fs.copyFileSync(mixed, wav); console.log('voix mixées');
  }
  const master = path.join(out, 'video-1080p.mp4'), web = path.join(out, 'video-720p.mp4');
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%04d.jpg'), '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', master], { stdio: 'inherit' });
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', master, '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-b:v', '1150k', '-maxrate', '1600k', '-bufsize', '3200k',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', web], { stdio: 'inherit' });
  for (const f of [master, web]) console.log(path.basename(f), (fs.statSync(f).size / 1e6).toFixed(1), 'Mo');
}

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, 'server.js')], { env: { ...process.env, PORT }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 600));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--hide-scrollbars', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])] });
  try {
    const page = await browser.newPage();
    page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
    page.on('pageerror', (e) => console.log('[pageerror]', e.message));
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/scene/index.html?render`, { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.sceneReady === true', { timeout: 20000 });
    const duration = await page.evaluate('window.DURATION');

    if (stills) {
      const dir = path.join(out, 'stills'); fs.mkdirSync(dir, { recursive: true });
      for (const t of stills) {
        await page.evaluate((x) => window.renderAt(x), t);
        await page.screenshot({ path: path.join(dir, `t${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 88 });
      }
      console.log('stills ->', dir);
      return;
    }

    const frames = path.join(out, 'frames'); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
    const n = Math.round(duration * FPS); const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      await page.evaluate((x) => window.renderAt(x), i / FPS);
      await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 93 });
      if (i % 30 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    await browser.close();

    encode();
  } finally {
    try { await browser.close(); } catch {}
    server.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
