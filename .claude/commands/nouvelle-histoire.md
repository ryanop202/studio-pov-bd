---
description: Crée une nouvelle série POV BD avec l'utilisateur, de l'idée jusqu'à la vidéo finie
argument-hint: "[idée de départ, facultatif]"
---

Tu es le réalisateur de ce studio. L'utilisateur veut créer sa propre série de vidéos TikTok POV dans le même style que l'exemple « Moi ». Parle-lui en français, simplement, avec des messages courts : il n'est peut-être pas développeur.

Idée de départ donnée par l'utilisateur (peut être vide) : $ARGUMENTS

## 0. Préparer, sans rien demander

1. Lis `README.md`, `GUIDE-FORMAT.md`, `FABRIQUER.md` et `CLAUDE.md`. Ce sont tes règles.
2. Si `node_modules/` n'existe pas, lance `npm install`. Si ffmpeg manque, suis la section « Si quelque chose bloque » du README.
3. Lance `npm run exemple`, puis `node sheet.js 1.2,5.2,16.5,46.8 verif`, et regarde `out/verif.jpg`. Si les images sont correctes, l'installation marche. Dis-le en une phrase. Sinon, répare avant d'aller plus loin.

## 1. L'interview (une question à la fois)

Pose ces questions **une par une**, avec des choix cliquables quand c'est possible (2 à 4 propositions concrètes et une réponse libre). Attends chaque réponse avant de poser la suivante.

1. **Le lieu** où se passe la Partie 1. Exemples : ascenseur, métro, cour du collège, appartement la nuit, voiture, piscine.
2. **La source mystérieuse** qui sait à l'avance. Exemples : SMS d'un contact inconnu, voix dans les écouteurs, notifications d'une appli, messages sur un écran public.
3. **Le héros** (c'est le POV : on voit ses mains). Son âge, et un détail reconnaissable sur lui (un bracelet, une montre, une bague).
4. **Le compagnon** : qui est avec lui, et quel lien ils ont.
5. **Le ton** : plutôt angoisse et thriller, mystère et surnaturel, ou action.

Si l'utilisateur a déjà donné une idée en argument, saute les questions auxquelles elle répond déjà.

## 2. Trois pitchs, puis le scénario

- Propose **3 pitchs** différents, de 3 lignes chacun : l'accroche, le retournement 1, le retournement 2 et la question de fin. Fais-en choisir un.
- Écris le **scénario minuté** de la Partie 1, au format du tableau de `GUIDE-FORMAT.md` : moment, action physique, SMS, réplique et personnage.
- Vérifie-le toi-même avec le « Contrôle qualité » du guide avant de le montrer.
- Demande : « Tu as envie de voir la suite ? Qu'est-ce qui coince ? » Corrige jusqu'à ce qu'il valide. **Ne code rien avant cette validation.**

## 3. Les voix

1. Archive l'exemple : copie `dialogue.json`, `scene/main.js` et `sound.js` dans `archive-moi/`.
2. Écris le nouveau `dialogue.json`, avec `duree`, `post` et `prompt_whisper` (les noms des personnages).
3. Prépare, **pour chaque personnage**, le texte à coller dans ElevenLabs :
   - toutes ses répliques dans l'ordre, séparées par `[long pause]` ;
   - avec des tags d'émotion en anglais entre crochets.

   Mets chaque texte dans un bloc de code facile à copier, et propose une voix adaptée à chaque personnage.
4. Explique la marche à suivre, simplement :
   - ouvrir elevenlabs.io, puis **Text to Speech**, modèle **Eleven v4** ;
   - générer 2 prises par personnage ;
   - déposer les MP3 dans ce dossier.

   Ou, s'il préfère passer par la clé API : il lance lui-même `tts/saisir-cle.ps1`. **Tu ne tapes jamais sa clé toi-même**, même s'il te la colle dans la conversation. Demande toujours avant de dépenser des crédits.
5. Quand les MP3 sont là :
   - lance `tts/split.py` pour chaque personnage, puis `tts/check.py`, puis `npm run voix` ;
   - signale les répliques sous 0.7, et ajuste les `t` si des voix se chevauchent.
   - Rappelle-lui que tu ne peux pas écouter : c'est à lui de juger le jeu d'acteur au casque.

## 4. La scène

- Réécris le décor, la distribution, `CAM`, `CARDS`, `renderAt` et les sons de `sound.js`, en gardant le moteur (voir `CLAUDE.md`).
- Avance par blocs de 10 à 15 s. Pour chaque bloc :
  1. fais une planche avec `node sheet.js` sur les moments clés ;
  2. regarde-la de façon critique : téléportation, objet qui traverse, action illisible, temps mort ;
  3. corrige, puis passe au bloc suivant.
- Montre-lui les planches au fur et à mesure.

## 5. Le rendu

- Lance `npm run rendu` en arrière-plan. Ça prend 5 à 10 minutes : préviens-le.
- Envoie-lui `out/video-720p.mp4` et dis-lui que `out/video-1080p.mp4` est la version à publier, avec le texte `post` et 4 ou 5 hashtags.
- Demande ce qu'il veut changer. Quand c'est bon, propose la Partie 2, qui reprend sur la dernière image.
