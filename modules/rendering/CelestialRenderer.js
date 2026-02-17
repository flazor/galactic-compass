import { Coordinates } from '../../cosmic-core/src/astronomy/Coordinates.js';
import { COSMIC_LEVELS } from '../../cosmic-core/src/config/CosmicLevels.js';
import { calculateCelestialPositions, calculateVectorSum as calcVectorSum } from '../../cosmic-core/src/calculations/CelestialCalculations.js';

export class CelestialRenderer {
  constructor(sceneManager, uiControls, levelManager = null) {
    this.sceneManager = sceneManager;
    this.uiControls = uiControls;
    this.levelManager = levelManager;
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

  processMotionHUDWithConfig(MotionClass, levelConfig, bodyId, elementId, lat, lon, date) {
    // Create instance with configuration for CosmicMotion, or without for specialized classes
    const instance = new MotionClass(levelConfig);
    
    // Get direction from instance
    const direction = instance.getDirection(lat, lon, date);
    
    // Log coordinates
    this.logCoordinates(levelConfig.name, direction.azimuth, direction.altitude);
    
    // Position the celestial body
    this.sceneManager.positionCelestialBody(bodyId, direction.azimuth, direction.altitude);
    
    // Update HUD text with velocity
    const velocity = instance.getVelocity(lat, lon);
    this.updateHUDText(elementId, `${velocity} km/s`);
  }

  processMotionHUDsBasedOnLevels(lat, lon, date) {
    // Use level manager to determine which HUDs to show
    if (!this.levelManager) {
      // Fallback: process all implemented motion HUDs using COSMIC_LEVELS data
      const implementedLevels = COSMIC_LEVELS.filter(level => level.implemented);
      implementedLevels.forEach(level => {
        if (level.motionClass) {
          this.processMotionHUDWithConfig(
            level.motionClass,
            level,
            level.bodyId,
            level.elementId,
            lat, lon, date
          );
        }
      });
      return;
    }

    // Hide all motion containers first
    this.sceneManager.hideAllMotionContainers();

    // Get active implemented levels from level manager
    const activeLevels = this.levelManager.getActiveImplementedLevels();
    
    this.uiControls?.debugLog(`Processing ${activeLevels.length} active motion HUDs (max level: ${this.levelManager.getMaxLevel()})`);

    // Process and show each active level
    activeLevels.forEach(level => {
      if (level.motionClass && level.implemented) {
        // Show the container
        this.sceneManager.setMotionContainerVisibility(level.bodyId, true);
        
        // Process the motion HUD with level configuration
        this.processMotionHUDWithConfig(
          level.motionClass, 
          level, // Pass the full level config
          level.bodyId, 
          level.elementId, 
          lat, lon, date
        );
      }
    });
  }

  renderCelestialScene(position, compassCorrection, currentTime = null) {
    if (!this.sceneManager || !position) return;

    const { lat, lon } = position;
    const date = currentTime || new Date();

    try {
      // Calculate celestial positions using the calculation layer
      const celestialData = calculateCelestialPositions(lat, lon, date);

      // Log calculations
      this.logCoordinates("Sun", celestialData.sun.azimuth, celestialData.sun.altitude);
      this.logCoordinates("Moon", celestialData.moon.azimuth, celestialData.moon.altitude);

      // Apply skybox rotations (using galactic center rotations)
      this.sceneManager.applySkyboxRotation(compassCorrection, celestialData.galacticCenter.rotations);

      // Apply compass correction to all containers
      this.sceneManager.applyCompassCorrection(compassCorrection);

      // Position celestial bodies
      this.sceneManager.positionCelestialBody('sun', celestialData.sun.azimuth, celestialData.sun.altitude);
      this.sceneManager.positionCelestialBody('moon', celestialData.moon.azimuth, celestialData.moon.altitude);

      // Process motion HUDs based on level configuration
      this.processMotionHUDsBasedOnLevels(lat, lon, date);

      // Position galactic center
      this.sceneManager.positionGalacticCenter(celestialData.galacticCenter.rotations);

      this.uiControls?.debugLog("Celestial scene rendered successfully");

      return {
        sun: celestialData.sun,
        moon: celestialData.moon,
        galactic: celestialData.galacticCenter.rotations
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

  // Update motion container visibility based on current level settings
  updateMotionContainerVisibility() {
    if (!this.levelManager) return;
    
    // Hide all motion containers first
    this.sceneManager.hideAllMotionContainers();
    
    // Show containers for active levels
    const activeLevels = this.levelManager.getActiveImplementedLevels();
    activeLevels.forEach(level => {
      if (level.implemented) {
        this.sceneManager.setMotionContainerVisibility(level.bodyId, true);
      }
    });
    
    this.uiControls?.debugLog(`Updated visibility: showing ${activeLevels.length} motion containers`);
  }

  // Calculate vector sum of all active motion levels
  calculateVectorSum(lat, lon, date) {
    if (!this.levelManager) return null;

    // Get the max level from level manager
    const maxLevel = this.levelManager.getMaxLevel();

    // Use the calculation layer to compute vector sum
    const vectorSumData = calcVectorSum(lat, lon, date, maxLevel);

    const resultant = vectorSumData.resultant;
    if (resultant) {
      this.uiControls?.debugLog(`Your velocity: ${Math.round(resultant.magnitude)} km/s toward ${Math.round(resultant.azimuthDegrees)}° az ${Math.round(resultant.altitudeDegrees)}° alt`);

      // Update UI display
      this.updateVectorSumDisplay(vectorSumData.vectorSum);
    }

    return vectorSumData.vectorSum;
  }

  // Update the vector sum display in the UI
  updateVectorSumDisplay(vectorSum) {
    const vectorSumElement = document.getElementById('vectorSumText');
    if (!vectorSumElement || !vectorSum) return;
    
    const resultant = vectorSum.getResultant();
    if (!resultant) {
      vectorSumElement.innerHTML = 'No motion vectors active';
      return;
    }
    
    const speed = Math.round(resultant.magnitude);
    const azimuth = Math.round(resultant.azimuthDegrees);
    const altitude = Math.round(resultant.altitudeDegrees);
    
    // Create detailed display
    const summary = vectorSum.getSummary();
    const vectorList = summary.vectors
      .map(v => `${v.name}: ${v.magnitude} km/s`)
      .join('<br>');
    
    vectorSumElement.innerHTML = `
      <div style="font-weight: bold; color: #FFFF00;">
        ${speed} km/s @ ${azimuth}° az, ${altitude}° alt
      </div>
      <div style="margin-top: 4px; opacity: 0.8; font-size: 9px;">
        ${summary.vectorCount} active motions:<br>
        ${vectorList}
      </div>
    `;
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