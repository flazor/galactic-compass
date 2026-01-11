export class Coordinates {
  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  static toDegrees(radians) {
    return radians / (Math.PI / 180);
  }

  static daysSinceJ2000(date = null) {
    if (date === null) {
      date = new Date();
    }
    const j2000 = new Date(2000, 0, 1, 12);
//    const j2000 = new Date(Date.UTC(2000, 0, 1, 12));
    const diff = date - j2000;
    return diff / (24 * 60 * 60 * 1000);
  }


  static localSiderealTime(daysSinceJ2000, lonDeg) {
    const lst = 280.46061837
              + 360.98564736629 * daysSinceJ2000
              + lonDeg;
    return ((lst % 360) + 360) % 360;
  }
  
  
  static hourAngle(lstDeg, raDeg) {
    let ha = lstDeg - raDeg;
    if (ha < 0) {
      ha += 360;
    }
    return ha;
  }

  static calculateAltitude(obsLatRad, starDecRad, haRad) {
    const sinAlt = Math.sin(obsLatRad) * Math.sin(starDecRad) + 
                   Math.cos(obsLatRad) * Math.cos(starDecRad) * Math.cos(haRad);
    return Math.asin(sinAlt);
  }

  static calculateAzimuth(obsLatRad, starDecRad, starAltRad, haRad) {
    const cosAz = (Math.sin(starDecRad) - Math.sin(obsLatRad) * Math.sin(starAltRad)) / 
                  (Math.cos(obsLatRad) * Math.cos(starAltRad));
    const az = Math.acos(cosAz);
    return Math.sin(haRad) < 0 ? az : Coordinates.toRadians(360) - az;
  }

  static angleBetweenPoints(az1, alt1, az2, alt2) {
    const alt1Rad = Coordinates.toRadians(alt1);
    const az1Rad = Coordinates.toRadians(az1);
    const alt2Rad = Coordinates.toRadians(alt2);
    const az2Rad = Coordinates.toRadians(az2);
    
    const haversineAlt = Math.pow(Math.sin((alt2Rad - alt1Rad) / 2), 2);
    const haversineAz = Math.pow(Math.sin((az2Rad - az1Rad) / 2), 2);
    const angle = 2 * Math.asin(Math.sqrt(haversineAlt + Math.cos(alt1Rad) * Math.cos(alt2Rad) * haversineAz));
    
    return Coordinates.toDegrees(angle);
  }

  /**
   * Convert ecliptic coordinates to equatorial coordinates
   * @param {number} lambda - Ecliptic longitude (rad)
   * @param {number} beta   - Ecliptic latitude (rad)
   * @param {number} eps    - Obliquity of the ecliptic (rad)
   * @returns {Object} { ra, dec } in radians
   */
  static eclipticToEquatorial(lambda, beta, eps) {

    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
    const sinBeta   = Math.sin(beta);
    const cosBeta   = Math.cos(beta);
    const sinEps    = Math.sin(eps);
    const cosEps    = Math.cos(eps);

    // Right ascension
    let ra = Math.atan2(
      sinLambda * cosEps - Math.tan(beta) * sinEps,
      cosLambda
    );

    // Normalize RA to [0, 2π)
    if (ra < 0) ra += 2 * Math.PI;

    // Declination
    const dec = Math.asin(
      sinBeta * cosEps + cosBeta * sinEps * sinLambda
    );

    return { ra, dec };
  }
  /**
   * Convert equatorial coordinates to horizontal coordinates
   * @param {number} ha   - Hour angle (rad)
   * @param {number} dec  - Declination (rad)
   * @param {number} lat  - Observer latitude (rad)
   * @returns {Object} { azimuth, altitude } in radians
   *
   * Azimuth convention:
   *   0 = North, π/2 = East, π = South, 3π/2 = West
   */
  static equatorialToHorizontal(ha, dec, lat) {

    // Altitude
    const sinAlt =
      Math.sin(lat) * Math.sin(dec) +
      Math.cos(lat) * Math.cos(dec) * Math.cos(ha);

    const altitude = Math.asin(sinAlt);

    // Azimuth (north = 0, east = +)
    const y = Math.sin(ha);
    const x =
      Math.cos(ha) * Math.sin(lat) -
      Math.tan(dec) * Math.cos(lat);

    let azimuth = Math.atan2(y, x);
    if (azimuth < 0) azimuth += 2 * Math.PI;

    return { azimuth, altitude };
  }
}