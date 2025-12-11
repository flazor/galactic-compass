import { Coordinates } from '../astronomy/Coordinates.js';
import { StellarCalculations } from '../astronomy/StellarCalculations.js';

export class AndromedaPull {
  constructor() {
    // The galaxies approximate speed towards Andromeda
    // https://en.wikipedia.org/wiki/Great_Attractor
    this.speed = 110; // km/s
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
   * Get the apparent sky direction of Andromeda's pull velocity vector.
   * 
   * WHAT THIS RETURNS:
   * - Azimuth / altitude in the observer’s LOCAL HORIZON FRAME
   * - Suitable for visualization, HUDs, and intuitive direction cues
   * - NOT intended for high-precision astrometry or ephemeris comparison or space travel
   *
   * @param {number} latitude  Observer latitude (degrees)
   * @param {number} longitude Observer longitude (degrees)
   * @param {Date}   date      UTC date/time
   * @returns {Object} { azimuth, altitude }
   */
  getDirection(latitude, longitude, utcDatetime = new Date()) {
    // Use the approximate location of Andromeda Galaxy
    // RA: 00h 44m 10.2s DEC: 41deg 24' 55.5"
    const andromedaPos = StellarCalculations.calculateStarLocation(latitude, longitude, 0.74, 41.4, utcDatetime);
    console.log(`Andromeda Galaxy pos: az: ${andromedaPos[1]}, alt: ${andromedaPos[0]}`);
    
    return {
      azimuth: Coordinates.toRadians(andromedaPos[1]),
      altitude: Coordinates.toRadians(andromedaPos[0]),
      description:
        "Approximate Galactic velocity direction"
    };
  }

}