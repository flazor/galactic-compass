/**
 * MarkersMode - Colored marker spheres positioned in 3D space with velocity labels
 *
 * This is the original visualization mode, extracted from CelestialRenderer.
 */
export class MarkersMode {
  constructor(sceneManager, uiControls, levelManager) {
    this.sceneManager = sceneManager;
    this.uiControls = uiControls;
    this.levelManager = levelManager;
    this.needsAnimation = false;
  }

  activate() {
    // Show markers for currently active levels
    this.updateVisibility();
  }

  deactivate() {
    // Hide all motion containers
    this.sceneManager.hideAllMotionContainers();
  }

  /**
   * Render marker positions and velocity labels for active levels
   */
  render(activeLevels, lat, lon, date) {
    // Hide all first
    this.sceneManager.hideAllMotionContainers();

    // Process and show each active level
    activeLevels.forEach(level => {
      if (level.motionClass && level.implemented) {
        this.sceneManager.setMotionContainerVisibility(level.bodyId, true);
        this.processLevel(level, lat, lon, date);
      }
    });
  }

  onLevelChange(activeLevels) {
    this.updateVisibility();
  }

  update(dt) {
    // No per-frame updates needed for markers
  }

  /**
   * Position a single level's marker and update its velocity text
   */
  processLevel(level, lat, lon, date) {
    const instance = new level.motionClass(level);
    const direction = instance.getDirection(lat, lon, date);

    this.sceneManager.positionCelestialBody(level.bodyId, direction.azimuth, direction.altitude);

    const velocity = instance.getVelocity(lat, lon);
    const element = document.getElementById(level.elementId);
    if (element) {
      element.setAttribute('value', `${velocity} km/s`);
    }
  }

  /**
   * Update which motion containers are visible based on current level
   */
  updateVisibility() {
    if (!this.levelManager) return;

    this.sceneManager.hideAllMotionContainers();
    const activeLevels = this.levelManager.getActiveImplementedLevels();
    activeLevels.forEach(level => {
      if (level.implemented) {
        this.sceneManager.setMotionContainerVisibility(level.bodyId, true);
      }
    });
  }
}
