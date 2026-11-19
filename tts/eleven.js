// Voix ElevenLabs : génère chaque réplique de dialogue.json dans out/voices/<id>.wav (même format que Chatterbox,
// donc voicemix.js et render.js marchent sans changement).
//   node tts/eleven.js --voices      liste les voix de ton compte + les caractères restants
//   node tts/eleven.js               génère tout (cache : seules les répliques modifiées sont refaites)
//   node tts/eleven.js s03 i10       seulement ces répliques
// La clé se lit dans tts/cle-elevenlabs.txt (ou la variable ELEVENLABS_API_KEY). Elle n'est jamais affichée.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const STUDIO = path.dirname(__dirname);
const OUT = path.join(STUDIO, 'out', 'voices');
const API = 'https://api.elevenlabs.io/v1';

function key() {
  const f = path.join(__dirname, 'cle-elevenlabs.txt');
  const fromFile = fs.existsSync(f)
    ? fs.readFileSync(f, 'utf8').split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith('#'))
    : '';
  const k = fromFile || process.env.ELEVENLABS_API_KEY || '';
  if (!k) { console.error('Pas de clé : colle ta clé ElevenLabs dans tts/cle-elevenlabs.txt'); process.exit(1); }
  return k;
}

async function api(p, opts = {}) {
  const r = await fetch(API + p, { ...opts, headers: { 'xi-api-key': key(), 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (!r.ok) {
    const body = (await r.text()).slice(0, 400);
    const why = r.status === 401 ? 'clé refusée (vérifie tts/cle-elevenlabs.txt)' : r.status === 402 || /quota/i.test(body) ? 'quota de caractères épuisé' : `erreur ${r.status}`;
    throw new Error(`${why} — ${body}`);
  }
  return r;
}

async function listVoices() {
  const sub = await (await api('/user/subscription')).json();
  console.log(`Plan : ${sub.tier} — caractères utilisés ${sub.character_count}/${sub.character_limit}\n`);
  const { voices } = await (await api('/voices')).json();
  for (const v of voices) {
    const l = v.labels || {};
    console.log(`${v.voice_id}  ${v.name.padEnd(28)} ${[l.gender, l.age, l.accent, l.language, l.description].filter(Boolean).join(', ')}`);
  }
}

function toWav(mp3, wav) {
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03';
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', mp3, '-af', `${trim},areverse,${trim},areverse`, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--voices')) return listVoices();
  const cast = JSON.parse(fs.readFileSync(path.join(__dirname, 'eleven-cast.json'), 'utf8'));
  const { lines } = JSON.parse(fs.readFileSync(path.join(STUDIO, 'dialogue.json'), 'utf8'));
  fs.mkdirSync(OUT, { recursive: true });
  let chars = 0;
  for (const L of lines) {
    if (args.length && !args.includes(L.id)) continue;
    const whos = L.who === 'choeur' ? cast.choeur : [L.who];
    for (let k = 0; k < whos.length; k++) {
      const name = L.who === 'choeur' ? `${L.id}_${k}` : L.id;
      const c = cast.voices[whos[k]] || cast.voices[(cast.alias || {})[whos[k]]];
      if (!c || !c.voice_id) { console.log(`!! pas de voix pour « ${whos[k]} » (eleven-cast.json)`); continue; }
      const text = L.say || L.text; // « say » : texte prononcé (balises d'émotion v3 possibles), « text » : sous-titre
      const body = {
        text,
        model_id: c.model || cast.model,
        voice_settings: { stability: c.stability ?? 0.4, similarity_boost: c.similarity ?? 0.8, style: c.style ?? 0.3, use_speaker_boost: true, speed: c.speed ?? 1.0 },
      };
      const sig = crypto.createHash('sha1').update(JSON.stringify([c.voice_id, body])).digest('hex');
      const wav = path.join(OUT, name + '.wav'), keyf = path.join(OUT, name + '.key');
      if (fs.existsSync(wav) && fs.existsSync(keyf) && fs.readFileSync(keyf, 'utf8') === 'eleven:' + sig) continue;
      const r = await api(`/text-to-speech/${c.voice_id}?output_format=mp3_44100_128`, { method: 'POST', body: JSON.stringify(body) });
      const mp3 = path.join(OUT, name + '.mp3');
      fs.writeFileSync(mp3, Buffer.from(await r.arrayBuffer()));
      toWav(mp3, wav);
      fs.unlinkSync(mp3);
      fs.writeFileSync(keyf, 'eleven:' + sig);
      chars += text.length;
      console.log(`ok ${name.padEnd(6)} ${whos[k].padEnd(8)} « ${text} »`);
    }
  }
  console.log(`terminé — ${chars} caractères consommés`);
}

main().catch((e) => { console.error('ÉCHEC :', e.message); process.exit(1); });
