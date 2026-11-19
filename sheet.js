// Planche de vérification : node sheet.js 7,10.6,12.5 nom
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const [times, name = 'planche'] = process.argv.slice(2);
execFileSync(process.execPath, [path.join(__dirname, 'render.js'), '--stills', times], { stdio: 'inherit' });
const list = times.split(',').map((t) => path.join(__dirname, 'out', 'stills', `t${Number(t).toFixed(2)}.jpg`));
const args = ['-y', '-hide_banner', '-loglevel', 'error'];
list.forEach((f) => args.push('-i', f));
const n = list.length, cols = Math.min(n, 5), rows = Math.ceil(n / cols);
const fc = list.map((_, i) => `[${i}]scale=324:576,drawtext=text='${times.split(',')[i]} s':x=8:y=8:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(';') +
  ';' + list.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${n}:layout=` + list.map((_, i) => `${(i % cols) * 324}_${Math.floor(i / cols) * 576}`).join('|') + `:fill=black[o]`;
execFileSync(ffmpeg, [...args, '-filter_complex', fc, '-map', '[o]', '-frames:v', '1', path.join(__dirname, 'out', `${name}.jpg`)], { stdio: 'inherit' });
console.log('->', name, rows, 'x', cols);
