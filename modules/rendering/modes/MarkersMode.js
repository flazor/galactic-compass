/**
 * MarkersMode - Colored marker circles positioned in 3D space with velocity labels
 *
 * Shows individual level markers plus a resultant (vector sum) marker.
 * Circle areas are proportional to velocity, scaled to the max across all markers.
 */
import { calculateVectorSum } from '../../../cosmic-core/src/calculations/CelestialCalculations.js';

export class MarkersMode {
  constructor(sceneManager, uiControls, levelManager) {
    this.sceneManager = sceneManager;
    this.uiControls = uiControls;
    this.levelManager = levelManager;
    this.needsAnimation = false;
    this.needsRenderReplay = false;
  }

  activate() {
    this.updateVisibility();
  }

  deactivate() {
    this.sceneManager.hideAllMotionContainers();
  }

  /**
   * Render marker positions, velocity labels, and scaled circles for active levels + resultant
   */
  render(activeLevels, lat, lon, date) {
    this.sceneManager.hideAllMotionContainers();

    // Process individual levels
    const velocities = [];
    activeLevels.forEach(level => {
      if (level.motionClass && level.implemented) {
        this.sceneManager.setMotionContainerVisibility(level.bodyId, true);
        const velocity = this.processLevel(level, lat, lon, date);
        velocities.push({ velocity, elementId: level.elementId });
      }
    });

    // Pre-position all 8 resultant containers so slider changes work without a re-render
    const maxLevel = this.levelManager?.getMaxLevel() ?? 8;
    const resultantVelocities = {}; // lvl -> velocity
    for (let lvl = 1; lvl <= 8; lvl++) {
      const vectorSumData = calculateVectorSum(lat, lon, date, lvl);
      if (!vectorSumData?.resultant) continue;
      const resultant = vectorSumData.resultant;

      this.sceneManager.positionCelestialBody(`resultant${lvl}`, resultant.azimuth, resultant.altitude);

      const velocity = Math.round(resultant.magnitude * 100) / 100;
      const chevrons = velocity < 1 ? '▾' : velocity <= 100 ? '▾▾' : '▾▾▾';
      const textEl = document.getElementById(`resultant-${lvl}-hud-text`);
      if (textEl) {
        textEl.setAttribute('value', `${chevrons}\n${velocity} km/s`);
      }
      resultantVelocities[lvl] = velocity;
    }

    // Show only the resultant for the current level
    this.sceneManager.setMotionContainerVisibility(`resultant${maxLevel}`, true);
    if (resultantVelocities[maxLevel] != null) {
      velocities.push({ velocity: resultantVelocities[maxLevel], elementId: `resultant-${maxLevel}-hud-text` });
    }

    // Scale all circles using a shared max velocity
    const maxVelocity = Math.max(...velocities.map(v => v.velocity), 1);
    const maxRadius = 0.5;
    const minRadius = 0.05;
    const sizeCircle = (id, velocity) => {
      const circle = document.getElementById(id);
      if (circle) {
        circle.setAttribute('radius', Math.max(minRadius, maxRadius * Math.sqrt(velocity / maxVelocity)));
      }
    };

    // Individual level circles
    velocities.forEach(({ velocity, elementId }) => {
      sizeCircle(elementId.replace('-text', '-circle'), velocity);
    });

    // All 8 resultant circles (so they're correctly sized when the slider changes)
    for (let lvl = 1; lvl <= 8; lvl++) {
      if (resultantVelocities[lvl] != null) {
        sizeCircle(`resultant-${lvl}-hud-circle`, resultantVelocities[lvl]);
      }
    }
  }

  onLevelChange(activeLevels) {
    this.updateVisibility();
  }

  update(dt) {
    // No per-frame updates needed for markers
  }

  /**
   * Position a single level's marker and update its velocity text.
   * Returns the velocity for scaling.
   */
  processLevel(level, lat, lon, date) {
    const instance = new level.motionClass(level);
    const direction = instance.getDirection(lat, lon, date);

    this.sceneManager.positionCelestialBody(level.bodyId, direction.azimuth, direction.altitude);

    const velocity = instance.getVelocity(lat, lon);
    const chevrons = velocity < 1 ? '▾' : velocity <= 100 ? '▾▾' : '▾▾▾';
    const element = document.getElementById(level.elementId);
    if (element) {
      element.setAttribute('value', `${chevrons}\n${velocity} km/s`);
    }
    return velocity;
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
    const maxLevel = this.levelManager.getMaxLevel();
    this.sceneManager.setMotionContainerVisibility(`resultant${maxLevel}`, true);
  }
}
