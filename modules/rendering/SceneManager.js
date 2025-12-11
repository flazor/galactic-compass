import { Coordinates } from '../astronomy/Coordinates.js';
import { AndromedaPull } from '../motion/AndromedaPull.js';
import { EarthRotationHUD } from '../motion/EarthRotationHUD.js';

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
      andromedaPull: document.getElementById('andromeda-pull-container'),
      greatAttractor: document.getElementById('great-attractor-container'),
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

    return true;
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
}