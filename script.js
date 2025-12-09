import { DeviceOrientation } from './modules/sensors/DeviceOrientation.js';
import { Geolocation } from './modules/sensors/Geolocation.js';
import { SceneManager } from './modules/rendering/SceneManager.js';
import { UIControls } from './modules/rendering/UIControls.js';
import { CelestialRenderer } from './modules/rendering/CelestialRenderer.js';
import { AssetManager } from './modules/assets/AssetManager.js';
import { Coordinates } from './modules/astronomy/Coordinates.js';

const VERSION = '0.1.2';

// Global instances
const deviceOrientation = new DeviceOrientation();
const geolocation = new Geolocation();
const sceneManager = new SceneManager();
const uiControls = new UIControls();
const celestialRenderer = new CelestialRenderer(sceneManager, uiControls);
const assetManager = new AssetManager(uiControls);

// Listen for service worker messages
navigator.serviceWorker?.addEventListener('message', (event) => {
  if (event.data?.type === 'SW_LOG') {
    uiControls.debugLog(`[SW] ${event.data.message}`);
  }
});

// Make functions available globally for HTML onload and A-Frame components
window.loadBG = loadBG;
window.toRadians = Coordinates.toRadians;
window.toDegrees = Coordinates.toDegrees;
window.toggleDebugExpansion = () => uiControls.toggleDebugExpansion();
window.loadHighResImage = loadHighResImage;

// A-Frame component registration
AFRAME.registerComponent('button', {
  init() {
    uiControls.initialize();
    uiControls.setupHiResButton(loadHighResImage);
  }
});

// Asset caching is now handled by AssetManager

// Asset management is now handled by AssetManager

function checkDeviceCapabilities() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Test canvas size limits
  uiControls.debugLog('Testing device capabilities...');
  uiControls.debugLog(`User Agent: ${navigator.userAgent}`);
  uiControls.debugLog(`Screen: ${screen.width}x${screen.height}`);
  uiControls.debugLog(`Device pixel ratio: ${devicePixelRatio}`);
  uiControls.debugLog(`Available memory: ${navigator.deviceMemory || 'unknown'}GB`);
  
  // Test maximum canvas dimensions
  let maxCanvasSize = 8192;
  try {
    canvas.width = maxCanvasSize;
    canvas.height = maxCanvasSize;
    ctx.fillRect(0, 0, 1, 1);
    uiControls.debugLog(`Canvas ${maxCanvasSize}x${maxCanvasSize}: OK`);
  } catch (e) {
    uiControls.debugLog(`Canvas ${maxCanvasSize}x${maxCanvasSize}: FAILED - ${e.message}`);
    maxCanvasSize = 4096;
    try {
      canvas.width = maxCanvasSize;
      canvas.height = maxCanvasSize;
      ctx.fillRect(0, 0, 1, 1);
      uiControls.debugLog(`Canvas ${maxCanvasSize}x${maxCanvasSize}: OK`);
    } catch (e2) {
      uiControls.debugLog(`Canvas ${maxCanvasSize}x${maxCanvasSize}: FAILED - ${e2.message}`);
    }
  }
  
  return { maxCanvasSize };
}

function loadBG() {
  // Version info for debugging
  uiControls.debugLog(`Tilt Meter v${VERSION} | SW: tilt-meter-v1.0`);
  
  // Initialize rendering system
  try {
    sceneManager.initialize();
    uiControls.initialize();
    uiControls.debugLog('Rendering system initialized');
  } catch (error) {
    uiControls.debugLog('ERROR initializing rendering system: ' + error.message);
    return;
  }
  
  // Check device capabilities first
  checkDeviceCapabilities();
  
  // Cache all assets for offline use
  assetManager.cacheAllAssets();
  
  // Update initial skybox if cached image exists
  setTimeout(() => {
    const cachedLowRes = assetManager.getCachedLowResImage();
    if (cachedLowRes) {
      celestialRenderer.updateSkyboxTexture(cachedLowRes);
      uiControls.debugLog('Using cached low-res image for initial load');
    }
  }, 100);
  
  // Start device orientation calibration
  deviceOrientation.startCalibration(handleDeviceReady);
}

async function handleDeviceReady(heading) {
  try {
    const position = await geolocation.getCurrentPosition();
    const compassCorrection = deviceOrientation.getOrientationCorrection(heading);
    
    // Render the celestial scene using the new rendering system
    celestialRenderer.renderCelestialScene(position, compassCorrection);
    
  } catch (error) {
    uiControls.debugLog('ERROR in handleDeviceReady: ' + error.message);
  }
}

async function loadHighResImage() {
  uiControls.debugLog('Hi-Res button pressed');
  uiControls.setHiResButtonState('loading', 'Attempting to cache hi-res image...');
  
  try {
    // Try to get hi-res image (from cache or network)
    const imageSrc = await assetManager.cacheHiResImage();
    uiControls.debugLog('Hi-res image ready, updating skybox');
    
    celestialRenderer.updateSkyboxTexture(imageSrc);
    
    // Wait for texture to actually render
    celestialRenderer.waitForTextureUpdate((success) => {
      if (success) {
        uiControls.setHiResButtonState('success', 'Hi-res texture rendered successfully');
      } else {
        uiControls.setHiResButtonState('error', 'Hi-res load failed (timeout)');
      }
    });
    
  } catch (error) {
    uiControls.setHiResButtonState('error', 'ERROR in loadHighResImage: ' + error.message);
  }
}
