
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


function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians) {
  return radians / (Math.PI / 180);
}

function loadBG() {
  window.addEventListener("deviceorientation", rotateBG);
}

function loadHighResImage() {
  const hiResBtn = document.getElementById('hiResButton');
  const loadingIndicator = document.getElementById('loading-indicator');
  
  // Update button to show loading state
  hiResBtn.textContent = 'Loading...';
  hiResBtn.disabled = true;
  
  // Show loading indicator if it exists
  if (loadingIndicator) {
    loadingIndicator.style.display = 'block';
  }
  
  // Load high-resolution starmap
  const highResImage = new Image();
  highResImage.onload = function() {
    console.log('High-res starmap loaded, upgrading sky texture');
    const skyElement = document.getElementById('a-sky');
    
    // Listen for the actual texture update completion
    const waitForTextureUpdate = () => {
      const material = skyElement.getObject3D('mesh').material;
      if (material && material.map && material.map.image && material.map.image.src.includes('8k')) {
        // Texture is actually updated, now confirm
        setTimeout(() => {
          if (loadingIndicator) loadingIndicator.style.display = 'none';
          hiResBtn.textContent = 'Hi-Res ✓';
          hiResBtn.style.background = 'rgba(0,128,0,0.8)'; // Green background
        }, 500); // Small delay to ensure GPU has processed the texture
      } else {
        // Check again in a short while
        setTimeout(waitForTextureUpdate, 100);
      }
    };
    
    skyElement.setAttribute('src', 'https://s3.eu-west-1.amazonaws.com/rideyourbike.org/compass/starmap_2020_8k_gal.jpg');
    
    // Start checking for texture update
    setTimeout(waitForTextureUpdate, 100);
  };
  
  highResImage.onerror = function() {
    console.warn('Failed to load high-res starmap, keeping low-res version');
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    hiResBtn.textContent = 'Hi-Res ✗';
    hiResBtn.style.background = 'rgba(128,0,0,0.8)'; // Red background
    hiResBtn.disabled = false;
  };
  
  highResImage.src = 'https://s3.eu-west-1.amazonaws.com/rideyourbike.org/compass/starmap_2020_8k_gal.jpg';
}

let compassAttempts = 0;

function rotateBG(evt) {
  compassAttempts++;
  const heading = evt.webkitCompassHeading;
  
  // Wait for a valid non-zero heading (iOS compass needs time to calibrate)
  if (heading == undefined || isNaN(heading) || heading === 0) {
    document.getElementById('debugOutput').innerHTML = `Waiting for compass calibration... (attempt ${compassAttempts})`;
    return; // Keep listening for more orientation events
  }
  
  // Got a valid heading, proceed with setup
  window.removeEventListener("deviceorientation", rotateBG);
  document.getElementById('debugOutput').innerHTML = `Compass ready: ${heading}°`;
  console.log(`Compass heading: ${heading}°`);
  
  navigator.geolocation.getCurrentPosition(function(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    console.log(`Latitude: ${lat}, Longitude: ${lon}`);
    let sunLoc = SunCalc.getPosition(new Date(), lat, lon);
    console.log("sun alt: " + toDegrees(sunLoc.altitude));
    console.log("sun az: " + toDegrees(sunLoc.azimuth + Math.PI));
    let moonLoc = SunCalc.getMoonPosition(new Date(), lat, lon);
    console.log("moon alt: " + toDegrees(moonLoc.altitude));
    console.log("moon az: " + toDegrees(moonLoc.azimuth + Math.PI));
    
    const portrait = window.matchMedia("(orientation: portrait)").matches;
    var compassCorrection = (portrait) ? heading - 90 : heading;

    // Rotate Y by negative Azimuth of heading to correct for north
    document.getElementById("a-sky").object3D.rotateY(toRadians(compassCorrection));

    var rotations = current_milky_way_position(lat, lon, new Date());
    //// To Orient the Galactic center
    // Rotate Y by negative Azimuth of sagA
    document.getElementById("a-sky").object3D.rotateY(toRadians(-rotations[0]));
    // Rotate Z by negative Altitude of sagA, aligning the center of the galaxy
    document.getElementById("a-sky").object3D.rotateZ(toRadians(-rotations[1]));
    // Rotate pole by angle between rotated galactic north pole and Com31, aligning the galactic plane
    document.getElementById("a-sky").object3D.rotateX(toRadians(-rotations[2]));

    // Correct for the direction that the viewer is facing. This must be done before other rotations
    document.getElementById("milky-way-container").object3D.rotateY(toRadians(compassCorrection));
    document.getElementById("sun-container").object3D.rotateY(toRadians(compassCorrection));
    document.getElementById("moon-container").object3D.rotateY(toRadians(compassCorrection));
    document.getElementById("compass-container").object3D.rotateY(toRadians(compassCorrection));
    // sunLoc uses 0 deg for south to add 180 deg (PI radians) to adjust to north
    console.log("rotate:"+(sunLoc.azimuth + Math.PI))
    document.getElementById("sun-container").object3D.rotateY(-sunLoc.azimuth + Math.PI / 2);
    document.getElementById("sun-container").object3D.rotateX(-sunLoc.altitude);
    document.getElementById("moon-container").object3D.rotateY(-moonLoc.azimuth + Math.PI / 2);
    document.getElementById("moon-container").object3D.rotateX(-moonLoc.altitude);

    document.getElementById("milky-way-container").object3D.rotateY(toRadians(-rotations[0]));
    document.getElementById("milky-way-container").object3D.rotateZ(toRadians(-rotations[1]));
    document.getElementById("milky-way-container").object3D.rotateX(toRadians(-rotations[2]));


  });
}

function current_milky_way_position(lat, lon, utc_datetime = null) {
  var angle, com31_pos, galactic_north_pole_alt, galactic_north_pole_az, sagA_pos;

  if (utc_datetime === null) {
    utc_datetime = new Date();
  }
  // The center of the milky way is located at Sagittarius A*
  // Right ascension: 17h 45m 40.0409s
  // Declination: −29° 0′ 28.118″
  sagA_pos = calculate_star_location(lat, lon, 17.7611, -28.992, utc_datetime);
  console.log(`sagA pos: az: ${sagA_pos[1]}, alt: ${sagA_pos[0]}`);
  com31_pos = calculate_star_location(lat, lon, 12.81, 27.4, utc_datetime);
  console.log(`com31 pos: az: ${com31_pos[1]}, alt: ${com31_pos[0]}`);

  if (sagA_pos[0] < 0) {
    galactic_north_pole_az = sagA_pos[1];
    galactic_north_pole_alt = 90 + sagA_pos[0];
  } else {
    galactic_north_pole_az = sagA_pos[1] + 180;
    galactic_north_pole_alt = 90 - sagA_pos[0];
  }

  console.log(`gal_np pos: az: ${galactic_north_pole_az}, alt: ${galactic_north_pole_alt}`);
  angle = angle_between_points(galactic_north_pole_az, galactic_north_pole_alt, com31_pos[1], com31_pos[0]);
  console.log(`angle to rotate: ${angle}`);
  console.log(`ROTATE Y: ${sagA_pos[1]}`);
  console.log(`ROTATE Z: ${sagA_pos[0]}`);
  console.log(`ROTATE X: ${angle}`);
  return [sagA_pos[1], sagA_pos[0], angle];
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
