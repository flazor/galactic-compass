/**
 * VisualizationModeManager - Manages switchable visualization modes
 *
 * Follows the same listener pattern as LevelManager.
 * Modes implement: activate(), deactivate(), render(), onLevelChange(), update(dt), needsAnimation
 */
export class VisualizationModeManager {
  constructor(uiControls) {
    this.uiControls = uiControls;
    this.modes = new Map();       // name -> mode instance
    this.activeModeName = null;
    this.listeners = new Set();
    this.animationFrameId = null;
    this.lastTimestamp = null;
  }

  /**
   * Register a mode by name
   */
  registerMode(name, mode) {
    this.modes.set(name, mode);
    this.uiControls?.debugLog(`Viz mode registered: ${name}`);
  }

  /**
   * Get the currently active mode instance
   */
  getActiveMode() {
    return this.activeModeName ? this.modes.get(this.activeModeName) : null;
  }

  /**
   * Get the currently active mode name
   */
  getActiveModeName() {
    return this.activeModeName;
  }

  /**
   * Switch to a named mode
   */
  setMode(name) {
    if (!this.modes.has(name)) {
      this.uiControls?.debugLog(`Unknown viz mode: ${name}`);
      return;
    }

    if (name === this.activeModeName) return;

    const oldName = this.activeModeName;
    const oldMode = this.getActiveMode();

    // Deactivate current mode
    if (oldMode) {
      this.stopAnimationLoop();
      oldMode.deactivate();
    }

    // Activate new mode
    this.activeModeName = name;
    const newMode = this.modes.get(name);
    newMode.activate();

    // Start animation loop if needed
    if (newMode.needsAnimation) {
      this.startAnimationLoop();
    }

    this.uiControls?.debugLog(`Viz mode: ${oldName || 'none'} -> ${name}`);
    this.notifyListeners(oldName, name);
  }

  /**
   * Add listener for mode changes. Callback receives (oldMode, newMode).
   */
  addModeChangeListener(callback) {
    this.listeners.add(callback);
  }

  removeModeChangeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners(oldMode, newMode) {
    this.listeners.forEach(callback => {
      try {
        callback(oldMode, newMode);
      } catch (error) {
        this.uiControls?.debugLog(`Error in mode change listener: ${error.message}`);
      }
    });
  }

  /**
   * Delegate render call to active mode
   */
  render(activeLevels, lat, lon, date) {
    const mode = this.getActiveMode();
    if (mode) {
      mode.render(activeLevels, lat, lon, date);
    }
  }

  /**
   * Delegate level change to active mode
   */
  onLevelChange(activeLevels) {
    const mode = this.getActiveMode();
    if (mode) {
      mode.onLevelChange(activeLevels);
    }
  }

  /**
   * Animation loop for modes that need per-frame updates
   */
  startAnimationLoop() {
    this.lastTimestamp = null;
    const tick = (timestamp) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const dt = (timestamp - this.lastTimestamp) / 1000; // seconds
      this.lastTimestamp = timestamp;

      const mode = this.getActiveMode();
      if (mode && mode.needsAnimation) {
        mode.update(dt);
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
