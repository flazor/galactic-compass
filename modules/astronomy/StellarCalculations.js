import { Coordinates } from './Coordinates.js';

export class StellarCalculations {
  static calculateStarLocation(obsLatDeg, obsLonDeg, starRaHrs, starDecDeg, utcDatetime = null) {
    if (utcDatetime === null) {
      utcDatetime = new Date();
    }
    
    const obsLatRad = Coordinates.toRadians(obsLatDeg);
    const obsLonRad = Coordinates.toRadians(obsLonDeg);
    const d = Coordinates.daysSinceJ2000(utcDatetime);
    console.log(d + ' days since j2000');
    
    const lstDeg = Coordinates.localSiderealTime(d, obsLonDeg);
    console.log('Local Sidereal Time: ' + lstDeg);
    
    const starRaDeg = starRaHrs * 15;
    const starDecRad = Coordinates.toRadians(starDecDeg);
    const haRad = Coordinates.toRadians(Coordinates.hourAngle(lstDeg, starRaDeg));
    const starAltRad = Coordinates.calculateAltitude(obsLatRad, starDecRad, haRad);
    const starAzRad = Coordinates.calculateAzimuth(obsLatRad, starDecRad, starAltRad, haRad);
    
    const starAltDeg = Coordinates.toDegrees(starAltRad);
    const starAzDeg = Coordinates.toDegrees(starAzRad);
    
    return [starAltDeg, starAzDeg];
  }
}