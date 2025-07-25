
AFRAME.registerComponent('button', {
  init() {
    const btn = document.getElementById('reloadButton')
    btn.addEventListener('click', () => {
      location.reload();
    })
  }
})

let starmapCache = null;

function preloadStarmap() {
  const imageUrl = 'https://s3.eu-west-1.amazonaws.com/rideyourbike.org/compass/starmap_2020_8k_gal.jpg';
  const cacheKey = 'starmap_cache';
  const cacheVersionKey = 'starmap_cache_version';
  const currentVersion = '1.0';
  
  // Check if we have a cached version with correct version
  if ('indexedDB' in window) {
    loadFromIndexedDB(cacheKey, cacheVersionKey, currentVersion, imageUrl);
  } else {
    // Fallback to direct loading with browser cache headers
    console.log('IndexedDB not available, using browser cache');
    loadWithCacheHeaders(imageUrl);
  }
}

function loadFromIndexedDB(cacheKey, versionKey, currentVersion, imageUrl) {
  const request = indexedDB.open('StarmapCache', 1);
  
  request.onerror = () => {
    console.log('IndexedDB error, falling back to direct load');
    loadWithCacheHeaders(imageUrl);
  };
  
  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('images')) {
      db.createObjectStore('images');
    }
  };
  
  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const getRequest = store.get(cacheKey);
    
    getRequest.onsuccess = () => {
      const cached = getRequest.result;
      if (cached && cached.version === currentVersion) {
        console.log('Loading starmap from IndexedDB cache');
        const objectUrl = URL.createObjectURL(cached.blob);
        starmapCache = objectUrl;
        setStarmapSrc(objectUrl);
      } else {
        console.log('Cache miss or outdated, downloading starmap...');
        downloadAndCache(db, cacheKey, currentVersion, imageUrl);
      }
    };
    
    getRequest.onerror = () => {
      console.log('Cache read error, downloading starmap...');
      downloadAndCache(db, cacheKey, currentVersion, imageUrl);
    };
  };
}

function downloadAndCache(db, cacheKey, version, imageUrl) {
  fetch(imageUrl, {
    cache: 'force-cache'
  })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.blob();
    })
    .then(blob => {
      // Store in IndexedDB
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      store.put({ blob: blob, version: version }, cacheKey);
      
      console.log('Starmap cached in IndexedDB');
      const objectUrl = URL.createObjectURL(blob);
      starmapCache = objectUrl;
      setStarmapSrc(objectUrl);
    })
    .catch(error => {
      console.error('Failed to cache starmap:', error);
      setStarmapSrc(imageUrl);
    });
}

function loadWithCacheHeaders(imageUrl) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    console.log('Starmap loaded with browser cache');
    setStarmapSrc(this.src);
  };
  img.onerror = function() {
    console.error('Failed to load starmap image');
  };
  // Add cache-busting prevention and cache headers
  img.src = imageUrl + '?cache=max-age';
}

function setStarmapSrc(src) {
  const sky = document.getElementById('a-sky');
  if (sky) {
    sky.setAttribute('src', src);
  }
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians) {
  return radians / (Math.PI / 180);
}

function loadBG() {
  preloadStarmap();
  window.addEventListener("deviceorientation", rotateBG, {once: true} );
}

function rotateBG(evt) {
  
  navigator.geolocation.getCurrentPosition(function(position) {
    const heading = evt.webkitCompassHeading;
    console.log(`Heading: ${heading}`);
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    console.log(`Latitude: ${lat}, Longitude: ${lon}`);
    let sunLoc = SunCalc.getPosition(new Date(), lat, lon);
    console.log("sun alt: " + toDegrees(sunLoc.altitude));
    console.log("sun az: " + toDegrees(sunLoc.azimuth + Math.PI));
    let moonLoc = SunCalc.getMoonPosition(new Date(), lat, lon);
    console.log("moon alt: " + toDegrees(moonLoc.altitude));
    console.log("moon az: " + toDegrees(moonLoc.azimuth + Math.PI));
    if (heading != undefined) {
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      var compassCorrection = (portrait) ? heading - 90 : heading;

      // Rotate Y by negative Azimuth of heading to correct for north
      document.getElementById("a-sky").object3D.rotateY(toRadians(compassCorrection));
    }

    var rotations = current_milky_way_position(lat, lon, new Date());
    //// To Orient the Galactic center
    // Rotate Y by negative Azimuth of Sag3
    document.getElementById("a-sky").object3D.rotateY(toRadians(-rotations[0]));
    // Rotate Z by negative Altitude of Sag3, aligning the center of the galaxy
    document.getElementById("a-sky").object3D.rotateZ(toRadians(-rotations[1]));
    // Rotate pole by angle between rotated galactic north pole and Com31, aligning the galactic plane
    document.getElementById("a-sky").object3D.rotateX(toRadians(-rotations[2]));

    // Sun
    // Correct for the direction that the viewer is facing
    document.getElementById("sun-container").object3D.rotateY(toRadians(compassCorrection));
    document.getElementById("moon-container").object3D.rotateY(toRadians(compassCorrection));
    document.getElementById("compass-container").object3D.rotateY(toRadians(compassCorrection));
    // sunLoc uses 0 deg for south to add 180 deg (PI radians) to adjust to north
    console.log("rotate:"+(sunLoc.azimuth + Math.PI))
    document.getElementById("sun-container").object3D.rotateY(-sunLoc.azimuth + Math.PI / 2);
    document.getElementById("sun-container").object3D.rotateX(-sunLoc.altitude);
    document.getElementById("moon-container").object3D.rotateY(-moonLoc.azimuth + Math.PI / 2);
    document.getElementById("moon-container").object3D.rotateX(-moonLoc.altitude);

  });
}

