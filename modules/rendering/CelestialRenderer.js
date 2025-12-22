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

  logCoordinates(object, azimuth, altitude) {
    this.uiControls?.debugLog(`${object.constructor.name} az: ${Coordinates.toDegrees(azimuth).toFixed(2)}° alt: ${Coordinates.toDegrees(altitude).toFixed(2)}°`);
  }

  updateHUDText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.setAttribute('value', text);
    } else {
      this.uiControls?.debugLog(`WARNING: Element ${elementId} not found`);
    }
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
      this.uiControls?.debugLog("Sun az: " + Coordinates.toDegrees(sunLoc.azimuth + Math.PI).toFixed(2) 
                              + " alt: " + Coordinates.toDegrees(sunLoc.altitude).toFixed(2));
      this.uiControls?.debugLog("Moon az: " + Coordinates.toDegrees(moonLoc.azimuth + Math.PI).toFixed(2)
                              + " alt: " + Coordinates.toDegrees(moonLoc.altitude).toFixed(2));

      // Apply skybox rotations
      this.sceneManager.applySkyboxRotation(compassCorrection, galacticRotations);

      // Apply compass correction to all containers
      this.sceneManager.applyCompassCorrection(compassCorrection);

      // Position celestial bodies
      // SunCalc uses 0 deg for south, add PI to adjust to north
      this.sceneManager.positionCelestialBody('sun', sunLoc.azimuth + Math.PI, sunLoc.altitude);
      this.sceneManager.positionCelestialBody('moon', moonLoc.azimuth + Math.PI, moonLoc.altitude);

      // Earth rotation is to the East
      var er = new EarthRotation()
      this.sceneManager.positionCelestialBody('earthRotation', Math.PI/2, 0);
      this.updateHUDText('earth-rotation-hud-text', Math.round(er.getVelocity(lat) * 100) / 100 + " km/s");

      var eo = new EarthOrbit();
      var eoDir = eo.getDirection(lat, lon, date);
      this.logCoordinates(eo, eoDir.azimuth, eoDir.altitude);
      this.sceneManager.positionCelestialBody('earthOrbit', eoDir.azimuth, eoDir.altitude);
      this.updateHUDText('earth-orbit-hud-text', eo.getVelocity() + " km/s");

      var so = new SolarOrbit();
      var soDir = so.getDirection(lat, lon, date);
      this.logCoordinates(so, soDir.azimuth, soDir.altitude);
      this.sceneManager.positionCelestialBody('solarOrbit', soDir.azimuth, soDir.altitude);
      this.updateHUDText('solar-orbit-hud-text', so.getVelocity() + " km/s");

      var ap = new AndromedaPull();
      var apDir = ap.getDirection(lat, lon, date);
      this.logCoordinates(ap, apDir.azimuth, apDir.altitude);
      this.sceneManager.positionCelestialBody('andromedaPull', apDir.azimuth, apDir.altitude);
      this.updateHUDText('andromeda-pull-hud-text', ap.getVelocity() + " km/s");

      var ga = new GreatAttractor();
      var gaDir = ga.getDirection(lat, lon, date);
      this.logCoordinates(ga, gaDir.azimuth, gaDir.altitude);
      this.sceneManager.positionCelestialBody('greatAttractor', gaDir.azimuth, gaDir.altitude);
      this.updateHUDText('great-attractor-hud-text', ga.getVelocity() + " km/s");


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