import { DeviceOrientation } from './modules/sensors/DeviceOrientation.js';
import { Geolocation } from './modules/sensors/Geolocation.js';
import { GalacticCenter } from './modules/astronomy/GalacticCenter.js';
import { Coordinates } from './modules/astronomy/Coordinates.js';

const VERSION = '0.1.1';

// Global instances
const deviceOrientation = new DeviceOrientation();
const geolocation = new Geolocation();

// Make functions available globally for HTML onload and A-Frame components
window.loadBG = loadBG;
window.toRadians = Coordinates.toRadians;
window.toDegrees = Coordinates.toDegrees;
window.toggleDebugExpansion = toggleDebugExpansion;
window.loadHighResImage = loadHighResImage;

AFRAME.registerComponent('button', {
  init() {
    const btn = document.getElementById('reloadButton')
    btn.addEventListener('click', () => {
      location.reload();
    })

    // Hi-res button functionality
    const hiResBtn = document.getElementById('hiResButton')
    if (hiResBtn) {
      hiResBtn.addEventListener('click', () => {
        loadHighResImage();
      })
    }
  }
})

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
      debugLog('Loaded cached asset from localStorage:', asset.url);
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
            debugLog('Cached image to localStorage:', asset.url);
          } catch (error) {
            debugLog('ERROR: Failed to cache image:', asset.url, error);
          }
        };
        img.onerror = () => debugLog('ERROR: Failed to load image:', asset.url);
        img.src = asset.url;
      } else {
        // Handle text assets (CSS, JS)
        const response = await fetch(asset.url);
        const text = await response.text();
        localStorage.setItem(cachedKey, text);
        debugLog('Cached text asset to localStorage:', asset.url);
      }
    } catch (error) {
      debugLog('ERROR: Failed to cache asset:', asset.url, error);
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
  
  debugLog('Checking IndexedDB cache for hi-res image');
  
  try {
    // Check if already cached in IndexedDB
    const cached = await getImageFromDB(hiResUrl);
    if (cached) {
      debugLog('Found cached hi-res image in IndexedDB');
      imageCache[hiResUrl] = cached;
      return cached;
    }
    
    debugLog('No cached image, loading from network');
    
    // If not cached, load and cache it
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          debugLog(`Hi-res image loaded: ${img.width}x${img.height}`);
          debugLog(`Image file size estimate: ${(img.width * img.height * 4 / 1024 / 1024).toFixed(1)}MB`);
          
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
            debugLog(`Downscaling from ${img.width}x${img.height} to ${targetWidth}x${targetHeight}`);
          }
          
          debugLog('Setting canvas dimensions...');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          debugLog(`Canvas created: ${canvas.width}x${canvas.height}`);
          
          debugLog('Drawing image to canvas...');
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          
          // Check if canvas drawing actually worked
          const imageData = ctx.getImageData(0, 0, 1, 1);
          debugLog(`Canvas pixel check: [${imageData.data[0]},${imageData.data[1]},${imageData.data[2]},${imageData.data[3]}]`);
          
          debugLog('Converting to data URL...');
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          const dataURLSize = (dataURL.length / 1024 / 1024).toFixed(1);
          debugLog(`Data URL size: ${dataURLSize}MB`);
          
          // Check if toDataURL failed (returns empty or invalid data URL)
          if (dataURL.length < 1000 || dataURL === 'data:,') {
            debugLog('Data URL conversion failed even after downscaling');
            throw new Error('Canvas toDataURL failed');
          }
          
          imageCache[hiResUrl] = dataURL;
          debugLog('Saving to IndexedDB...');
          await saveImageToDB(hiResUrl, dataURL);
          debugLog('Cached hi-res image to IndexedDB successfully');
          resolve(dataURL);
        } catch (error) {
          debugLog('ERROR caching hi-res image: ' + error.message);
          debugLog('Stack: ' + error.stack);
          reject(error);
        }
      };
      img.onerror = () => {
        debugLog('ERROR loading hi-res image from network');
        reject(new Error('Failed to load hi-res image'));
      };
      img.src = hiResUrl;
      debugLog('Started loading hi-res image: ' + hiResUrl);
    });
  } catch (error) {
    debugLog('ERROR with IndexedDB: ' + error.message);
    throw error;
  }
}