function current_milky_way_position(lat, lon, utc_datetime = null) {
  var angle, com31_pos, galactic_north_pole_alt, galactic_north_pole_az, sag3_pos;

  if (utc_datetime === null) {
    utc_datetime = new Date();
  }

  sag3_pos = calculate_star_location(lat, lon, 17.75, -27.5, utc_datetime);
  console.log(`sag3 pos: az: ${sag3_pos[1]}, alt: ${sag3_pos[0]}`);
  com31_pos = calculate_star_location(lat, lon, 12.81, 27.4, utc_datetime);
  console.log(`com31 pos: az: ${com31_pos[1]}, alt: ${com31_pos[0]}`);

  if (sag3_pos[0] < 0) {
    galactic_north_pole_az = sag3_pos[1];
    galactic_north_pole_alt = 90 + sag3_pos[0];
  } else {
    galactic_north_pole_az = sag3_pos[1] + 180;
    galactic_north_pole_alt = 90 - sag3_pos[0];
  }

  console.log(`gal_np pos: az: ${galactic_north_pole_az}, alt: ${galactic_north_pole_alt}`);
  angle = angle_between_points(galactic_north_pole_az, galactic_north_pole_alt, com31_pos[1], com31_pos[0]);
  console.log(`angle to rotate: ${angle}`);
  console.log(`ROTATE Y: ${sag3_pos[1]}`);
  console.log(`ROTATE Z: ${sag3_pos[0]}`);
  console.log(`ROTATE X: ${angle}`);
  return [sag3_pos[1], sag3_pos[0], angle];
}

function calculate_star_location(obs_lat_deg, obs_lon_deg, star_ra_hrs, star_dec_deg, utc_datetime = null) {
  var d, ha_rad, lst_deg, obs_lat_rad, obs_lon_rad, star_alt_deg, star_alt_rad, star_az_deg, star_az_rad, star_dec_rad, star_ra_deg, ut;

  if (utc_datetime === null) {
    utc_datetime = new Date();
  }
  obs_lat_rad = toRadians(obs_lat_deg);
  obs_lon_rad = toRadians(obs_lon_deg);
  d = days_since_j2000(utc_datetime);
  console.log(d);
  ut = utc_datetime.getUTCHours() + utc_datetime.getUTCMinutes() / 60;
  console.log(ut);
  lst_deg = local_sidereal_time(d, obs_lon_deg, ut);
  console.log(lst_deg)
  star_ra_deg = star_ra_hrs * 15;
  star_dec_rad = toRadians(star_dec_deg);
  ha_rad = toRadians(hour_angle(lst_deg, star_ra_deg));
  star_alt_rad = calculate_altitude(obs_lat_rad, star_dec_rad, ha_rad);
  star_az_rad = calculate_azimuth(obs_lat_rad, star_dec_rad, star_alt_rad, ha_rad);
  star_alt_deg = toDegrees(star_alt_rad);
  star_az_deg = toDegrees(star_az_rad);
  return [star_alt_deg, star_az_deg];
}

function days_since_j2000(t) {
  if (t === null) {
    t = new Date();
  }

  var diff, j2000;
  j2000 = new Date(2000, 0, 1, 12);
  diff = t - j2000;
  return diff / (24 * 60 * 60 * 1000);
}

function local_sidereal_time(days_since_j2000, lon_deg, hours) {
  var lst;
  lst = 100.46 + 0.985647 * days_since_j2000 + lon_deg + 15 * hours;
  return lst % 360;
}

function hour_angle(lst_deg, ra_deg) {
  var ha;
  ha = lst_deg - ra_deg;

  if (ha < 0) {
    ha += 360;
  }

  return ha;
}

function calculate_altitude(obs_lat_rad, star_dec_rad, ha_rad) {
  var sin_alt;
  sin_alt = Math.sin(obs_lat_rad) * Math.sin(star_dec_rad) + Math.cos(obs_lat_rad) * Math.cos(star_dec_rad) * Math.cos(ha_rad);
  return Math.asin(sin_alt);
}

function calculate_azimuth(obs_lat_rad, star_dec_rad, star_alt_rad, ha_rad) {
  var az, cos_az;
  cos_az = (Math.sin(star_dec_rad) - Math.sin(obs_lat_rad) * Math.sin(star_alt_rad)) / (Math.cos(obs_lat_rad) * Math.cos(star_alt_rad));
  az = Math.acos(cos_az);
  return Math.sin(ha_rad) < 0 ? az : toRadians(360) - az;
}


function angle_between_points(az1, alt1, az2, alt2) {
  var angle, haversine_alt, haversine_az;
  alt1 = toRadians(alt1);
  az1 = toRadians(az1);
  alt2 = toRadians(alt2);
  az2 = toRadians(az2);
  haversine_alt = Math.pow(Math.sin((alt2 - alt1) / 2), 2);
  haversine_az = Math.pow(Math.sin((az2 - az1) / 2), 2);
  angle = 2 * Math.asin(Math.sqrt(haversine_alt + Math.cos(alt1) * Math.cos(alt2) * haversine_az));
  return toDegrees(angle);
}
