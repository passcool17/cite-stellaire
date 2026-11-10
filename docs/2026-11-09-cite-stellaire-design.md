# Cité Stellaire — Devis de conception (2026-11-09)

**Titre provisoire :** *Cité Stellaire*  
**Plateforme :** RPG navigateur HTML autonome (Phaser 3), jouable par lien local/file.  
**Concept validé :** vue 2D isométrique, 3 héros fictifs, cité de briques / canaux turquoise, ziggourat lapis-or avec techno stellaire discrète (`/workspace/crea/rpg-cite-stellaire/concept-ecran-rpg.png`).  
**Portée immédiate :** un seul **Chapitre 1 jouable** (~20–30 min). Pas de code dans ce devis ; pas de dépôt/commit/push/publication.

---

## Pitch

Trois héros inventés explorent Eridu, première cité des listes royales sumériennes. Les mythes des Anunna (dieux qui décrètent les destins, détenteurs des *me*) structurent les quêtes ; une lecture extraterrestre — **fiction assumée**, non historique — apparaît seulement là où le récit mythique « ressemble » à une visite céleste. Le joueur découvre le mystère progressivement ; le jeu ne présente jamais la thèse des anciens astronautes comme un fait.

## Cadre : historique / mythe / fiction (séparés)

| Couche | Contenu | Usage dans le jeu |
|--------|---------|-------------------|
| **Historique / archéo** | Cités (Eridu, Uruk/Unug, Nippur/Nibru), temples, canaux, briques, écriture cunéiforme | Décors, toponymes, ambiance |
| **Mythe documenté** | Anunna = groupe de dieux (pas d’aliens) ; An, Enlil, Enki, Inana ; *me* = pouvoirs/décrets de civilisation ; création de l’humain pour le travail des dieux ; déluge | Quêtes, PNJ, lore affiché comme « tablettes / récits » |
| **Fiction SF** | Interprétation stellaire discrète (artefacts, « lumière sans soleil », motifs non rituels) | Indices progressifs ; jamais labellisés « Anunnaki aliens » dans l’UI |

**Ponts mythe ↔ SF (ressemblances narratives, pas preuves) :** « descendus / liés au ciel » ; *me* ≈ « boîte à outils » de civilisation (métiers, royauté, écriture) ; humains créés pour travailler ; déluge comme reset divin.  
**Origine de la thèse ET :** Zecharia Sitchin (XXe s.) ; rejetée par les assyriologues (traductions et Nibiru non supportés par les lexiques cunéiformes). Le jeu s’en inspire comme *fiction*, en le disant.

## Héros (fictifs — aucune personne réelle)

| Nom | Rôle combat | Fantaisie courte |
|-----|-------------|------------------|
| **Tishra** | Tank — attaque solide, **Défense** (réduit dégâts), taunt léger | Gardienne des digues d’Eridu |
| **Nerû** | Mage / soutien — compétences *me* (soin léger, analyse d’artefact) | Apprenti scribe du temple d’Enki |
| **Balum** | DPS — attaque forte, esquive / ciblage | Chasseur des marais au sud de la cité |

HUD : quête + mini-carte + panneau d’équipe (comme le concept).

## Arc des 6 chapitres (une ligne chacun)

1. **Eridu** — Canaux et temple : premier *me* anomal, boss gardien du seuil.  
2. **Uruk** — Course aux *me* (écho d’Inana & Enki) : rivalité de cités, techno discrète.  
3. **Nippur** — Décrets d’Enlil : tablette des destins, choix moral politique.  
4. **Abzu / profondeurs** — Origine de l’humain (travail des dieux) : révélation partielle SF.  
5. **Déluge** — Course contre la montée des eaux : survie, sacrifice, vérité fragmentaire.  
6. **Ciel lié** — Confrontation finale : mythe vs visiteurs ; épilogue qui distingue histoire et fiction.

## Chapitre 1 — Périmètre jouable (~20–30 min)

### Zones
1. **Quais & canaux d’Eridu** — exploration isométrique, 1–2 rencontres.  
2. **Marché / quartier des scribes** — PNJ, tutoriel combat optionnel.  
3. **Cour du temple (E-abzu)** — énigme simple (3 symboles / portes).  
4. **Sanctuaire intérieur** — boss + cinématique courte (texte + art).

### Quête principale
« **Rapporter la tablette du destin fendu** » — le grand prêtre **Dumuzi-abzu** (PNJ fictif) envoie l’équipe récupérer une tablette volée par des pillards / un gardien corrompu. Indices : motifs « d’en haut » illisibles aux scribes. Fin de chapitre : tablette récupérée + 1 artefact stellaire **non expliqué**.

