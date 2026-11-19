# Guide du format

Ce sont les règles qui font qu'on regarde jusqu'au bout. Elles viennent de l'analyse de séries POV qui marchent et des retours sur l'exemple « Moi ».

## L'ADN en une phrase

**POV total, une source qui sait à l'avance, une escalade physique toutes les 5 à 10 s, deux retournements, et une coupure sèche sur une question.**

## La structure d'une partie

| Moment | Ce qui se passe | Dans « Moi », Partie 1 |
|---|---|---|
| **0 à 1 s, l'accroche** | Un ordre court, puis un choc physique immédiat. Jamais d'introduction. | SMS « Accroche-toi. », puis le bus pile et tout le monde tombe en avant. |
| **2 à 10 s, la règle** | Le spectateur comprend la règle du jeu : la source annonce, puis ça arrive. | « Baisse la tête. » Une branche explose la vitre à l'endroit où était sa tête. |
| **10 à 25 s, l'escalade** | Chaque message pousse plus loin. Une nouvelle question à chaque fois. | Le siège du chauffeur est vide. Puis il y a un deuxième bus, et c'est Sam qui est dedans. |
| **Vers 15 à 20 s, retournement 1** | La source elle-même change de sens. | C'est Sam qui s'envoie les SMS depuis le bus de derrière. |
| **25 à 32 s, le climax** | Compte à rebours, action physique, choc. | « La fenêtre. 3… 2… 1. » Le choc, puis l'éjection. |
| **35 à 48 s, retournement 2** | Le compagnon de confiance devient suspect. | « Celle qui te tient la main, c'est pas elle. » La vraie Inès est dans le bus. |
| **Dernières secondes, la fin sèche** | Une question au spectateur, puis noir **avant** la réponse. | « Je fais quoi ? », puis « Moi est en train d'écrire… », puis le noir. |

- **Durée :** 55 à 67 s par partie, en 9:16 (1080×1920), à 30 images par seconde.
- **Texte de publication :** `Partie N | question de choix ?` et 4 ou 5 hashtags. La question pousse les gens à répondre en commentaire.
- **Suite :** chaque partie reprend exactement sur la dernière image de la précédente.

## Les règles apprises à la dure

Ces règles viennent de retours réels sur l'exemple. Chacune a coûté une version.

1. **Pas de téléportation.** La caméra ne saute jamais d'un endroit à un autre. Si le perso va voir le chauffeur, on marche dans l'allée. Une coupe sèche n'est permise que sur un choc (flash blanc, éjection).
2. **Pas de temps mort.** Il se passe quelque chose de physique au moins toutes les 5 à 10 s. Un dialogue seul, sans action, ne dépasse pas 4 s.
3. **Rien ne traverse rien.** Un personnage qui pousse une porte s'arrête devant la porte. On vérifie sur des images fixes (`node sheet.js`).
4. **L'action doit se lire.** Un objet important, comme la branche, reste au moins 1 s à l'écran, bien cadré, avant et après l'impact. Si on ne comprend pas ce qui a cassé, c'est raté.
5. **Le monde continue de bouger.** Un véhicule qui doit partir accélère vraiment. Rien ne reste figé pendant qu'on parle.
6. **Les retournements doivent changer le sens de ce qu'on a vu,** pas seulement ajouter un danger. « Le bus freine » est un événement. « C'est moi qui envoie les SMS » est un retournement.
7. **Chaque SMS ouvre une question.** Un message qui n'intrigue pas est à couper. Moins de texte, c'est mieux : « Ne lui montre pas. » plutôt que « Ne lui montre pas, elle n'est pas qui tu crois. »
8. **Des voix qui jouent.** Les voix de synthèse gratuites (Edge, Chatterbox…) ont été refusées : trop plates, ça ne donne pas envie de regarder. Il faut **ElevenLabs Eleven v4** avec des indications d'émotion. Voir [FABRIQUER.md](FABRIQUER.md).

## Les répliques et les sous-titres

- **Répliques :** 1 à 6 mots. On parle comme dans la vraie vie, dans l'urgence.
- **Sous-titres :** blocs de 1 à 3 mots (15 caractères au plus), en gros, contour noir épais, police Montserrat Black. Ils sont générés tout seuls depuis `dialogue.json`.
- **Une couleur par personnage :**
  - le héros (POV) : blanc `#FFFFFF`
  - le compagnon : jaune `#F2C230`
  - les inconnus et le danger : rouge `#E5664F`
- **Placement :** sous-titres au milieu de l'écran, cartes SMS en haut. Les deux ne se cachent jamais.

## Les cartes SMS (notifications)

- **Carte blanche en haut :** icône Messages, `MESSAGES`, le nom de l'expéditeur en gras et le texte.
- **L'heure :** « maintenant » ou « envoyé dans 3 min ». Cette petite incohérence fait tout le mystère.
- **Animation :** elle arrive avec un petit rebond et repart en fondu, accompagnée d'un « ding ».
- **Variantes déjà codées :**
  - `big` : texte rouge géant, pour un ordre crié (« LÂCHE. »).
  - `out` : bulle bleue à droite, le héros répond.
  - `typing` : les trois points, « … est en train d'écrire ».
  - `hard` : apparition sans animation.
  - `text` peut aussi être une fonction du temps, pour un compte à rebours.

## Le visuel

- **Rendu BD :**
  - aplats de couleur, 3 niveaux d'ombre (toon) et contour noir sur chaque objet ;
  - couleurs franches, ciel bleu, décor clair.
- **Personnages :**
  - faits de formes simples, avec une tête un peu grosse ;
  - grands yeux blancs ronds à pupille noire, sourcils expressifs ;
  - vêtements unis, larmes bleues pour l'émotion.
- **Un détail pour reconnaître le héros :** dans l'exemple, c'est le bracelet rouge au poignet. Il sert à le reconnaître dans l'autre bus.
- **POV :** on voit les mains et le téléphone pendant au moins 80 % de la vidéo.
- **Caméra :**
  - fisheye léger (fov 98) et mouvements de quelqu'un qui marche ;
  - demi-tour brusque vers ce qui fait peur, puis zoom très serré (fov 13 à 20) pour une révélation au loin ;
  - flou de mouvement pendant les gestes rapides, secousses sur les chocs.
- **Post-traitement :** vignette, grain léger, flash blanc sur les impacts, noir final sec.

## Le son

Tout est synthétisé dans `sound.js` : moteur, crissements, verre, klaxons, bips, choc, sifflement d'oreille, ambiance de rue, nappe grave et battements de cœur qui accélèrent vers la fin. Il y a un « ding » sur chaque SMS. Les voix passent par-dessus, avec un léger écho quand on est dans un lieu fermé.

## Contrôle qualité avant de publier

- [ ] Un ordre ou un choc dans la première seconde
- [ ] Les mains ou le téléphone visibles pendant au moins 80 % de la vidéo
- [ ] Chaque message confirmé en moins de 3 s
- [ ] Une action physique au moins toutes les 10 s, aucune téléportation
- [ ] Rien ne traverse les murs, les portes ou les sièges (vérifié sur une planche)
- [ ] 2 retournements, dont un sur la source
- [ ] Coupure au noir sur une question, avant la réponse
- [ ] Sous-titres de 1 à 3 mots, jamais cachés par une carte
- [ ] Voix écoutées au casque : elles jouent, elles ne lisent pas
- [ ] 9:16, de 55 à 67 s
