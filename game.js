/* ============================================================
   game.js — Etapa 1 Refinada: estructura, reloj, oficina, cámaras,
   capas de animatrónicos y control de electricidad.
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);

/* ---------- Utilidades ---------- */
function loadOptionalImage(img, src, onOk) {
  if (!img) return;
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

  register(mod) {
    this.modules.push(mod);
    if (this.ready && mod.init) mod.init(this);
    return mod;
  },

  freshState() {
    return {
      elapsed: 0,                 // Segundos de juego transcurridos
      hourIndex: 0,               // 0..5
      electricityOn: CONFIG.electricity.defaultOn,
      monitorOpen: false,
      camera: 0,
      timeScale: CONFIG.debug.timeScale,
      over: false,
      tools: {
        guitar: { enabled: CONFIG.tools.find(t=>t.id==="guitar")?.enabled || false, active: false },
        power:  { enabled: CONFIG.tools.find(t=>t.id==="power")?.enabled || true,   active: true },
        meaty:  { enabled: CONFIG.tools.find(t=>t.id==="meaty")?.enabled || false,  active: false },
      }
    };
  },

  init() {
    $("#menu-title").textContent = CONFIG.title;
    document.title = CONFIG.title;
    UI.build();
    this.modules.forEach(m => m.init && m.init(this));
    this.ready = true;
    UI.show("menu");
    UI.fit();
    addEventListener("resize", UI.fit);
    requestAnimationFrame(t => { this.last = t; this.loop(t); });
  },

  start() {
    this.state = this.freshState();
    this.modules.forEach(m => m.reset && m.reset(this));
    UI.setMonitor(false);
    UI.setCamera(0, true);
    UI.refreshElectricityUI();
    UI.refreshToolsUI();
    UI.refreshHud();
    UI.show("game");
    this.running = true;
  },

  loop(t) {
    const dt = Math.min((t - this.last) / 1000, 0.25);
    this.last = t;
    if (this.running && !this.state.over) this.update(dt * this.state.timeScale);
    requestAnimationFrame(tt => this.loop(tt));
  },

  update(dt) {
    const s = this.state;
    s.elapsed += dt;
    const hourLen = CONFIG.night.realSeconds / CONFIG.night.hoursTotal;
    s.hourIndex = Math.min(CONFIG.night.hoursTotal, Math.floor(s.elapsed / hourLen));
    this.modules.forEach(m => m.update && m.update(dt, this));
    UI.refreshHud();
    if (s.elapsed >= CONFIG.night.realSeconds) this.win();
  },

  setElectricity(onState) {
    if (!this.state || this.state.over) return;
    this.state.electricityOn = Boolean(onState);
    this.state.tools.power.active = this.state.electricityOn;
    UI.refreshElectricityUI();
  },

  toggleElectricity() {
    if (!this.state) return;
    this.setElectricity(!this.state.electricityOn);
  },

  win()  { this.end(true,  "Son las 6 AM", "Amanece. Sobreviviste a la noche."); },
  lose(reason = "No lo lograste.") { this.end(false, "Fin de la jornada", reason); },

  end(won, title, text) {
    if (this.state.over) return;
    this.state.over = true;
    this.running = false;
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

    // Preparar sprites de personajes en la oficina
    const officeLayer = $("#layer-office");
    this.setupCharacterSprites(officeLayer, "office");

    $("#cam-feed").style.setProperty("--cam-brightness", CONFIG.monitor.imageBrightness);

    // Cámaras
    const feed = $("#cam-rooms"), btns = $("#cam-buttons");
    CONFIG.cameras.forEach((c, i) => {
      const room = document.createElement("div");
      room.className = "cam-room";
      room.dataset.id = c.id;
      room.innerHTML = `
        <div class="cam-frame" style="--ar:${(c.w / c.h).toFixed(4)}">
          <div class="bg-placeholder" style="background:linear-gradient(hsl(${c.hue} 25% 14%),hsl(${c.hue} 30% 6%))">
            <span class="ph-label">${c.id} — imagen pendiente</span>
          </div>
          <img alt="${c.name}">
          <div class="char-layer"></div>
        </div>`;
      
      loadOptionalImage($("img", room), c.image);
      feed.appendChild(room);
      this.rooms.push(room);

      // Preparar sprites de personajes en esta cámara
      const camLayer = room.querySelector(".char-layer");
      this.setupCharacterSprites(camLayer, c.id);

      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = c.id;
      b.title = c.name;
      b.onclick = () => this.setCamera(i);
      btns.appendChild(b);
    });

    // Bar de herramientas
    this.buildToolsUI();

    // Entrada de usuario
    $("#btn-start").onclick = () => Game.start();
    $("#btn-retry").onclick = () => UI.show("menu");
    $("#monitor-toggle").onclick = () => this.setMonitor(!Game.state.monitorOpen);

    addEventListener("keydown", e => {
      if (!Game.running || Game.state.over) return;
      if (e.code === "Space") {
        e.preventDefault();
        this.setMonitor(!Game.state.monitorOpen);
      }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= CONFIG.cameras.length) {
        this.setMonitor(true);
        this.setCamera(n - 1);
      }
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
        const a = e.target.dataset.act;
        if (!a || !Game.state) return;
        if (a === "win") Game.state.elapsed = CONFIG.night.realSeconds - 0.1;
        if (a === "lose") Game.lose("Derrota forzada desde el panel de depuración.");
        if (a === "x10") {
          const s = Game.state;
          s.timeScale = s.timeScale === 10 ? 1 : 10;
          e.target.textContent = "Velocidad ×" + (s.timeScale === 10 ? "1" : "10");
        }
        if (a === "toggle-power") {
          Game.toggleElectricity();
        }
      };
    }

    (function pan() {
      UI.worldX += (UI.targetX - UI.worldX) * CONFIG.office.panSmoothing;
      $("#office-world").style.transform = `translateX(${UI.worldX.toFixed(1)}px)`;
      requestAnimationFrame(pan);
    })();
  },

  setupCharacterSprites(container, locationId) {
    const chars = CONFIG.characters;
    const posConfig = CONFIG.characterPositions[locationId] || {};

    Object.keys(chars).forEach(charId => {
      const img = document.createElement("img");
      img.className = `char-sprite char-${charId}`;
      img.alt = chars[charId].name;
      img.src = chars[charId].image;

      const pos = posConfig[charId] || { x: 50, y: 50, scale: 1.0, visible: false };
      img.style.left = pos.x + "%";
      img.style.top = pos.y + "%";
      img.style.transform = `translate(-50%, -50%) scale(${pos.scale})`;

      if (pos.visible) img.classList.add("visible");
      container.appendChild(img);
    });
  },

  // API para posicionar/mostrar/ocultar animatrónicos en runtime
  setCharacterPosition(locationId, charId, { x, y, scale, visible }) {
    let container;
    if (locationId === "office") {
      container = $("#layer-office");
    } else {
      const camIdx = CONFIG.cameras.findIndex(c => c.id === locationId);
      if (camIdx !== -1) container = this.rooms[camIdx].querySelector(".char-layer");
    }
    if (!container) return;

    const sprite = container.querySelector(`.char-${charId}`);
    if (!sprite) return;

    if (x !== undefined) sprite.style.left = x + "%";
    if (y !== undefined) sprite.style.top = y + "%";
    if (scale !== undefined) sprite.style.transform = `translate(-50%, -50%) scale(${scale})`;
    if (visible !== undefined) sprite.classList.toggle("visible", Boolean(visible));
  },

  buildToolsUI() {
    const bar = $("#tools-bar");
    bar.innerHTML = "";
    CONFIG.tools.forEach(t => {
      const b = document.createElement("button");
      b.className = "btn";
      b.id = "tool-" + t.id;
      b.onclick = () => {
        if (t.id === "power") Game.toggleElectricity();
      };
      bar.appendChild(b);
    });
  },

  refreshToolsUI() {
    if (!Game.state) return;
    CONFIG.tools.forEach(t => {
      const b = $("#tool-" + t.id);
      if (!b) return;
      const state = Game.state.tools[t.id] || { enabled: t.enabled, active: t.active };
      b.disabled = !state.enabled;
      let statusTxt = "Inactivo";
      if (!state.enabled) statusTxt = "Bloqueado";
      else if (state.active) statusTxt = "Activo";

      b.innerHTML = `${t.label}<small>${statusTxt}</small>`;
    });
  },

  refreshElectricityUI() {
    const isOn = Game.state ? Game.state.electricityOn : true;
    const box = $("#power-box");
    const status = $("#power-status");
    box.className = isOn ? "on" : "off";
    status.textContent = isOn ? "ON" : "OFF";

    // Si las cámaras dependen de la electricidad en el monitor:
    const feed = $("#cam-feed");
    feed.style.opacity = isOn ? "1" : "0.15";
    this.refreshToolsUI();
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
      const f = $("#cam-flicker");
      f.classList.remove("on");
      void f.offsetWidth;
      f.classList.add("on");
    }
  },

  refreshHud() {
    const s = Game.state;
    $("#clock").textContent = hourLabel((CONFIG.night.startHour + s.hourIndex) % 12);
  },

  roomLayer(camIndex) { return this.rooms[camIndex].querySelector(".char-layer"); },
  officeLayer() { return $("#layer-office"); },

  fit() {
    const s = Math.min(innerWidth / CONFIG.resolution.w, innerHeight / CONFIG.resolution.h);
    $("#stage").style.transform = `translate(-50%,-50%) scale(${s})`;
  },
};

/* ---------- Módulos de personajes (STUBS) ---------- */
Game.register({ name: "roger" });
Game.register({ name: "john"  });
Game.register({ name: "meaty" });

window.addEventListener("DOMContentLoaded", () => Game.init());