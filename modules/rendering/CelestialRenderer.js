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
      this.uiControls?.debugLog("sun az: " + Coordinates.toDegrees(sunLoc.azimuth + Math.PI));
      this.uiControls?.debugLog("sun alt: " + Coordinates.toDegrees(sunLoc.altitude));
      this.uiControls?.debugLog("moon az: " + Coordinates.toDegrees(moonLoc.azimuth + Math.PI));
      this.uiControls?.debugLog("moon alt: " + Coordinates.toDegrees(moonLoc.altitude));

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
      document.getElementById('earth-rotation-hud-text').setAttribute('value', Math.round(er.getRotationalVelocity(lat) * 100) / 100 + " km/s");

      var eo = new EarthOrbit();
      var eoDir = eo.getDirection(lat, lon, date);
      this.uiControls?.debugLog("EO az: " + Coordinates.toDegrees(eoDir.azimuth) + " EO alt: " + Coordinates.toDegrees(eoDir.altitude));
      this.sceneManager.positionCelestialBody('earthOrbit', eoDir.azimuth, eoDir.altitude);
      document.getElementById('earth-orbit-hud-text').setAttribute('value', eo.getOrbitalVelocity() + " km/s");

      var so = new SolarOrbit();
      var soDir = so.getDirection(lat, lon, date);
      this.uiControls?.debugLog("SO az: " + Coordinates.toDegrees(soDir.azimuth) + " SO alt: " + Coordinates.toDegrees(soDir.altitude));
      this.sceneManager.positionCelestialBody('solarOrbit', soDir.azimuth, soDir.altitude);
      document.getElementById('solar-orbit-hud-text').setAttribute('value', so.getOrbitalVelocity() + " km/s");

      var ap = new AndromedaPull();
      var apDir = ap.getDirection(lat, lon, date);
      this.uiControls?.debugLog("AP az: " + Coordinates.toDegrees(apDir.azimuth) + " AP alt: " + Coordinates.toDegrees(apDir.altitude));
      this.sceneManager.positionCelestialBody('andromedaPull', apDir.azimuth, apDir.altitude);
      document.getElementById('andromeda-pull-hud-text').setAttribute('value', ap.getVelocity() + " km/s");

      var ga = new GreatAttractor();
      var gaDir = ga.getDirection(lat, lon, date);
      this.uiControls?.debugLog("GA az: " + Coordinates.toDegrees(gaDir.azimuth) + " GA alt: " + Coordinates.toDegrees(gaDir.altitude));
      this.sceneManager.positionCelestialBody('greatAttractor', gaDir.azimuth, gaDir.altitude);
      document.getElementById('great-attractor-hud-text').setAttribute('value', ga.getVelocity() + " km/s");


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