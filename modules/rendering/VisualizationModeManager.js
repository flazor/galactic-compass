/**
 * VisualizationModeManager - Manages visualization modes (multiple can be active)
 *
 * Follows the same listener pattern as LevelManager.
 * Modes implement: activate(), deactivate(), render(), onLevelChange(), update(dt), needsAnimation
 */
export class VisualizationModeManager {
  constructor(uiControls) {
    this.uiControls = uiControls;
    this.modes = new Map();        // name -> mode instance
    this.activeModes = new Set();  // names of currently active modes
    this.listeners = new Set();
    this.animationFrameId = null;
    this.lastTimestamp = null;
    this.lastRenderArgs = null;
  }

  registerMode(name, mode) {
    this.modes.set(name, mode);
    this.uiControls?.debugLog(`Viz mode registered: ${name}`);
  }

  getActiveMode() {
    // Return first active mode (for CelestialRenderer's null check)
    if (this.activeModes.size === 0) return null;
    return this.modes.get(this.activeModes.values().next().value);
  }

  isModeActive(name) {
    return this.activeModes.has(name);
  }

  enableMode(name) {
    if (!this.modes.has(name) || this.activeModes.has(name)) return;

    this.activeModes.add(name);
    const mode = this.modes.get(name);
    mode.activate();

    if (this.lastRenderArgs && mode.needsRenderReplay !== false) {
      const { activeLevels, lat, lon, date } = this.lastRenderArgs;
      mode.render(activeLevels, lat, lon, date);
    }

    this.updateAnimationLoop();
    this.uiControls?.debugLog(`Viz mode enabled: ${name}`);
    this.notifyListeners();
  }

  disableMode(name) {
    if (!this.activeModes.has(name)) return;

    const mode = this.modes.get(name);
    mode.deactivate();
    this.activeModes.delete(name);

    this.updateAnimationLoop();
    this.uiControls?.debugLog(`Viz mode disabled: ${name}`);
    this.notifyListeners();
  }

  toggleMode(name, enabled) {
    if (enabled) {
      this.enableMode(name);
    } else {
      this.disableMode(name);
    }
  }

  addModeChangeListener(callback) {
    this.listeners.add(callback);
  }

  removeModeChangeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners() {
    const active = [...this.activeModes];
    this.listeners.forEach(callback => {
      try {
        callback(active);
      } catch (error) {
        this.uiControls?.debugLog(`Error in mode change listener: ${error.message}`);
      }
    });
  }

  render(activeLevels, lat, lon, date) {
    this.lastRenderArgs = { activeLevels, lat, lon, date };
    for (const name of this.activeModes) {
      this.modes.get(name).render(activeLevels, lat, lon, date);
    }
  }

  onLevelChange(activeLevels) {
    for (const name of this.activeModes) {
      this.modes.get(name).onLevelChange(activeLevels);
    }
  }

  updateAnimationLoop() {
    const needsAnim = [...this.activeModes].some(name => this.modes.get(name).needsAnimation);
    if (needsAnim && this.animationFrameId === null) {
      this.startAnimationLoop();
    } else if (!needsAnim && this.animationFrameId !== null) {
      this.stopAnimationLoop();
    }
  }

  startAnimationLoop() {
    this.lastTimestamp = null;
    const tick = (timestamp) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const dt = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      for (const name of this.activeModes) {
        const mode = this.modes.get(name);
        if (mode.needsAnimation) {
          mode.update(dt);
        }
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  stopAnimationLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.lastTimestamp = null;
    }
  }
}
