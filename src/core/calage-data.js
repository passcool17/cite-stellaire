// GÉNÉRÉ par scripts/calage.mjs depuis assets/calage/ — ne pas éditer à la main.
// Recaler : modifier assets/calage/ajustements.json puis `node scripts/calage.mjs --write`.
export const CALAGE = {
 "quais": {
  "map": [
   "#####..E",
   "####....",
   "####....",
   "#......#",
   "#....###",
   "......##",
   "........",
   "........",
   "#......#",
   "#####.##"
  ],
  "origin": {
   "x": 1060,
   "y": 340
  },
  "tile": {
   "w": 160,
   "h": 80
  },
  "spawn": {
   "x": 3,
   "y": 6
  },
  "exit": {
   "x": 7,
   "y": 0
  },
  "objects": {
   "quais1": {
    "x": 3,
    "y": 4
   },
   "quais2": {
    "x": 5,
    "y": 1
   }
  },
  "corridor": [],
  "painted": []
 },
 "marche": {
  "map": [
   "#####.E#",
   "#####.##",
   "####..##",
   "##....##",
   "#......#",
   ".......#",
   ".......#",
   "#.......",
   "##.....#",
   "#####.##"
  ],
  "origin": {
   "x": 1110,
   "y": 200
  },
  "tile": {
   "w": 160,
   "h": 80
  },
  "spawn": {
   "x": 4,
   "y": 6
  },
  "exit": {
   "x": 6,
   "y": 0
  },
  "objects": {
   "dumuzi": {
    "x": 2,
    "y": 4
   },
   "tuto": {
    "x": 5,
    "y": 5
   }
  },
  "corridor": [
   {
    "x": 5,
    "y": 2
   },
   {
    "x": 5,
    "y": 1
   },
   {
    "x": 5,
    "y": 0
   }
  ],
  "painted": []
 },
 "cour": {
  "map": [
   "E#########",
   "..########",
   "#..#######",
   "##..#..#..",
   "##.......#",
   "#.........",
   "#........#",
   "##......##",
   "###....###",
   "####..####"
  ],
  "origin": {
   "x": 900,
   "y": 350
  },
  "tile": {
   "w": 160,
   "h": 80
  },
  "spawn": {
   "x": 5,
   "y": 5
  },
  "exit": {
   "x": 0,
   "y": 0
  },
  "objects": {
   "pierre-eau": {
    "x": 5,
    "y": 6
   },
   "pierre-etoile": {
    "x": 6,
    "y": 6
   },
   "pierre-roseau": {
    "x": 8,
    "y": 6
   },
   "inscription": {
    "x": 5,
    "y": 3
   },
   "cour1": {
    "x": 3,
    "y": 4
   }
  },
  "corridor": [
   {
    "x": 1,
    "y": 1
   },
   {
    "x": 0,
    "y": 1
   }
  ],
  "painted": [
   "pierre-eau",
   "pierre-etoile",
   "pierre-roseau",
   "inscription"
  ]
 },
 "sanctuaire": {
  "map": [
   "####.######",
   "###....####",
   "##......###",
   "#........##",
   "..........#",
   ".......#...",
   "#.....###.#",
   "##....#####",
   "###....####",
   "####...####",
   "#####.#####"
  ],
  "origin": {
   "x": 960,
   "y": 220
  },
  "tile": {
   "w": 160,
   "h": 80
  },
  "spawn": {
   "x": 5,
   "y": 5
  },
  "exit": null,
  "objects": {
   "lahama": {
    "x": 3,
    "y": 3
   }
  },
  "corridor": [],
  "painted": []
 }
};
