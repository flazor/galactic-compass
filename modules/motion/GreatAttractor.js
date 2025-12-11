import { Coordinates } from '../astronomy/Coordinates.js';
import { StellarCalculations } from '../astronomy/StellarCalculations.js';

export class GreatAttractor {
  constructor() {
    // The galaxies approximate speed towards The Great Attractor
    // https://en.wikipedia.org/wiki/Great_Attractor
    this.speed = 600; // km/s
  }

  /**
   * @param {number} latitude - Observer's latitude in degrees
   * @param {number} longitude - Observer's longitude in degrees
   * @returns {number} Velocity in km/s
   */
  getVelocity(latitude, longitude) {
    // The galaxy's velocity is constant for all observers on Earth
    return this.speed;
  }

  /**
   * Get the apparent sky direction of the The Great Attractor velocity vector.
   * 
   * WHAT THIS RETURNS:
   * - Azimuth / altitude in the observer’s LOCAL HORIZON FRAME
   * - Suitable for visualization, HUDs, and intuitive direction cues
   * - NOT intended for high-precision astrometry or ephemeris comparison
   *
   * @param {number} latitude  Observer latitude (degrees)
   * @param {number} longitude Observer longitude (degrees)
   * @param {Date}   date      UTC date/time
   * @returns {Object} { azimuth, altitude }
   */
  getDirection(latitude, longitude, utcDatetime = new Date()) {
    // Use the approximate location of Norma Cluster
    // RA: 16h 16m 35.8s DEC: -60deg 55' 56.7"
    const normaPos = StellarCalculations.calculateStarLocation(latitude, longitude, 16.27, -60.92, utcDatetime);
    console.log(`Norma Cluster pos: az: ${normaPos[1]}, alt: ${normaPos[0]}`);
    
    return {
      azimuth: Coordinates.toRadians(normaPos[1]),
      altitude: Coordinates.toRadians(normaPos[0]),
      description:
        "Approximate Galactic velocity direction"
    };
  }

}