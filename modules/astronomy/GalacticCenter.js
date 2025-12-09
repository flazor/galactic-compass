import { StellarCalculations } from './StellarCalculations.js';
import { Coordinates } from './Coordinates.js';

export class GalacticCenter {
  static currentMilkyWayPosition(lat, lon, utcDatetime = null) {
    if (utcDatetime === null) {
      utcDatetime = new Date();
    }
    
    // The center of the milky way is located at Sagittarius A*
    // Right ascension: 17h 45m 40.0409s
    // Declination: −29° 0′ 28.118″
    const sagAPos = StellarCalculations.calculateStarLocation(lat, lon, 17.7611, -28.992, utcDatetime);
    console.log(`sagA* pos: az: ${sagAPos[1]}, alt: ${sagAPos[0]}`);
    
    const com31Pos = StellarCalculations.calculateStarLocation(lat, lon, 12.81, 27.4, utcDatetime);
    console.log(`com31 pos: az: ${com31Pos[1]}, alt: ${com31Pos[0]}`);

    let galacticNorthPoleAz, galacticNorthPoleAlt;
    
    if (sagAPos[0] < 0) {
      galacticNorthPoleAz = sagAPos[1];
      galacticNorthPoleAlt = 90 + sagAPos[0];
    } else {
      galacticNorthPoleAz = sagAPos[1] + 180;
      galacticNorthPoleAlt = 90 - sagAPos[0];
    }

    console.log(`gal_np pos: az: ${galacticNorthPoleAz}, alt: ${galacticNorthPoleAlt}`);
    const angle = Coordinates.angleBetweenPoints(galacticNorthPoleAz, galacticNorthPoleAlt, com31Pos[1], com31Pos[0]);
    console.log(`angle to rotate: ${angle}`);
    console.log(`ROTATE Y: ${sagAPos[1]}`);
    console.log(`ROTATE Z: ${sagAPos[0]}`);
    console.log(`ROTATE X: ${angle}`);
    
    return [sagAPos[1], sagAPos[0], angle];
  }
}