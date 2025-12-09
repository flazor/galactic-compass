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
    const diff = date - j2000;
    return diff / (24 * 60 * 60 * 1000);
  }

  static localSiderealTime(daysSinceJ2000, lonDeg, hours) {
    let lst = 100.46 + 0.985647 * daysSinceJ2000 + lonDeg + 15 * hours;
    return lst % 360;
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
}