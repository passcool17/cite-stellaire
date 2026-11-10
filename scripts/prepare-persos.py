#!/usr/bin/env python3
"""Prépare les personnages peints et l'interface Créa (à relancer à chaque livraison).

Sprites : versions nettes sprites/x2/ réduites à leur taille d'affichage à l'écran 1280×720, en WebP q85 avec alpha.
  taille de frame écran = frame_size(96/192) × display_scale × 1280/1920 → héros/ennemis/PNJ 128 px, boss 224 px.
  Le jeu les affiche donc à l'échelle 1 en exploration (pas de rééchantillonnage), ancrés par les pieds.
UI : portraits 128 (WebP) ; cadre de mini-carte recadré sur l'or (intérieur transparent mesuré) ;
  bandeau d'objectif = vrai 9-slice Créa (image entière + marges du JSON), affiché à 0,5.
Écrit assets/media-persos/*.webp et assets/media-persos/persos.json (géométrie lue par le jeu et par les tests).
"""
import json, shutil, sys
from pathlib import Path
from PIL import Image

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/crea/rpg-cite-stellaire/pack-ch1-peint')
OUT = Path(__file__).resolve().parent.parent / 'assets/media-persos'
SCREEN_K = 1280 / 1920

if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir(parents=True)
manifest = json.loads((SRC / 'manifest.json').read_text())
shutil.copyfile(SRC / 'manifest.json', OUT / 'manifest-crea-persos.json')
geo = {}
for key, s in manifest['sprites'].items():
    fw, fh = s['frame_size_x2']
    frame = round(s['frame_size'][0] * s['display_scale'] * SCREEN_K)  # 128 ou 224
    f = frame / fw
    im = Image.open(SRC / s['path_x2']).convert('RGBA')
    cols, rows = im.width // fw, im.height // fh
    im = im.resize((cols * frame, rows * frame), Image.LANCZOS)
    im.save(OUT / f'{key}.webp', quality=85, alpha_quality=85, method=6)
    ax, ay = s['anchor_feet_x2']
    anims = {}
    for name, a in s['animations'].items():
        cs = a.get('cols', list(range(a['frames'])))
        anims[name] = [a['row'] * cols + c for c in cs]
    # Frames suspectes (découpe Créa) : silhouette qui touche un bord latéral (deux personnages ou figure coupée).
    alpha = im.split()[3].point(lambda v: 255 if v > 128 else 0)
    suspects = []
    if s['role'] != 'boss':
        for fr in sorted({f for fs in anims.values() for f in fs}):
            r, c = divmod(fr, cols)
            box = alpha.crop((c * frame, r * frame, (c + 1) * frame, (r + 1) * frame)).getbbox()
            if box and (box[0] <= 2 or box[2] >= frame - 2): suspects.append(fr)
    geo[key] = {'frame': frame, 'cols': cols, 'rows': rows, 'origin': [ax / fw, ay / fh], 'role': s['role'], 'anims': anims, 'suspects': suspects}

for k in ('portrait-tishra', 'portrait-neru', 'portrait-balum'):
    Image.open(SRC / f'ui/{k}.png').convert('RGBA').save(OUT / f'{k}.webp', quality=90, alpha_quality=90, method=6)
# Cadres dorés (corrigés par Créa) : gardés avec leur alpha.
#  mini-carte : or opaque, intérieur transparent → recadrée sur l'or ; on mesure le rectangle intérieur transparent.
mm_src = Image.open(SRC / 'ui/cadre-minimap.png').convert('RGBA')
gold = Image.new('L', mm_src.size)
raw = mm_src.tobytes()
gold.putdata([255 if raw[i + 3] > 200 and raw[i] > 120 and raw[i] - raw[i + 2] > 50 else 0 for i in range(0, len(raw), 4)])  # or : rouge vif, peu de bleu
gb = gold.getbbox()
mm = mm_src.crop(gb)
inner = mm.split()[3].point(lambda v: 255 if v < 20 else 0).getbbox()
mm.save(OUT / 'cadre-minimap.webp', quality=90, alpha_quality=90, method=6)
#  bandeau d'objectif : vrai 9-slice (marges du JSON Créa), affiché à l'échelle 0,5 (bandeau de ~100 px de haut).
ns = json.loads((SRC / 'ui/cadre-objectif-9slice.json').read_text())
obj = Image.open(SRC / ns['image']).convert('RGBA')
obj.save(OUT / 'cadre-objectif.webp', quality=90, alpha_quality=90, method=6)
shutil.copyfile(SRC / 'ui/cadre-objectif-9slice.json', OUT / 'cadre-objectif-9slice.json')
geo['_ui'] = {
    'cadre-minimap': {'size': list(mm.size), 'interior': [inner[0], inner[1], inner[2] - inner[0], inner[3] - inner[1]]},
    'cadre-objectif': {'size': list(obj.size), 'margins': ns['margins'], 'scale': 0.5},
}
(OUT / 'persos.json').write_text(json.dumps(geo, indent=1, sort_keys=True) + '\n')
print('\n'.join(f'{p.name} {p.stat().st_size}' for p in sorted(OUT.iterdir())))
