import { EarthRotation } from './EarthRotation.js';

export class EarthRotationHUD {
  constructor(hudRenderer, uiControls) {
    this.hudRenderer = hudRenderer;
    this.uiControls = uiControls;
    this.earthRotation = new EarthRotation();
    this.hudId = 'earth-rotation';
  }

  /**
   * Show Earth Rotation HUD
   * @param {Object} position - GPS position {lat, lon}
   */
  show(position) {
    this.uiControls?.debugLog('Showing Earth Rotation HUD');

    // Calculate velocity at this latitude
    const velocity = this.earthRotation.getVelocity(position.lat, position.lon);
    
    // Get direction (always eastward)
    const direction = this.earthRotation.getDirection();

    // Create HUD configuration
    const config = {
      label: `Earth Rotation\\n${velocity.toFixed(3)} km/s East`,
      color: '#00FF00', // Green
      azimuth: direction.azimuth, // 90° = East
      altitude: direction.altitude // 0° = Horizontal
    };

    // Create the HUD
    this.hudRenderer.createHUD(this.hudId, config);

    this.uiControls?.debugLog(`Earth Rotation HUD: ${velocity.toFixed(3)} km/s at lat ${position.lat.toFixed(2)}°`);
  }

  /**
   * Hide Earth Rotation HUD
   */
  hide() {
    this.hudRenderer.removeHUD(this.hudId);
  }

  /**
   * Update HUD with new position
   * @param {Object} position - GPS position {lat, lon}
   */
  update(position) {
    if (this.hudRenderer.hasHUD(this.hudId)) {
      this.show(position); // Recreate with new velocity
    }
  }
}