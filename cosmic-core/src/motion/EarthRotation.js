export class EarthRotation {
  constructor() {
    // Earth's rotational speed at equator: ~0.5 km/s (1,700 km/hr)
    this.equatorialSpeed = 0.465; // km/s (more precise value)
  }

  /**
   * Calculate rotational velocity at given latitude
   * @param {number} latitude - Observer's latitude in degrees
   * @param {number} longitude - Observer's longitude in degrees (not used for rotation)
   * @returns {number} Velocity in km/s
   */
  getVelocity(latitude, longitude) {
    // Convert latitude to radians
    const latRad = latitude * Math.PI / 180;
    
    // Velocity = equatorial speed * cos(latitude)
    // At equator (lat=0): full speed
    // At poles (lat=±90): zero speed
    const velocity = this.equatorialSpeed * Math.cos(latRad);
    
    return Math.round(velocity * 100) / 100;
  }

  /**
   * Get direction of rotation (always eastward)
   * @param {number} latitude - Observer's latitude in degrees (not used for rotation direction)
   * @param {number} longitude - Observer's longitude in degrees (not used for rotation direction)  
   * @param {Date} date - Current date (not used for rotation direction)
   * @returns {Object} Direction info
   */
  getDirection(latitude, longitude, date) {
    return {
      azimuth: Math.PI / 2, // 90 degrees = East
      altitude: 0, // Horizontal
      description: 'Eastward rotation'
    };
  }

  /**
   * Get info about Earth's rotation
   */
  getInfo() {
    return {
      name: "Earth's Rotation",
      speed: "0.465 km/s at equator",
      period: "24 hours",
      direction: "East",
      description: "Earth rotates eastward, creating day/night cycles. Speed varies by latitude."
    };
  }
}