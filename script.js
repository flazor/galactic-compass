import { DeviceOrientation } from './modules/sensors/DeviceOrientation.js';
import { Geolocation } from './modules/sensors/Geolocation.js';
import { SceneManager } from './modules/rendering/SceneManager.js';
import { UIControls } from './modules/rendering/UIControls.js';
import { CelestialRenderer } from './modules/rendering/CelestialRenderer.js';
import { AssetManager } from './modules/assets/AssetManager.js';
import { Coordinates } from './cosmic-core/src/astronomy/Coordinates.js';
import { VERSION } from './cosmic-core/src/version.js';
import { LevelManager } from './cosmic-core/src/config/LevelManager.js';
import { VisualizationModeManager } from './modules/rendering/VisualizationModeManager.js';
import { MarkersMode } from './modules/rendering/modes/MarkersMode.js';
import { DistanceMode } from './modules/rendering/modes/DistanceMode.js';
import { ParticlesMode } from './modules/rendering/modes/ParticlesMode.js';

// Global instances
const deviceOrientation = new DeviceOrientation();
const geolocation = new Geolocation();
const sceneManager = new SceneManager();
const uiControls = new UIControls();
const levelManager = new LevelManager(uiControls);
const vizModeManager = new VisualizationModeManager(uiControls);
vizModeManager.registerMode('markers', new MarkersMode(sceneManager, uiControls, levelManager));
vizModeManager.registerMode('distance', new DistanceMode(sceneManager, uiControls, levelManager));
vizModeManager.registerMode('particles', new ParticlesMode(sceneManager, uiControls, levelManager));
const celestialRenderer = new CelestialRenderer(sceneManager, uiControls, levelManager, vizModeManager);
const assetManager = new AssetManager(uiControls);

// Listen for service worker messages
navigator.serviceWorker?.addEventListener('message', (event) => {
  if (event.data?.type === 'SW_LOG') {
    uiControls.debugLog(`[SW] ${event.data.message}`);
  }
});

// Make functions available globally for HTML
window.toRadians = Coordinates.toRadians;
window.toDegrees = Coordinates.toDegrees;
window.toggleDebugExpansion = () => uiControls.toggleDebugExpansion();
window.loadHighResImage = loadHighResImage;
window.levelManager = levelManager; // For testing and development

// Wait for A-Frame scene to be fully initialized before starting
const scene = document.querySelector('a-scene');
if (scene.hasLoaded) {
  loadBG();
} else {
  scene.addEventListener('loaded', loadBG);
}

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
  // Initialize rendering system
  try {
    sceneManager.initialize();
    uiControls.initialize();
    uiControls.setupHiResButton(loadHighResImage);

    // Connect UI controls to level manager and viz mode manager
    uiControls.connectLevelManager(levelManager);
    uiControls.connectVisualizationModeManager(vizModeManager);
    vizModeManager.enableMode('markers');
    vizModeManager.enableMode('distance');
    vizModeManager.enableMode('particles');
    
    // Add level change listener to update motion container visibility when level changes
    levelManager.addLevelChangeListener((oldLevel, newLevel) => {
      celestialRenderer.updateMotionContainerVisibility();
      
      // Calculate and log vector sum for current levels
      const position = geolocation.getPosition();
      if (position) {
        const vectorSum = celestialRenderer.calculateVectorSum(position.lat, position.lon, new Date());
        if (vectorSum) {
          const resultant = vectorSum.getResultant();
          if (resultant) {
            uiControls.debugLog(`Level ${newLevel}: Your velocity ${Math.round(resultant.magnitude)} km/s @ ${Math.round(resultant.azimuthDegrees)}° az  ${Math.round(resultant.altitudeDegrees)}° alt`);
          }
        }
      }
    });
    
    // Version info for debugging (after UI is initialized)
    uiControls.debugLog(`Tilt Meter v${VERSION}`);
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
    uiControls.debugLog('Using compass correction: ' + compassCorrection);
    
    // Render the celestial scene using the new rendering system
    celestialRenderer.renderCelestialScene(position, compassCorrection);
    
    // Calculate initial vector sum
    const vectorSum = celestialRenderer.calculateVectorSum(position.lat, position.lon, new Date());
    if (vectorSum) {
      const resultant = vectorSum.getResultant();
      if (resultant) {
        uiControls.debugLog(`Initial: Your velocity ${Math.round(resultant.magnitude)} km/s @ ${Math.round(resultant.azimuthDegrees)}° az ${Math.round(resultant.altitudeDegrees)}° alt`);
      }
    }
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
