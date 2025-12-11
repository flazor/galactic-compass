import { Coordinates } from '../astronomy/Coordinates.js';
import { StellarCalculations } from '../astronomy/StellarCalculations.js';

export class SolarOrbit {
  constructor() {
    // The Sun's orbital speed around the galaxy: ~230 km/s
    this.orbitalSpeed = 220; // km/s
  }

  /**
   * Calculate orbital velocity (constant regardless of observer position)
   * @param {number} latitude - Observer's latitude in degrees (not used for orbital motion)
   * @param {number} longitude - Observer's longitude in degrees (not used for orbital motion)
   * @returns {number} Velocity in km/s
   */
  getOrbitalVelocity(latitude, longitude) {
    // The solar system orbital velocity is constant for all observers on Earth
    return this.orbitalSpeed;
  }

  /**
   * Get the apparent sky direction of the Solar System's orbital velocity vector.
   *
   * IMPORTANT PHYSICAL NOTES:
   * - This computes a FIRST-ORDER GEOMETRIC APPROXIMATION of the Solar System's 
   *   instantaneous orbital velocity direction.
   * - It assumes the Solar System is moving toward the constellation Lyra.
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
    // Use the approximate location of constellation Lyra
    // RA: 18h 49m 15.8s DEC: +35deg 47' 53.6"
    const lyraPos = StellarCalculations.calculateStarLocation(latitude, longitude, 18.8167, 35.7983, utcDatetime);
    console.log(`Lyra pos: az: ${lyraPos[1]}, alt: ${lyraPos[0]}`);
    
    return {
      azimuth: Coordinates.toRadians(lyraPos[1]),
      altitude: Coordinates.toRadians(lyraPos[0]),
      description:
        "Approximate Solar System orbital velocity direction"
    };
  }

}