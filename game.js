/* ============================================================
   game.js — Etapa 2: Implementación validada de Roger
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

/* ---------- Hooks de Audio ---------- */
const AudioSystem = {
  playGuitar() {
    console.log("[AUDIO HOOK] Guitarra activada. Sonido en reproducción...");
  },
  stopGuitar() {
    console.log("[AUDIO HOOK] Guitarra desactivada por Roger.");
  }
};

/* ---------- Algoritmo de Búsqueda de Rutas (BFS) ---------- */
function getNextStepTowards(currentRoom, targetRoom, mapGraph, blockedRooms = []) {
  if (currentRoom === targetRoom) return currentRoom;
  
  const queue = [[currentRoom]];
  const visited = new Set([currentRoom]);

  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];

    if (node === targetRoom) {
      return path[1];
    }

    const neighbors = mapGraph[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && (!blockedRooms.includes(neighbor) || neighbor === targetRoom)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  return currentRoom;
}

/* ---------- Núcleo del Juego ---------- */
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
      elapsed: 0,
      hourIndex: 0,
      electricityOn: CONFIG.electricity.defaultOn,
      monitorOpen: false,
      camera: 0,
      timeScale: CONFIG.debug.timeScale,
      over: false,
      tools: {
        guitar: { enabled: CONFIG.tools.find(t=>t.id==="guitar")?.enabled || true, active: false },
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
    UI.resetCharacterSprites();
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

/* ---------- Interfaz de Usuario ---------- */
const UI = {
  worldX: 0, targetX: 0,
  rooms: [],

  build() {
    $("#office-world").style.width = CONFIG.office.worldWidth + "px";
    loadOptionalImage($("#office-img"), CONFIG.office.image);

    const officeLayer = $("#layer-office");
    this.setupCharacterSprites(officeLayer, "office");

    $("#cam-feed").style.setProperty("--cam-brightness", CONFIG.monitor.imageBrightness);

    const feed = $("#cam-rooms"), btns = $("#cam-buttons");
    feed.innerHTML = "";
    btns.innerHTML = "";
    this.rooms = [];

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

      const camLayer = room.querySelector(".char-layer");
      this.setupCharacterSprites(camLayer, c.id);

      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = c.id;
      b.title = c.name;
      b.onclick = () => this.setCamera(i);
      btns.appendChild(b);
    });

    this.buildToolsUI();

    $("#btn-start").onclick = () => Game.start();
    $("#btn-retry").onclick = () => UI.show("menu");
    $("#monitor-toggle").onclick = () => this.setMonitor(!Game.state.monitorOpen);

    $("#btn-guitar-cam5").onclick = () => {
      if (RogerModule) RogerModule.activateGuitar();
    };

    addEventListener("keydown", e => {
      if (!Game.running || Game.state.over) return;
      if (e.code === "Space") {
        e.preventDefault();
        this.setMonitor(!Game.state.monitorOpen);
      }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= CONFIG.cameras.length) {
        if (Game.state.electricityOn) {
          this.setMonitor(true);
          this.setCamera(n - 1);
        }
      }
    });

    $("#screen-game").addEventListener("mousemove", e => {
      const r = $("#stage").getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      this.targetX = -(CONFIG.office.worldWidth - CONFIG.resolution.w) * ratio;
    });

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
        if (a === "force-roger-step") {
          if (RogerModule) RogerModule.step(Game);
        }
        if (a === "reset-roger") {
          if (RogerModule) RogerModule.reset(Game);
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
      let img = container.querySelector(`.char-${charId}`);
      if (!img) {
        img = document.createElement("img");
        img.className = `char-sprite char-${charId}`;
        img.alt = chars[charId].name;
        img.src = chars[charId].image;
        container.appendChild(img);
      }
      const pos = posConfig[charId] || { x: 50, y: 50, scale: 1.0, visible: false };
      img.style.left = pos.x + "%";
      img.style.top = pos.y + "%";
      img.style.transform = `translate(-50%, -50%) scale(${pos.scale})`;
      img.classList.toggle("visible", Boolean(pos.visible));
    });
  },

  resetCharacterSprites() {
    this.setupCharacterSprites($("#layer-office"), "office");
    CONFIG.cameras.forEach((c, i) => {
      if (this.rooms[i]) {
        const camLayer = this.rooms[i].querySelector(".char-layer");
        this.setupCharacterSprites(camLayer, c.id);
      }
    });
  },

  setCharacterPosition(locationId, charId, pos = {}) {
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

    if (pos.x !== undefined) sprite.style.left = pos.x + "%";
    if (pos.y !== undefined) sprite.style.top = pos.y + "%";
    if (pos.scale !== undefined) sprite.style.transform = `translate(-50%, -50%) scale(${pos.scale})`;
    if (pos.visible !== undefined) sprite.classList.toggle("visible", Boolean(pos.visible));
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
        if (t.id === "guitar") {
          this.setMonitor(true);
          const cam5Index = CONFIG.cameras.findIndex(c => c.id === "CAM 05");
          if (cam5Index !== -1) this.setCamera(cam5Index);
        }
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

  refreshGuitarUI() {
    const gBtn = $("#btn-guitar-cam5");
    if (!gBtn || !RogerModule) return;

    const isCam5 = Game.state && CONFIG.cameras[Game.state.camera]?.id === "CAM 05";
    const state = RogerModule.guitarState;
    const cooldown = Math.ceil(RogerModule.guitarCooldownTimer);

    if (isCam5 && Game.state.electricityOn) {
      gBtn.style.display = "block";
      if (state === "READY") {
        gBtn.disabled = false;
        gBtn.className = "btn";
        gBtn.textContent = "Tocar Guitarra";
      } else if (state === "PLAYING") {
        gBtn.disabled = true;
        gBtn.className = "btn playing";
        gBtn.textContent = "Guitarra Sonando...";
      } else if (state === "COOLDOWN") {
        gBtn.disabled = true;
        gBtn.className = "btn";
        gBtn.textContent = `Enfriamiento (${cooldown}s)`;
      }
    } else {
      gBtn.style.display = "none";
    }

    if (Game.state && Game.state.tools.guitar) {
      Game.state.tools.guitar.active = (state === "PLAYING");
      this.refreshToolsUI();
    }
  },

  refreshElectricityUI() {
    const isOn = Game.state ? Game.state.electricityOn : true;
    const box = $("#power-box");
    const status = $("#power-status");
    box.className = isOn ? "on" : "off";
    status.textContent = isOn ? "ON" : "OFF";

    const feed = $("#cam-feed");
    feed.classList.toggle("offline", !isOn);

    const camBtns = document.querySelectorAll("#cam-buttons .btn");
    camBtns.forEach(btn => btn.disabled = !isOn);

    this.refreshGuitarUI();
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
    this.refreshGuitarUI();
  },

  setCamera(i, silent) {
    if (!Game.state.electricityOn) return;
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
    this.refreshGuitarUI();
  },

  refreshHud() {
    const s = Game.state;
    $("#clock").textContent = hourLabel((CONFIG.night.startHour + s.hourIndex) % 12);
  },

  updateDebugRoger() {
    const dbgText = $("#debug-roger-info");
    if (!dbgText || !RogerModule) return;
    const cd = RogerModule.guitarCooldownTimer > 0 ? ` (${RogerModule.guitarCooldownTimer.toFixed(1)}s)` : "";
    dbgText.textContent = `Roger: ${RogerModule.currentLocation} | Estado: ${RogerModule.getMovementStateText()} | Guitarra: ${RogerModule.guitarState}${cd}`;
  },

  roomLayer(camIndex) { return this.rooms[camIndex].querySelector(".char-layer"); },
  officeLayer() { return $("#layer-office"); },

  fit() {
    const s = Math.min(innerWidth / CONFIG.resolution.w, innerHeight / CONFIG.resolution.h);
    $("#stage").style.transform = `translate(-50%,-50%) scale(${s})`;
  },
};

