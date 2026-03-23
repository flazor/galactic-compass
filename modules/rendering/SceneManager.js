import { Coordinates } from '../../cosmic-core/src/astronomy/Coordinates.js';

export class SceneManager {
  constructor() {
    this.scene = null;
    this.skybox = null;
    this.containers = {};
  }

  initialize() {
    // Wait for A-Frame to be ready
    if (typeof AFRAME === 'undefined') {
      throw new Error('A-Frame not loaded');
    }

    this.scene = document.querySelector('a-scene');
    this.skybox = document.getElementById('a-sky');
    
    // Cache container references
    this.containers = {
      earthRotation: document.getElementById('earth-rotation-container'),
      earthOrbit: document.getElementById('earth-orbit-container'),
      solarOrbit: document.getElementById('solar-orbit-container'),
      localGroupMotion: document.getElementById('local-group-motion-container'),
      localVoidPush: document.getElementById('local-void-push-container'),
      virgoPull: document.getElementById('virgo-pull-container'),
      largeScaleFlow: document.getElementById('large-scale-flow-container'),
      cmbDipoleMotion: document.getElementById('cmb-dipole-motion-container'),
      resultant1: document.getElementById('resultant-1-container'),
      resultant2: document.getElementById('resultant-2-container'),
      resultant3: document.getElementById('resultant-3-container'),
      resultant4: document.getElementById('resultant-4-container'),
      resultant5: document.getElementById('resultant-5-container'),
      resultant6: document.getElementById('resultant-6-container'),
      resultant7: document.getElementById('resultant-7-container'),
      resultant8: document.getElementById('resultant-8-container'),
      milkyWay: document.getElementById('milky-way-container'),
      sun: document.getElementById('sun-container'),
      moon: document.getElementById('moon-container'),
      compass: document.getElementById('compass-container')
    };

    // Verify all elements exist
    const missing = Object.entries(this.containers)
      .filter(([name, element]) => !element)
      .map(([name]) => name);
    
    if (missing.length > 0) {
      throw new Error(`Missing scene elements: ${missing.join(', ')}`);
    }

    this.buildRealisticSun();

    return true;
  }

