/**
 * ParticlesMode — Photorealistic spark particles
 *
 * All particles are hot sparks: bright white/yellow core fading through
 * orange to red as they cool, shrinking as they die. Additive blending
 * gives a natural glow against the dark sky.
 *
 *   1. Exhaust sparks — stream backward from hoverboard
 *   2. Incoming sparks — fly in from the direction of travel
 *   3. Moon sparks (level 2+) — drift from the moon's direction
 *   4. Sun sparks (level 3+) — drift from the sun's direction
 */
import { calculateVectorSum } from '../../../cosmic-core/src/calculations/CelestialCalculations.js';
import { Coordinates } from '../../../cosmic-core/src/astronomy/Coordinates.js';

// Particle counts
const MAX_EXHAUST  = 60;
const MAX_INCOMING = 30;
const MAX_MOON     = 20;
const MAX_SUN      = 20;

// Layout
const BOARD_HALF   = 0.2;
const BOARD_Y      = -1.0;
const SPAWN_DIST   = 2.5;
const SPREAD       = 0.25;
const CEL_SPREAD   = 0.04;

// Timing
const EXHAUST_LIFE  = 2.5;
const INCOMING_LIFE = 8;
const CEL_LIFE      = 10;
const BASE_SPEED    = 1.5;

// Spark colour ramp (t: 0 = birth, 1 = death)
// white → yellow → orange → red → dark
const RAMP = [
  { t: 0.0, r: 1.0,  g: 0.95, b: 0.85 },  // hot white
  { t: 0.15, r: 1.0,  g: 0.85, b: 0.4  },  // bright yellow
  { t: 0.4, r: 1.0,  g: 0.5,  b: 0.1  },  // orange
  { t: 0.7, r: 0.8,  g: 0.15, b: 0.0  },  // red
  { t: 1.0, r: 0.3,  g: 0.05, b: 0.0  },  // ember
];

function sparkColor(t) {
  t = Math.max(0, Math.min(1, t));
  let i = 0;
  while (i < RAMP.length - 2 && RAMP[i + 1].t < t) i++;
  const a = RAMP[i], b = RAMP[i + 1];
  const f = (t - a.t) / (b.t - a.t);
  const r = Math.round((a.r + (b.r - a.r) * f) * 255);
  const g = Math.round((a.g + (b.g - a.g) * f) * 255);
  const bl = Math.round((a.b + (b.b - a.b) * f) * 255);
  return `rgb(${r},${g},${bl})`;
}

function sparkOpacity(t) {
  if (t < 0.1) return t / 0.1;        // fade in
  if (t > 0.6) return 1 - (t - 0.6) / 0.4;  // fade out
  return 1;
}

export class ParticlesMode {
  constructor(sceneManager, uiControls, levelManager) {
    this.sceneManager = sceneManager;
    this.uiControls = uiControls;
    this.levelManager = levelManager;
    this.needsAnimation = true;

    this.container = null;
    this.exhaustParticles  = [];
    this.incomingParticles = [];
    this.moonParticles     = [];
    this.sunParticles      = [];

    this.exhaustDir = new THREE.Vector3(0, 0, 1);
    this.moveDir    = new THREE.Vector3(0, 0, -1);

    this.speed = 1;
    this.lastLat  = null;
    this.lastLon  = null;
    this.lastDate = null;
  }

  activate() {
    this.createContainer();
    this.uiControls?.debugLog('Particles mode activated');
  }

