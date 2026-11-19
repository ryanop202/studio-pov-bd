# CLAUDE.md : Studio POV BD

Projet de vidéos TikTok POV en 3D rendu BD, générées entièrement en code. L'utilisateur écrit en français, réponds en français. Lis d'abord `GUIDE-FORMAT.md` : ce sont les règles créatives, et elles priment sur tes idées.

## Pipeline

1. `dialogue.json` : répliques (`id`, `t`, `who`, `text`, `nosub`), `duree`, `post`, `prompt_whisper`.
2. Voix, au choix :
   - par l'API : `tts/eleven.js` ;
   - par le site d'ElevenLabs, puis `tts/split.py` qui découpe les prises avec faster-whisper.

   Dans les deux cas, chaque réplique arrive dans `out/voices/<id>.wav` (24 kHz mono). `tts/check.py` sert à vérifier.
3. `voicemix.js` place chaque réplique à `t` avec le traitement `FX[who]`. Il écrit `out/voices.wav` et `out/voice-timing.json` (la durée réelle de chaque réplique).
4. `scene/index.html` et `scene/main.js` : Three.js 0.169 (modules ES servis par `server.js` sur le port 5178).
   - `window.renderAt(t)` dessine l'image à l'instant `t`, de façon **déterministe**.
   - `window.sceneReady` passe à vrai quand la scène est chargée.
   - `window.DURATION` donne la durée.
5. `render.js` : puppeteer-core pilote Chrome sans fenêtre (1080×1920, 30 i/s, captures JPEG dans `out/frames`). Ensuite :
   - `sound.js` (`buildAudio`) synthétise les bruitages avec ffmpeg, via `-filter_complex_script` (une ligne de commande trop longue casse sous Windows) ;
   - le script mixe bruitages et voix, puis encode `out/video-1080p.mp4` et `out/video-720p.mp4`.
6. `sheet.js t1,t2,… nom` : planche d'images fixes dans `out/nom.jpg`. **C'est l'outil de vérification principal :** regarde toujours les planches avant de lancer un rendu complet, qui prend 5 à 10 minutes.

## Plan de `scene/main.js`

Le fichier est découpé en sections `// ====`.

- **Rendu de base :**
  - `toon(color)` : MeshToonMaterial à 3 tons ;
  - `ink(mesh)` : coque de contour noir ;
  - `part(geo, mat, {pos, rot, scale, thick, parent})` : crée une pièce avec son contour ;
  - `grp(parent, pos, rot)`.
- **Textures dessinées en code :** `canvasTex(w, h, draw)` (façades, arbres, tissu, sol, asphalte…).
- **Personnages :**
  - `person(LOOK)` renvoie un pantin articulé ;
  - LOOK : `skin`, `top`, `bottom`, `hair`, `hairStyle` (`short`, `puffs`…), `scale`, `headScale` ;
  - fonctions : `setSit`, `walk(P, phase, amt)`, `face(P, {brow, squint, talk, tears})`, `aim()`, `smile()`.
- **Décors :** bus intérieur (origine), rue extérieure (décalée de `X0 = 200` en x), bus qui suit. Les vitesses sont intégrées dans `OFF` à partir de `busSpeed(t)`.
- **Caméra :**
  - `CAM = [[t, décor, position, lacet, tangage, {cut, roll, fov, track}], …]` ;
  - interpolation lissée entre les clés, `angLerp` pour le lacet ;
  - `cut: true` pour une coupe franche, `track` pour viser une cible qui bouge ;
  - fov 98 par défaut (fisheye) ;
  - `shake(t)` pour les secousses.