function checkDeviceCapabilities() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Test canvas size limits
  debugLog('Testing device capabilities...');
  debugLog(`User Agent: ${navigator.userAgent}`);
  debugLog(`Screen: ${screen.width}x${screen.height}`);
  debugLog(`Device pixel ratio: ${devicePixelRatio}`);
  debugLog(`Available memory: ${navigator.deviceMemory || 'unknown'}GB`);
  
  // Test maximum canvas dimensions
  let maxCanvasSize = 8192;
  try {
    canvas.width = maxCanvasSize;
    canvas.height = maxCanvasSize;
    ctx.fillRect(0, 0, 1, 1);
    debugLog(`Canvas ${maxCanvasSize}x${maxCanvasSize}: OK`);
  } catch (e) {
    debugLog(`Canvas ${maxCanvasSize}x${maxCanvasSize}: FAILED - ${e.message}`);
    maxCanvasSize = 4096;
    try {
      canvas.width = maxCanvasSize;
      canvas.height = maxCanvasSize;
      ctx.fillRect(0, 0, 1, 1);
      debugLog(`Canvas ${maxCanvasSize}x${maxCanvasSize}: OK`);
    } catch (e2) {
      debugLog(`Canvas ${maxCanvasSize}x${maxCanvasSize}: FAILED - ${e2.message}`);
    }
  }
  
  return { maxCanvasSize };
}

function loadBG() {
  // Version info for debugging
  debugLog(`Galactic Compass v${VERSION}`);
  
  // Check device capabilities first
  checkDeviceCapabilities();
  
  // Cache all assets for offline use
  cacheAllAssets();
  
  // Update initial skybox if cached image exists
  setTimeout(() => {
    const skyElement = document.getElementById('a-sky');
    const cachedLowRes = localStorage.getItem('cached_https://s3.eu-west-1.amazonaws.com/rideyourbike.org/compass/starmap_2020_1k_gal.jpg');
    if (cachedLowRes && skyElement) {
      skyElement.setAttribute('src', cachedLowRes);
      debugLog('Using cached low-res image for initial load');
    }
  }, 100);
  
  // Start device orientation calibration
  deviceOrientation.startCalibration(handleDeviceReady);
}

async function handleDeviceReady(heading) {
  try {
    const position = await geolocation.getCurrentPosition();
    const { lat, lon } = position;
    
    // Calculate sun and moon positions using SunCalc
    let sunLoc = SunCalc.getPosition(new Date(), lat, lon);
    debugLog("sun alt: " + Coordinates.toDegrees(sunLoc.altitude));
    debugLog("sun az: " + Coordinates.toDegrees(sunLoc.azimuth + Math.PI));
    
    let moonLoc = SunCalc.getMoonPosition(new Date(), lat, lon);
    debugLog("moon alt: " + Coordinates.toDegrees(moonLoc.altitude));
    debugLog("moon az: " + Coordinates.toDegrees(moonLoc.azimuth + Math.PI));
    
    const compassCorrection = deviceOrientation.getOrientationCorrection(heading);

    // Rotate Y by negative Azimuth of heading to correct for north
    document.getElementById("a-sky").object3D.rotateY(Coordinates.toRadians(compassCorrection));

    var rotations = GalacticCenter.currentMilkyWayPosition(lat, lon, new Date());
    // To Orient the Galactic center
    // Rotate Y by negative Azimuth of sagA
    document.getElementById("a-sky").object3D.rotateY(Coordinates.toRadians(-rotations[0]));
    // Rotate Z by negative Altitude of sagA, aligning the center of the galaxy
    document.getElementById("a-sky").object3D.rotateZ(Coordinates.toRadians(-rotations[1]));
    // Rotate pole by angle between rotated galactic north pole and Com31, aligning the galactic plane
    document.getElementById("a-sky").object3D.rotateX(Coordinates.toRadians(-rotations[2]));

    // Correct for the direction that the viewer is facing. This must be done before other rotations
    document.getElementById("milky-way-container").object3D.rotateY(Coordinates.toRadians(compassCorrection));
    document.getElementById("sun-container").object3D.rotateY(Coordinates.toRadians(compassCorrection));
    document.getElementById("moon-container").object3D.rotateY(Coordinates.toRadians(compassCorrection));
    document.getElementById("compass-container").object3D.rotateY(Coordinates.toRadians(compassCorrection));
    
    // sunLoc uses 0 deg for south to add 180 deg (PI radians) to adjust to north
    debugLog("rotate:"+(sunLoc.azimuth + Math.PI))
    document.getElementById("sun-container").object3D.rotateY(-sunLoc.azimuth + Math.PI / 2);
    document.getElementById("sun-container").object3D.rotateX(-sunLoc.altitude);
    document.getElementById("moon-container").object3D.rotateY(-moonLoc.azimuth + Math.PI / 2);
    document.getElementById("moon-container").object3D.rotateX(-moonLoc.altitude);

    document.getElementById("milky-way-container").object3D.rotateY(Coordinates.toRadians(-rotations[0]));
    document.getElementById("milky-way-container").object3D.rotateZ(Coordinates.toRadians(-rotations[1]));
    document.getElementById("milky-way-container").object3D.rotateX(Coordinates.toRadians(-rotations[2]));
    
  } catch (error) {
    debugLog('ERROR in handleDeviceReady: ' + error.message);
  }
}

