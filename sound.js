// Bande son de « Moi » — Partie 1, entièrement synthétisée avec ffmpeg (les voix sont mixées à part).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CUT = 54.0, BRAKE = 1.0, SMASH = 5.0, CRASH = 31.2;
const SMS = [0.3, 3.8, 8.85, 9.9, 14.0, 16.4, 21.6, 27.4, 38.2];
const WHOOSH = [[2.1, 0.4, 0.4], [4.2, 0.4, 0.6], [6.3, 0.4, 0.4], [14.3, 0.6, 0.8], [21.6, 0.4, 0.4], [24.2, 0.4, 0.5], [26.2, 0.4, 0.5], [27.4, 0.4, 0.5], [28.5, 0.3, 0.4], [29.6, 0.3, 0.4], [34.8, 0.9, 0.5], [40.4, 0.4, 0.7], [43.4, 0.35, 0.5], [48.0, 0.35, 0.5], [49.8, 0.35, 0.4]];
const HITS = [[BRAKE + 0.15, 1.2], [8.85, 0.7], [12.9, 0.8], [16.0, 1.0], [16.45, 0.8], [21.5, 1.1], [38.2, 0.9], [40.9, 0.8], [46.7, 1.2]];

function buildAudio(ffmpeg, wav, D) {
  const chains = []; let n = 0;
  const ST = 'aformat=sample_rates=48000:channel_layouts=stereo';
  const PAN = { L: 'aformat=sample_rates=48000:channel_layouts=mono,pan=stereo|c0=c0|c1=0.3*c0', R: 'aformat=sample_rates=48000:channel_layouts=mono,pan=stereo|c0=0.3*c0|c1=c0', C: ST };
  const add = (src, filters, at = 0, pan = 'C') => {
    const ms = Math.round(at * 1000);
    chains.push(`${src},${filters}${filters ? ',' : ''}${PAN[pan]}${ms ? `,adelay=${ms}|${ms}` : ''}[a${n}]`); n++;
  };
  const tone = (f, d, vol, at, pan = 'C', extra = '') => add(`sine=f=${f}:d=${d}`, `afade=t=out:st=${Math.min(0.02, d / 4)}:d=${(d * 0.9).toFixed(3)},volume=${vol}${extra}`, at, pan);
  const noise = (color, d, vol, at, filt, pan = 'C') => add(`anoisesrc=color=${color}:amplitude=0.5:d=${d}:seed=${n + 7}`, `${filt},volume=${vol}`, at, pan);

  // --- moteur du bus : roule, pile, se tait, repart tout seul, s'emballe
  const eng = `if(lt(t,${BRAKE}),1,if(lt(t,1.6),1-0.8*(t-${BRAKE})/0.6,if(lt(t,3),0.2,if(lt(t,4.6),0.2+0.8*(t-3)/1.6,if(lt(t,9.9),1,if(lt(t,13.5),1+0.5*(t-9.9)/3.6,1.5))))))`;
  noise('brown', CRASH, 0.55, 0, `lowpass=f=300,highpass=f=35,volume='${eng}':eval=frame`);
  add(`sine=f=48:d=${CRASH}`, `tremolo=f=6:d=0.4,volume='0.2*${eng}':eval=frame`);
  add(`sine=f=96:d=${CRASH - 9.9}`, `tremolo=f=9:d=0.5,afade=t=in:d=3,volume='0.05+0.05*t/21':eval=frame`, 9.9);
  noise('pink', 0.95, 0.25, 0, 'bandpass=f=900:w=600'); // brouhaha avant le freinage
  // --- freinage : crissement + chocs des corps et des sacs
  add('sine=f=2900:d=0.8', "vibrato=f=18:d=0.3,afade=t=in:d=0.04,afade=t=out:st=0.5:d=0.3,volume=0.12", BRAKE);
  noise('white', 0.8, 0.35, BRAKE, 'bandpass=f=3200:w=1500,afade=t=in:d=0.04,afade=t=out:st=0.45:d=0.35');
  for (const [at, v] of [[1.25, 0.9], [1.35, 0.6], [1.5, 0.8], [1.65, 0.7], [1.75, 0.5], [1.9, 0.6]]) noise('brown', 0.3, v, at, 'lowpass=f=260,afade=t=out:st=0.03:d=0.27');
  noise('pink', 1.4, 0.25, 1.7, 'bandpass=f=500:w=400,afade=t=in:d=0.2,afade=t=out:st=0.6:d=0.8'); // gémissements / agitation
  // --- la branche et la vitre
  noise('pink', 0.4, 0.5, SMASH - 0.25, 'bandpass=f=1200:w=1500,afade=t=in:d=0.2,afade=t=out:st=0.2:d=0.2');
  noise('white', 0.9, 0.7, SMASH, 'highpass=f=2500,afade=t=out:st=0.05:d=0.85');
  noise('brown', 0.4, 0.8, SMASH, 'lowpass=f=400,afade=t=out:st=0.02:d=0.38');
  for (let i = 0; i < 16; i++) tone(3200 + ((i * 937) % 3100), 0.12, 0.08, SMASH + 0.05 + i * 0.045 + (i % 3) * 0.02, i % 2 ? 'L' : 'R');
  noise('pink', 0.95, 0.3, SMASH + 0.08, 'bandpass=f=700:w=900,tremolo=f=22:d=0.7,afade=t=out:st=0.7:d=0.25'); // la branche racle
  noise('pink', 0.4, 0.5, SMASH + 1.0, 'bandpass=f=1400:w=1800,afade=t=out:st=0.1:d=0.3'); // arrachée
  noise('white', 6, 0.08, SMASH + 0.6, 'bandpass=f=900:w=1200,afade=t=in:d=0.4'); // vent par la vitre cassée
  for (let at = 10.5; at < 12.4; at += 0.36) noise('brown', 0.12, 0.35, at, 'lowpass=f=600,afade=t=out:st=0.01:d=0.11');
  for (let at = 22.95; at < 24.0; at += 0.24) noise('brown', 0.1, 0.4, at, 'lowpass=f=600,afade=t=out:st=0.01:d=0.09');
  // --- le bus qui suit : klaxon, moteur qui monte
  for (const [at, d] of [[21.5, 1.1], [26.3, 0.7], [29.9, 1.3]]) { add(`sine=f=233:d=${d}`, `afade=t=in:d=0.03,afade=t=out:st=${d - 0.15}:d=0.15,volume=0.22`, at); add(`sine=f=277:d=${d}`, `afade=t=in:d=0.03,afade=t=out:st=${d - 0.15}:d=0.15,volume=0.16`, at); }
  noise('brown', CRASH - 21.4, 0.2, 21.4, "lowpass=f=420,volume='0.4+1.6*(t/9.8)*(t/9.8)':eval=frame");
  // portes qu'on secoue
  for (let at = 23.8; at < 27.4; at += 0.35) noise('brown', 0.18, 0.5, at, 'lowpass=f=900,highpass=f=120,afade=t=out:st=0.02:d=0.16');
  // compte à rebours
  for (const at of [28.4, 29.4, 30.4]) tone(880, 0.14, 0.4, at);
  // --- le choc
  noise('brown', 1.4, 1.4, CRASH, 'lowpass=f=500,afade=t=out:st=0.05:d=1.35');
  add('sine=f=38:d=1.5', 'afade=t=out:st=0.05:d=1.4,volume=1.1', CRASH);
  noise('white', 1.0, 0.8, CRASH, 'bandpass=f=1800:w=2500,afade=t=out:st=0.05:d=0.95');
  for (let i = 0; i < 10; i++) tone(2600 + ((i * 1171) % 3500), 0.15, 0.08, CRASH + 0.1 + i * 0.05, i % 2 ? 'L' : 'R');
  for (const at of [31.75, 32.15, 32.6, 32.95]) noise('brown', 0.25, 0.9, at, 'lowpass=f=220,afade=t=out:st=0.02:d=0.23'); // roulades
  add('sine=f=3600:d=4.2', 'afade=t=in:d=0.2,afade=t=out:st=1.5:d=2.7,volume=0.07', CRASH + 0.4); // sifflement d'oreilles
  // --- la rue
  noise('brown', CUT - 32.8, 0.3, 32.8, 'lowpass=f=480,highpass=f=40,afade=t=in:d=2.5');
  noise('pink', CUT - 32.8, 0.045, 32.8, 'bandpass=f=2200:w=1800,afade=t=in:d=2.5');
  for (const at of [35.0, 35.3, 39.1, 39.3]) add('sine=f=3600:d=0.09', 'vibrato=f=30:d=0.6,afade=t=out:st=0.01:d=0.08,volume=0.05', at, at % 2 > 1 ? 'L' : 'R');
  noise('brown', 48 - 31.6, 0.3, 31.6, "lowpass=f=220,afade=t=in:d=0.5,volume='1-0.6*t/16.4':eval=frame", 'L'); // le bus qui s'éloigne
  noise('brown', 5, 0.5, 48, 'lowpass=f=320,afade=t=in:d=0.4,afade=t=out:st=1.5:d=3.5', 'L'); // il repart
  // la vraie Inès tape contre la vitre (lointain)
  for (const at of [40.9, 41.3, 41.7, 42.4, 42.8, 48.5, 48.9, 49.3]) noise('brown', 0.15, 0.35, at, 'lowpass=f=500,highpass=f=150,afade=t=out:st=0.01:d=0.14', 'L');
  // --- SMS : petit « ding » à deux notes (aigu, propre à la série)
  for (const at of SMS) { tone(1318.5, 0.14, 0.45, at); tone(1975.5, 0.2, 0.34, at + 0.09); }
  tone(1975.5, 0.12, 0.5, 46.7); tone(1318.5, 0.25, 0.5, 46.78); // « LÂCHE. » : ding inversé
  noise('pink', 0.25, 0.35, 50.95, 'highpass=f=1500,afade=t=in:d=0.12,afade=t=out:st=0.12:d=0.13'); // envoi
  tone(1567.98, 0.12, 0.25, 51.1);
  for (const at of [52.5, 53.05, 53.6]) tone(660, 0.06, 0.12, at); // « Moi » écrit…
  // tapotements sur l'écran
  for (let at = 50.4; at < 50.95; at += 0.11) noise('white', 0.03, 0.15, at, 'highpass=f=3000');
  // --- panoramiques, coups, nappes, cœur
  for (const [at, d, v] of WHOOSH) noise('pink', d, v * 0.5, at, `bandpass=f=900:w=1200,afade=t=in:d=${(d * 0.45).toFixed(2)},afade=t=out:st=${(d * 0.45).toFixed(2)}:d=${(d * 0.55).toFixed(2)}`);
  for (const [at, v] of HITS) { tone(55, 1.0, 0.9 * v, at); noise('brown', 0.5, 0.4 * v, at, 'lowpass=f=150,afade=t=out:st=0.05:d=0.45'); }
  add('sine=f=98:d=7', "afade=t=in:d=3,volume='0.06+0.06*t/7':eval=frame,afade=t=out:st=6.6:d=0.4", 14.2);
  add('sine=f=103.8:d=7', "afade=t=in:d=3,volume='0.04+0.05*t/7':eval=frame,afade=t=out:st=6.6:d=0.4", 14.2);
  add(`sine=f=87.3:d=${CUT - 37}`, `afade=t=in:d=4,volume='0.05+0.09*t/${CUT - 37}':eval=frame`, 37);
  add(`sine=f=92.5:d=${CUT - 37}`, `afade=t=in:d=4,volume='0.04+0.07*t/${CUT - 37}':eval=frame`, 37);
  for (let at = 43.6, gap = 0.85; at < CUT - 0.1; at += gap, gap = Math.max(0.42, gap * 0.94)) { tone(52, 0.13, 0.8, at); tone(46, 0.13, 0.5, at + 0.16); }

  const mix = chains.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${chains.length}:normalize=0:duration=longest,volume='if(lt(t,${CUT}),1.6,0)':eval=frame,alimiter=limit=0.89,apad=whole_dur=${D}[mix]`;
  const fc = chains.join(';') + ';' + mix;
  const fcFile = path.join(path.dirname(wav), 'sfx-filter.txt'); fs.writeFileSync(fcFile, fc);
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-filter_complex_script', fcFile, '-map', '[mix]', '-ar', '48000', '-ac', '2', '-t', String(D), wav], { stdio: ['ignore', 'ignore', 'inherit'] });
  return chains.length;
}
module.exports = { buildAudio };
