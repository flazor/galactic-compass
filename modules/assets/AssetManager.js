export class AssetManager {
  constructor(uiControls = null) {
    this.uiControls = uiControls;
    this.imageCache = {};
    this.dbName = 'GalacticCompassDB';
    this.dbVersion = 1;
  }

  // Asset caching configuration
  getAssetList() {
    return [
      { url: 'main.css', type: 'text' },
      { url: 'aframe.min.js', type: 'text' },
      { url: 'suncalc.js', type: 'text' },
      { url: 'script.js', type: 'text' },
      { url: 'https://s3.eu-west-1.amazonaws.com/rideyourbike.org/compass/starmap_2020_1k_gal.jpg', type: 'image' }
      // Don't preload hi-res image
    ];
  }

  // Main asset caching function
  async cacheAllAssets() {
    const assetsToCache = this.getAssetList();
    
    for (const asset of assetsToCache) {
      const cachedKey = `cached_${asset.url}`;
      const cached = localStorage.getItem(cachedKey);
      
      if (cached) {
        if (asset.type === 'image') {
          this.imageCache[asset.url] = cached;
        }
        this.debugLog('Loaded cached asset from localStorage: ' + asset.url);
        continue;
      }
      
      try {
        if (asset.type === 'image') {
          await this.cacheImageAsset(asset.url, cachedKey);
        } else {
          await this.cacheTextAsset(asset.url, cachedKey);
        }
      } catch (error) {
        this.debugLog('ERROR: Failed to cache asset: ' + asset.url + ' ' + error);
      }
    }
  }

  // Cache image asset with canvas conversion
  async cacheImageAsset(url, cacheKey) {
    return new Promise((resolve, reject) => {
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
          this.imageCache[url] = dataURL;
          localStorage.setItem(cacheKey, dataURL);
          this.debugLog('Cached image to localStorage: ' + url);
          resolve(dataURL);
        } catch (error) {
          this.debugLog('ERROR: Failed to cache image: ' + url + ' ' + error);
          reject(error);
        }
      };
      img.onerror = () => {
        const error = new Error('Failed to load image: ' + url);
        this.debugLog('ERROR: ' + error.message);
        reject(error);
      };
      img.src = url;
    });
  }

  // Cache text asset
  async cacheTextAsset(url, cacheKey) {
    const response = await fetch(url);
    const text = await response.text();
    localStorage.setItem(cacheKey, text);
    this.debugLog('Cached text asset to localStorage: ' + url);
    return text;
  }

  // IndexedDB wrapper functions
  openImageDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
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

  async getImageFromDB(url) {
    const db = await this.openImageDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const request = store.get(url);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ? request.result.dataURL : null);
    });
  }

  async saveImageToDB(url, dataURL) {
    const db = await this.openImageDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const request = store.put({ url, dataURL });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Hi-res image caching with IndexedDB
  async cacheHiResImage() {
    const hiResUrl = 'https://s3.eu-west-1.amazonaws.com/rideyourbike.org/compass/starmap_2020_8k_gal.jpg';
    
    this.debugLog('Checking IndexedDB cache for hi-res image');
    
    try {
      // Check if already cached in IndexedDB
      const cached = await this.getImageFromDB(hiResUrl);
      if (cached) {
        this.debugLog('Found cached hi-res image in IndexedDB');
        this.imageCache[hiResUrl] = cached;
        return cached;
      }
      
      this.debugLog('No cached image, loading from network');
      
      // If not cached, load and cache it
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
          try {
            this.debugLog(`Hi-res image loaded: ${img.width}x${img.height}`);
            this.debugLog(`Image file size estimate: ${(img.width * img.height * 4 / 1024 / 1024).toFixed(1)}MB`);
            
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
              this.debugLog(`Downscaling from ${img.width}x${img.height} to ${targetWidth}x${targetHeight}`);
            }
            
            this.debugLog('Setting canvas dimensions...');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            this.debugLog(`Canvas created: ${canvas.width}x${canvas.height}`);
            
            this.debugLog('Drawing image to canvas...');
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            
            // Check if canvas drawing actually worked
            const imageData = ctx.getImageData(0, 0, 1, 1);
            this.debugLog(`Canvas pixel check: [${imageData.data[0]},${imageData.data[1]},${imageData.data[2]},${imageData.data[3]}]`);
            
            this.debugLog('Converting to data URL...');
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            const dataURLSize = (dataURL.length / 1024 / 1024).toFixed(1);
            this.debugLog(`Data URL size: ${dataURLSize}MB`);
            
            // Check if toDataURL failed (returns empty or invalid data URL)
            if (dataURL.length < 1000 || dataURL === 'data:,') {
              this.debugLog('Data URL conversion failed even after downscaling');
              throw new Error('Canvas toDataURL failed');
            }
            
            this.imageCache[hiResUrl] = dataURL;
            this.debugLog('Saving to IndexedDB...');
            await this.saveImageToDB(hiResUrl, dataURL);
            this.debugLog('Cached hi-res image to IndexedDB successfully');
            resolve(dataURL);
          } catch (error) {
            this.debugLog('ERROR caching hi-res image: ' + error.message);
            this.debugLog('Stack: ' + error.stack);
            reject(error);
          }
        };
        img.onerror = () => {
          this.debugLog('ERROR loading hi-res image from network');
          reject(new Error('Failed to load hi-res image'));
        };
        img.src = hiResUrl;
        this.debugLog('Started loading hi-res image: ' + hiResUrl);
      });
    } catch (error) {
      this.debugLog('ERROR with IndexedDB: ' + error.message);
      throw error;
    }
  }

  // Get cached low-res image for initial load
  getCachedLowResImage() {
    return localStorage.getItem('cached_https://s3.eu-west-1.amazonaws.com/rideyourbike.org/compass/starmap_2020_1k_gal.jpg');
  }

  // Get cached image from memory cache
  getCachedImage(url) {
    return this.imageCache[url];
  }

  // Utility function for debug logging
  debugLog(message) {
    if (this.uiControls && typeof this.uiControls.debugLog === 'function') {
      this.uiControls.debugLog(message);
    } else {
      console.log(message);
    }
  }
}