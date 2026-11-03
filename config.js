/* ============================================================
   config.js — Configuración general, grafos, Roger y John
   ============================================================ */
const CONFIG = {
  title: "Unas Cuantas Noches con Roger",

  resolution: { w: 1280, h: 720 },

  night: {
    realSeconds: 360,
    startHour: 12,
    hoursTotal: 6,
  },

  office: {
    worldWidth: 1760,
    panSmoothing: 0.12,
    image: "assets/rooms/office.jpg",
  },

  cameras: [
    { id: "CAM 01", name: "Patio",              image: "assets/rooms/cam01_patio.jpg",              w: 2576, h: 1450, hue: 215 },
    { id: "CAM 02", name: "Escaleras",          image: "assets/rooms/cam02_escaleras.jpg",          w: 2576, h: 1404, hue: 30  },
    { id: "CAM 03", name: "Pasillo",            image: "assets/rooms/cam03_pasillo.jpg",            w: 2576, h: 1270, hue: 40  },
    { id: "CAM 04", name: "Segundo pasillo",    image: "assets/rooms/cam04_pasillo_secundario.jpg", w: 2576, h: 1086, hue: 40  },
    { id: "CAM 05", name: "Templo",             image: "assets/rooms/cam05_templo.jpeg",            w: 2576, h: 1449, hue: 340, hasGuitar: true },
  ],

  monitor: { imageBrightness: 1.3 },
  cameraSwitchFlickerMs: 220,

  electricity: {
    defaultOn: true
  },

  characters: {
    roger: { name: "Roger", image: "assets/characters/roger.png" },
    john:  { name: "John",  image: "assets/characters/john.png"  },
    meaty: { name: "Meaty", image: "assets/characters/meaty.png" },
  },

  // Grafo de conexiones entre habitaciones
  mapGraph: {
    "CAM 01": ["CAM 02", "CAM 04"],
    "CAM 02": ["CAM 01", "CAM 03", "CAM 05"],
    "CAM 03": ["CAM 02", "CAM 04", "office"],
    "CAM 04": ["CAM 01", "CAM 03", "CAM 05", "office"],
    "CAM 05": ["CAM 02", "CAM 04"],
    "office": ["CAM 03", "CAM 04"]
  },

  blockedRooms: [],

  // Configuración de Roger
  roger: {
    enabled: true,
    startLocation: "CAM 01",
    moveInterval: 5.0,
    baseProbability: 0.15,
    watchedProbability: 0.05,
    unwatchedProbability: 0.25,
    guitarCooldownDuration: 15.0,
  },

  // Configuración de John
  john: {
    enabled: true,
    startLocation: "CAM 02",
    moveInterval: 4.0,           // Intervalo de decisión de movimiento
    baseProbability: 0.20,       // Probabilidad base
    watchedProbability: 0.08,    // Menor probabilidad si la cámara actual lo observa
    unwatchedProbability: 0.35,  // Mayor probabilidad cuando no es vigilado
    searchDuration: 8.0,         // Tiempo que busca en la ventana con luz apagada
    detectionGraceTime: 1.5,     // Tiempo antes de atacar si la luz se mantiene encendida
    retreatTime: 5.0,            // Tiempo que tarda en completar su retirada peligrosa
  },

  // Coordenadas de apariciones (% X, % Y, escala, visibilidad)
  characterPositions: {
    office: {
      roger: { x: 50, y: 50, scale: 1.0, visible: false },
      john:  { x: 18, y: 35, scale: 0.9, visible: false }, // Posición en la ventana
      meaty: { x: 75, y: 60, scale: 1.0, visible: false },
    },
    "CAM 01": {
      roger: { x: 45, y: 55, scale: 0.75, visible: false },
      john:  { x: 65, y: 50, scale: 0.75, visible: false },
      meaty: { x: 25, y: 60, scale: 0.70, visible: false },
    },
    "CAM 02": {
      roger: { x: 50, y: 48, scale: 0.80, visible: false },
      john:  { x: 30, y: 52, scale: 0.80, visible: false },
      meaty: { x: 70, y: 55, scale: 0.75, visible: false },
    },
    "CAM 03": {
      roger: { x: 48, y: 50, scale: 0.85, visible: false },
      john:  { x: 55, y: 45, scale: 0.85, visible: false },
      meaty: { x: 35, y: 58, scale: 0.80, visible: false },
    },
    "CAM 04": {
      roger: { x: 52, y: 52, scale: 0.80, visible: false },
      john:  { x: 40, y: 48, scale: 0.80, visible: false },
      meaty: { x: 65, y: 55, scale: 0.75, visible: false },
    },
    "CAM 05": {
      roger: { x: 50, y: 50, scale: 0.85, visible: false },
      john:  { x: 20, y: 55, scale: 0.85, visible: false },
      meaty: { x: 80, y: 60, scale: 0.80, visible: false },
    }
  },

  tools: [
    { id: "guitar", label: "Guitarra",        owner: "roger", enabled: true,  active: false },
    { id: "power",  label: "Electricidad",    owner: "john",  enabled: true,  active: true  },
    { id: "meaty",  label: "Reparar a Meaty", owner: "meaty", enabled: false, active: false },
  ],

  debug: { enabled: true, timeScale: 1 },
};