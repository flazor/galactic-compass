/**
 * MarkersMode — Cockpit Window HUD
 *
 * RETICLE  — screen-centre crosshair (don't touch — approved design).
 *
 * WINDOW   — wireframe cockpit window projected at the resultant velocity
 *            direction. Per-level telemetry around the edges:
 *              TOP:    speed + live distance traveled per level
 *              BOTTOM: az / alt per level
 *            Centre is open & transparent. Reticle locks into centre.
 */
import { calculateVectorSum } from '../../../cosmic-core/src/calculations/CelestialCalculations.js';
import { Coordinates } from '../../../cosmic-core/src/astronomy/Coordinates.js';

const C            = 299792.458;
const PROJECT_DIST = 5;
const LOCK_RADIUS  = 60;
const RETICLE_LOCK_PX  = 53;   // outer circle pixel radius (r=40 in 120-unit viewBox at 160px)
const TARGET_RELEASE   = 100;  // release hysteresis — must drag further than capture
const LABEL_FADE_START = 120;
const LABEL_FADE_END   = 40;

const CELESTIAL_BODIES = [
  { id: 'sun-sphere',        name: 'SOL',    type: 'G2V MAIN SEQUENCE',    dist: '1.00 AU · 150M km' },
  { id: 'moon-sphere',       name: 'LUNA',   type: 'NATURAL SATELLITE',    dist: '384,400 km' },
  { id: 'black-hole-sphere', name: 'SGR A*', type: 'SUPERMASSIVE BLACK HOLE<br>Milky Way Center', dist: '26,000 ly' },
];

function fmtSpd(v) { return v < 1 ? v.toFixed(3) : v < 10 ? v.toFixed(2) : v.toFixed(1); }
function fmtDist(km) {
  if (km < 1000) return `${km.toFixed(0)}`;
  if (km < 1e6)  return `${(km / 1e3).toFixed(1)}K`;
  if (km < 1e9)  return `${(km / 1e6).toFixed(1)}M`;
  return `${(km / 1e9).toFixed(2)}B`;
}
function shortName(name) {
  return name
    .replace("Earth's Orbit Around Sun", 'ORBIT')
    .replace("Solar System's Galactic Orbit", 'GALACTIC')
    .replace('Earth Rotation', 'ROTATION');
}

export class MarkersMode {
  constructor(sceneManager, uiControls, levelManager) {
    this.sceneManager = sceneManager;
    this.uiControls   = uiControls;
    this.levelManager = levelManager;
    this.needsAnimation    = true;
    this.needsRenderReplay = true;

    this.resultant  = null;
    this.worldPos   = null;
    this.levelData  = [];   // [{ name, velocity, azDeg, altDeg }]
    this.reticleEl  = null;
    this.panelEl    = null;
    this.celLabels  = [];
    this.targetLock    = null;   // locked celestial label ref
    this.targetLockPos = null;   // { x, y } screen coords of locked body
    this.lastLat    = null;
    this.lastLon    = null;
    this.lastDate   = null;
    this.startTime  = Date.now();
    this.recalcTimer = 0;
  }

  /* ── lifecycle ─────────────────────────────────────────── */

  activate() {
    this.sceneManager.hideAllMotionContainers();
    if (!this.reticleEl) this._build();
    this.reticleEl.style.display = '';
    this.panelEl.style.display   = '';
    this.celLabels.forEach(l => l.dom.style.display = '');
  }

  deactivate() {
    if (this.reticleEl) this.reticleEl.style.display = 'none';
    if (this.panelEl)   this.panelEl.style.display   = 'none';
    this.celLabels.forEach(l => l.dom.style.display = 'none');
  }

  /* ── data (≈1 Hz) ──────────────────────────────────────── */

  render(activeLevels, lat, lon, date) {
    this.lastLat = lat; this.lastLon = lon; this.lastDate = date;
    this._recalc();
  }

  onLevelChange() { if (this.lastLat != null) this._recalc(); }

