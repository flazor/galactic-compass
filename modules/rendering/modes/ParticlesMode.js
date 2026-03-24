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
const MAX_EXHAUST  = 40;
const MAX_INCOMING = 10;
const MAX_MOON     = 0;
const MAX_SUN      = 0;

// Layout
const BOARD_HALF   = 0.2;
const BOARD_Y      = -0.55;
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

    // Orient board nose toward the direction of travel
    if (this.board?.object3D) {
      const boardPos = this.board.object3D.position;
      const target = boardPos.clone().add(this.moveDir);
      this.board.object3D.lookAt(target);
      // lookAt points -Z at target, but our nose is -Z, so this is correct
    }
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
    if (!this.container || !this.board?.object3D) return;
    // Sparks emit from the back half of the surfboard in board-local space,
    // then transformed to world space so they follow the board's rotation
    const x = (Math.random() - 0.5) * 0.14;  // board width
    const z = 0.1 + Math.random() * 0.3;      // back half of board (local +Z)
    const pos = new THREE.Vector3(x, -0.01, z);
    this.board.object3D.updateMatrixWorld(true);
    pos.applyMatrix4(this.board.object3D.matrixWorld);
    const size = 0.002 + Math.random() * 0.004;
    this._spawn(pos, size, 0.9, EXHAUST_LIFE, this.exhaustParticles, true);
  }

  spawnIncoming() {
    if (!this.container) return;
    const pos = this.moveDir.clone().multiplyScalar(SPAWN_DIST)
      .add(perpendicularSpread(this.moveDir, SPREAD));
    const size = 0.002 + Math.random() * 0.004;
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

    // ── Surfboard (custom THREE.js geometry) ──
    // Proper surfboard outline: pointed nose, widest forward of centre,
    // tapering to a squash tail. Bezier curves for smooth rails.
    const board = document.createElement('a-entity');
    board.setAttribute('position', `0 ${BOARD_Y} 0`);

    // Build the board shape once the entity is in the scene
    board.addEventListener('loaded', () => {
      // Outline in local x,y — will be rotated flat (y becomes z)
      // Nose at y=-0.45, tail at y=+0.36, width ±0.09
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.45);  // nose tip
      // Right rail: nose → widest point (forward of centre)
      shape.bezierCurveTo(0.03, -0.38,  0.085, -0.2,  0.09, -0.05);
      // Right rail: widest → tail
      shape.bezierCurveTo(0.09, 0.12,  0.08, 0.26,  0.065, 0.33);
      // Squash tail (slightly flat with rounded corners)
      shape.quadraticCurveTo(0.04, 0.37,  0, 0.37);
      // Left rail (mirror)
      shape.quadraticCurveTo(-0.04, 0.37,  -0.065, 0.33);
      shape.bezierCurveTo(-0.08, 0.26,  -0.09, 0.12,  -0.09, -0.05);
      shape.bezierCurveTo(-0.085, -0.2,  -0.03, -0.38,  0, -0.45);

      const extrudeSettings = {
        depth: 0.02,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.004,
        bevelSegments: 3,
      };

      // ── Chrome ShaderMaterial — direct equirectangular sampling ──
      // Bypasses Three.js PMREM pipeline so star reflections stay pixel-sharp
      const chromeMat = new THREE.ShaderMaterial({
        uniforms: {
          envMap: { value: null },
        },
        vertexShader: `
          varying vec3 vWorldNormal;
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform sampler2D envMap;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPosition;
          void main() {
            vec3 viewDir = normalize(vWorldPosition - cameraPosition);
            vec3 reflDir = reflect(viewDir, normalize(vWorldNormal));
            float phi = atan(reflDir.z, reflDir.x);
            float theta = asin(clamp(reflDir.y, -1.0, 1.0));
            vec2 uv = vec2(phi / (2.0 * 3.14159265) + 0.5, theta / 3.14159265 + 0.5);
            vec3 color = texture2D(envMap, uv).rgb * 1.5 * vec3(0.85, 0.88, 0.95);
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        side: THREE.DoubleSide,
      });

      // ── Deck (main body) ──
      const deckGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const deckMesh = new THREE.Mesh(deckGeo, chromeMat);
      deckMesh.rotation.x = -Math.PI / 2;
      deckMesh.position.y = -0.01;
      board.object3D.add(deckMesh);

      // ── Deck top accent ──
      const topGeo = new THREE.ShapeGeometry(shape);
      const topMesh = new THREE.Mesh(topGeo, chromeMat);
      topMesh.rotation.x = -Math.PI / 2;
      topMesh.position.y = 0.016;
      board.object3D.add(topMesh);

      // ── Stringer (thin line nose to tail on deck) ──
      const stringerGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.017, 0.44),   // nose
        new THREE.Vector3(0, 0.017, -0.36),   // tail
      ]);
      const stringerMat = new THREE.LineBasicMaterial({
        color: 0x4488aa,
        transparent: true,
        opacity: 0.25,
      });
      board.object3D.add(new THREE.Line(stringerGeo, stringerMat));

      // ── Thruster glow (additive plane underneath) ──
      const glowGeo = new THREE.PlaneGeometry(0.1, 0.5);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x44aaff,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.rotation.x = -Math.PI / 2;
      glowMesh.position.y = -0.015;
      glowMesh.position.z = 0.05;
      board.object3D.add(glowMesh);

      // ── Centre fin ──
      const finShape = new THREE.Shape();
      finShape.moveTo(0, 0);
      finShape.lineTo(0.04, 0);
      finShape.lineTo(0.06, -0.035);
      finShape.lineTo(0.01, -0.04);
      finShape.lineTo(0, 0);
      const finGeo = new THREE.ShapeGeometry(finShape);
      const finMesh = new THREE.Mesh(finGeo, chromeMat);
      finMesh.position.set(-0.02, -0.012, -0.22);
      board.object3D.add(finMesh);

      // ── Load skybox texture for sharp chrome reflections ──
      // Clone with LinearFilter + no mipmaps to prevent mip-level blurring
      const tryEnvMap = () => {
        const skyMesh = document.getElementById('a-sky')?.getObject3D('mesh');
        const skyTex = skyMesh?.material?.map;
        if (!skyTex?.image) return false;

        const envTex = skyTex.clone();
        envTex.minFilter = THREE.LinearFilter;
        envTex.generateMipmaps = false;
        envTex.needsUpdate = true;

        chromeMat.uniforms.envMap.value = envTex;
        chromeMat.needsUpdate = true;
        return true;
      };

      if (!tryEnvMap()) {
        document.getElementById('a-sky')
          ?.addEventListener('materialtextureloaded', tryEnvMap);
      }
    });

    this.container.appendChild(board);
    this.board = board;

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
