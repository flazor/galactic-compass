/**
 * Level Manager - Manages cosmic level selection and configuration state
 */

import { COSMIC_LEVELS, getLevelsUpTo, getCosmicLevelByNumber } from './CosmicLevels.js';

export class LevelManager {
  constructor(uiControls) {
    this.uiControls = uiControls;
    
    // Default state: show up to level 8 (all cosmic motion levels implemented)
    this.maxLevel = 8;
    this.isUIVisible = false;
    
    // Event listeners for level changes
    this.listeners = new Set();
    
    this.uiControls?.debugLog('LevelManager initialized with max level: ' + this.maxLevel);
  }

  /**
   * Get current maximum level setting
   */
  getMaxLevel() {
    return this.maxLevel;
  }

  /**
   * Set maximum level (1-8)
   * Triggers level change events
   */
  setMaxLevel(level) {
    const newLevel = Math.max(1, Math.min(8, level));
    
    if (newLevel !== this.maxLevel) {
      const oldLevel = this.maxLevel;
      this.maxLevel = newLevel;
      
      this.uiControls?.debugLog(`Level changed: ${oldLevel} → ${newLevel}`);
      
      // Notify all listeners
      this.notifyLevelChange(oldLevel, newLevel);
    }
  }

  /**
   * Get all levels that should be displayed (up to maxLevel)
   */
  getActiveLevels() {
    return getLevelsUpTo(this.maxLevel);
  }

  /**
   * Get only implemented levels that should be displayed
   */
  getActiveImplementedLevels() {
    return this.getActiveLevels().filter(level => level.implemented);
  }

  /**
   * Check if a specific level should be displayed
   */
  isLevelActive(levelNumber) {
    return levelNumber <= this.maxLevel;
  }

  /**
   * Get level configuration by number
   */
  getLevelConfig(levelNumber) {
    return getCosmicLevelByNumber(levelNumber);
  }

  /**
   * Toggle UI visibility
   */
  toggleUI() {
    this.isUIVisible = !this.isUIVisible;
    this.uiControls?.debugLog(`Cosmic levels UI: ${this.isUIVisible ? 'visible' : 'hidden'}`);
    
    // Notify UI listeners
    this.notifyUIToggle(this.isUIVisible);
    
    return this.isUIVisible;
  }

  /**
   * Show UI
   */
  showUI() {
    if (!this.isUIVisible) {
      this.toggleUI();
    }
  }

  /**
   * Hide UI
   */
  hideUI() {
    if (this.isUIVisible) {
      this.toggleUI();
    }
  }

  /**
   * Get UI visibility state
   */
  isUIOpen() {
    return this.isUIVisible;
  }

  /**
   * Add listener for level changes
   * Callback receives (oldLevel, newLevel)
   */
  addLevelChangeListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove level change listener
   */
  removeLevelChangeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of level change
   */
  notifyLevelChange(oldLevel, newLevel) {
    this.listeners.forEach(callback => {
      try {
        callback(oldLevel, newLevel);
      } catch (error) {
        this.uiControls?.debugLog(`Error in level change listener: ${error.message}`);
      }
    });
  }

  /**
   * Notify UI toggle listeners (extend listeners if needed)
   */
  notifyUIToggle(isVisible) {
    // For now, just log. Can extend if we need UI-specific listeners
    this.uiControls?.debugLog(`UI toggle notification: ${isVisible}`);
  }

  /**
   * Get human-readable description of current state
   */
  getStateDescription() {
    const activeLevels = this.getActiveLevels();
    const implementedCount = activeLevels.filter(l => l.implemented).length;
    const totalCount = activeLevels.length;
    
    return {
      maxLevel: this.maxLevel,
      totalLevels: totalCount,
      implementedLevels: implementedCount,
      unimplementedLevels: totalCount - implementedCount,
      isUIVisible: this.isUIVisible,
      description: `Showing ${implementedCount}/${totalCount} levels (up to level ${this.maxLevel})`
    };
  }

  /**
   * Get summary for debug purposes
   */
  getDebugSummary() {
    const state = this.getStateDescription();
    const activeLevels = this.getActiveLevels();
    
    return {
      ...state,
      activeLevels: activeLevels.map(level => ({
        level: level.level,
        name: level.name,
        implemented: level.implemented,
        velocity: level.velocity
      }))
    };
  }

  /**
   * Reset to default state
   */
  reset() {
    this.setMaxLevel(6); // Default to max currently implemented
    this.hideUI();
  }
}

export default LevelManager;