  deactivate() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.exhaustParticles  = [];
    this.incomingParticles = [];
    this.moonParticles     = [];
    this.sunParticles      = [];
    this.uiControls?.debugLog('Particles mode deactivated');
  }

  render(activeLevels, lat, lon, date) {
    this.lastLat  = lat;
    this.lastLon  = lon;
    this.lastDate = date;
    this.updateDirections();
  }

  onLevelChange(activeLevels) {
    if (this.lastLat == null) return;
    this.updateDirections();
    const maxLevel = this.levelManager?.getMaxLevel() ?? 1;
    if (maxLevel < 2) this.clearStream(this.moonParticles);
    if (maxLevel < 3) this.clearStream(this.sunParticles);
  }

  updateDirections() {
    if (!this.levelManager) return;
    const maxLevel = this.levelManager.getMaxLevel();
    const vectorSumData = calculateVectorSum(this.lastLat, this.lastLon, this.lastDate, maxLevel);
    if (!vectorSumData?.resultant) return;

    this.speed = vectorSumData.resultant.magnitude;
    const corrRad = Coordinates.toRadians(this.sceneManager.compassCorrection ?? 0);
    this.moveDir.copy(
      azAltToWorldDir(vectorSumData.resultant.azimuthDegrees, vectorSumData.resultant.altitudeDegrees, corrRad)
    );
    this.exhaustDir.copy(this.moveDir).negate();
  }

  update(dt) {
    if (!this.container || dt <= 0) return;

    const vs = BASE_SPEED * Math.log10(Math.max(this.speed, 1) + 1);
    const maxLevel = this.levelManager?.getMaxLevel() ?? 1;
    const inMove = this.exhaustDir.clone().multiplyScalar(vs * 1.2 * dt);

    // 1. Exhaust sparks
    while (this.exhaustParticles.length < MAX_EXHAUST) this.spawnExhaust();
    this.advanceSparks(this.exhaustParticles,
      this.exhaustDir.clone().multiplyScalar(vs * dt), dt);

    // 2. Incoming sparks
    while (this.incomingParticles.length < MAX_INCOMING) this.spawnIncoming();
    this.advanceSparks(this.incomingParticles, inMove, dt);

    // 3. Moon sparks (level 2+)
    if (maxLevel >= 2) {
      const moonDir = this.getWorldDir('moon-sphere');
      if (moonDir) {
        while (this.moonParticles.length < MAX_MOON)
          this.spawnCelestial(moonDir, this.moonParticles);
        this.advanceSparks(this.moonParticles, inMove, dt);
      }
    }

    // 4. Sun sparks (level 3+)
    if (maxLevel >= 3) {
      const sunDir = this.getWorldDir('sun-sphere');
      if (sunDir) {
        while (this.sunParticles.length < MAX_SUN)
          this.spawnCelestial(sunDir, this.sunParticles);
        this.advanceSparks(this.sunParticles, inMove, dt);
      }
    }
  }

  /** Move particles, update spark colour/size/opacity, cull dead ones */
  advanceSparks(array, movement, dt) {
    for (let i = array.length - 1; i >= 0; i--) {
      const p = array[i];
      p.age += dt;
      const t = p.age / p.lifetime;

      if (t > 1 || p.position.length() < 0.15) {
        this.container.removeChild(p.el);
        array.splice(i, 1);
        continue;
      }

      // Move
      p.position.add(movement);
      // Slight gravity on exhaust (downward drift)
      if (p.gravity) p.position.y -= 0.15 * dt;

      if (p.el.object3D) {
        p.el.object3D.position.copy(p.position);
        // Shrink as it cools
        const scale = p.startScale * (1 - t * 0.7);
        p.el.object3D.scale.setScalar(scale);
      }

      // Update colour and opacity
      const mat = p.el.getObject3D('mesh')?.material;
      if (mat) {
        mat.color.setStyle(sparkColor(t));
        mat.opacity = sparkOpacity(t) * p.startOpacity;
      }
    }
  }

  spawnExhaust() {
    if (!this.container) return;
    const x = (Math.random() - 0.5) * BOARD_HALF * 2;
    const z = (Math.random() - 0.5) * BOARD_HALF * 2;
    const pos = new THREE.Vector3(x, BOARD_Y, z);
    const size = 0.008 + Math.random() * 0.012;
    this._spawn(pos, size, 0.9, EXHAUST_LIFE, this.exhaustParticles, true);
  }

  spawnIncoming() {
    if (!this.container) return;
    const pos = this.moveDir.clone().multiplyScalar(SPAWN_DIST)
      .add(perpendicularSpread(this.moveDir, SPREAD));
    const size = 0.004 + Math.random() * 0.008;
    this._spawn(pos, size, 0.85, INCOMING_LIFE, this.incomingParticles, false);
  }

  spawnCelestial(dir, array) {
    if (!this.container) return;
    const pos = dir.clone().multiplyScalar(SPAWN_DIST)
      .add(perpendicularSpread(dir, CEL_SPREAD));
    const size = 0.006 + Math.random() * 0.01;
    this._spawn(pos, size, 0.9, CEL_LIFE, array, false);
  }

  _spawn(pos, radius, opacity, baseLife, array, gravity) {
    const el = document.createElement('a-sphere');
    el.setAttribute('radius', radius);
    el.setAttribute('material',
      'shader: flat; color: #FFF3E0; transparent: true; opacity: 0; ' +
      'blending: additive; depthWrite: false');
    el.addEventListener('loaded', () => {
      if (el.object3D) el.object3D.position.copy(pos);
    });
    this.container.appendChild(el);
    array.push({
      el,
      position: pos.clone(),
      age: 0,
      lifetime: baseLife * (0.5 + Math.random()),
      startScale: 0.8 + Math.random() * 0.4,
      startOpacity: opacity,
      gravity,
    });
  }

  getWorldDir(elementId) {
    const el = document.getElementById(elementId);
    if (!el?.object3D) return null;
    const pos = new THREE.Vector3();
    el.object3D.getWorldPosition(pos);
    const len = pos.length();
    return len > 0.1 ? pos.divideScalar(len) : null;
  }

  clearStream(array) {
    array.forEach(p => { if (this.container) this.container.removeChild(p.el); });
    array.length = 0;
  }

  createContainer() {
    this.container = document.createElement('a-entity');
    this.container.id = 'particles-mode-container';

    // Hoverboard
    const board = document.createElement('a-plane');
    board.setAttribute('position', `0 ${BOARD_Y} 0`);
    board.setAttribute('rotation', '-90 0 0');
    board.setAttribute('width', BOARD_HALF * 2);
    board.setAttribute('height', BOARD_HALF * 2);
    board.setAttribute('color', '#AADDFF');
    board.setAttribute('material', 'opacity: 0.4; transparent: true; side: double');
    this.container.appendChild(board);

    const scene = document.querySelector('a-scene');
    if (scene) scene.appendChild(this.container);
  }
}

function azAltToWorldDir(azDeg, altDeg, corrRad) {
  const az  = Coordinates.toRadians(azDeg);
  const alt = Coordinates.toRadians(altDeg);
  const v = new THREE.Vector3(
    -Math.cos(alt) * Math.cos(az),
     Math.sin(alt),
    -Math.cos(alt) * Math.sin(az)
  ).normalize();
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), corrRad);
  return v;
}

function perpendicularSpread(dir, radius) {
  const arbitrary = Math.abs(dir.x) < 0.9
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(dir, arbitrary).normalize();
  const v = new THREE.Vector3().crossVectors(dir, u).normalize();
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return u.multiplyScalar(Math.cos(angle) * r).add(v.multiplyScalar(Math.sin(angle) * r));
}