- **POV :** cuisses, main, téléphone (`HAND_POSES`, `HAND_KEYS`). L'écran du téléphone est un canvas (`drawPhone`).
- **SMS :** `CARDS = [{kind: 'm' | 'out' | 'typing', in, out, text (chaîne ou fonction de t), when, big, hard, shake}]`. Le style CSS est dans `index.html`.
- **Sous-titres :** générés depuis `dialogue.json` et `voice-timing.json`. Blocs de 1 à 3 mots de 15 caractères au plus ; la ponctuation seule est collée au mot d'avant. Couleur selon `COLOR[who]`.
- **Post-traitement :** shader fisheye, flou de mouvement, vignette, grain, uniform `flash`, noir après `CUT`.
- **`renderAt(t)` :** toutes les animations, en fonction de `t` uniquement. Jamais de `Math.random()` ni d'horloge : utilise `rnd(seed)`.

## Les temps à garder synchronisés

Quand un événement bouge, mets à jour **tous** ces endroits :

- `scene/main.js` : `DURATION`, `CUT`, les constantes d'événements (ici `BRAKE`, `SMASH`, `CRASH`), `CAM`, `CARDS`, `HAND_KEYS`, `renderAt` ;
- `sound.js` : `CUT`, les mêmes constantes, `SMS` (les dings), `WHOOSH`, `HITS`, et les instants écrits en dur dans `buildAudio` ;
- `voicemix.js` : `IN_BUS` (écho d'intérieur) et `FX` par personnage ;
- `dialogue.json` : `duree` et les `t`.

## Pour une nouvelle histoire

- Copie `dialogue.json`, `scene/main.js` et `sound.js` dans un dossier `archive-<nom>/` avant de tout réécrire, pour garder l'exemple qui marche.
- **Garde tel quel :** le rendu de base, les personnages, le post-traitement, les cartes, les sous-titres, le moteur de caméra, le pipeline audio et les voix.
- **Réécris :** les décors, la distribution, `CAM`, `CARDS`, `renderAt`, et les sons de `buildAudio`.
- Montre d'abord le scénario minuté, et attends la validation avant de coder.
- **Ordre de travail :**
  1. voix ;
  2. `npm run voix` ;
  3. scène ;
  4. planches avec `sheet.js` ;
  5. corrections ;
  6. `npm run rendu`.

## Retours déjà reçus, à ne pas reproduire

- **Téléportation de caméra entre deux lieux :** il faut des déplacements continus. Une coupe n'est permise que sur un choc.
- **Temps morts :** une action physique toutes les 5 à 10 s au plus.
- **Personnage qui traverse une porte ou un siège :** il s'arrête devant et pousse. Vérifie les collisions sur les planches.
- **Objet clé illisible**, comme la branche qui casse la vitre : il doit être visible et cadré au moins 1 s.
- **Véhicule immobile alors qu'il « part » :** il doit vraiment avancer et accélérer.
- **Retournements faibles :** un retournement change le sens de ce qu'on a vu.
- **SMS trop bavards :** les SMS font 2 à 6 mots.
- **Voix TTS gratuites** (Edge, Chatterbox) : refusées, pas émotionnelles. Utilise ElevenLabs Eleven v4 avec des tags d'émotion, une prise par personnage.
- **Sous-titre qui commence par une ponctuation seule** (« ! Je ») : déjà corrigé, ne le casse pas.

## Règles de sécurité

- Ne jamais écrire, afficher ou committer une clé API. La clé va dans `tts/cle-elevenlabs.txt`, ignoré par git. L'utilisateur la saisit lui-même avec `tts/saisir-cle.ps1`.
- Demander avant de dépenser des crédits ElevenLabs ou d'un autre service payant.
- Tu ne peux pas écouter l'audio : la vérification passe par Whisper (`check.py`), et c'est l'utilisateur qui juge le jeu d'acteur.

## Environnement

- Node 20 ou plus, Chrome (chemin détecté, ou variable `CHROME_PATH`). `ffmpeg-static` est installé par npm.
- Python avec `faster-whisper` (dans `requirements.txt`), à lancer avec `-I` et `PYTHONIOENCODING=utf-8` sous Windows.
- Un rendu complet prend 5 à 10 minutes : lance-le en arrière-plan.
