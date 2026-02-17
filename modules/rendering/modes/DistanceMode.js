/**
 * DistanceMode - Running distance counters since mode activation
 *
 * Shows how far you've traveled due to each motion component.
 * Plain HTML overlay, updated at 10fps via setInterval.
 */
import { calculateVectorSum } from '../../../cosmic-core/src/calculations/CelestialCalculations.js';

export class DistanceMode {
  constructor(sceneManager, uiControls, levelManager) {
    this.sceneManager = sceneManager;
    this.uiControls = uiControls;
    this.levelManager = levelManager;
    this.needsAnimation = false;

    this.overlay = null;
    this.intervalId = null;
    this.startTime = null;
  }

  activate() {
    // Hide markers
    this.sceneManager.hideAllMotionContainers();

    this.startTime = Date.now();
    this.createOverlay();
    this.intervalId = setInterval(() => this.tick(), 100); // 10fps
    this.uiControls?.debugLog('Distance mode activated');
  }

  deactivate() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.removeOverlay();
    this.startTime = null;
    this.uiControls?.debugLog('Distance mode deactivated');
  }

  render(activeLevels, lat, lon, date) {
    // Store latest level data for tick()
    this.activeLevels = activeLevels;
    this.lat = lat;
    this.lon = lon;
  }

  onLevelChange(activeLevels) {
    this.activeLevels = activeLevels;
  }

  update(dt) {
    // Not used — we use setInterval instead of rAF
  }

  tick() {
    if (!this.overlay || !this.startTime) return;

    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    const levels = this.activeLevels || [];

    let html = `<div style="margin-bottom: 6px; font-weight: bold; color: #FFFF00;">Distance Traveled</div>`;
    html += `<div style="margin-bottom: 4px; font-size: 10px; opacity: 0.7;">${formatDuration(elapsedSeconds)}</div>`;

    let totalKm = 0;

    levels.forEach(level => {
      if (!level.implemented || !level.motionClass) return;
      const instance = new level.motionClass(level);
      const velocity = instance.getVelocity(this.lat, this.lon); // km/s
      const distanceKm = velocity * elapsedSeconds;
      totalKm += distanceKm;

      html += `<div style="display: flex; justify-content: space-between; margin: 2px 0;">
        <span style="color: ${getLevelColor(level)}">${level.name}</span>
        <span>${formatDistance(distanceKm)}</span>
      </div>`;
    });

    // Vector sum total (magnitude, not simple sum)
    if (levels.length > 0 && this.levelManager) {
      const maxLevel = this.levelManager.getMaxLevel();
      const vectorSumData = calculateVectorSum(this.lat, this.lon, new Date(), maxLevel);
      if (vectorSumData?.resultant) {
        const resultantKm = vectorSumData.resultant.magnitude * elapsedSeconds;
        html += `<div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 4px; border-top: 1px solid #00FF00; font-weight: bold;">
          <span>Resultant</span>
          <span>${formatDistance(resultantKm)}</span>
        </div>`;
      }
    }

    this.overlay.innerHTML = html;
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'distanceModeOverlay';
    Object.assign(this.overlay.style, {
      position: 'fixed',
      bottom: '50px',
      left: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.7)',
      color: '#00FF00',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #00FF00',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: '9998',
      maxHeight: '40vh',
      overflowY: 'auto'
    });
    document.body.appendChild(this.overlay);
  }

  removeOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}

// Color lookup matching the A-Frame entity colors
const LEVEL_COLORS = {
  earthRotation: '#00FF00',
  earthOrbit: '#0000FF',
  solarOrbit: '#FFFF00',
  localGroupMotion: '#FF0000',
  localVoidPush: '#FF00FF',
  virgoPull: '#00FFFF',
  largeScaleFlow: '#FFA500',
  cmbDipole: '#FFFFFF'
};

function getLevelColor(level) {
  return LEVEL_COLORS[level.id] || '#00FF00';
}

function formatDistance(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  } else if (km < 1000) {
    return `${km.toFixed(1)} km`;
  } else if (km < 1000000) {
    return `${(km / 1000).toFixed(1)} thousand km`;
  } else {
    return `${(km / 1000000).toFixed(2)} million km`;
  }
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