  buildRealisticSun() {
    const sunEl = document.getElementById('sun-sphere');
    if (!sunEl) return;

    const buildSun = () => {
      const obj = sunEl.object3D;

      // Core — pure white disk (sun in vacuum is blindingly white)
      const coreGeo = new THREE.SphereGeometry(7, 32, 24);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
      obj.add(new THREE.Mesh(coreGeo, coreMat));

      // Thin corona — tight Fresnel glow hugging the limb (no atmospheric scatter)
      const glowGeo = new THREE.SphereGeometry(18, 32, 24);
      const glowMat = new THREE.ShaderMaterial({
        uniforms: {
          glowColor:     { value: new THREE.Color(0xFFEEDD) },
          falloff:       { value: 0.12 },
          sharpness:     { value: 0.3 },
          internalRadius: { value: 6.0 },
        },
        vertexShader: `
          varying vec3 vWorldPos;
          varying vec3 vWorldNormal;
          void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
            vWorldPos = worldPos.xyz;
            vWorldNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          uniform float falloff;
          uniform float sharpness;
          uniform float internalRadius;
          varying vec3 vWorldPos;
          varying vec3 vWorldNormal;
          void main() {
            vec3 normal = normalize(vWorldNormal);
            if (!gl_FrontFacing) normal *= -1.0;
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float fresnel = dot(viewDir, normal);
            fresnel = pow(fresnel, internalRadius + 0.1);
            float edge = smoothstep(0.0, falloff, fresnel);
            float glow = fresnel + fresnel * sharpness;
            glow *= edge;
            gl_FragColor = vec4(clamp(glowColor * fresnel, 0.0, 1.0),
                               clamp(glow, 0.0, 1.0));
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      obj.add(new THREE.Mesh(glowGeo, glowMat));

      // Lens flare ghosts — additive circles along the sun-screen center axis
      // Placed close to camera (distance 5) so sizes are in screen-relative units
      const FLARE_DIST = 5;
      const flareDefs = [
        { t: 0.2,  radius: 0.04, color: 0xFFEECC, opacity: 0.35 },
        { t: 0.45, radius: 0.08, color: 0xAADDFF, opacity: 0.15 },
        { t: 0.7,  radius: 0.025, color: 0xFFCCAA, opacity: 0.30 },
        { t: 1.1,  radius: 0.06, color: 0x88CCFF, opacity: 0.12 },
        { t: 1.5,  radius: 0.12, color: 0xFFDDEE, opacity: 0.08 },
      ];

      const sceneObj = sunEl.sceneEl.object3D;
      const flares = flareDefs.map(def => {
        const geo = new THREE.CircleGeometry(def.radius, 24);
        const mat = new THREE.MeshBasicMaterial({
          color: def.color,
          transparent: true,
          opacity: def.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 999;
        sceneObj.add(mesh);
        return { mesh, t: def.t, baseOpacity: def.opacity };
      });

      // Reusable vectors for per-frame flare update
      const _sunWorld = new THREE.Vector3();
      const _camFwd = new THREE.Vector3();

      const updateFlares = () => {
        requestAnimationFrame(updateFlares);
        const cam = sunEl.sceneEl.camera;
        if (!cam) return;

        sunEl.object3D.getWorldPosition(_sunWorld);
        const sunDir = _sunWorld.clone().normalize();

        // Check if sun is in front of camera
        cam.getWorldDirection(_camFwd);
        const dot = sunDir.dot(_camFwd);
        const behind = dot < 0;

        flares.forEach(f => {
          if (behind) { f.mesh.visible = false; return; }
          f.mesh.visible = true;

          // Ghost direction: mirror sun direction through camera forward axis
          // ghostDir = 2 * dot(sunDir, camFwd) * camFwd - sunDir
          const ghostDir = _camFwd.clone().multiplyScalar(2 * dot).sub(sunDir);
          // Interpolate between sun direction and ghost direction by t
          const dir = sunDir.clone().lerp(ghostDir, f.t);
          f.mesh.position.copy(dir.normalize().multiplyScalar(FLARE_DIST));
          f.mesh.quaternion.copy(cam.quaternion);

          // Fade based on how centered the sun is (brighter when sun is near center)
          const sunNDC = _sunWorld.clone().project(cam);
          const offCenter = Math.sqrt(sunNDC.x * sunNDC.x + sunNDC.y * sunNDC.y);
          f.mesh.material.opacity = f.baseOpacity * Math.max(0, 1 - offCenter * 0.6);
        });
      };
      requestAnimationFrame(updateFlares);
    };

    if (sunEl.hasLoaded) {
      buildSun();
    } else {
      sunEl.addEventListener('loaded', buildSun);
    }
  }

  applySkyboxRotation(compassCorrection, galacticRotations) {
    if (!this.skybox) return;

    // Apply compass correction first
    this.skybox.object3D.rotateY(Coordinates.toRadians(compassCorrection));

    // Apply galactic center alignment rotations
    const [azimuth, altitude, angle] = galacticRotations;
    this.skybox.object3D.rotateY(Coordinates.toRadians(-azimuth));
    this.skybox.object3D.rotateZ(Coordinates.toRadians(-altitude));
    this.skybox.object3D.rotateX(Coordinates.toRadians(-angle));
  }

  applyCompassCorrection(compassCorrection) {
    this.compassCorrection = compassCorrection; // stored for particle direction
    // Apply compass correction to all containers
    Object.values(this.containers).forEach(container => {
      if (container) {
        container.object3D.rotateY(Coordinates.toRadians(compassCorrection));
      }
    });
  }

  positionCelestialBody(containerName, azimuth, altitude) {
    const container = this.containers[containerName];
    if (!container) return;

    container.object3D.rotateY(-azimuth);
    container.object3D.rotateZ(-altitude);
  }

  directVectorPlacement(az, alt, distance) {
    const pos = new THREE.Vector3(
      Math.cos(alt) * Math.sin(az),
      Math.sin(alt),
      Math.cos(alt) * Math.cos(az)
    ).multiplyScalar(distance);
    return pos;
  }

  positionGalacticCenter(galacticRotations) {
    const container = this.containers.milkyWay;
    if (!container) return;

    const [azimuth, altitude, angle] = galacticRotations;
    container.object3D.rotateY(Coordinates.toRadians(-azimuth));
    container.object3D.rotateZ(Coordinates.toRadians(-altitude));
    container.object3D.rotateX(Coordinates.toRadians(-angle));
  }

  updateSkyboxTexture(imageSrc) {
    if (!this.skybox) return;
    this.skybox.setAttribute('src', imageSrc);
  }

  // Helper to get container for external access
  getContainer(name) {
    return this.containers[name];
  }

  // Helper to get skybox for external access
  getSkybox() {
    return this.skybox;
  }

  // Set visibility of a motion container
  setMotionContainerVisibility(containerName, visible) {
    const container = this.containers[containerName];
    if (container) {
      container.setAttribute('visible', visible);
    }
  }

  // Hide all motion containers
  hideAllMotionContainers() {
    const motionContainers = [
      'earthRotation', 'earthOrbit', 'solarOrbit', 'localGroupMotion',
      'localVoidPush', 'virgoPull', 'largeScaleFlow', 'cmbDipoleMotion',
      'resultant1', 'resultant2', 'resultant3', 'resultant4',
      'resultant5', 'resultant6', 'resultant7', 'resultant8'
    ];
    motionContainers.forEach(name => {
      this.setMotionContainerVisibility(name, false);
    });
  }
}