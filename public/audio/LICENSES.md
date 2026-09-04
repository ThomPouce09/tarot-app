# Sons audio — Sources et licences

Tous les fichiers audio de `public/audio/` sont **libres de droits**.

## Sons en production (ajoutés le 1er août 2026)

### Kenney Casino Audio Pack — CC0 (domaine public)
Source : https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips
Licence : Creative Commons Zero 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
Auteur : Kenney Vleugels (https://kenney.nl)
Attribution : non obligatoire mais appréciée ("Kenney.nl")

| Fichier | Usage prévu |
|---|---|
| `dice-shake-1.mp3` → `dice-shake-3.mp3` | Secouer le gobelet de dés |
| `dice-throw-1.mp3` → `dice-throw-3.mp3` | Jeté de dés |
| `runes-handle-1.mp3`, `runes-handle-2.mp3` | Manipulation des runes |

### rubberduck Breaking/Falling/Hit SFX — CC0 (domaine public)
Source : https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx
Licence : Creative Commons Zero 1.0

| Fichier | Usage prévu |
|---|---|
| `rune-hit-1.mp3` | Impact sec de rune (0.13s) |
| `rune-falling-1.mp3`, `rune-falling-2.mp3` | Runes qui tombent (0.3-0.5s) |

## Sons préexistants (déjà dans l'app)

| Fichier | Usage |
|---|---|
| `card-flipped.mp3`, `card-flipped2.mp3` | Retournement de carte Tarot |
| `creatures1.mp3` → `creatures5.mp3` | Tap sur la luciole |
| `scroll1.mp3` | Ouverture du menu parchemin |
| `spell.mp3` | Effet magique (Yi Jing) |
| `stick-draw.mp3` | Tirage des bâtons Yi Jing |

## Sons générés maison (ajoutés le 3 septembre 2026)

| Fichier | Usage prévu |
|---|---|
| `cadeau.mp3` | Carillon « cadeau des créatures » (tirage offert) — synthèse CC0 inédite (cloches C6-E6-G6-C7 + scintillements), générée par script Python/ffmpeg |

## Sons magiques « révélation » (proposés le 4 septembre 2026, page /son-a-supprimer)

| Fichier | Description |
|---|---|
| `magic-1.mp3` | Carillon ascendant (do-mi-sol-do + écho + shimmer) |
| `magic-2.mp3` | Pentatonique rapide (8 notes) |
| `magic-3.mp3` | Cloches lointaines (longue traîne) |
| `magic-4.mp3` | Scintillement féerique (glissando aigu + clochettes) |
| `magic-5.mp3` | Gong profond + shimmer |
| `magic-6.mp3` | Glissando de harpe (cordes pincées) |
| `magic-7.mp3` | Boîte à musique (timbre sec, motif G-B-D-G) |
| `magic-8.mp3` | Brume éthérée (nappe désaccordée + cloche) |
| `magic-9.mp3` | Retour de vague (swell inversé + cloche) |
| `magic-10.mp3` | Triple étincelle (3 clochettes aiguës + traîne) |

Tous : synthèse maison CC0 inédite (script `scripts/gen-magic-sfx.py`, Python stdlib + ffmpeg), pics à −1,4 dB.

## Notes

- Tous les fichiers sont en **MP3** (compatibilité Safari/iOS + Android)
- Les fichiers OGG sources ont été convertis en MP3 (ffmpeg, libmp3lame q5)
- Aucun son n'exige d'attribution, mais créditer "Kenney.nl" pour le pack casino est une bonne pratique