/* ---------- Módulo de Roger ---------- */
const RogerModule = {
  name: "roger",
  currentLocation: "CAM 01",
  timer: 0,
  guitarState: "READY",
  guitarCooldownTimer: 0,

  init(game) {
    this.resetState();
  },

  resetState() {
    this.currentLocation = CONFIG.roger.startLocation;
    this.timer = 0;
    this.guitarState = "READY";
    this.guitarCooldownTimer = 0;
  },

  reset(game) {
    UI.setCharacterPosition("office", "roger", { visible: false });
    CONFIG.cameras.forEach(c => UI.setCharacterPosition(c.id, "roger", { visible: false }));

    this.resetState();
    this.updateVisuals();
    UI.refreshGuitarUI();
    UI.updateDebugRoger();
  },

  update(dt, game) {
    if (game.state.over) return;

    if (this.guitarState === "COOLDOWN") {
      this.guitarCooldownTimer -= dt;
      if (this.guitarCooldownTimer <= 0) {
        this.guitarCooldownTimer = 0;
        this.guitarState = "READY";
        UI.refreshGuitarUI();
      }
      UI.updateDebugRoger();
    }

    this.timer += dt;
    if (this.timer >= CONFIG.roger.moveInterval) {
      this.timer = 0;
      this.evaluateMovement(game);
    }
  },

  activateGuitar() {
    if (this.guitarState !== "READY") return false;
    this.guitarState = "PLAYING";
    AudioSystem.playGuitar();
    UI.refreshGuitarUI();
    UI.updateDebugRoger();
    return true;
  },

  evaluateMovement(game) {
    if (game.state.over) return;

    const currentCamId = CONFIG.cameras[game.state.camera]?.id;
    const isWatched = game.state.monitorOpen && (currentCamId === this.currentLocation);
    const prob = isWatched ? CONFIG.roger.watchedProbability : CONFIG.roger.unwatchedProbability;

    if (Math.random() < prob) {
      this.step(game);
    }
  },

  step(game) {
    if (game.state.over) return;

    // Caso de borde: si ya está en CAM 05 y la guitarra está sonando, la apaga inmediatamente
    if (this.currentLocation === "CAM 05" && this.guitarState === "PLAYING") {
      this.guitarState = "COOLDOWN";
      this.guitarCooldownTimer = CONFIG.roger.guitarCooldownDuration;
      AudioSystem.stopGuitar();
      UI.refreshGuitarUI();
      UI.updateDebugRoger();
      return;
    }

    const targetRoom = (this.guitarState === "PLAYING") ? "CAM 05" : "office";
    const nextRoom = getNextStepTowards(this.currentLocation, targetRoom, CONFIG.mapGraph, CONFIG.blockedRooms);

    if (nextRoom && nextRoom !== this.currentLocation) {
      UI.setCharacterPosition(this.currentLocation, "roger", { visible: false });
      this.currentLocation = nextRoom;
      this.updateVisuals();

      if (this.currentLocation === "CAM 05" && this.guitarState === "PLAYING") {
        this.guitarState = "COOLDOWN";
        this.guitarCooldownTimer = CONFIG.roger.guitarCooldownDuration;
        AudioSystem.stopGuitar();
        UI.refreshGuitarUI();
      }

      if (this.currentLocation === "office") {
        game.lose("Roger ha entrado en la oficina.");
      }

      UI.updateDebugRoger();
    }
  },

  updateVisuals() {
    const posConfig = CONFIG.characterPositions[this.currentLocation]?.roger || { x: 50, y: 50, scale: 1.0 };
    UI.setCharacterPosition(this.currentLocation, "roger", {
      x: posConfig.x,
      y: posConfig.y,
      scale: posConfig.scale,
      visible: true
    });
  },

  getMovementStateText() {
    if (this.currentLocation === "office") return "En Oficina (Derrota)";
    if (this.guitarState === "PLAYING") return "Atrayéndose hacia CAM 05";
    return "Avanzando hacia Oficina";
  }
};

Game.register(RogerModule);
Game.register({ name: "john"  });
Game.register({ name: "meaty" });

window.addEventListener("DOMContentLoaded", () => Game.init());