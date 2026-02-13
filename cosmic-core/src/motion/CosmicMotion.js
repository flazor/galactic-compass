import { StellarCalculations } from '../astronomy/StellarCalculations.js';

/**
 * Generic motion class for simple cosmic motions with constant velocity
 * and fixed RA/Dec coordinates. Used for motions like Solar Orbit,
 * Virgo Cluster Infall, etc. that don't require complex calculations.
 */
export class CosmicMotion {
  constructor(config) {
    // Use configuration from CosmicLevels
    this.config = config;
  }

  /**
   * Get velocity (constant for this motion)
   * @param {number} latitude - Observer's latitude in degrees (not used for simple motions)
   * @param {number} longitude - Observer's longitude in degrees (not used for simple motions)
   * @returns {number} Velocity in km/s
   */
  getVelocity(latitude, longitude) {
    return this.config.velocity;
  }

  /**
   * Get direction toward target coordinates
   * @param {number} latitude - Observer's latitude in degrees
   * @param {number} longitude - Observer's longitude in degrees
   * @param {Date} date - Current date for coordinate calculations
   * @returns {Object} Direction info with azimuth and altitude
   */
  getDirection(latitude, longitude, date) {
    // Convert RA/Dec to azimuth/altitude using existing stellar calculations
    // calculateStarLocation returns [altitude, azimuth] in degrees
    const location = StellarCalculations.calculateStarLocation(
      latitude,
      longitude,
      this.config.coordinates.ra, // RA in hours
      this.config.coordinates.dec, // Dec in degrees
      date
    );

    // Convert to radians for consistency with other motion classes
    return {
      azimuth: location[1] * Math.PI / 180, // azimuth in radians
      altitude: location[0] * Math.PI / 180, // altitude in radians
      description: this.config.direction
    };
  }

  /**
   * Get info about this motion (from config)
   */
  getInfo() {
    return {
      name: this.config.name,
      speed: this.config.velocityDescription,
      period: this.config.period,
      direction: this.config.direction,
      description: this.config.description,
      coordinates: this.config.coordinates.description,
      discoverer: this.config.discoverer
    };
  }
}
