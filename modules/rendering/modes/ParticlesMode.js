/**
 * ParticlesMode - Multiple particle streams based on resultant velocity and celestial positions:
 *   1. Blue exhaust from the hoverboard at viewer's feet, streaming opposite to travel
 *   2. Yellow particles from the resultant marker, flying toward the camera
 *   3. (Level 2+) Silver particles from the moon, parallel to incoming
 *   4. (Level 3+) Warm white particles from the sun, parallel to incoming
 */
import { calculateVectorSum } from '../../../cosmic-core/src/calculations/CelestialCalculations.js';
import { Coordinates } from '../../../cosmic-core/src/astronomy/Coordinates.js';

const MAX_EXHAUST   = 80;
const MAX_INCOMING  = 40;
const MAX_MOON      = 30;
const MAX_SUN       = 30;
const BOARD_HALF    = 0.2;
const BOARD_Y       = -1.0;
const MARKER_DIST   = 2.0;
const MARKER_SPREAD = 0.3;
const CELESTIAL_SPREAD = 0.03;
const EXHAUST_LIFETIME  = 4;
const INCOMING_LIFETIME = 15;
const CELESTIAL_LIFETIME = 15;
const BASE_SPEED = 1.5;

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
    this.exhaustParticles   = [];
    this.incomingParticles  = [];
    this.moonParticles      = [];
    this.sunParticles       = [];
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

    // Clear streams that are no longer active at this level
    const maxLevel = this.levelManager?.getMaxLevel() ?? 1;
    if (maxLevel < 2) this.clearStream(this.moonParticles);
    if (maxLevel < 3) this.clearStream(this.sunParticles);
  }

  updateDirections() {
    if (!this.levelManager) return;

    const maxLevel = this.levelManager.getMaxLevel();
    const vectorSumData = calculateVectorSum(this.lastLat, this.lastLon, this.lastDate, maxLevel);
    if (!vectorSumData?.resultant) return;

    const resultant = vectorSumData.resultant;
    this.speed = resultant.magnitude;

    const corrRad = Coordinates.toRadians(this.sceneManager.compassCorrection ?? 0);

    this.moveDir.copy(
      azAltToWorldDir(resultant.azimuthDegrees, resultant.altitudeDegrees, corrRad)
    );
    this.exhaustDir.copy(this.moveDir).negate();

  }

  update(dt) {
    if (!this.container || dt <= 0) return;

    const visualSpeed = BASE_SPEED * Math.log10(Math.max(this.speed, 1) + 1);
    const maxLevel = this.levelManager?.getMaxLevel() ?? 1;
    const incomingMove = this.exhaustDir.clone().multiplyScalar(visualSpeed * 1.2 * dt);

    // 1. Exhaust (blue, from hoverboard)
    while (this.exhaustParticles.length < MAX_EXHAUST) this.spawnExhaust();
    this.moveAndCull(this.exhaustParticles,
      this.exhaustDir.clone().multiplyScalar(visualSpeed * dt), dt,
      p => p.age > p.lifetime);

    // 2. Incoming (yellow, from resultant marker)
    while (this.incomingParticles.length < MAX_INCOMING) this.spawnIncoming();
    this.moveAndCull(this.incomingParticles, incomingMove, dt,
      p => p.age > p.lifetime || p.position.length() < 0.2);

    // 3. Moon (silver, level 2+)
    if (maxLevel >= 2) {
      const moonDir = this.getWorldDir('moon-sphere');
      if (moonDir) {
        while (this.moonParticles.length < MAX_MOON)
          this.spawnCelestial(moonDir, '#DDDDDD', this.moonParticles);
        this.moveAndCull(this.moonParticles, incomingMove, dt,
          p => p.age > p.lifetime || p.position.length() < 0.2);
      }
    }

    // 4. Sun (warm white, level 3+)
    if (maxLevel >= 3) {
      const sunDir = this.getWorldDir('sun-sphere');
      if (sunDir) {
        while (this.sunParticles.length < MAX_SUN)
          this.spawnCelestial(sunDir, '#FFFFDD', this.sunParticles);
        this.moveAndCull(this.sunParticles, incomingMove, dt,
          p => p.age > p.lifetime || p.position.length() < 0.2);
      }
    }

  }

  moveAndCull(array, movement, dt, shouldDespawn) {
    for (let i = array.length - 1; i >= 0; i--) {
      const p = array[i];
      p.age += dt;
      p.position.add(movement);
      if (p.el.object3D) p.el.object3D.position.copy(p.position);
      if (shouldDespawn(p)) {
        this.container.removeChild(p.el);
        array.splice(i, 1);
      }
    }
  }

  spawnExhaust() {
    if (!this.container) return;
    const el = document.createElement('a-sphere');
    el.setAttribute('radius', 0.015);
    el.setAttribute('color', '#AADDFF');
    el.setAttribute('material', 'opacity: 0.6; transparent: true');

    const x = (Math.random() - 0.5) * BOARD_HALF * 2;
    const z = (Math.random() - 0.5) * BOARD_HALF * 2;
    const pos = new THREE.Vector3(x, BOARD_Y, z);
    el.addEventListener('loaded', () => { if (el.object3D) el.object3D.position.copy(pos); });
    this.container.appendChild(el);
    this.exhaustParticles.push({ el, position: pos, age: 0,
      lifetime: EXHAUST_LIFETIME * (0.5 + Math.random()) });
  }

  spawnIncoming() {
    if (!this.container) return;
    const pos = this.moveDir.clone().multiplyScalar(MARKER_DIST)
      .add(perpendicularSpread(this.moveDir, MARKER_SPREAD));
    this.spawnSphere(pos, 0.003, '#FFD700', 0.8, this.incomingParticles, INCOMING_LIFETIME);
  }

  spawnCelestial(dir, color, array) {
    if (!this.container) return;
    const pos = dir.clone().multiplyScalar(MARKER_DIST)
      .add(perpendicularSpread(dir, CELESTIAL_SPREAD));
    this.spawnSphere(pos, 0.008, color, 1.0, array, CELESTIAL_LIFETIME);
  }

  spawnSphere(pos, radius, color, opacity, array, baseLifetime) {
    const el = document.createElement('a-sphere');
    el.setAttribute('radius', radius);
    el.setAttribute('color', color);
    el.setAttribute('material', `opacity: ${opacity}; transparent: true`);
    el.addEventListener('loaded', () => { if (el.object3D) el.object3D.position.copy(pos); });
    this.container.appendChild(el);
    array.push({ el, position: pos.clone(), age: 0,
      lifetime: baseLifetime * (0.6 + Math.random() * 0.8) });
  }

  // Get the normalised world-space direction to a scene element (e.g. moon-sphere)
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

/**
 * Convert azimuth (degrees) + altitude (degrees) to an A-Frame world-space unit vector,
 * then rotate by compassCorrection (radians) around Y.
 * Compass convention: North = -X, East = -Z, Up = +Y.
 */
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

/**
 * Random offset within a disc perpendicular to dir.
 */
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
