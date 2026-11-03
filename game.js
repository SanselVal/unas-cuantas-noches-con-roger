/* ============================================================
   game.js — FASE DE INTEGRACIÓN: Auditoría completa de Roger,
   John, Meaty, electricidad y victorias diferenciadas.
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
  },
  johnDistantSteps() {
    console.log("[AUDIO HOOK] John: Pasos lejanos retumban...");
  },
  johnApproaching() {
    console.log("[AUDIO HOOK] John: Pasos pesados aproximándose a la oficina...");
  },
  johnAtWindow() {
    console.log("[AUDIO HOOK] John: Estructura metálica llega a la ventana de la oficina.");
  },
  johnSearching() {
    console.log("[AUDIO HOOK] John: Búsqueda activa en la penumbra...");
  },
  johnRetreating() {
    console.log("[AUDIO HOOK] John: Pasos pesados alejándose de la ventana...");
  },
  johnSafe() {
    console.log("[AUDIO HOOK] John: Sonido metálico lejano. Zona segura.");
  },
  meatyRepairing() {
    console.log("[AUDIO HOOK] Meaty: Ajustando engranajes y soldadura...");
  },
  meatyRepaired() {
    console.log("[AUDIO HOOK] Meaty: Reparación completada. Sistema operativo.");
  },
  meatyDeployed(room) {
    console.log(`[AUDIO HOOK] Meaty: Desplegado con éxito en ${room}.`);
  },
  meatyDestroyed() {
    console.log("[AUDIO HOOK] Meaty: Chasis destruido por John. Regresando a la oficina averiado.");
  }
};

/* ---------- Algoritmo BFS de Búsqueda de Rutas ---------- */
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