let debugExpanded = false;

function toggleDebugExpansion() {
  const debugDiv = document.getElementById('debugOutput');
  if (!debugDiv) return;
  
  debugExpanded = !debugExpanded;
  
  if (debugExpanded) {
    debugDiv.style.maxHeight = '33vh';
    debugDiv.style.width = '90vw';
  } else {
    debugDiv.style.maxHeight = '18px';
    debugDiv.style.width = '90vw';
  }
}

function debugLog(message) {
  const debugDiv = document.getElementById('debugOutput');
  if (debugDiv) {
    if (debugDiv.innerHTML.includes('click to expand')) {
      debugDiv.innerHTML = '';
    }
    debugDiv.innerHTML += '<br>' + new Date().toLocaleTimeString() + ': ' + message;
    debugDiv.scrollTop = debugDiv.scrollHeight;
  }
}

async function loadHighResImage() {
  debugLog('Hi-Res button pressed');
  
  const hiResBtn = document.getElementById('hiResButton');
  const loadingIndicator = document.getElementById('loading-indicator');
  
  // Update button to show loading state
  hiResBtn.textContent = 'Loading...';
  hiResBtn.disabled = true;
  
  // Show loading indicator if it exists
  if (loadingIndicator) {
    loadingIndicator.style.display = 'block';
  }
  
  try {
    debugLog('Attempting to cache hi-res image...');
    // Try to get hi-res image (from cache or network)
    const imageSrc = await cacheHiResImage();
    debugLog('Hi-res image ready, updating skybox');
    
    const skyElement = document.getElementById('a-sky');
    debugLog(`Setting skybox src to cached image (${imageSrc.length} chars)`);
    skyElement.setAttribute('src', imageSrc);
    
    // Wait for texture to actually render (like original version)
    const waitForTextureUpdate = () => {
      const material = skyElement.getObject3D('mesh').material;
      if (material && material.map && material.map.image && 
          (material.map.image.src.includes('8k') || material.map.image.src.startsWith('data:'))) {
        // Texture is actually updated with hi-res content
        setTimeout(() => {
          if (loadingIndicator) loadingIndicator.style.display = 'none';
          hiResBtn.textContent = 'Hi-Res ✓';
          hiResBtn.style.background = 'rgba(0,128,0,0.8)'; // Green - successfully cached
          hiResBtn.disabled = false;
          debugLog('Hi-res texture rendered successfully');
        }, 500); // Small delay to ensure GPU has processed the texture
      } else {
        // Check again in a short while
        setTimeout(waitForTextureUpdate, 100);
      }
    };
    
    // Start checking for texture update
    setTimeout(waitForTextureUpdate, 100);
    
    // Fallback timeout in case texture detection fails
    setTimeout(() => {
      if (hiResBtn.textContent === 'Loading...') {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        hiResBtn.textContent = 'Hi-Res ✗';
        hiResBtn.style.background = 'rgba(128,0,0,0.8)'; // Red background
        hiResBtn.disabled = false;
        debugLog('Hi-res load failed (timeout)');
      }
    }, 5000); // 5 second fallback
    
  } catch (error) {
    debugLog('ERROR in loadHighResImage: ' + error.message);
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    hiResBtn.textContent = 'Hi-Res ✗';
    hiResBtn.style.background = 'rgba(128,0,0,0.8)'; // Red background
    hiResBtn.disabled = false;
  }
}