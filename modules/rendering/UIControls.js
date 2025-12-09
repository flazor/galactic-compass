export class UIControls {
  constructor() {
    this.debugExpanded = false;
    this.debugDiv = null;
    this.reloadBtn = null;
    this.hiResBtn = null;
    this.loadingIndicator = null;
  }

  initialize() {
    // Cache UI element references
    this.debugDiv = document.getElementById('debugOutput');
    this.reloadBtn = document.getElementById('reloadButton');
    this.hiResBtn = document.getElementById('hiResButton');
    this.loadingIndicator = document.getElementById('loading-indicator');

    // Set up event listeners
    if (this.reloadBtn) {
      this.reloadBtn.addEventListener('click', () => {
        location.reload();
      });
    }

    // Set up debug div click handler
    if (this.debugDiv) {
      this.debugDiv.addEventListener('click', () => {
        this.toggleDebugExpansion();
      });
    }

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
}