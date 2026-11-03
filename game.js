/* ============================================================
   game.js — Etapa 1: estructura, reloj, oficina, cámaras, fin de partida.
   Arquitectura: un objeto Game con "módulos" registrables. Cada módulo
   puede tener init(), reset(), update(dt). Los animatrónicos de las
   próximas etapas se registran con Game.register({...}) sin tocar el núcleo.
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);

/* ---------- Utilidades ---------- */
// Carga una imagen opcional: si existe la muestra, si no deja el placeholder.
function loadOptionalImage(img, src, onOk) {
  img.onload = () => { img.style.display = "block"; if (onOk) onOk(); };
  img.onerror = () => { img.style.display = "none"; };
  img.src = src;
}
function hourLabel(h) { return (h === 0 ? 12 : h) + " AM"; }

/* ---------- Núcleo ---------- */
const Game = {
  modules: [],
  state: null,
  running: false,
  last: 0,

  register(mod) { this.modules.push(mod); if (this.ready && mod.init) mod.init(this); return mod; },

  freshState() {
    return {
      elapsed: 0,                 // segundos de juego transcurridos
      hourIndex: 0,               // 0..5
      power: CONFIG.power.start,
      monitorOpen: false,
      camera: 0,
      timeScale: CONFIG.debug.timeScale,
      over: false,
    };
  },

  init() {
    $("#menu-title").textContent = CONFIG.title;
    document.title = CONFIG.title;
    UI.build();
    this.modules.forEach(m => m.init && m.init(this));
    this.ready = true;
    UI.show("menu");
    UI.fit(); addEventListener("resize", UI.fit);
    requestAnimationFrame(t => { this.last = t; this.loop(t); });
  },

  start() {
    this.state = this.freshState();
    this.modules.forEach(m => m.reset && m.reset(this));
    UI.setMonitor(false);
    UI.setCamera(0, true);
    UI.refreshHud();
    UI.show("game");
    this.running = true;
  },

  loop(t) {
    // dt limitado: si la pestaña queda en segundo plano el navegador detiene rAF
    // y el reloj no salta de golpe (limitación documentada).
    const dt = Math.min((t - this.last) / 1000, 0.25);
    this.last = t;
    if (this.running && !this.state.over) this.update(dt * this.state.timeScale);
    requestAnimationFrame(tt => this.loop(tt));
  },

  update(dt) {
    const s = this.state;
    // El reloj NUNCA se detiene por interacciones del jugador.
    s.elapsed += dt;
    const hourLen = CONFIG.night.realSeconds / CONFIG.night.hoursTotal;
    s.hourIndex = Math.min(CONFIG.night.hoursTotal, Math.floor(s.elapsed / hourLen));
    this.modules.forEach(m => m.update && m.update(dt, this));
    UI.refreshHud();
    if (s.elapsed >= CONFIG.night.realSeconds) this.win();
  },

  win()  { this.end(true,  "Son las 6 AM", "Amanece. Sobreviviste a la noche."); },
  lose(reason = "No lo lograste.") { this.end(false, "Fin de la jornada", reason); },

  end(won, title, text) {
    if (this.state.over) return;
    this.state.over = true; this.running = false;
    UI.setMonitor(false);
    $("#end-title").textContent = title;
    $("#end-text").textContent = text;
    $("#screen-end").className = "screen active " + (won ? "win" : "lose");
    UI.show("end", won ? "win" : "lose");
  },
};