### Combat (ATB — jauges de temps)
Actions : **Attaque / Compétence / Objet / Défense**.  
Chaque combattant (alliés **et** ennemis) a une **jauge** qui se remplit selon sa **vitesse** ; l’action est possible quand la jauge est pleine, puis elle se vide.  
**Mode Attente** (défaut) : le temps se **fige** pendant la sélection d’un menu (clavier/tactile confortables).  
**Mode Actif** : option dans les réglages — le temps continue pendant les menus.  
Ennemis (3–4) : Pillard des digues, Esprit des roseaux, Scorpion des briques, Gardien de seuil (élite).  
**Boss :** *Lahama faussé* (gardien des eaux, motif mythique détourné) — 2 phases : (1) armure ; (2) **rage** qui **accélère sa jauge**.  
Mort : reprise au dernier point de sauvegarde.

### Progression & systèmes
- XP léger → niveaux 1→3 max au ch.1 ; 1 compétence débloquée par héros.  
- Inventaire minimal (3 objets soignants + 1 clé de quête).  
- **Sauvegarde locale** (`localStorage`) : début de zone + avant boss.  
- Contrôles : **clavier** (flèches/ZQSD, Entrée/Espace, Esc) + **tactile** (pad virtuel / boutons).

### Tech (recommandée)
**Phaser 3**, un `index.html` + assets locaux, aucune dépendance serveur pour jouer. GitHub Pages plus tard **sur autorisation explicite** seulement.

### Approches
| | Description | Verdict |
|---|-------------|---------|
| A | Carte **isométrique** + combat **tour par tour pur** (menus) | Alternative — plus simple, moins dynamique |
| **B — choisie par Pascal** | Iso + **ATB** (jauges de temps) | **Recommandée / retenue** — mode Attente par défaut pour clavier/tactile |
| C | Vue **de dessus** + tour par tour | Alternative — plus rapide à prototyper, éloigné du concept validé |

### Médias (listés, **non demandés** ici)
- **Créa** : tileset iso Eridu, 3 sprites héros (idle/walk/combat), 4 ennemis + boss, portraits, UI.  
- **SUNO** : thème exploration (~2 min bouclable) + tension temple.  
- **Voix** : SFX pas, coup, sort, victoire, ouverture de porte.

### Critères de réussite (vérifiables)
- [ ] Partie complète ch.1 en ≤ 30 min sans tutoriel externe.  
- [ ] 3 héros utilisables en combat ; boss vaincu au moins une fois en test.  
- [ ] Jauges ATB visibles pour alliés et ennemis ; mode **Attente** vérifié (temps figé pendant les menus).  
- [ ] Sauvegarde / reprise fonctionne après rechargement navigateur.  
- [ ] Clavier + tactile OK (smoke test).  
- [ ] Aucun nom/musique/cristal/mascotte protégés type Final Fantasy.  
- [ ] Écran titre ou note : mythe mésopotamien + fiction SF distincts de l’histoire académique.

### Hors périmètre (ch.1)
Chapitres 2–6, craft, multi, compte cloud, boutique, publication web, voix off narrative longue, carte monde, jobs avancés.

---

## Sources (URLs vérifiées HTTP 200, 2026-11-09)

1. **ETCSL — Enki and the world order** (Anuna, Eridu, *me*, ordre du monde) — https://etcsl.orinst.ox.ac.uk/section1/tr113.htm  
2. **ETCSL — Inana and Enki** (*me* emportés vers Unug/Uruk) — https://etcsl.orinst.ox.ac.uk/section1/tr131.htm  
3. **ETCSL — Enki and Ninmah** (création des humains pour le travail) — https://etcsl.orinst.ox.ac.uk/section1/tr112.htm  
4. **ETCSL — The Flood story** + **Sumerian king list** (déluge ; Eridu antédiluvienne) — https://etcsl.orinst.ox.ac.uk/section1/tr174.htm · https://etcsl.orinst.ox.ac.uk/section2/tr211.htm  
5. **Michael S. Heiser — Open Letter to Zecharia Sitchin** (rejet philologique de la thèse ET) — https://www.sitchiniswrong.com/open_letter.htm  

*Note :* la fiche ORACC/AMGG « Anunna (Anunnaku, Anunnaki) » (Penn) est la synthèse académique de référence pour le terme, mais le serveur répondait **500** au moment de la vérif. ; à reconsulter : `https://oracc.museum.upenn.edu/amgg/listofdeities/anunna/`. British Museum / Met / World History Encyclopedia : bloqués ou 404 côté fetch — non retenus.

**Décisions restantes à faire approuver avant code :** (1) trio Tishra / Nerû / Balum et quête « tablette du destin fendu » ; (2) tech Phaser 3 HTML autonome, sans publication. *(Approche B ATB : déjà choisie par Pascal.)*
