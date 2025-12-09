import { GalacticCenter } from '../astronomy/GalacticCenter.js';
import { Coordinates } from '../astronomy/Coordinates.js';

export class CelestialRenderer {
  constructor(sceneManager, uiControls) {
    this.sceneManager = sceneManager;
    this.uiControls = uiControls;
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
      this.uiControls?.debugLog("sun alt: " + Coordinates.toDegrees(sunLoc.altitude));
      this.uiControls?.debugLog("sun az: " + Coordinates.toDegrees(sunLoc.azimuth + Math.PI));
      this.uiControls?.debugLog("moon alt: " + Coordinates.toDegrees(moonLoc.altitude));
      this.uiControls?.debugLog("moon az: " + Coordinates.toDegrees(moonLoc.azimuth + Math.PI));

      // Apply skybox rotations
      this.sceneManager.applySkyboxRotation(compassCorrection, galacticRotations);

      // Apply compass correction to all containers
      this.sceneManager.applyCompassCorrection(compassCorrection);

      // Position celestial bodies
      this.sceneManager.positionCelestialBody('sun', sunLoc.azimuth, sunLoc.altitude);
      this.sceneManager.positionCelestialBody('moon', moonLoc.azimuth, moonLoc.altitude);

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

    const checkTexture = () => {
      const material = skybox.getObject3D('mesh')?.material;
      if (material && material.map && material.map.image && 
          (material.map.image.src.includes('8k') || material.map.image.src.startsWith('data:'))) {
        // Texture is actually updated with hi-res content
        setTimeout(() => {
          callback(true);
          this.uiControls?.debugLog('Hi-res texture rendered successfully');
        }, 500); // Small delay to ensure GPU has processed the texture
      } else {
        // Check again in a short while
        setTimeout(checkTexture, 100);
      }
    };

    // Start checking for texture update
    setTimeout(checkTexture, 100);

    // Fallback timeout
    setTimeout(() => {
      callback(false);
      this.uiControls?.debugLog('Hi-res texture load timeout');
    }, timeout);
  }
}