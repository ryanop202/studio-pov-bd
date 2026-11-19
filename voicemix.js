// Place chaque réplique générée (out/voices/<id>.wav) à son moment, applique le traitement
// de chaque personnage, et écrit out/voices.wav + out/voice-timing.json (pour caler les sous-titres).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const dir = path.join(__dirname, 'out', 'voices');
const { lines, duree } = JSON.parse(fs.readFileSync(path.join(__dirname, 'dialogue.json'), 'utf8'));
const D = duree || 55;

function wavDuration(file) { // en-tête RIFF : octets de données / débit
  const b = fs.readFileSync(file);
  let p = 12, byteRate = 0, dataLen = 0;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') byteRate = b.readUInt32LE(p + 16);
    if (id === 'data') { dataLen = size; break; }
    p += 8 + size + (size % 2);
  }
  return dataLen / byteRate;
}

const isEar = (w) => w === 'ines_loin';
const IN_BUS = (t) => t < 31.2; // écho « intérieur du bus » avant le choc : à adapter à ton décor
const FX = {
  sam: (t) => `highpass=f=80,${IN_BUS(t) ? 'aecho=0.8:0.5:25:0.16,' : ''}volume=1.0,pan=stereo|c0=c0|c1=c0`,
  ines: (t) => `highpass=f=90,${IN_BUS(t) ? 'aecho=0.8:0.5:25:0.16,' : ''}volume=0.95,pan=stereo|c0=c0|c1=0.72*c0`,
  // la fausse Inès, à la fin : un demi-ton plus grave, un peu trop proche
  ines_f: () => 'asetrate=48000*0.94,aresample=48000,atempo=1.0638,highpass=f=70,acompressor=threshold=0.1:ratio=3,volume=1.05,pan=stereo|c0=c0|c1=c0',
  // la vraie Inès, derrière la vitre du bus au loin
  ines_loin: () => 'highpass=f=300,lowpass=f=1500,aecho=0.8:0.6:90|160:0.3|0.2,volume=0.55,pan=stereo|c0=c0|c1=0.45*c0',
  homme: (t) => `highpass=f=60,${IN_BUS(t) ? 'aecho=0.8:0.55:30:0.2,' : ''}volume=0.9,pan=stereo|c0=0.8*c0|c1=c0`,
};

const timing = {}, inputs = [], chains = [];
lines.forEach((L, i) => {
  const files = L.who === 'choeur' ? fs.readdirSync(dir).filter((f) => f.startsWith(L.id + '_') && f.endsWith('.wav')).map((f) => path.join(dir, f)) : [path.join(dir, `${L.id}.wav`)];
  const ok = files.filter(fs.existsSync);
  if (!ok.length) { console.log('manque', L.id); return; }
  // fenêtre : jusqu'à la réplique suivante du même « canal » (voix normales / écouteurs)
  const next = lines.slice(i + 1).find((M) => isEar(M.who) === isEar(L.who) && M.t > L.t + 0.05);
  const win = (next ? next.t : D - 0.8) - L.t - 0.06;
  const cap = L.who === 'choeur' ? 0.75 : 99; // le chœur : un « Sam. » bref, on coupe ce qui traîne
  const dur = Math.min(cap, Math.max(...ok.map(wavDuration)));
  const tempo = Math.min(1.3, Math.max(1, dur / win));
  timing[L.id] = { who: L.who, t: L.t, dur: +(dur / tempo).toFixed(3) };
  ok.forEach((f, k) => {
    const idx = chains.length; inputs.push('-i', f);
    const delay = Math.round((L.t + k * 0.03) * 1000);
    const cut = cap < 99 ? `atrim=0:${cap},afade=t=out:st=${cap - 0.15}:d=0.15,` : '';
    chains.push(`[${idx}]aformat=sample_rates=48000:channel_layouts=mono,${cut}${tempo > 1.001 ? `atempo=${tempo.toFixed(3)},` : ''}${FX[L.who](L.t)},adelay=${delay}|${delay}[v${idx}]`);
  });
});
const n = chains.length;
const fc = chains.join(';') + ';' + chains.map((_, i) => `[v${i}]`).join('') + `amix=inputs=${n}:normalize=0:duration=longest,alimiter=limit=0.95,apad=whole_dur=${D}[out]`;
execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', fc, '-map', '[out]', '-ar', '48000', '-ac', '2', '-t', String(D), path.join(__dirname, 'out', 'voices.wav')], { stdio: 'inherit' });
fs.writeFileSync(path.join(__dirname, 'out', 'voice-timing.json'), JSON.stringify(timing, null, 1));
console.log(`voix placées : ${Object.keys(timing).length}/${lines.length}`);
