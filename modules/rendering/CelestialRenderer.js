import { GalacticCenter } from '../astronomy/GalacticCenter.js';
import { Coordinates } from '../astronomy/Coordinates.js';
import { EarthOrbit } from '../motion/EarthOrbit.js';
import { SolarOrbit } from '../motion/SolarOrbit.js';
import { GreatAttractor } from '../motion/GreatAttractor.js';
import { EarthRotation } from '../motion/EarthRotation.js';
import { AndromedaPull } from '../motion/AndromedaPull.js';

export class CelestialRenderer {
  constructor(sceneManager, uiControls) {
    this.sceneManager = sceneManager;
    this.uiControls = uiControls;
  }

  logCoordinates(objectOrName, azimuth, altitude) {
    const name = typeof objectOrName === 'string' ? objectOrName : objectOrName.constructor.name;
    this.uiControls?.debugLog(`${name} az: ${Coordinates.toDegrees(azimuth).toFixed(2)}° alt: ${Coordinates.toDegrees(altitude).toFixed(2)}°`);
  }

  updateHUDText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.setAttribute('value', text);
    } else {
      this.uiControls?.debugLog(`WARNING: Element ${elementId} not found`);
    }
  }

  processMotionHUD(MotionClass, bodyId, elementId, lat, lon, date) {
    const instance = new MotionClass();
    
    // Get direction from instance
    const direction = instance.getDirection(lat, lon, date);
    
    // Log coordinates
    this.logCoordinates(instance, direction.azimuth, direction.altitude);
    
    // Position the celestial body
    this.sceneManager.positionCelestialBody(bodyId, direction.azimuth, direction.altitude);
    
    // Update HUD text with velocity
    const velocity = instance.getVelocity(lat, lon);
    this.updateHUDText(elementId, `${velocity} km/s`);
  }

  renderCelestialScene(position, compassCorrection, currentTime = null) {
    if (!this.sceneManager || !position) return;

    const { lat, lon } = position;
    const date = currentTime || new Date();

    try {
      // Calculate celestial positions
      const sunLoc = SunCalc.getPosition(date, lat, lon);
      const moonLoc = SunCalc.getMoonPosition(date, lat, lon);
      const galacticRotations = GalacticCenter.currentMilkyWayPosition(lat, lon, date);

      // Log calculations
      this.logCoordinates("Sun", sunLoc.azimuth + Math.PI, sunLoc.altitude);
      this.logCoordinates("Moon", moonLoc.azimuth + Math.PI, moonLoc.altitude);

      // Apply skybox rotations
      this.sceneManager.applySkyboxRotation(compassCorrection, galacticRotations);

      // Apply compass correction to all containers
      this.sceneManager.applyCompassCorrection(compassCorrection);

      // Position celestial bodies
      // SunCalc uses 0 deg for south, add PI to adjust to north
      this.sceneManager.positionCelestialBody('sun', sunLoc.azimuth + Math.PI, sunLoc.altitude);
      this.sceneManager.positionCelestialBody('moon', moonLoc.azimuth + Math.PI, moonLoc.altitude);

      // Process all motion HUDs with unified method
      this.processMotionHUD(EarthRotation, 'earthRotation', 'earth-rotation-hud-text', lat, lon, date);
      this.processMotionHUD(EarthOrbit, 'earthOrbit', 'earth-orbit-hud-text', lat, lon, date);
      this.processMotionHUD(SolarOrbit, 'solarOrbit', 'solar-orbit-hud-text', lat, lon, date);
      this.processMotionHUD(AndromedaPull, 'andromedaPull', 'andromeda-pull-hud-text', lat, lon, date);
      this.processMotionHUD(GreatAttractor, 'greatAttractor', 'great-attractor-hud-text', lat, lon, date);


      // Position galactic center
      this.sceneManager.positionGalacticCenter(galacticRotations);

      this.uiControls?.debugLog("Celestial scene rendered successfully");
      
      return {
        sun: sunLoc,
        moon: moonLoc,
        galactic: galacticRotations
      };

    } catch (error) {
      this.uiControls?.debugLog(`ERROR in renderCelestialScene: ${error.message}`);
      throw error;
    }
  }

  updateSkyboxTexture(imageSrc) {
    if (!this.sceneManager) return;
    
    this.sceneManager.updateSkyboxTexture(imageSrc);
    this.uiControls?.debugLog(`Skybox texture updated (${imageSrc.length} chars)`);
  }

  // Wait for texture to actually render (used by hi-res loading)
  waitForTextureUpdate(callback, timeout = 5000) {
    const skybox = this.sceneManager.getSkybox();
    if (!skybox) return;

    let timeoutTriggered = false;
    let checkCount = 0;

    const checkTexture = () => {
      if (timeoutTriggered) return;
      
      checkCount++;
      const material = skybox.getObject3D('mesh')?.material;
      
      if (material && material.map && material.map.image) {
        const src = material.map.image.src;
        const isHiRes = src.includes('8k') || 
                       (src.startsWith('data:') && src.length > 100000); // Large data URL indicates hi-res
        
        this.uiControls?.debugLog(`Texture check ${checkCount}: ${src.substring(0, 50)}... isHiRes: ${isHiRes}`);
        
        if (isHiRes) {
          // Texture is actually updated with hi-res content
          timeoutTriggered = true;
          setTimeout(() => {
            callback(true);
            this.uiControls?.debugLog('Hi-res texture rendered successfully');
          }, 500); // Small delay to ensure GPU has processed the texture
          return;
        }
      } else {
        this.uiControls?.debugLog(`Texture check ${checkCount}: No material/map/image yet`);
      }
      
      // Check again in a short while
      setTimeout(checkTexture, 100);
    };

    // Start checking for texture update
    setTimeout(checkTexture, 100);

    // Fallback timeout
    setTimeout(() => {
      if (!timeoutTriggered) {
        timeoutTriggered = true;
        callback(false);
        this.uiControls?.debugLog(`Hi-res texture load timeout after ${checkCount} checks`);
      }
    }, timeout);
  }
}