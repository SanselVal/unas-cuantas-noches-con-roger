/* ============================================================
   config.js — TODO lo modificable vive aquí.
   ============================================================ */
const CONFIG = {
  title: "Unas Cuantas Noches con Roger",

  // Resolución de referencia (el escenario se escala a la ventana)
  resolution: { w: 1280, h: 720 },

  // Noche única: 6 minutos reales = 12 AM → 6 AM
  night: {
    realSeconds: 360,
    startHour: 12,   // 12 AM
    hoursTotal: 6,   // 12,1,2,3,4,5 -> 6 AM = victoria
  },

  // Oficina: el mundo es más ancho que la pantalla y se desplaza con el ratón
  office: {
    worldWidth: 1760,   // ancho del fondo de la oficina (px de referencia)
    panSmoothing: 0.12, // 0..1 (más alto = sigue más rápido al ratón)
    image: "assets/rooms/office.jpg", // si no existe, se usa un placeholder
  },

  // Cámaras. "image" es el fondo de vigilancia original (se conserva su composición completa).
  // "w" y "h" = tamaño real en píxeles: se usa para calcular la proporción del marco.
  // Los personajes se posicionarán en % de ESE marco (x e y de 0 a 100), no de la pantalla.
  cameras: [
    { id: "CAM 01", name: "Patio",              image: "assets/rooms/cam01_patio.jpg",                w: 2576, h: 1450, hue: 215 },
    { id: "CAM 02", name: "Escaleras",          image: "assets/rooms/cam02_escaleras.jpg",            w: 2576, h: 1404, hue: 30  },
    { id: "CAM 03", name: "Pasillo",            image: "assets/rooms/cam03_pasillo.jpg",              w: 2576, h: 1270, hue: 40  },
    { id: "CAM 04", name: "Segundo pasillo",    image: "assets/rooms/cam04_pasillo_secundario.jpg",   w: 2576, h: 1086, hue: 40  },
    { id: "CAM 05", name: "Templo",             image: "assets/rooms/cam05_templo.jpeg",              w: 2576, h: 1449, hue: 340, hasGuitar: true },
  ],
  // Las fotos son muy oscuras. 1 = original sin tocar; sube para ver más (afecta solo al monitor).
  monitor: { imageBrightness: 1.3 },
  cameraSwitchFlickerMs: 220,

  // Energía (la usará John en Etapa 3). En Etapa 1 solo se muestra, sin consumo.
  power: { enabled: false, max: 100, start: 100 },

  // Personajes (se activan en sus etapas). Imágenes proporcionadas por ti.
  characters: {
    roger: { enabled: false, name: "Roger", image: "assets/characters/roger.png" },
    john:  { enabled: false, name: "John",  image: "assets/characters/john.png"  },
    meaty: { enabled: false, name: "Meaty", image: "assets/characters/meaty.png" },
  },

  // Herramientas del jugador (se conectan en sus etapas)
  tools: [
    { id: "guitar", label: "Guitarra",         owner: "roger", stage: "Etapa 2" },
    { id: "power",  label: "Electricidad",     owner: "john",  stage: "Etapa 3" },
    { id: "meaty",  label: "Reparar a Meaty",  owner: "meaty", stage: "Etapa 4" },
  ],

  // Depuración
  debug: { enabled: true, timeScale: 1 }, // timeScale 10 = noche en 36 s
};
