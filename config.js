/* ============================================================
   config.js — Configuración general del proyecto y coordenadas
   ============================================================ */
const CONFIG = {
  title: "Unas Cuantas Noches con Roger",

  // Resolución de referencia
  resolution: { w: 1280, h: 720 },

  // Noche única: 6 minutos reales = 12 AM → 6 AM
  night: {
    realSeconds: 360,
    startHour: 12,   // 12 AM
    hoursTotal: 6,   // 12,1,2,3,4,5 -> 6 AM = victoria
  },

  // Oficina
  office: {
    worldWidth: 1760,   // Ancho del fondo de la oficina
    panSmoothing: 0.12,
    image: "assets/rooms/office.jpg",
  },

  // Cámaras de vigilancia
  cameras: [
    { id: "CAM 01", name: "Patio",              image: "assets/rooms/cam01_patio.jpg",              w: 2576, h: 1450, hue: 215 },
    { id: "CAM 02", name: "Escaleras",          image: "assets/rooms/cam02_escaleras.jpg",          w: 2576, h: 1404, hue: 30  },
    { id: "CAM 03", name: "Pasillo",            image: "assets/rooms/cam03_pasillo.jpg",            w: 2576, h: 1270, hue: 40  },
    { id: "CAM 04", name: "Segundo pasillo",    image: "assets/rooms/cam04_pasillo_secundario.jpg", w: 2576, h: 1086, hue: 40  },
    { id: "CAM 05", name: "Templo",             image: "assets/rooms/cam05_templo.jpeg",            w: 2576, h: 1449, hue: 340, hasGuitar: true },
  ],

  monitor: { imageBrightness: 1.3 },
  cameraSwitchFlickerMs: 220,

  // Sistema de electricidad (ON/OFF sin batería ni consumo)
  electricity: {
    defaultOn: true
  },

  // Rutas de imágenes de personajes
  characters: {
    roger: { name: "Roger", image: "assets/characters/roger.png" },
    john:  { name: "John",  image: "assets/characters/john.png"  },
    meaty: { name: "Meaty", image: "assets/characters/meaty.png" },
  },

  // Coordenadas configurables de aparición (en % de ancho y alto de cada escenario)
  // Permite ajustar posición (x, y) en % y escala (scale: 1.0 = 100%)
  characterPositions: {
    office: {
      roger: { x: 50, y: 50, scale: 1.0, visible: false },
      john:  { x: 18, y: 35, scale: 0.9, visible: false }, // Ventana izquierda
      meaty: { x: 75, y: 60, scale: 1.0, visible: false }, // Esquina derecha
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

  // Herramientas de la interfaz
  tools: [
    { id: "guitar", label: "Guitarra",        owner: "roger", enabled: false, active: false },
    { id: "power",  label: "Electricidad",    owner: "john",  enabled: true,  active: true  },
    { id: "meaty",  label: "Reparar a Meaty", owner: "meaty", enabled: false, active: false },
  ],

  // Depuración
  debug: { enabled: true, timeScale: 1 },
};