/* ---------- Interfaz ---------- */
const UI = {
  worldX: 0, targetX: 0,
  rooms: [],

  build() {
    // Oficina
    $("#office-world").style.width = CONFIG.office.worldWidth + "px";
    loadOptionalImage($("#office-img"), CONFIG.office.image);

    $("#cam-feed").style.setProperty("--cam-brightness", CONFIG.monitor.imageBrightness);
    // Cámaras: una "sala" por cámara con su capa de personajes
    const feed = $("#cam-rooms"), btns = $("#cam-buttons");
    CONFIG.cameras.forEach((c, i) => {
      const room = document.createElement("div");
      room.className = "cam-room"; room.dataset.id = c.id;
      room.innerHTML = `<div class="cam-frame" style="--ar:${(c.w / c.h).toFixed(4)}"><div class="bg-placeholder" style="background:linear-gradient(hsl(${c.hue} 25% 14%),hsl(${c.hue} 30% 6%))"><span class="ph-label">${c.id} — imagen pendiente</span></div><img alt="${c.name}"><div class="char-layer"></div></div>`;
      loadOptionalImage($("img", room), c.image);
      feed.appendChild(room); this.rooms.push(room);

      const b = document.createElement("button");
      b.className = "btn"; b.textContent = c.id; b.title = c.name;
      b.onclick = () => this.setCamera(i);
      btns.appendChild(b);
    });

    // Herramientas (placeholders hasta su etapa)
    const bar = $("#tools-bar");
    CONFIG.tools.forEach(t => {
      const b = document.createElement("button");
      b.className = "btn"; b.id = "tool-" + t.id; b.disabled = !CONFIG.characters[t.owner].enabled;
      b.innerHTML = `${t.label}<small>${b.disabled ? "Pendiente · " + t.stage : "Listo"}</small>`;
      bar.appendChild(b);
    });
    $("#power-box").classList.toggle("off", !CONFIG.power.enabled);

    // Entrada
    $("#btn-start").onclick = () => Game.start();
    $("#btn-retry").onclick = () => UI.show("menu");
    $("#monitor-toggle").onclick = () => this.setMonitor(!Game.state.monitorOpen);
    addEventListener("keydown", e => {
      if (!Game.running || Game.state.over) return;
      if (e.code === "Space") { e.preventDefault(); this.setMonitor(!Game.state.monitorOpen); }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= CONFIG.cameras.length) { this.setMonitor(true); this.setCamera(n - 1); }
    });
    $("#screen-game").addEventListener("mousemove", e => {
      const r = $("#stage").getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      this.targetX = -(CONFIG.office.worldWidth - CONFIG.resolution.w) * ratio;
    });

    // Depuración
    const dbg = $("#debug-panel");
    if (CONFIG.debug.enabled) {
      dbg.hidden = false;
      dbg.onclick = e => {
        const a = e.target.dataset.act; if (!a || !Game.state) return;
        if (a === "win") Game.state.elapsed = CONFIG.night.realSeconds - 0.1;
        if (a === "lose") Game.lose("Derrota forzada desde el panel de depuración.");
        if (a === "x10") { const s = Game.state; s.timeScale = s.timeScale === 10 ? 1 : 10; e.target.textContent = "Velocidad ×" + (s.timeScale === 10 ? "1" : "10"); }
      };
    }
    (function pan() {
      UI.worldX += (UI.targetX - UI.worldX) * CONFIG.office.panSmoothing;
      $("#office-world").style.transform = `translateX(${UI.worldX.toFixed(1)}px)`;
      requestAnimationFrame(pan);
    })();
  },

  show(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $("#screen-" + name).classList.add("active");
  },

  setMonitor(open) {
    Game.state.monitorOpen = open;
    $("#monitor").classList.toggle("open", open);
    $("#monitor-toggle").textContent = open ? "▼ Cerrar monitor" : "▲ Abrir monitor";
  },

  setCamera(i, silent) {
    Game.state.camera = i;
    this.rooms.forEach((r, k) => r.classList.toggle("active", k === i));
    document.querySelectorAll("#cam-buttons .btn").forEach((b, k) => b.classList.toggle("active", k === i));
    $("#cam-name").textContent = CONFIG.cameras[i].id + " · " + CONFIG.cameras[i].name;
    if (!silent) {
      const f = $("#cam-flicker"); f.classList.remove("on"); void f.offsetWidth; f.classList.add("on");
    }
  },

  refreshHud() {
    const s = Game.state;
    $("#clock").textContent = hourLabel((CONFIG.night.startHour + s.hourIndex) % 12);
    const pct = Math.round(s.power / CONFIG.power.max * 100);
    $("#power-fill").style.width = pct + "%";
    $("#power-txt").textContent = pct + "%";
  },

  // API para etapas futuras: dónde dibujar personajes
  roomLayer(camIndex) { return this.rooms[camIndex].querySelector(".char-layer"); },
  officeLayer() { return $("#layer-office"); },

  fit() {
    const s = Math.min(innerWidth / CONFIG.resolution.w, innerHeight / CONFIG.resolution.h);
    $("#stage").style.transform = `translate(-50%,-50%) scale(${s})`;
  },
};

/* ---------- Módulos de personajes (STUBS: se implementan en etapas 2-4) ---------- */
// Cada uno quedará con { init, reset, update(dt) }. Hoy solo reservan su lugar.
Game.register({ name: "roger" });  // Etapa 2: vigilancia + guitarra
Game.register({ name: "john"  });  // Etapa 3: electricidad + oscuridad
Game.register({ name: "meaty" });  // Etapa 4: reparación + despliegue

window.addEventListener("DOMContentLoaded", () => Game.init());
