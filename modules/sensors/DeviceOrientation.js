export class DeviceOrientation {
  constructor() {
    this.compassAttempts = 0;
    this.isCalibrated = false;
    this.onReadyCallback = null;
    this.boundHandleOrientation = this.handleOrientation.bind(this);
  }

  async requestPermissions() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      return permission === 'granted';
    }
    return true;
  }

  startCalibration(onReady) {
    this.onReadyCallback = onReady;
    window.addEventListener("deviceorientation", this.boundHandleOrientation);
  }

  handleOrientation(evt) {
    this.compassAttempts++;
    const heading = evt.webkitCompassHeading;
    
    // Wait for a valid non-zero heading (iOS compass needs time to calibrate)
    if (heading == undefined || isNaN(heading) || heading === 0) {
      console.log('Waiting for compass calibration... (attempt ' + this.compassAttempts + ')');
      return; // Keep listening for more orientation events
    }
    
    // Got a valid heading, proceed with setup
    window.removeEventListener("deviceorientation", this.boundHandleOrientation);
    console.log('Compass ready: ' + heading);
    this.isCalibrated = true;
    
    if (this.onReadyCallback) {
      this.onReadyCallback(heading);
    }
  }

  getOrientationCorrection(heading) {
    const portrait = window.matchMedia("(orientation: portrait)").matches;
    return portrait ? heading - 90 : heading;
  }
}