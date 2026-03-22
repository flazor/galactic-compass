/**
 * MarkersMode — Cockpit Window HUD
 *
 * RETICLE  — screen-centre crosshair. Chevrons rotate to point toward
 *            the travel direction. Slides to lock onto the panel centre
 *            when you look directly at the velocity vector.
 *
 * PANEL    — large transparent cockpit-window frame projected at the
 *            resultant velocity direction. Data is arranged around the
 *            edges (top strip: velocity; bottom strip: bearing + levels).
 *            Centre is open so the starfield shows through.
 */
import { calculateVectorSum } from '../../../cosmic-core/src/calculations/CelestialCalculations.js';
import { Coordinates } from '../../../cosmic-core/src/astronomy/Coordinates.js';

const C            = 299792.458;
const PROJECT_DIST = 5;
const LOCK_RADIUS  = 60;

export class MarkersMode {
  constructor(sceneManager, uiControls, levelManager) {
    this.sceneManager = sceneManager;
    this.uiControls   = uiControls;
    this.levelManager = levelManager;
    this.needsAnimation   = true;
    this.needsRenderReplay = true;

    this.resultant = null;
    this.worldPos  = null;
    this.levelData = [];
    this.reticleEl = null;
    this.panelEl   = null;
    this.lastLat   = null;
    this.lastLon   = null;
    this.lastDate  = null;
  }

  /* ── lifecycle ─────────────────────────────────────────── */

  activate() {
    this.sceneManager.hideAllMotionContainers();
    if (!this.reticleEl) this._build();
    this.reticleEl.style.display = '';
    this.panelEl.style.display   = '';
  }

  deactivate() {
    if (this.reticleEl) this.reticleEl.style.display = 'none';
    if (this.panelEl)   this.panelEl.style.display   = 'none';
  }

  /* ── data (≈1 Hz) ──────────────────────────────────────── */

  render(activeLevels, lat, lon, date) {
    this.lastLat = lat; this.lastLon = lon; this.lastDate = date;
    this._recalc();
  }

  onLevelChange() { if (this.lastLat != null) this._recalc(); }

