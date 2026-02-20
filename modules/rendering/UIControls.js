export class UIControls {
  constructor() {
    this.debugExpanded = false;
    this.debugDiv = null;
    this.reloadBtn = null;
    this.hiResBtn = null;
    this.loadingIndicator = null;
    this.levelToggleBtn = null;
    this.sidebar = null;
    this.levelManager = null;

    // Distance/timer state
    this.startTime = null;
    this.cachedVelocities = {}; // level → km/s
    this.cachedResultantMag = 0; // km/s
    this.distIntervalId = null;

    this.openDescLevel = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return true;

    this.debugDiv = document.getElementById('debugOutput');
    this.reloadBtn = document.getElementById('reloadButton');
    this.hiResBtn = document.getElementById('hiResButton');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.levelToggleBtn = document.getElementById('levelControlsToggle');
    this.sidebar = document.getElementById('levelSidebar');

    if (this.reloadBtn) {
      this.reloadBtn.addEventListener('click', () => location.reload());
    }

    if (this.levelToggleBtn) {
      let pressTimer = null;
      this.levelToggleBtn.addEventListener('pointerdown', () => {
        pressTimer = setTimeout(() => {
          pressTimer = 'fired';
          this.toggleDebugWindow();
        }, 1000);
      });
      this.levelToggleBtn.addEventListener('pointerup', () => {
        if (pressTimer === 'fired') { pressTimer = null; return; }
        clearTimeout(pressTimer);
        pressTimer = null;
        this.toggleSidebar();
      });
      this.levelToggleBtn.addEventListener('pointerleave', () => {
        if (pressTimer && pressTimer !== 'fired') clearTimeout(pressTimer);
        pressTimer = null;
      });
    }

    for (let lvl = 1; lvl <= 8; lvl++) {
      const node = document.getElementById(`sidebar-level-${lvl}`);
      if (node) {
        node.addEventListener('click', () => this.onLevelNodeClick(lvl));
      }
    }

    // Timer reset button
    const resetBtn = document.getElementById('timer-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startTime = Date.now();
      });
    }

    // Close sidebar when tapping outside
    document.addEventListener('click', (e) => {
      if (this.sidebar && this.sidebar.style.display !== 'none') {
        if (!this.sidebar.contains(e.target) && !this.levelToggleBtn.contains(e.target)) {
          this.toggleSidebar();
        }
      }
    });

    // Start distance/timer ticker
    this.startTime = Date.now();
    this.distIntervalId = setInterval(() => this._tickDistanceTimer(), 100);

    this.initialized = true;
    return true;
  }

  toggleDebugWindow() {
    if (!this.debugDiv) return;
    const isVisible = this.debugDiv.style.display !== 'none';
    this.debugDiv.style.display = isVisible ? 'none' : 'block';
  }

  toggleSidebar() {
    if (!this.sidebar) return;
    const isVisible = this.sidebar.style.display !== 'none';
    this.sidebar.style.display = isVisible ? 'none' : 'flex';
    if (this.levelToggleBtn) {
      this.levelToggleBtn.style.borderColor = isVisible ? 'white' : '#00FF00';
    }
  }

  setupHiResButton(callback) {
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
        if (this.reloadBtn) {
          this.reloadBtn.addEventListener('click', () => location.reload());
        }
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
    this.debugDiv.style.maxHeight = this.debugExpanded ? '33vh' : '18px';
  }

  setHiResButtonState(state, message = null) {
    if (!this.hiResBtn) return;

    switch (state) {
      case 'loading':
        this.hiResBtn.textContent = 'Loading...';
        this.hiResBtn.disabled = true;
        if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';
        break;
      case 'success':
        this.hiResBtn.textContent = 'Hi-Res ✓';
        this.hiResBtn.style.background = 'rgba(0,128,0,0.8)';
        this.hiResBtn.disabled = false;
        if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
        break;
      case 'error':
        this.hiResBtn.textContent = 'Hi-Res ✗';
        this.hiResBtn.style.background = 'rgba(128,0,0,0.8)';
        this.hiResBtn.disabled = false;
        if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
        break;
      default:
        this.hiResBtn.textContent = 'Hi-Res';
        this.hiResBtn.style.background = '';
        this.hiResBtn.disabled = false;
        if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
    }

    if (message) this.debugLog(message);
  }

  showLoadingIndicator() {
    if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';
  }

  hideLoadingIndicator() {
    if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
  }

  connectVisualizationModeManager(vizModeManager) {
    this.vizModeManager = vizModeManager;

    const labels = document.querySelectorAll('#vizModeSelector label');
    labels.forEach(label => {
      const cb = label.querySelector('input[type="checkbox"]');
      if (!cb) return;

      // Set initial active state
      if (cb.checked) label.classList.add('active');

      // Toggle on label tap (checkbox is hidden)
      label.addEventListener('click', (e) => {
        e.preventDefault();
        cb.checked = !cb.checked;
        label.classList.toggle('active', cb.checked);
        this.vizModeManager.toggleMode(cb.value, cb.checked);
      });
    });
  }

  connectLevelManager(levelManager) {
    this.levelManager = levelManager;

    if (this.levelManager) {
      this.levelManager.addLevelChangeListener((oldLevel, newLevel) => {
        this.updateLevelActiveStates(newLevel);
      });

      const currentLevel = this.levelManager.getMaxLevel();
      this.updateLevelActiveStates(currentLevel);
    }
  }

  onLevelNodeClick(level) {
    if (this.levelManager) {
      this.levelManager.setMaxLevel(level);
    }
    this.toggleLevelDescription(level);
  }

  toggleLevelDescription(level) {
    if (!this.levelManager) return;

    // Close any currently open description
    if (this.openDescLevel && this.openDescLevel !== level) {
      const prev = document.getElementById(`sidebar-desc-${this.openDescLevel}`);
      if (prev) prev.style.display = 'none';
    }

    const descEl = document.getElementById(`sidebar-desc-${level}`);
    if (!descEl) return;

    // Toggle: if tapping same level, close it
    if (this.openDescLevel === level && descEl.style.display !== 'none') {
      descEl.style.display = 'none';
      this.openDescLevel = null;
      return;
    }

    const config = this.levelManager.getLevelConfig(level);
    if (!config) return;
    descEl.innerHTML = `<strong>${config.name}</strong><br>${config.description}<br><em>${config.velocityDescription} ${config.direction}</em><br><small>${config.scaleDescription}</small>`;
    descEl.style.display = 'block';
    this.openDescLevel = level;
  }

  updateLevelActiveStates(maxLevel) {
    for (let lvl = 1; lvl <= 8; lvl++) {
      const node = document.getElementById(`sidebar-level-${lvl}`);
      if (node) {
        node.classList.toggle('active', lvl <= maxLevel);
        node.classList.toggle('selected', lvl === maxLevel);
      }
      const header = document.getElementById(`sidebar-header-${lvl}`);
      if (header) header.style.display = lvl === maxLevel ? '' : 'none';
    }
  }

  /**
   * Update sidebar with fresh velocity/direction data. Caches velocities for
   * the distance ticker to use between renders.
   */
  updateSidebar(motionVectors, resultant, maxLevel) {
    // Cache resultant for ticker
    this.cachedResultantMag = resultant?.magnitude ?? 0;

    // Resultant row
    if (resultant) {
      const mag = resultant.magnitude;
      const spd = mag < 10 ? mag.toFixed(2) : mag.toFixed(1);
      const az  = resultant.azimuthDegrees.toFixed(2);
      const alt = resultant.altitudeDegrees.toFixed(2);
      this._setText('sidebar-resultant-vel', spd);
      this._setText('sidebar-resultant-az',  `${az}°`);
      this._setText('sidebar-resultant-alt', `${alt}°`);
    }

    this.updateLevelActiveStates(maxLevel);

    for (let lvl = 1; lvl <= 8; lvl++) {
      const vector = motionVectors?.find(v => v.level === lvl);
      if (vector?.implemented && vector.velocity != null) {
        // Cache velocity for distance ticker
        this.cachedVelocities[lvl] = vector.velocity;

        const v = vector.velocity;
        const spd = lvl === 1 ? v.toFixed(2) : v.toFixed(1);
        const az  = vector.direction.azimuthDegrees.toFixed(2);
        const alt = vector.direction.altitudeDegrees.toFixed(2);
        this._setText(`sidebar-${lvl}-vel`, spd);
        this._setText(`sidebar-${lvl}-az`,  `${az}°`);
        this._setText(`sidebar-${lvl}-alt`, `${alt}°`);
      }
    }
  }

  /** Called at 100ms intervals to update the timer and distance cells. */
  _tickDistanceTimer() {
    if (!this.startTime) return;
    if (this.sidebar?.style.display === 'none') return;
    const elapsed = (Date.now() - this.startTime) / 1000;

    this._setText('sidebar-timer', _formatDuration(elapsed));

    // Resultant distance
    this._setText('sidebar-resultant-dist', _formatDist(this.cachedResultantMag * elapsed));

    // Per-level distances
    for (let lvl = 1; lvl <= 8; lvl++) {
      const vel = this.cachedVelocities[lvl];
      if (vel != null) {
        this._setText(`sidebar-${lvl}-dist`, _formatDist(vel * elapsed));
      }
    }
  }

  _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}

function _formatDuration(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function _formatDist(km) {
  if (km < 1000)   return `${km.toFixed(1)} km`;
  if (km < 1e6)    return `${(km / 1e3).toFixed(1)}K km`;
  if (km < 1e9)    return `${(km / 1e6).toFixed(2)}M km`;
  return               `${(km / 1e9).toFixed(2)}G km`;
}
