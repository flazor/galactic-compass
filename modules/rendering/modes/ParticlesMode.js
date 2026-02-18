/**
 * ParticlesMode - Two particle streams based on the resultant velocity vector:
 *   1. Blue exhaust from the hoverboard at viewer's feet, streaming opposite to travel
 *   2. Yellow particles from the resultant marker in the sky, flying toward the camera
 */
import { calculateVectorSum } from '../../../cosmic-core/src/calculations/CelestialCalculations.js';
import { Coordinates } from '../../../cosmic-core/src/astronomy/Coordinates.js';

const MAX_EXHAUST = 80;
const MAX_INCOMING = 40;
const BOARD_HALF = 0.2;           // hoverboard half-width (metres)
const BOARD_Y = -1.0;             // below camera (eye level)
const MARKER_DIST = 2.0;          // resultant marker distance from camera
const MARKER_SPREAD = 0.3;        // spawn spread radius on the marker disc
const EXHAUST_LIFETIME = 4;       // seconds
const INCOMING_LIFETIME = 2;      // seconds (shorter — closer distance)
const BASE_SPEED = 1.5;

export class ParticlesMode {
  constructor(sceneManager, uiControls, levelManager) {
    this.sceneManager = sceneManager;
    this.uiControls = uiControls;
    this.levelManager = levelManager;
    this.needsAnimation = true;

    this.container = null;
    this.exhaustParticles = [];
    this.incomingParticles = [];
    this.exhaustDir = new THREE.Vector3(0, 0, 1);
    this.moveDir = new THREE.Vector3(0, 0, -1); // direction of travel (toward marker)
    this.speed = 1;
    this.lastLat = null;
    this.lastLon = null;
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
    this.exhaustParticles = [];
    this.incomingParticles = [];
    this.uiControls?.debugLog('Particles mode deactivated');
  }

  render(activeLevels, lat, lon, date) {
    this.lastLat = lat;
    this.lastLon = lon;
    this.lastDate = date;
    this.updateDirections();
  }

  onLevelChange(activeLevels) {
    if (this.lastLat != null) this.updateDirections();
  }

  updateDirections() {
    if (!this.levelManager) return;

    const maxLevel = this.levelManager.getMaxLevel();
    const vectorSumData = calculateVectorSum(this.lastLat, this.lastLon, this.lastDate, maxLevel);
    if (!vectorSumData?.resultant) return;

    const resultant = vectorSumData.resultant;
    this.speed = resultant.magnitude;

    const az = Coordinates.toRadians(resultant.azimuthDegrees);
    const alt = Coordinates.toRadians(resultant.altitudeDegrees);

    // Map azimuth/altitude to A-Frame world space.
    // Compass entities: North = -X, East = -Z, Up = +Y.
    const moveDir = new THREE.Vector3(
      -Math.cos(alt) * Math.cos(az),
      Math.sin(alt),
      -Math.cos(alt) * Math.sin(az)
    ).normalize();

    // Apply compass correction to match scene orientation set at page load
    const corrRad = Coordinates.toRadians(this.sceneManager.compassCorrection ?? 0);
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), corrRad);

    this.moveDir.copy(moveDir);
    this.exhaustDir.copy(moveDir).negate();
  }

  update(dt) {
    if (!this.container || dt <= 0) return;

    const visualSpeed = BASE_SPEED * Math.log10(Math.max(this.speed, 1) + 1);

    // --- Exhaust particles (blue, from hoverboard) ---
    while (this.exhaustParticles.length < MAX_EXHAUST) {
      this.spawnExhaust();
    }
    const exhaustMove = this.exhaustDir.clone().multiplyScalar(visualSpeed * dt);
    for (let i = this.exhaustParticles.length - 1; i >= 0; i--) {
      const p = this.exhaustParticles[i];
      p.age += dt;
      if (p.age > p.lifetime) {
        this.container.removeChild(p.el);
        this.exhaustParticles.splice(i, 1);
        continue;
      }
      p.position.add(exhaustMove);
      if (p.el.object3D) p.el.object3D.position.copy(p.position);
    }

    // --- Incoming particles (yellow, from resultant marker) ---
    while (this.incomingParticles.length < MAX_INCOMING) {
      this.spawnIncoming();
    }
    const incomingMove = this.exhaustDir.clone().multiplyScalar(visualSpeed * 1.2 * dt);
    for (let i = this.incomingParticles.length - 1; i >= 0; i--) {
      const p = this.incomingParticles[i];
      p.age += dt;
      if (p.age > p.lifetime || p.position.length() < 0.2) {
        this.container.removeChild(p.el);
        this.incomingParticles.splice(i, 1);
        continue;
      }
      p.position.add(incomingMove);
      if (p.el.object3D) p.el.object3D.position.copy(p.position);
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

    el.addEventListener('loaded', () => {
      if (el.object3D) el.object3D.position.copy(pos);
    });
    this.container.appendChild(el);
    this.exhaustParticles.push({ el, position: pos, age: 0, lifetime: EXHAUST_LIFETIME * (0.5 + Math.random()) });
  }

  spawnIncoming() {
    if (!this.container) return;
    const el = document.createElement('a-sphere');
    el.setAttribute('radius', 0.003);
    el.setAttribute('color', '#FFD700');
    el.setAttribute('material', 'opacity: 0.8; transparent: true');

    // Spawn spread across the marker disc (perpendicular to moveDir)
    const markerCenter = this.moveDir.clone().multiplyScalar(MARKER_DIST);
    const spread = perpendicularSpread(this.moveDir, MARKER_SPREAD);
    const pos = markerCenter.clone().add(spread);

    el.addEventListener('loaded', () => {
      if (el.object3D) el.object3D.position.copy(pos);
    });
    this.container.appendChild(el);
    this.incomingParticles.push({ el, position: pos, age: 0, lifetime: INCOMING_LIFETIME * (0.6 + Math.random() * 0.8) });
  }

  createContainer() {
    this.container = document.createElement('a-entity');
    this.container.id = 'particles-mode-container';

    // Hoverboard square at viewer's feet
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
 * Random offset vector within a disc perpendicular to the given direction.
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
