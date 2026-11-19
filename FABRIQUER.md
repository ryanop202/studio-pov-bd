# Fabriquer une partie, étape par étape

On commence par l'histoire et la timeline, puis les voix, ensuite la scène, et le rendu en dernier. **Ne code pas la scène avant d'avoir les voix :** ce sont leurs durées réelles qui fixent la timeline.

## 1. Écrire le scénario minuté

Sur papier ou avec Claude, en suivant [GUIDE-FORMAT.md](GUIDE-FORMAT.md). Chaque ligne doit donner :

- le moment, en secondes ;
- ce qu'on voit (l'action physique) ;
- le SMS ou la notification, s'il y en a un ;
- la réplique, avec le personnage qui la dit.

Fais relire le scénario par quelqu'un, avec une seule question : « Tu as envie de voir la suite ? » Si la réponse est non, change les retournements avant d'écrire du code.

## 2. Remplir `dialogue.json`

```json
{
 "titre": "Ma série — Partie 1",
 "post": "Partie 1 | Tu ouvres la porte ?",
 "duree": 60,
 "prompt_whisper": "Léa, Tom. Dialogue dans un ascenseur.",
 "lines": [
  { "id": "a01", "t": 2.3, "who": "heros", "text": "C'est quoi, ce message ?" },
  { "id": "a02", "t": 5.1, "who": "amie", "text": "Tom ! Derrière toi !" },
  { "id": "a03", "t": 58.4, "who": "heros", "text": "Je fais quoi ?", "nosub": true }
 ]
}
```

- `id` : un nom court et unique ; il donne le nom du fichier de voix.
- `t` : le moment où la réplique commence, en secondes.
- `who` : le personnage. Il donne la couleur du sous-titre et le traitement de la voix. Chaque `who` doit exister dans `COLOR` (dans `scene/main.js`) et dans `FX` (dans `voicemix.js`).
- `text` : exactement ce qui est dit. Le sous-titre est découpé automatiquement à partir de ce texte.
- `nosub` : réplique sans sous-titre, par exemple quand le texte est déjà sur une carte.
- `duree` : la durée totale. Mets la même valeur dans `DURATION`, en haut de `scene/main.js`.

## 3. Les voix avec ElevenLabs

Il faut un compte ElevenLabs. Les crédits gratuits suffisent pour une partie. Il y a deux façons de faire.

### A. Par le site (sans clé API, c'est ce qui a servi pour l'exemple)

1. Sur elevenlabs.io, ouvre **Text to Speech** et choisis le modèle **Eleven v4**.
2. Choisis une voix par personnage, de préférence sans tarif spécial. Dans l'exemple :
   - **Mike** pour le héros (garçon de 16 ans) ;
   - **Paula M** pour la petite sœur ;
   - **Hugo** pour le passager adulte.
3. Pour **un personnage à la fois**, colle **toutes ses répliques à la suite**, dans l'ordre, séparées par `[long pause]`, avec des indications d'émotion entre crochets :

   ```text
   [confused] « Moi » ? C'est qui, « Moi » ? [long pause] [whispering, scared] …C'est moi. [long pause] [panicked, shouting] Inès, donne ta main !
   ```

   Une seule prise par personnage garde une voix cohérente, et l'émotion passe mieux qu'avec des répliques isolées.
4. Génère deux prises, puis télécharge les MP3 (par exemple `heros_a.mp3`, `heros_b.mp3`).
5. Découpe-les automatiquement en une réplique par fichier. Le script écoute avec Whisper, retrouve chaque réplique et garde la meilleure prise :

   ```powershell
   .venv\Scripts\python -I tts\split.py a01,a03,a07 heros_a.mp3 heros_b.mp3
   ```

   La liste contient les `id` des répliques de ce personnage, dans l'ordre où elles sont dites. Le script crée `out/voices/<id>.wav` et affiche un score par réplique : 1.00, c'est parfait ; sous 0.7, la réplique est à refaire ou à vérifier à l'oreille.

### B. Par l'API (automatique, avec une clé)

1. Enregistre ta clé. Elle reste sur ton PC, dans un fichier ignoré par git :

   ```powershell
   powershell -ExecutionPolicy Bypass -File tts\saisir-cle.ps1
   ```

2. `node tts/eleven.js --voices` liste tes voix et tes crédits. Mets les `voice_id` choisis dans `tts/eleven-cast.json`.
3. `node tts/eleven.js` génère toutes les répliques. Seules les répliques modifiées sont refaites.

### Vérifier

```powershell
.venv\Scripts\python -I tts\check.py
```

Le script retranscrit chaque fichier et signale ce qui est coupé ou mal prononcé. **Écoute quand même au casque :** une machine ne peut pas juger le jeu d'acteur.

## 4. Placer les voix sur la timeline

```powershell
npm run voix
```

Le script place chaque réplique à son `t`, applique le traitement du personnage (écho, voix lointaine, voix trafiquée) et écrit `out/voice-timing.json`. La scène lit ce fichier pour caler les sous-titres et les bouches qui bougent. Si une réplique déborde sur la suivante, elle est accélérée d'au plus 30 %. Au-delà, décale les `t` dans `dialogue.json`.

## 5. Coder la scène

C'est la grosse partie : demande à Claude en lui donnant le scénario. Tout est dans `scene/main.js` (voir [CLAUDE.md](CLAUDE.md)) :

- **décor et personnages :** on réutilise `person()`, `part()`, `toon()` et les textures dessinées en code ;
- **caméra :** le tableau `CAM` ;
- **SMS :** le tableau `CARDS` ;
- **actions :** dans `renderAt(t)` ;
- **bruitages :** dans `sound.js`, aux mêmes instants.

Vérifie au fur et à mesure avec des planches d'images :

```powershell
node sheet.js 0.5,1.2,5,16,31.5 essai
```

## 6. Rendre et publier

```powershell
npm run rendu
```

- `out/video-1080p.mp4` : c'est la version à publier sur TikTok.
- `out/video-720p.mp4` : une version légère, à envoyer pour avoir des avis.

Si tu changes seulement le son ou les voix, pas besoin de refaire les images : lance `npm run voix`, puis `npm run encode`.

Pour publier, mets en texte le `post` de `dialogue.json` et 4 ou 5 hashtags, par exemple `#pov #histoire #suspense #twist`.