  _recalc() {
    this.sceneManager.hideAllMotionContainers();
    const lvl  = this.levelManager?.getMaxLevel() ?? 1;
    const data = calculateVectorSum(this.lastLat, this.lastLon, this.lastDate, lvl);
    if (!data?.resultant) return;

    this.resultant = data.resultant;
    this.levelData = (data.activeVectors || []).map(v => ({
      name: v.name, velocity: v.velocity,
    }));

    const corr = Coordinates.toRadians(this.sceneManager.compassCorrection ?? 0);
    const az   = Coordinates.toRadians(this.resultant.azimuthDegrees);
    const alt  = Coordinates.toRadians(this.resultant.altitudeDegrees);
    const dir  = new THREE.Vector3(
      -Math.cos(alt) * Math.cos(az),
       Math.sin(alt),
      -Math.cos(alt) * Math.sin(az),
    ).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), corr);
    this.worldPos = dir.multiplyScalar(PROJECT_DIST);

    this._setText();
  }

  /* ── per-frame (60 Hz) ─────────────────────────────────── */

  update(dt) {
    if (!this.panelEl || !this.worldPos) return;
    const scene = document.querySelector('a-scene');
    if (!scene?.camera) return;

    const v = this.worldPos.clone().project(scene.camera);
    const behind = v.z > 1;
    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;

    let tx = hw + v.x * hw;
    let ty = hh - v.y * hh;
    if (behind) { tx = hw * 2 - tx; ty = hh * 2 - ty; }

    const dx = tx - hw;
    const dy = ty - hh;
    const dist = Math.sqrt(dx * dx + dy * dy);

    /* ── panel position ── */
    const pad = 10;
    const px = Math.max(pad, Math.min(window.innerWidth  - pad, tx));
    const py = Math.max(pad, Math.min(window.innerHeight - pad, ty));
    this.panelEl.style.transform = `translate(${px}px, ${py}px)`;

    const onScreen = !behind
      && tx > pad && tx < window.innerWidth - pad
      && ty > pad && ty < window.innerHeight - pad;
    this.panelEl.style.opacity = onScreen ? '1' : '0.2';

    /* ── lock detection ── */
    const locked = dist < LOCK_RADIUS && onScreen;
    this.panelEl.classList.toggle('locked', locked);
    this.reticleEl.classList.toggle('locked', locked);

    /* ── reticle ── */
    const svg = this.reticleEl.querySelector('.reticle-svg');
    if (locked) {
      this.reticleEl.style.transform = `translate(${px}px, ${py}px)`;
      if (svg) svg.style.transform = 'rotate(0deg)';
    } else {
      this.reticleEl.style.transform = `translate(${hw}px, ${hh}px)`;
      const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
      if (svg) svg.style.transform = `rotate(${angle}deg)`;
    }
  }

  /* ── DOM ────────────────────────────────────────────────── */

  _build() {
    /* ── Reticle ── */
    this.reticleEl = document.createElement('div');
    this.reticleEl.id = 'hud-reticle';
    this.reticleEl.innerHTML = `
      <svg class="reticle-svg" viewBox="-60 -60 120 120" width="160" height="160">
        <!-- rings -->
        <circle cx="0" cy="0" r="40" fill="none" stroke="#4af" stroke-width="0.5" opacity="0.25"/>
        <!-- crosshair lines -->
        <line x1="0" y1="-24" x2="0" y2="-38" stroke="#4af" stroke-width="0.6" opacity="0.4"/>
        <line x1="0" y1="24"  x2="0" y2="38"  stroke="#4af" stroke-width="0.6" opacity="0.4"/>
        <line x1="-24" y1="0" x2="-38" y2="0" stroke="#4af" stroke-width="0.6" opacity="0.4"/>
        <line x1="24"  y1="0" x2="38"  y2="0" stroke="#4af" stroke-width="0.6" opacity="0.4"/>
        <!-- primary chevron (top) — points toward target -->
        <path d="M-7,-44 L0,-53 L7,-44" fill="none" stroke="#4af" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>
        <path d="M-5,-50 L0,-57 L5,-50" fill="none" stroke="#4af" stroke-width="0.6" opacity="0.35"/>
        <!-- subtle side/bottom chevrons -->
        <path d="M44,-5 L53,0 L44,5"    fill="none" stroke="#4af" stroke-width="0.5" opacity="0.15"/>
        <path d="M-44,-5 L-53,0 L-44,5" fill="none" stroke="#4af" stroke-width="0.5" opacity="0.15"/>
        <path d="M-5,44 L0,53 L5,44"    fill="none" stroke="#4af" stroke-width="0.5" opacity="0.15"/>
        <!-- centre pip -->
        <circle cx="0" cy="0" r="2" fill="none" stroke="#4af" stroke-width="0.6" opacity="0.5"/>
        <circle cx="0" cy="0" r="0.7" fill="#e0f0ff"/>
      </svg>`;
    document.body.appendChild(this.reticleEl);

    /* ── Panel (cockpit window frame) ── */
    this.panelEl = document.createElement('div');
    this.panelEl.id = 'hud-panel';
    this.panelEl.innerHTML = `
      <div class="cw-top">
        <span class="cw-label" id="hp-label">RESULTANT</span>
        <span class="cw-speed" id="hp-speed">---</span>
        <span class="cw-unit">km/s</span>
        <span class="cw-sep"></span>
        <span class="cw-cfrac" id="hp-cfrac">-.---</span>
        <span class="cw-c">c</span>
      </div>
      <div class="cw-bottom">
        <div class="cw-bearing">
          <span class="cw-dim">AZ</span><span id="hp-az">---°</span>
          <span class="cw-dim">ALT</span><span id="hp-alt">---°</span>
          <span class="cw-dim">LVL</span><span id="hp-lvl">-</span>
        </div>
        <div class="cw-levels" id="hp-levels"></div>
      </div>`;
    document.body.appendChild(this.panelEl);
  }

  _setText() {
    if (!this.panelEl || !this.resultant) return;
    const m = this.resultant.magnitude;
    const lvl = this.levelManager?.getMaxLevel() ?? 1;

    this._s('hp-speed', m < 10 ? m.toFixed(2) : m.toFixed(1));
    const cf = m / C;
    this._s('hp-cfrac', cf < 0.001 ? cf.toExponential(2) : cf.toFixed(6));
    this._s('hp-az',  `${this.resultant.azimuthDegrees.toFixed(1)}°`);
    const sign = this.resultant.altitudeDegrees >= 0 ? '+' : '';
    this._s('hp-alt', `${sign}${this.resultant.altitudeDegrees.toFixed(1)}°`);
    this._s('hp-lvl', lvl);

    const el = document.getElementById('hp-levels');
    if (el) {
      el.innerHTML = this.levelData.map(l => {
        const v = l.velocity < 10 ? l.velocity.toFixed(2) : l.velocity.toFixed(1);
        const n = l.name
          .replace("Earth's Orbit Around Sun", 'Orbit')
          .replace("Solar System's Galactic Orbit", 'Galactic')
          .replace('Earth Rotation', 'Rotation');
        return `<span class="cw-lv"><span class="cw-ln">${n}</span> ${v}</span>`;
      }).join('');
    }
  }

  _s(id, t) { const e = document.getElementById(id); if (e) e.textContent = t; }
}