/* ---------- Interfaz de Comunicación de Módulos (John / Meaty) ---------- */
const ModuleBridge = {
  onJohnEnteredRoom(room) {
    if (window.MeatyModule && typeof window.MeatyModule.checkJohnDestruction === "function") {
      window.MeatyModule.checkJohnDestruction(room);
    }
  }
};

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
      meatyPanelOpen: false,
      camera: 0,
      timeScale: CONFIG.debug.timeScale,
      over: false,
      tools: {
        guitar: { enabled: CONFIG.tools.find(t=>t.id==="guitar")?.enabled || true, active: false },
        power:  { enabled: CONFIG.tools.find(t=>t.id==="power")?.enabled || true,   active: true },
        meaty:  { enabled: CONFIG.tools.find(t=>t.id==="meaty")?.enabled || true,   active: false },
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
    UI.setMeatyPanel(false);
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

    if (window.JohnModule) {
      window.JohnModule.onElectricityChanged(this.state.electricityOn, this);
    }
  },

  toggleElectricity() {
    if (!this.state) return;
    this.setElectricity(!this.state.electricityOn);
  },

  win() {
    const repaired = window.MeatyModule ? window.MeatyModule.meatyRepairedAtLeastOnce : false;
    if (repaired) {
      this.end(true, "Victoria Laboral", "Amanece. Sobreviviste a la noche y cumpliste con la reparación de Meaty. Recibes tu sueldo completo.", "labor-win");
    } else {
      this.end(true, "Victoria Alternativa", "Sobreviviste a las 6 AM sin reparar a Meaty. Has logrado sobrevivir, pero no recibes sueldo por incumplir el mantenimiento.", "alt-win");
    }
  },

  lose(reason = "No lo lograste.") {
    this.end(false, "Fin de la jornada", reason, "lose");
  },

  end(won, title, text, styleClass = "win") {
    if (this.state.over) return;
    this.state.over = true;
    this.running = false;
    
    if (window.MeatyModule) window.MeatyModule.isRepairing = false;

    UI.setMonitor(false);
    UI.setMeatyPanel(false);
    $("#end-title").textContent = title;
    $("#end-text").textContent = text;
    $("#screen-end").className = `screen active ${styleClass}`;
    UI.show("end");
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
    this.buildSchematicMap();

    $("#btn-start").onclick = () => Game.start();
    $("#btn-retry").onclick = () => UI.show("menu");
    $("#monitor-toggle").onclick = () => {
      if (window.MeatyModule && window.MeatyModule.isRepairing) return;
      this.setMonitor(!Game.state.monitorOpen);
    };

    $("#btn-guitar-cam5").onclick = () => {
      if (window.MeatyModule && window.MeatyModule.isRepairing) return;
      if (window.RogerModule) window.RogerModule.activateGuitar();
    };

    $("#btn-close-meaty").onclick = () => {
      if (window.MeatyModule && window.MeatyModule.isRepairing) return;
      this.setMeatyPanel(false);
    };

    const holdBtn = $("#btn-hold-repair");
    const startRepair = (e) => {
      e.preventDefault();
      if (!Game.running || Game.state.over) return;
      if (window.MeatyModule) window.MeatyModule.isRepairing = true;
    };
    const stopRepair = () => {
      if (window.MeatyModule) window.MeatyModule.isRepairing = false;
    };

    holdBtn.addEventListener("mousedown", startRepair);
    holdBtn.addEventListener("mouseup", stopRepair);
    holdBtn.addEventListener("mouseleave", stopRepair);
    holdBtn.addEventListener("touchstart", startRepair);
    holdBtn.addEventListener("touchend", stopRepair);

    $("#btn-recall-meaty").onclick = () => {
      if (window.MeatyModule && window.MeatyModule.isRepairing) return;
      if (window.MeatyModule) window.MeatyModule.recallToOffice();
    };

    addEventListener("keydown", e => {
      if (!Game.running || Game.state.over) return;
      if (Game.state.meatyPanelOpen || (window.MeatyModule && window.MeatyModule.isRepairing)) return;

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
      if (!Game.running || Game.state.over || Game.state.meatyPanelOpen || (window.MeatyModule && window.MeatyModule.isRepairing)) return;
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
        if (a === "toggle-power") Game.toggleElectricity();
        if (a === "force-roger-step" && window.RogerModule) window.RogerModule.step(Game);
        if (a === "reset-roger" && window.RogerModule) window.RogerModule.reset(Game);
        if (a === "force-john-step" && window.JohnModule) window.JohnModule.step(Game);
        if (a === "reset-john" && window.JohnModule) window.JohnModule.reset(Game);
        
        if (a === "force-meaty-repair" && window.MeatyModule) window.MeatyModule.forceCompleteRepair(Game);
        if (a === "deplete-meaty-uses" && window.MeatyModule) window.MeatyModule.depleteUses(Game);
        if (a === "force-meaty-destroy" && window.MeatyModule) window.MeatyModule.forceDestroy(Game);
        if (a === "reset-meaty" && window.MeatyModule) window.MeatyModule.reset(Game);
      };
    }

    (function pan() {
      UI.worldX += (UI.targetX - UI.worldX) * CONFIG.office.panSmoothing;
      $("#office-world").style.transform = `translateX(${UI.worldX.toFixed(1)}px)`;
      requestAnimationFrame(pan);
    })();
  },

  buildSchematicMap() {
    const grid = $("#schematic-map");
    grid.innerHTML = "";
    CONFIG.meaty.deployableRooms.forEach(roomId => {
      const camObj = CONFIG.cameras.find(c => c.id === roomId);
      const node = document.createElement("div");
      node.className = "map-node";
      node.dataset.room = roomId;
      node.innerHTML = `
        <div class="map-node-title">${roomId}</div>
        <div class="map-node-status">${camObj ? camObj.name : ""} - [Libre]</div>`;
      node.onclick = () => {
        if (window.MeatyModule && window.MeatyModule.isRepairing) return;
        if (window.MeatyModule) window.MeatyModule.deployToRoom(roomId);
      };
      grid.appendChild(node);
    });
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
        if (window.MeatyModule && window.MeatyModule.isRepairing) return;
        if (t.id === "power") Game.toggleElectricity();
        if (t.id === "guitar") {
          this.setMonitor(true);
          const cam5Index = CONFIG.cameras.findIndex(c => c.id === "CAM 05");
          if (cam5Index !== -1) this.setCamera(cam5Index);
        }
        if (t.id === "meaty") {
          this.setMeatyPanel(true);
        }
      };
      bar.appendChild(b);
    });
  },

  refreshToolsUI() {
    if (!Game.state) return;
    const isRepairing = window.MeatyModule ? window.MeatyModule.isRepairing : false;
    CONFIG.tools.forEach(t => {
      const b = $("#tool-" + t.id);
      if (!b) return;
      const state = Game.state.tools[t.id] || { enabled: t.enabled, active: t.active };
      b.disabled = !state.enabled || isRepairing;
      let statusTxt = "Inactivo";
      if (!state.enabled) statusTxt = "Bloqueado";
      else if (state.active) statusTxt = "Activo";

      b.innerHTML = `${t.label}<small>${statusTxt}</small>`;
    });
  },

  refreshMeatyUI() {
    if (!window.MeatyModule) return;
    const m = window.MeatyModule;

    for (let i = 0; i < 3; i++) {
      const fill = $("#fill-prog-" + i);
      const lbl = $("#lbl-prog-" + i);
      if (fill && lbl) {
        const pct = Math.round(m.repairProgress[i]);
        fill.style.width = pct + "%";
        lbl.textContent = pct + "%";
        fill.classList.toggle("completed", pct >= 100);
      }
    }

    const holdBtn = $("#btn-hold-repair");
    if (holdBtn) {
      if (m.state === "REPAIRED" || m.state === "DEPLOYED") {
        holdBtn.disabled = true;
        holdBtn.textContent = "SISTEMA COMPLETAMENTE REPARADO";
      } else {
        holdBtn.disabled = false;
        holdBtn.textContent = m.isRepairing ? "REPARANDO..." : "MANTENER PARA REPARAR";
      }
    }

    $("#lbl-meaty-uses").textContent = m.usesLeft;

    const recallBtn = $("#btn-recall-meaty");
    if (recallBtn) recallBtn.disabled = m.isRepairing || m.state !== "DEPLOYED";

    const closeBtn = $("#btn-close-meaty");
    if (closeBtn) closeBtn.disabled = m.isRepairing;

    const nodes = document.querySelectorAll("#schematic-map .map-node");
    nodes.forEach(node => {
      const roomId = node.dataset.room;
      const camObj = CONFIG.cameras.find(c => c.id === roomId);
      const roomName = camObj ? camObj.name : "";
      const isOccupiedByMeaty = (m.currentLocation === roomId);
      const rogerHere = (window.RogerModule && window.RogerModule.currentLocation === roomId);
      const johnHere = (window.JohnModule && window.JohnModule.currentLocation === roomId);

      node.classList.toggle("occupied", isOccupiedByMeaty);
      node.classList.toggle("disabled", m.isRepairing || m.state !== "REPAIRED" || m.usesLeft <= 0 || rogerHere || johnHere);

      const statusEl = node.querySelector(".map-node-status");
      if (isOccupiedByMeaty) {
        statusEl.textContent = `${roomName} - [DESPLEGADO]`;
      } else if (rogerHere || johnHere) {
        statusEl.textContent = `${roomName} - [OCUPADO POR ANIMATRÓNICO]`;
      } else {
        statusEl.textContent = `${roomName} - [Libre]`;
      }
    });

    if (Game.state && Game.state.tools.meaty) {
      Game.state.tools.meaty.active = (m.state === "DEPLOYED" || m.state === "REPAIRED");
      this.refreshToolsUI();
    }
  },

  setMeatyPanel(open) {
    if (!Game.state) return;
    if (window.MeatyModule && window.MeatyModule.isRepairing && !open) return;
    Game.state.meatyPanelOpen = open;
    if (open) this.setMonitor(false);
    $("#meaty-panel").classList.toggle("open", open);
    this.refreshMeatyUI();
  },

  refreshGuitarUI() {
    const gBtn = $("#btn-guitar-cam5");
    if (!gBtn || !window.RogerModule) return;

    const isCam5 = Game.state && CONFIG.cameras[Game.state.camera]?.id === "CAM 05";
    const state = window.RogerModule.guitarState;
    const cooldown = Math.ceil(window.RogerModule.guitarCooldownTimer);
    const isRepairing = window.MeatyModule ? window.MeatyModule.isRepairing : false;

    if (isCam5 && Game.state.electricityOn && !Game.state.meatyPanelOpen) {
      gBtn.style.display = "block";
      if (state === "READY") {
        gBtn.disabled = isRepairing;
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

    const officeWorld = $("#office-world");
    if (officeWorld) officeWorld.classList.toggle("darkness", !isOn);

    const feed = $("#cam-feed");
    feed.classList.toggle("offline", !isOn);

    const camBtns = document.querySelectorAll("#cam-buttons .btn");
    camBtns.forEach(btn => btn.disabled = !isOn);

    this.refreshGuitarUI();
    this.refreshToolsUI();
  },

  showJohnBanner(mode, text = "") {
    const banner = $("#john-status-banner");
    if (!banner) return;
    banner.className = "";
    if (mode === "SEARCHING") {
      banner.classList.add("searching");
      banner.textContent = text || "¡ALERTA: ALGUIEN EN LA VENTANA — APAGA LA LUZ!";
    } else if (mode === "RETREATING") {
      banner.classList.add("retreating");
      banner.textContent = text || "JOHN SE ESTÁ RETIRANDO... MANTÉN LA LUZ APAGADA";
    } else if (mode === "SAFE") {
      banner.classList.add("safe");
      banner.textContent = text || "ZONA SEGURA — PUEDES ENCENDER LA LUZ";
      setTimeout(() => {
        if (banner.classList.contains("safe")) banner.style.display = "none";
      }, 3500);
    } else {
      banner.style.display = "none";
    }
  },

  show(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $("#screen-" + name).classList.add("active");
  },

  setMonitor(open) {
    if (window.MeatyModule && window.MeatyModule.isRepairing) return;
    if (open && Game.state.meatyPanelOpen) this.setMeatyPanel(false);
    Game.state.monitorOpen = open;
    $("#monitor").classList.toggle("open", open);
    $("#monitor-toggle").textContent = open ? "▼ Cerrar monitor" : "▲ Abrir monitor";
    this.refreshGuitarUI();
  },

  setCamera(i, silent) {
    if (!Game.state.electricityOn) return;
    if (window.MeatyModule && window.MeatyModule.isRepairing) return;
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

  updateDebugPanels() {
    const rogerDbg = $("#debug-roger-info");
    if (rogerDbg && window.RogerModule) {
      const cd = window.RogerModule.guitarCooldownTimer > 0 ? ` (${window.RogerModule.guitarCooldownTimer.toFixed(1)}s)` : "";
      rogerDbg.textContent = `Roger: ${window.RogerModule.currentLocation} | Estado: ${window.RogerModule.getMovementStateText()} | Guitarra: ${window.RogerModule.guitarState}${cd}`;
    }

    const johnDbg = $("#debug-john-info");
    if (johnDbg && window.JohnModule) {
      const j = window.JohnModule;
      const t = j.stateTimer > 0 ? ` (${j.stateTimer.toFixed(1)}s)` : "";
      johnDbg.textContent = `John: ${j.currentLocation} | Estado: ${j.state} ${t} | Zona Peligrosa: ${j.inDangerZone ? "SÍ" : "NO"}`;
    }

    const meatyDbg = $("#debug-meaty-info");
    if (meatyDbg && window.MeatyModule) {
      const m = window.MeatyModule;
      const bRooms = CONFIG.blockedRooms.join(",") || "Ninguna";
      meatyDbg.textContent = `Meaty: ${m.currentLocation} | Estado: ${m.state} | Fase: ${m.currentStageIndex + 1}/3 | Usos: ${m.usesLeft} | Bloqueo: ${bRooms} | Reparado1vez: ${m.meatyRepairedAtLeastOnce}`;
    }
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
    UI.updateDebugPanels();
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
      UI.updateDebugPanels();
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
    UI.updateDebugPanels();
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

    if (this.currentLocation === "CAM 05" && this.guitarState === "PLAYING") {
      this.guitarState = "COOLDOWN";
      this.guitarCooldownTimer = CONFIG.roger.guitarCooldownDuration;
      AudioSystem.stopGuitar();
      UI.refreshGuitarUI();
      UI.updateDebugPanels();
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

      UI.updateDebugPanels();
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

/* ---------- Módulo de John ---------- */
const JohnModule = {
  name: "john",
  currentLocation: "CAM 02",
  state: "MOVING",
  timer: 0,
  stateTimer: 0,
  inDangerZone: false,

  init(game) {
    this.resetState();
  },

  resetState() {
    this.currentLocation = CONFIG.john.startLocation;
    this.state = "MOVING";
    this.timer = 0;
    this.stateTimer = 0;
    this.inDangerZone = false;
  },

  reset(game) {
    UI.setCharacterPosition("office", "john", { visible: false });
    CONFIG.cameras.forEach(c => UI.setCharacterPosition(c.id, "john", { visible: false }));

    this.resetState();
    this.updateVisuals();
    UI.showJohnBanner("NONE");
    UI.updateDebugPanels();
  },

  update(dt, game) {
    if (game.state.over) return;

    if (this.state === "MOVING") {
      this.timer += dt;
      if (this.timer >= CONFIG.john.moveInterval) {
        this.timer = 0;
        this.evaluateMovement(game);
      }
    } else if (this.state === "AT_WINDOW" || this.state === "SEARCHING") {
      this.stateTimer += dt;
      
      if (game.state.electricityOn) {
        if (this.stateTimer >= CONFIG.john.detectionGraceTime) {
          game.lose("John te detectó desde la ventana de la oficina.");
          return;
        }
      } else {
        if (this.state !== "SEARCHING") {
          this.state = "SEARCHING";
          AudioSystem.johnSearching();
          UI.showJohnBanner("SEARCHING");
        }
        
        if (this.stateTimer >= CONFIG.john.searchDuration) {
          this.startRetreat(game);
        }
      }
      UI.updateDebugPanels();
    } else if (this.state === "RETREATING") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.finishRetreat(game);
      }
      UI.updateDebugPanels();
    }
  },

  evaluateMovement(game) {
    if (game.state.over) return;

    const currentCamId = CONFIG.cameras[game.state.camera]?.id;
    const isWatched = game.state.monitorOpen && (currentCamId === this.currentLocation);
    const prob = isWatched ? CONFIG.john.watchedProbability : CONFIG.john.unwatchedProbability;

    if (Math.random() < prob) {
      this.step(game);
    }
  },

  step(game) {
    if (game.state.over || this.state !== "MOVING") return;

    const targetRoom = "office";
    const nextRoom = getNextStepTowards(this.currentLocation, targetRoom, CONFIG.mapGraph, []);

    if (nextRoom && nextRoom !== this.currentLocation) {
      UI.setCharacterPosition(this.currentLocation, "john", { visible: false });
      this.currentLocation = nextRoom;
      this.updateVisuals();

      ModuleBridge.onJohnEnteredRoom(this.currentLocation);

      if (this.currentLocation === "office") {
        this.reachWindow(game);
      } else {
        AudioSystem.johnApproaching();
      }

      UI.updateDebugPanels();
    }
  },

  reachWindow(game) {
    this.state = "AT_WINDOW";
    this.stateTimer = 0;
    this.inDangerZone = true;
    AudioSystem.johnAtWindow();

    if (game.state.electricityOn) {
      UI.showJohnBanner("SEARCHING", "¡ALERTA: JOHN ESTÁ EN LA VENTANA — APAGA LA LUZ!");
    } else {
      this.state = "SEARCHING";
      AudioSystem.johnSearching();
      UI.showJohnBanner("SEARCHING");
    }
  },

  startRetreat(game) {
    this.state = "RETREATING";
    this.stateTimer = CONFIG.john.retreatTime;
    AudioSystem.johnRetreating();
    UI.showJohnBanner("RETREATING");
  },

  finishRetreat(game) {
    this.inDangerZone = false;
    UI.setCharacterPosition("office", "john", { visible: false });
    
    this.currentLocation = "CAM 03";
    this.state = "MOVING";
    this.timer = 0;
    this.updateVisuals();
    
    AudioSystem.johnSafe();
    UI.showJohnBanner("SAFE");
    UI.updateDebugPanels();
  },

  onElectricityChanged(isOn, game) {
    if (game.state.over) return;

    if (isOn && this.inDangerZone) {
      game.lose("Encendiste la luz mientras John aún no se había retirado de la zona peligrosa.");
    }
  },

  updateVisuals() {
    const posConfig = CONFIG.characterPositions[this.currentLocation]?.john || { x: 50, y: 50, scale: 1.0 };
    UI.setCharacterPosition(this.currentLocation, "john", {
      x: posConfig.x,
      y: posConfig.y,
      scale: posConfig.scale,
      visible: true
    });
  }
};

/* ---------- Módulo de Meaty ---------- */
const MeatyModule = {
  name: "meaty",
  currentLocation: "office",
  state: "BROKEN", // "BROKEN", "REPAIRING", "REPAIRED", "DEPLOYED"
  repairProgress: [0, 0, 0],
  currentStageIndex: 0,
  isRepairing: false,
  usesLeft: 0,
  meatyRepairedAtLeastOnce: false,

  get repairedAtLeastOnce() {
    return this.meatyRepairedAtLeastOnce;
  },

  set repairedAtLeastOnce(val) {
    this.meatyRepairedAtLeastOnce = Boolean(val);
  },

  init(game) {
    this.resetState();
  },

  resetState() {
    this.currentLocation = CONFIG.meaty.startLocation;
    this.state = "BROKEN";
    this.repairProgress = [0, 0, 0];
    this.currentStageIndex = 0;
    this.isRepairing = false;
    this.usesLeft = 0;
    this.meatyRepairedAtLeastOnce = false;
    CONFIG.blockedRooms = [];
  },

  reset(game) {
    UI.setCharacterPosition("office", "meaty", { visible: false });
    CONFIG.cameras.forEach(c => UI.setCharacterPosition(c.id, "meaty", { visible: false }));

    this.resetState();
    this.updateVisuals();
    UI.refreshMeatyUI();
    UI.updateDebugPanels();
  },

  update(dt, game) {
    if (game.state.over) return;

    if (this.state === "BROKEN" || this.state === "REPAIRING") {
      const idx = this.currentStageIndex;

      if (this.isRepairing) {
        if (this.state !== "REPAIRING") {
          this.state = "REPAIRING";
          AudioSystem.meatyRepairing();
        }

        const delta = (100 / CONFIG.meaty.repairStageDuration) * dt;
        this.repairProgress[idx] = Math.min(100, this.repairProgress[idx] + delta);

        if (this.repairProgress[idx] >= 100) {
          if (idx < 2) {
            this.currentStageIndex++;
          } else {
            this.state = "REPAIRED";
            this.usesLeft = CONFIG.meaty.maxUses;
            this.meatyRepairedAtLeastOnce = true;
            this.isRepairing = false;
            AudioSystem.meatyRepaired();
          }
        }
      } else {
        if (this.repairProgress[idx] > 0 && this.repairProgress[idx] < 100) {
          this.repairProgress[idx] = Math.max(0, this.repairProgress[idx] - CONFIG.meaty.decayRate * dt);
        }
        if (this.state === "REPAIRING") {
          this.state = "BROKEN";
        }
      }

      UI.refreshMeatyUI();
      UI.updateDebugPanels();
    }
  },

  deployToRoom(room) {
    if (this.isRepairing) return false;
    if (this.state !== "REPAIRED" && this.state !== "DEPLOYED") return false;
    if (this.usesLeft <= 0) return false;

    if (window.RogerModule && window.RogerModule.currentLocation === room) return false;
    if (window.JohnModule && window.JohnModule.currentLocation === room) return false;

    this.clearBlockedRoom();

    UI.setCharacterPosition(this.currentLocation, "meaty", { visible: false });

    this.currentLocation = room;
    this.state = "DEPLOYED";
    this.usesLeft--;
    
    if (!CONFIG.blockedRooms.includes(room)) {
      CONFIG.blockedRooms.push(room);
    }

    this.updateVisuals();
    AudioSystem.meatyDeployed(room);
    UI.refreshMeatyUI();
    UI.updateDebugPanels();
    return true;
  },

  recallToOffice() {
    if (this.isRepairing) return;
    if (this.state !== "DEPLOYED") return;
    this.clearBlockedRoom();

    UI.setCharacterPosition(this.currentLocation, "meaty", { visible: false });
    this.currentLocation = "office";

    if (this.usesLeft > 0) {
      this.state = "REPAIRED";
    } else {
      this.state = "BROKEN";
      this.repairProgress = [0, 0, 0];
      this.currentStageIndex = 0;
    }

    this.updateVisuals();
    UI.refreshMeatyUI();
    UI.updateDebugPanels();
  },

  checkJohnDestruction(room) {
    if (this.state === "DEPLOYED" && this.currentLocation === room) {
      AudioSystem.meatyDestroyed();
      this.clearBlockedRoom();

      UI.setCharacterPosition(this.currentLocation, "meaty", { visible: false });

      this.currentLocation = "office";
      this.state = "BROKEN";
      this.usesLeft = 0;
      this.repairProgress = [0, 0, 0];
      this.currentStageIndex = 0;

      this.updateVisuals();
      UI.refreshMeatyUI();
      UI.updateDebugPanels();
    }
  },

  clearBlockedRoom() {
    if (this.currentLocation && this.currentLocation !== "office") {
      CONFIG.blockedRooms = CONFIG.blockedRooms.filter(r => r !== this.currentLocation);
    }
  },

  updateVisuals() {
    const posConfig = CONFIG.characterPositions[this.currentLocation]?.meaty || { x: 50, y: 50, scale: 1.0 };
    UI.setCharacterPosition(this.currentLocation, "meaty", {
      x: posConfig.x,
      y: posConfig.y,
      scale: posConfig.scale,
      visible: true
    });
  },

  forceCompleteRepair(game) {
    this.repairProgress = [100, 100, 100];
    this.currentStageIndex = 2;
    this.state = "REPAIRED";
    this.usesLeft = CONFIG.meaty.maxUses;
    this.meatyRepairedAtLeastOnce = true;
    this.isRepairing = false;
    UI.refreshMeatyUI();
    UI.updateDebugPanels();
  },

  depleteUses(game) {
    this.usesLeft = 0;
    if (this.state === "REPAIRED") {
      this.state = "BROKEN";
      this.repairProgress = [0, 0, 0];
      this.currentStageIndex = 0;
    }
    UI.refreshMeatyUI();
    UI.updateDebugPanels();
  },

  forceDestroy(game) {
    if (this.state === "DEPLOYED") {
      this.checkJohnDestruction(this.currentLocation);
    } else {
      this.state = "BROKEN";
      this.usesLeft = 0;
      this.repairProgress = [0, 0, 0];
      this.currentStageIndex = 0;
      this.clearBlockedRoom();
      this.currentLocation = "office";
      this.updateVisuals();
      UI.refreshMeatyUI();
      UI.updateDebugPanels();
    }
  }
};

window.RogerModule = RogerModule;
window.JohnModule = JohnModule;
window.MeatyModule = MeatyModule;

Game.register(RogerModule);
Game.register(JohnModule);
Game.register(MeatyModule);

window.addEventListener("DOMContentLoaded", () => Game.init());