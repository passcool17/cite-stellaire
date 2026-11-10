#!/usr/bin/env python3
"""Prépare les scènes peintes Créa pour le jeu (à relancer à chaque nouvelle livraison).

- Fonds   : zoneN-<nom>.png 1920×1080 → assets/media-peint/zoneN-<nom>.jpg, 1280×720 (taille d'affichage du jeu), JPEG q85.
- Avant   : zoneN-avant.png RGBA → assets/media-peint/zoneN-avant.webp, 1280×720, WebP q85 avec alpha.
- Masques : alpha des calques avant (originaux 1920×1080) réduit au 1/10 → assets/calage/zoneN-avant-masque.json
            (192×108 cases, '1' = opaque) pour les tests « le calque ne cache pas les héros ».
- Zones   : *-zones.json copiés dans assets/calage/.
Les sprites de sprites/ ne sont PAS repris (découpe à refaire côté Créa).
"""
import json, shutil, sys
from pathlib import Path
from PIL import Image

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/crea/rpg-cite-stellaire/pack-ch1-peint')
ROOT = Path(__file__).resolve().parent.parent
MEDIA, CAL = ROOT / 'assets/media-peint', ROOT / 'assets/calage'
SCENES = {1: 'zone1-quais', 2: 'zone2-marche', 3: 'zone3-cour', 4: 'zone4-sanctuaire'}
ZONES_JSON = {1: 'zone1-zones.json', 2: 'zone2-marche-zones.json', 3: 'zone3-cour-zones.json', 4: 'zone4-sanctuaire-zones.json'}
OUT_SIZE, MASK_STEP = (1280, 720), 10

MEDIA.mkdir(parents=True, exist_ok=True); CAL.mkdir(parents=True, exist_ok=True)
for n, name in SCENES.items():
    bg = Image.open(SRC / f'{name}.png').convert('RGB')
    assert bg.size == (1920, 1080), (name, bg.size)
    bg.resize(OUT_SIZE, Image.LANCZOS).save(MEDIA / f'{name}.jpg', quality=85, optimize=True, progressive=True)
    av = SRC / f'zone{n}-avant.png'
    if av.exists():
        a = Image.open(av).convert('RGBA')
        a.resize(OUT_SIZE, Image.LANCZOS).save(MEDIA / f'zone{n}-avant.webp', quality=85, method=6)
        alpha = a.split()[3]
        opaque = alpha.point(lambda v: 1 if v >= 128 else 0)
        cell = lambda x, y: opaque.crop((x, y, x + MASK_STEP, y + MASK_STEP)).histogram()[1]
        # Case du masque opaque si au moins la moitié de ses pixels le sont.
        rows = [''.join('1' if cell(x, y) * 2 >= MASK_STEP ** 2 else '0' for x in range(0, 1920, MASK_STEP))
                for y in range(0, 1080, MASK_STEP)]
        (CAL / f'zone{n}-avant-masque.json').write_text(json.dumps({'source': av.name, 'step': MASK_STEP, 'rows': rows}) + '\n')
    shutil.copyfile(SRC / ZONES_JSON[n], CAL / ZONES_JSON[n])
    print(name, 'ok')
