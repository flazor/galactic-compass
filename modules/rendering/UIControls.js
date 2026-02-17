export class UIControls {
  constructor() {
    this.debugExpanded = false;
    this.debugDiv = null;
    this.reloadBtn = null;
    this.hiResBtn = null;
    this.loadingIndicator = null;
    
    // Level controls
    this.levelToggleBtn = null;
    this.levelPanel = null;
    this.levelSlider = null;
    this.levelDisplayText = null;
    this.levelDescription = null;
    this.levelStats = null;
    this.levelManager = null;
    
    // Initialization flag to prevent duplicate event listeners
    this.initialized = false;
  }

  initialize() {
    // Prevent duplicate initialization
    if (this.initialized) {
      return true;
    }

    // Cache UI element references
    this.debugDiv = document.getElementById('debugOutput');
    this.reloadBtn = document.getElementById('reloadButton');
    this.hiResBtn = document.getElementById('hiResButton');
    this.loadingIndicator = document.getElementById('loading-indicator');
    
    // Cache level control references
    this.levelToggleBtn = document.getElementById('levelControlsToggle');
    this.levelPanel = document.getElementById('levelControlsPanel');
    this.levelSlider = document.getElementById('levelSlider');
    this.levelDisplayText = document.getElementById('levelDisplayText');
    this.levelDescription = document.getElementById('levelDescription');
    this.levelStats = document.getElementById('levelStats');

    // Set up event listeners
    if (this.reloadBtn) {
      this.reloadBtn.addEventListener('click', () => {
        location.reload();
      });
    }

    // Note: Debug div uses onclick="toggleDebugExpansion()" in HTML

    // Set up level controls event listeners
    this.setupLevelControls();

    this.initialized = true;
    return true;
  }

  setupHiResButton(callback) {
    // Set up hi-res button event listener with provided callback
    if (this.hiResBtn && callback) {
      this.hiResBtn.addEventListener('click', callback);
    }

    return true;
  }

  registerAFrameComponent(loadHighResImageCallback) {
    if (typeof AFRAME === 'undefined') {
      throw new Error('A-Frame not loaded');
    }

    AFRAME.registerComponent('button', {
      init: () => {
        // Reload button
        if (this.reloadBtn) {
          this.reloadBtn.addEventListener('click', () => {
            location.reload();
          });
        }

        // Hi-res button
        if (this.hiResBtn && loadHighResImageCallback) {
          this.hiResBtn.addEventListener('click', loadHighResImageCallback);
        }
      }
    });
  }

  debugLog(message) {
    if (!this.debugDiv) return;

    if (this.debugDiv.innerHTML.includes('click to expand')) {
      this.debugDiv.innerHTML = '';
    }
    this.debugDiv.innerHTML += '<br>' + new Date().toLocaleTimeString() + ': ' + message;
    this.debugDiv.scrollTop = this.debugDiv.scrollHeight;
  }

  toggleDebugExpansion() {
    if (!this.debugDiv) return;

    this.debugExpanded = !this.debugExpanded;

    if (this.debugExpanded) {
      this.debugDiv.style.maxHeight = '33vh';
      this.debugDiv.style.width = '90vw';
    } else {
      this.debugDiv.style.maxHeight = '18px';
      this.debugDiv.style.width = '90vw';
    }
  }

  setHiResButtonState(state, message = null) {
    if (!this.hiResBtn) return;

    switch (state) {
      case 'loading':
        this.hiResBtn.textContent = 'Loading...';
        this.hiResBtn.disabled = true;
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'block';
        }
        break;
      
      case 'success':
        this.hiResBtn.textContent = 'Hi-Res ✓';
        this.hiResBtn.style.background = 'rgba(0,128,0,0.8)';
        this.hiResBtn.disabled = false;
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'none';
        }
        break;
      
      case 'error':
        this.hiResBtn.textContent = 'Hi-Res ✗';
        this.hiResBtn.style.background = 'rgba(128,0,0,0.8)';
        this.hiResBtn.disabled = false;
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'none';
        }
        break;
      
      default:
        this.hiResBtn.textContent = 'Hi-Res';
        this.hiResBtn.style.background = '';
        this.hiResBtn.disabled = false;
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'none';
        }
    }

    if (message) {
      this.debugLog(message);
    }
  }

  showLoadingIndicator() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'block';
    }
  }

  hideLoadingIndicator() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'none';
    }
  }

  // Level Control Methods

  setupLevelControls() {
    // Set up gear icon toggle
    if (this.levelToggleBtn) {
      this.levelToggleBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent bubbling to document click listener
        this.toggleLevelPanel();
      });
    }

    // Set up slider
    if (this.levelSlider) {
      this.levelSlider.addEventListener('input', (event) => {
        const level = parseInt(event.target.value);
        this.onLevelSliderChange(level);
      });
    }

    // Close panel when clicking outside (simple version)
    document.addEventListener('click', (event) => {
      if (this.levelPanel && this.levelPanel.style.display !== 'none') {
        if (!this.levelPanel.contains(event.target) && 
            !this.levelToggleBtn.contains(event.target)) {
          this.hideLevelPanel();
        }
      }
    });
  }

  connectVisualizationModeManager(vizModeManager) {
    this.vizModeManager = vizModeManager;

    const radios = document.querySelectorAll('input[name="vizMode"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (event) => {
        this.vizModeManager.setMode(event.target.value);
      });
    });
  }

  connectLevelManager(levelManager) {
    this.levelManager = levelManager;
    
    // Listen for level changes to update UI
    if (this.levelManager) {
      this.levelManager.addLevelChangeListener((oldLevel, newLevel) => {
        this.updateLevelDisplay(newLevel);
      });
      
      // Initialize UI with current level
      this.updateLevelDisplay(this.levelManager.getMaxLevel());
    }
  }

  toggleLevelPanel() {
    if (!this.levelPanel) return;

    const isVisible = this.levelPanel.style.display !== 'none';
    
    if (isVisible) {
      this.hideLevelPanel();
    } else {
      this.showLevelPanel();
    }
  }

  showLevelPanel() {
    if (!this.levelPanel) return;

    this.levelPanel.style.display = 'block';
    
    // Update gear button to show it's active (green border)
    if (this.levelToggleBtn) {
      this.levelToggleBtn.style.borderColor = '#00FF00';
    }
    
    this.debugLog('Cosmic level controls opened');
  }

  hideLevelPanel() {
    if (!this.levelPanel) return;

    this.levelPanel.style.display = 'none';
    
    // Update gear button to show it's inactive (white border)
    if (this.levelToggleBtn) {
      this.levelToggleBtn.style.borderColor = 'white';
    }
    
    this.debugLog('Cosmic level controls closed');
  }

  onLevelSliderChange(level) {
    if (this.levelManager) {
      this.levelManager.setMaxLevel(level);
    } else {
      this.debugLog(`Level slider changed to: ${level} (no level manager connected)`);
    }
  }

  updateLevelDisplay(level) {
    // Update slider position
    if (this.levelSlider) {
      this.levelSlider.value = level;
    }

    // Update display text
    if (this.levelDisplayText) {
      this.levelDisplayText.textContent = `Showing up to Level ${level}`;
    }

    // Update level description
    this.updateLevelDescription(level);

    // Update stats
    this.updateLevelStats(level);
  }

  updateLevelDescription(level) {
    if (!this.levelDescription || !this.levelManager) return;

    const levelConfig = this.levelManager.getLevelConfig(level);
    if (levelConfig) {
      const implementedText = levelConfig.implemented ? '' : ' (Not Implemented)';
      this.levelDescription.innerHTML = `
        <strong>${levelConfig.name}${implementedText}</strong><br>
        ${levelConfig.description}<br>
        ${levelConfig.velocityDescription} ${levelConfig.direction}
      `;
    }
  }

  updateLevelStats(level) {
    if (!this.levelStats || !this.levelManager) return;

    const state = this.levelManager.getStateDescription();
    this.levelStats.textContent = `${state.maxLevel} of 8 levels • ${state.implementedLevels} implemented`;
  }
}