  _recalc() {
    this.sceneManager.hideAllMotionContainers();
    const maxLvl = this.levelManager?.getMaxLevel() ?? 1;
    const data   = calculateVectorSum(this.lastLat, this.lastLon, this.lastDate, maxLvl);
    if (!data?.resultant) return;

    this.resultant = data.resultant;

    // Per-level: name, velocity, direction
    this.levelData = (data.activeVectors || []).map(v => ({
      name:     v.name,
      velocity: v.velocity,
      azDeg:    v.direction.azimuthDegrees,
      altDeg:   v.direction.altitudeDegrees,
    }));

    // World-space target
    const corr = Coordinates.toRadians(this.sceneManager.compassCorrection ?? 0);
    const az   = Coordinates.toRadians(this.resultant.azimuthDegrees);
    const alt  = Coordinates.toRadians(this.resultant.altitudeDegrees);
    const dir  = new THREE.Vector3(
      -Math.cos(alt) * Math.cos(az),
       Math.sin(alt),
      -Math.cos(alt) * Math.sin(az),
    ).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), corr);
    this.worldPos = dir.multiplyScalar(PROJECT_DIST);

    this._rebuildRows();
  }

  /* ── per-frame (60 Hz) ─────────────────────────────────── */

  update(dt) {
    if (!this.panelEl || !this.worldPos) return;
    const scene = document.querySelector('a-scene');
    if (!scene?.camera) return;

    /* ── projection ── */
    const v = this.worldPos.clone().project(scene.camera);
    const behind = v.z > 1;
    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;

    let tx = hw + v.x * hw;
    let ty = hh - v.y * hh;
    if (behind) { tx = hw * 2 - tx; ty = hh * 2 - ty; }

    const dx = tx - hw, dy = ty - hh;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const pad = 10;
    const px = Math.max(pad, Math.min(window.innerWidth  - pad, tx));
    const py = Math.max(pad, Math.min(window.innerHeight - pad, ty));
    this.panelEl.style.transform = `translate(${px}px, ${py}px)`;

    const onScreen = !behind
      && tx > pad && tx < window.innerWidth - pad
      && ty > pad && ty < window.innerHeight - pad;
    this.panelEl.style.opacity = onScreen ? '1' : '0.15';

    /* ── panel lock ── */
    const panelLocked = dist < LOCK_RADIUS && onScreen;
    this.panelEl.classList.toggle('locked', panelLocked);

    /* ── celestial labels + target lock-on (before reticle positioning) ── */
    this._updateCelestialLabels(scene.camera, hw, hh);

    /* ── reticle position: target-lock > panel-lock > screen centre ── */
    const svg = this.reticleEl.querySelector('.reticle-svg');
    if (this.targetLockPos) {
      this.reticleEl.style.transform =
        `translate(${this.targetLockPos.x}px, ${this.targetLockPos.y}px)`;
      if (svg) svg.style.transform = 'rotate(0deg)';
      this.reticleEl.classList.add('locked');
    } else if (panelLocked) {
      this.reticleEl.style.transform = `translate(${px}px, ${py}px)`;
      if (svg) svg.style.transform = 'rotate(0deg)';
      this.reticleEl.classList.add('locked');
    } else {
      this.reticleEl.style.transform = `translate(${hw}px, ${hh}px)`;
      const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
      if (svg) svg.style.transform = `rotate(${angle}deg)`;
      this.reticleEl.classList.remove('locked');
    }

    /* ── recalculate az/alt every second ── */
    this.recalcTimer += dt;
    if (this.recalcTimer >= 1 && this.lastLat != null) {
      this.recalcTimer = 0;
      this.lastDate = new Date();
      this._recalc();
    }

    /* ── tick distance ── */
    if (this.resultant) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const el = document.getElementById('wf-dist');
      if (el) el.textContent = fmtDist(this.resultant.magnitude * elapsed);
    }
  }

  /* ── DOM ────────────────────────────────────────────────── */

  _build() {
    /* ── Reticle (approved — don't change) ── */
    this.reticleEl = document.createElement('div');
    this.reticleEl.id = 'hud-reticle';
    this.reticleEl.innerHTML = `
      <svg class="reticle-svg" viewBox="-60 -60 120 120" width="160" height="160">
        <circle cx="0" cy="0" r="40" fill="none" stroke="#4af" stroke-width="0.5" opacity="0.25"/>
        <line x1="0" y1="-24" x2="0" y2="-38" stroke="#4af" stroke-width="0.6" opacity="0.4"/>
        <line x1="0" y1="24"  x2="0" y2="38"  stroke="#4af" stroke-width="0.6" opacity="0.4"/>
        <line x1="-24" y1="0" x2="-38" y2="0" stroke="#4af" stroke-width="0.6" opacity="0.4"/>
        <line x1="24"  y1="0" x2="38"  y2="0" stroke="#4af" stroke-width="0.6" opacity="0.4"/>
        <path d="M-7,-44 L0,-53 L7,-44" fill="none" stroke="#4af" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>
        <path d="M-5,-50 L0,-57 L5,-50" fill="none" stroke="#4af" stroke-width="0.6" opacity="0.35"/>
        <path d="M44,-5 L53,0 L44,5"    fill="none" stroke="#4af" stroke-width="0.5" opacity="0.15"/>
        <path d="M-44,-5 L-53,0 L-44,5" fill="none" stroke="#4af" stroke-width="0.5" opacity="0.15"/>
        <path d="M-5,44 L0,53 L5,44"    fill="none" stroke="#4af" stroke-width="0.5" opacity="0.15"/>
        <circle cx="0" cy="0" r="2" fill="none" stroke="#4af" stroke-width="0.6" opacity="0.5"/>
        <circle cx="0" cy="0" r="0.7" fill="#e0f0ff"/>
      </svg>
      <div class="reticle-target"></div>`;
    document.body.appendChild(this.reticleEl);

    /* ── Window frame ── */
    this.panelEl = document.createElement('div');
    this.panelEl.id = 'hud-panel';
    this.panelEl.innerHTML = `
      <div class="wf-label" id="wf-label"></div>
      <div class="wf-top">
        <span class="wf-left"><span class="wf-speed" id="wf-speed">---</span> <span class="wf-unit">km/s</span></span>
        <span class="wf-right"><span class="wf-dist" id="wf-dist">0</span> <span class="wf-unit">km</span></span>
      </div>
      <div class="wf-bottom">
        <span class="wf-az" id="wf-az">---°</span>
        <span class="wf-alt" id="wf-alt">---°</span>
      </div>`;
    document.body.appendChild(this.panelEl);

    /* ── Celestial body labels ── */
    this.celLabels = CELESTIAL_BODIES.map(body => {
      const div = document.createElement('div');
      div.className = 'cel-label';
      const azAltId = `cel-azalt-${body.id}`;
      div.innerHTML = `
        <div class="cel-name">${body.name}</div>
        <div class="cel-type">${body.type}</div>
        <div class="cel-data">
          ${body.dist}<br>
          <span id="${azAltId}">---</span>
        </div>`;
      document.body.appendChild(div);
      return {
        id: body.id,
        dom: div,
        azAltEl: div.querySelector(`#${azAltId}`),
      };
    });
  }

  _updateCelestialLabels(camera, hw, hh) {
    const _pos = new THREE.Vector3();
    // Collect screen positions for all visible bodies
    const bodyScreens = [];

    this.celLabels.forEach(label => {
      const el = document.getElementById(label.id);
      if (!el?.object3D) { label.dom.style.opacity = '0'; return; }

      el.object3D.updateWorldMatrix(true, false);
      el.object3D.getWorldPosition(_pos);
      const p = _pos.clone().project(camera);

      if (p.z > 1) { label.dom.style.opacity = '0'; return; }

      const sx = hw + p.x * hw;
      const sy = hh - p.y * hh;
      const dx = sx - hw, dy = sy - hh;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const opacity = Math.max(0, Math.min(1,
        (LABEL_FADE_START - dist) / (LABEL_FADE_START - LABEL_FADE_END)));
      label.dom.style.opacity = opacity.toFixed(3);
      label.dom.style.transform = `translate(${sx + 20}px, ${sy - 30}px)`;

      bodyScreens.push({ label, sx, sy, distFromCentre: dist });

      // Update az/alt from world position
      if (opacity > 0.01) {
        const len = _pos.length();
        const alt = Math.asin(_pos.y / len);
        const az  = Math.atan2(-_pos.z, -_pos.x);
        const corr = this.sceneManager.compassCorrection ?? 0;
        const azDeg  = ((Coordinates.toDegrees(az) + corr) % 360 + 360) % 360;
        const altDeg = Coordinates.toDegrees(alt);
        const sign = altDeg >= 0 ? '+' : '';
        label.azAltEl.textContent = `${azDeg.toFixed(1)}° ${sign}${altDeg.toFixed(1)}°`;
      }
    });

    // ── Sticky target lock-on ──
    // Release: locked body went behind camera or was dragged far from screen centre
    if (this.targetLock) {
      const cur = bodyScreens.find(b => b.label === this.targetLock);
      if (!cur || cur.distFromCentre > TARGET_RELEASE) {
        this.targetLock = null;
        this.targetLockPos = null;
      } else {
        this.targetLockPos = { x: cur.sx, y: cur.sy };
      }
    }

    // Capture: closest body within reticle circle of screen centre
    if (!this.targetLock) {
      let best = null, bestDist = Infinity;
      for (const b of bodyScreens) {
        if (b.distFromCentre < RETICLE_LOCK_PX && b.distFromCentre < bestDist) {
          best = b;
          bestDist = b.distFromCentre;
        }
      }
      if (best) {
        this.targetLock = best.label;
        this.targetLockPos = { x: best.sx, y: best.sy };
      }
    }

    // Update reticle target-lock visuals
    this.reticleEl.classList.toggle('target-lock', !!this.targetLock);
    const targetEl = this.reticleEl.querySelector('.reticle-target');
    if (targetEl) {
      if (this.targetLock) {
        const body = CELESTIAL_BODIES.find(b => b.id === this.targetLock.id);
        targetEl.textContent = body?.name || '';
      } else {
        targetEl.textContent = '';
      }
    }
  }

  _rebuildRows() {
    if (!this.panelEl || !this.resultant) return;
    const m = this.resultant.magnitude;

    // Label = highest active level name
    const top = this.levelData[this.levelData.length - 1];
    this._s('wf-label', top ? top.name.toUpperCase() : '');

    this._s('wf-speed', m < 10 ? m.toFixed(2) : m.toFixed(1));
    this._s('wf-az', `${this.resultant.azimuthDegrees.toFixed(1)}°`);
    const sign = this.resultant.altitudeDegrees >= 0 ? '+' : '';
    this._s('wf-alt', `${sign}${this.resultant.altitudeDegrees.toFixed(1)}°`);
  }

  _s(id, t) { const e = document.getElementById(id); if (e) e.textContent = t; }
}
