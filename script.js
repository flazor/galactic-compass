import { DeviceOrientation } from './modules/sensors/DeviceOrientation.js';
import { Geolocation } from './modules/sensors/Geolocation.js';
import { SceneManager } from './modules/rendering/SceneManager.js';
import { UIControls } from './modules/rendering/UIControls.js';
import { CelestialRenderer } from './modules/rendering/CelestialRenderer.js';
import { Coordinates } from './modules/astronomy/Coordinates.js';

const VERSION = '0.1.1';

// Global instances
const deviceOrientation = new DeviceOrientation();
const geolocation = new Geolocation();
const sceneManager = new SceneManager();
const uiControls = new UIControls();
const celestialRenderer = new CelestialRenderer(sceneManager, uiControls);

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

// Preload and cache images for iOS
const imageCache = {};

async function cacheAllAssets() {
  const assetsToCache = [
    { url: 'main.css', type: 'text' },
    { url: 'aframe.min.js', type: 'text' },
    { url: 'suncalc.js', type: 'text' },
    { url: 'script.js', type: 'text' },
    { url: 'https://s3.eu-west-1.amazonaws.com/rideyourbike.org/compass/starmap_2020_1k_gal.jpg', type: 'image' }
    // Don't preload hi-res image
  ];
  
  for (const asset of assetsToCache) {
    const cachedKey = `cached_${asset.url}`;
    const cached = localStorage.getItem(cachedKey);
    
    if (cached) {
      if (asset.type === 'image') {
        imageCache[asset.url] = cached;
      }
      uiControls.debugLog('Loaded cached asset from localStorage: ' + asset.url);
      continue;
    }
    
    try {
      if (asset.type === 'image') {
        // Handle images with canvas conversion
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            imageCache[asset.url] = dataURL;
            localStorage.setItem(cachedKey, dataURL);
            uiControls.debugLog('Cached image to localStorage: ' + asset.url);
          } catch (error) {
            uiControls.debugLog('ERROR: Failed to cache image: ' + asset.url + ' ' + error);
          }
        };
        img.onerror = () => uiControls.debugLog('ERROR: Failed to load image: ' + asset.url);
        img.src = asset.url;
      } else {
        // Handle text assets (CSS, JS)
        const response = await fetch(asset.url);
        const text = await response.text();
        localStorage.setItem(cachedKey, text);
        uiControls.debugLog('Cached text asset to localStorage: ' + asset.url);
      }
    } catch (error) {
      uiControls.debugLog('ERROR: Failed to cache asset: ' + asset.url + ' ' + error);
    }
  }
}

// Simple IndexedDB wrapper for storing large images
function openImageDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GalacticCompassDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'url' });
      }
    };
  });
}

async function getImageFromDB(url) {
  const db = await openImageDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const request = store.get(url);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ? request.result.dataURL : null);
  });
}

async function saveImageToDB(url, dataURL) {
  const db = await openImageDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');
    const request = store.put({ url, dataURL });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function cacheHiResImage() {
  const hiResUrl = 'https://s3.eu-west-1.amazonaws.com/rideyourbike.org/compass/starmap_2020_8k_gal.jpg';
  
  uiControls.debugLog('Checking IndexedDB cache for hi-res image');
  
  try {
    // Check if already cached in IndexedDB
    const cached = await getImageFromDB(hiResUrl);
    if (cached) {
      uiControls.debugLog('Found cached hi-res image in IndexedDB');
      imageCache[hiResUrl] = cached;
      return cached;
    }
    
    uiControls.debugLog('No cached image, loading from network');
    
    // If not cached, load and cache it
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          uiControls.debugLog(`Hi-res image loaded: ${img.width}x${img.height}`);
          uiControls.debugLog(`Image file size estimate: ${(img.width * img.height * 4 / 1024 / 1024).toFixed(1)}MB`);
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Could not get 2D context');
          }
          
          // Check if image is too large for device and downscale if needed
          let targetWidth = img.width;
          let targetHeight = img.height;
          const maxPixels = 16 * 1024 * 1024; // 16M pixels max for older devices
          const currentPixels = img.width * img.height;
          
          if (currentPixels > maxPixels) {
            const scale = Math.sqrt(maxPixels / currentPixels);
            targetWidth = Math.floor(img.width * scale);
            targetHeight = Math.floor(img.height * scale);
            uiControls.debugLog(`Downscaling from ${img.width}x${img.height} to ${targetWidth}x${targetHeight}`);
          }
          
          uiControls.debugLog('Setting canvas dimensions...');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          uiControls.debugLog(`Canvas created: ${canvas.width}x${canvas.height}`);
          
          uiControls.debugLog('Drawing image to canvas...');
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          
          // Check if canvas drawing actually worked
          const imageData = ctx.getImageData(0, 0, 1, 1);
          uiControls.debugLog(`Canvas pixel check: [${imageData.data[0]},${imageData.data[1]},${imageData.data[2]},${imageData.data[3]}]`);
          
          uiControls.debugLog('Converting to data URL...');
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          const dataURLSize = (dataURL.length / 1024 / 1024).toFixed(1);
          uiControls.debugLog(`Data URL size: ${dataURLSize}MB`);
          
          // Check if toDataURL failed (returns empty or invalid data URL)
          if (dataURL.length < 1000 || dataURL === 'data:,') {
            uiControls.debugLog('Data URL conversion failed even after downscaling');
            throw new Error('Canvas toDataURL failed');
          }
          
          imageCache[hiResUrl] = dataURL;
          uiControls.debugLog('Saving to IndexedDB...');
          await saveImageToDB(hiResUrl, dataURL);
          uiControls.debugLog('Cached hi-res image to IndexedDB successfully');
          resolve(dataURL);
        } catch (error) {
          uiControls.debugLog('ERROR caching hi-res image: ' + error.message);
          uiControls.debugLog('Stack: ' + error.stack);
          reject(error);
        }
      };
      img.onerror = () => {
        uiControls.debugLog('ERROR loading hi-res image from network');
        reject(new Error('Failed to load hi-res image'));
      };
      img.src = hiResUrl;
      uiControls.debugLog('Started loading hi-res image: ' + hiResUrl);
    });
  } catch (error) {
    uiControls.debugLog('ERROR with IndexedDB: ' + error.message);
    throw error;
  }
}

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
  uiControls.debugLog(`Galactic Compass v${VERSION}`);
  
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
  cacheAllAssets();
  
  // Update initial skybox if cached image exists
  setTimeout(() => {
    const cachedLowRes = localStorage.getItem('cached_https://s3.eu-west-1.amazonaws.com/rideyourbike.org/compass/starmap_2020_1k_gal.jpg');
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
    const imageSrc = await cacheHiResImage();
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