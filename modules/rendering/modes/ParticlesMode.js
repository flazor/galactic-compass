/**
 * ParticlesMode - Particles flow past observer opposite to resultant velocity
 *
 * Uses requestAnimationFrame via VisualizationModeManager's animation loop.
 * Particles spawn at leading edge and flow past camera.
 */
import { calculateVectorSum } from '../../../cosmic-core/src/calculations/CelestialCalculations.js';
import { Coordinates } from '../../../cosmic-core/src/astronomy/Coordinates.js';

const MAX_PARTICLES = 50;
const SPAWN_DISTANCE = 5;       // spawn radius from camera
const DESPAWN_DISTANCE = 10;    // remove when this far behind
const PARTICLE_RADIUS = 0.02;
const BASE_SPEED = 2;           // base visual speed multiplier (tuned for feel)

export class ParticlesMode {
  constructor(sceneManager, uiControls, levelManager) {
    this.sceneManager = sceneManager;
    this.uiControls = uiControls;
    this.levelManager = levelManager;
    this.needsAnimation = true;

    this.container = null;
    this.particles = [];
    this.flowDirection = new THREE.Vector3(0, 0, -1); // default until calculated
    this.speed = 1;
    this.lat = null;
    this.lon = null;
    this.compassCorrection = 0;
  }

  activate() {
    // Hide markers
    this.sceneManager.hideAllMotionContainers();
    this.createContainer();
    this.uiControls?.debugLog('Particles mode activated');
  }

  deactivate() {
    this.destroyParticles();
    this.removeContainer();
    this.uiControls?.debugLog('Particles mode deactivated');
  }

  render(activeLevels, lat, lon, date) {
    this.lat = lat;
    this.lon = lon;

    if (!this.levelManager) return;

    const maxLevel = this.levelManager.getMaxLevel();
    const vectorSumData = calculateVectorSum(lat, lon, date, maxLevel);
    if (!vectorSumData?.resultant) return;

    const resultant = vectorSumData.resultant;
    this.speed = resultant.magnitude;

    // Convert azimuth/altitude to a 3D direction vector
    // Azimuth: 0=N, 90=E. Altitude: + = up.
    const az = Coordinates.toRadians(resultant.azimuthDegrees);
    const alt = Coordinates.toRadians(resultant.altitudeDegrees);

    // Direction the observer is moving toward
    const moveDir = new THREE.Vector3(
      Math.cos(alt) * Math.sin(az),
      Math.sin(alt),
      Math.cos(alt) * Math.cos(az)
    ).normalize();

    // Particles flow in the OPPOSITE direction (they appear to come from ahead)
    this.flowDirection.copy(moveDir).negate();
  }

  onLevelChange(activeLevels) {
    // Speed/direction will update on next render pass
  }

  update(dt) {
    if (!this.container || dt <= 0) return;

    // Spawn new particles up to MAX_PARTICLES
    while (this.particles.length < MAX_PARTICLES) {
      this.spawnParticle();
    }

    // Scale visual speed: log scale so very fast velocities don't just blur
    const visualSpeed = BASE_SPEED * Math.log10(Math.max(this.speed, 1) + 1);

    // Move each particle along flow direction
    const movement = this.flowDirection.clone().multiplyScalar(visualSpeed * dt);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.position.add(movement);

      // Despawn if too far from origin
      if (p.position.length() > DESPAWN_DISTANCE) {
        this.container.removeChild(p.el);
        this.particles.splice(i, 1);
      }
    }
  }

  spawnParticle() {
    if (!this.container) return;

    // Spawn in a disc perpendicular to flow direction, at the leading edge
    const spawnCenter = this.flowDirection.clone().negate().multiplyScalar(SPAWN_DISTANCE);

    // Random offset perpendicular to flow direction
    const offset = randomPerpendicularOffset(this.flowDirection, SPAWN_DISTANCE * 0.8);
    const pos = spawnCenter.add(offset);

    const el = document.createElement('a-sphere');
    el.setAttribute('radius', PARTICLE_RADIUS);
    el.setAttribute('color', '#AADDFF');
    el.setAttribute('material', 'opacity: 0.6; transparent: true');
    this.container.appendChild(el);

    // Use object3D for position (performance)
    el.addEventListener('loaded', () => {
      el.object3D.position.copy(pos);
    });

    this.particles.push({ el, position: pos });
  }

  createContainer() {
    this.container = document.createElement('a-entity');
    this.container.id = 'particles-mode-container';
    const scene = document.querySelector('a-scene');
    if (scene) {
      scene.appendChild(this.container);
    }
  }

  removeContainer() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  destroyParticles() {
    this.particles = [];
  }
}

/**
 * Generate a random offset vector perpendicular to the given direction.
 */
function randomPerpendicularOffset(dir, radius) {
  // Find an arbitrary vector not parallel to dir
  const arbitrary = Math.abs(dir.x) < 0.9
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);

  const u = new THREE.Vector3().crossVectors(dir, arbitrary).normalize();
  const v = new THREE.Vector3().crossVectors(dir, u).normalize();

  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;

  return u.multiplyScalar(Math.cos(angle) * r).add(v.multiplyScalar(Math.sin(angle) * r));
}
