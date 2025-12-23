import { Coordinates } from '../astronomy/Coordinates.js';

/**
 * VectorSum - Mathematical class for 3D velocity vector addition
 * 
 * Handles combining cosmic motion vectors in 3D space to calculate
 * Earth's total velocity and direction through space.
 * 
 * Coordinate Systems:
 * - Spherical: (magnitude, azimuth, altitude) in local horizon frame
 * - Cartesian: (x, y, z) in standardized 3D space
 * 
 * Reference Frame Considerations:
 * - All vectors are in the observer's local horizon coordinate system
 * - Azimuth: 0° = North, 90° = East, 180° = South, 270° = West
 * - Altitude: 0° = horizon, +90° = zenith, -90° = nadir
 * - Motion vectors are measured relative to the Cosmic Microwave Background (CMB) rest frame
 * - CMB frame is the standard universal reference for cosmic motion (369.82 km/s toward Crater/Leo)
 * - This provides the most scientifically accurate representation of Earth's total motion through space
 */
export class VectorSum {
  constructor() {
    this.vectors = [];
    this.resultant = null;
  }

  /**
   * Add a velocity vector to the sum
   * @param {string} name - Human-readable name (e.g., "Earth Rotation")
   * @param {number} magnitude - Velocity magnitude in km/s
   * @param {number} azimuth - Direction azimuth in radians
   * @param {number} altitude - Direction altitude in radians
   * @param {Object} metadata - Additional info (level, description, etc.)
   */
  addVector(name, magnitude, azimuth, altitude, metadata = {}) {
    // Convert spherical to Cartesian coordinates
    const cartesian = this.sphericalToCartesian(magnitude, azimuth, altitude);
    
    const vector = {
      name,
      magnitude,
      azimuth,
      altitude,
      cartesian,
      metadata
    };
    
    this.vectors.push(vector);
    this.calculateResultant();
  }

  /**
   * Convert spherical coordinates to Cartesian
   * @param {number} magnitude - Vector magnitude (km/s)
   * @param {number} azimuth - Azimuth angle in radians
   * @param {number} altitude - Altitude angle in radians
   * @returns {Object} {x, y, z} Cartesian coordinates
   */
  sphericalToCartesian(magnitude, azimuth, altitude) {
    // Standard spherical to Cartesian conversion
    // x: East-West (positive = East)
    // y: North-South (positive = North) 
    // z: Up-Down (positive = Up)
    const x = magnitude * Math.cos(altitude) * Math.sin(azimuth);
    const y = magnitude * Math.cos(altitude) * Math.cos(azimuth);
    const z = magnitude * Math.sin(altitude);
    
    return { x, y, z };
  }

  /**
   * Convert Cartesian coordinates to spherical
   * @param {number} x - East-West component
   * @param {number} y - North-South component  
   * @param {number} z - Up-Down component
   * @returns {Object} {magnitude, azimuth, altitude}
   */
  cartesianToSpherical(x, y, z) {
    const magnitude = Math.sqrt(x*x + y*y + z*z);
    const azimuth = Math.atan2(x, y); // atan2(East, North)
    const altitude = Math.asin(z / magnitude);
    
    return { magnitude, azimuth, altitude };
  }

  /**
   * Calculate the vector sum (resultant) of all added vectors
   */
  calculateResultant() {
    if (this.vectors.length === 0) {
      this.resultant = null;
      return;
    }

    // Sum all Cartesian components
    let sumX = 0, sumY = 0, sumZ = 0;
    
    this.vectors.forEach(vector => {
      sumX += vector.cartesian.x;
      sumY += vector.cartesian.y;
      sumZ += vector.cartesian.z;
    });

    // Convert back to spherical coordinates
    const spherical = this.cartesianToSpherical(sumX, sumY, sumZ);
    
    this.resultant = {
      cartesian: { x: sumX, y: sumY, z: sumZ },
      magnitude: spherical.magnitude,
      azimuth: spherical.azimuth,
      altitude: spherical.altitude,
      azimuthDegrees: Coordinates.toDegrees(spherical.azimuth),
      altitudeDegrees: Coordinates.toDegrees(spherical.altitude)
    };
  }

  /**
   * Clear all vectors and reset the sum
   */
  clear() {
    this.vectors = [];
    this.resultant = null;
  }

  /**
   * Get the resultant vector
   * @returns {Object|null} Resultant vector or null if no vectors added
   */
  getResultant() {
    return this.resultant;
  }

  /**
   * Get all individual vectors
   * @returns {Array} Array of vector objects
   */
  getVectors() {
    return [...this.vectors]; // Return copy to prevent mutation
  }

  /**
   * Get a summary of the vector sum calculation
   * @returns {Object} Summary with components, resultant, and statistics
   */
  getSummary() {
    if (!this.resultant) {
      return { vectorCount: 0, resultant: null };
    }

    return {
      vectorCount: this.vectors.length,
      vectors: this.vectors.map(v => ({
        name: v.name,
        magnitude: Math.round(v.magnitude * 100) / 100,
        direction: `${Math.round(v.azimuth * 180/Math.PI)}° az, ${Math.round(v.altitude * 180/Math.PI)}° alt`
      })),
      resultant: {
        magnitude: Math.round(this.resultant.magnitude * 100) / 100,
        azimuth: Math.round(this.resultant.azimuthDegrees * 100) / 100,
        altitude: Math.round(this.resultant.altitudeDegrees * 100) / 100,
        direction: `${Math.round(this.resultant.azimuthDegrees)}° az, ${Math.round(this.resultant.altitudeDegrees)}° alt`
      }
    };
  }

  /**
   * Get percentage contribution of each vector to total magnitude
   * @returns {Array} Array with name and percentage for each vector
   */
  getContributions() {
    if (!this.resultant || this.resultant.magnitude === 0) {
      return [];
    }

    return this.vectors.map(vector => ({
      name: vector.name,
      magnitude: vector.magnitude,
      percentage: Math.round((vector.magnitude / this.resultant.magnitude) * 10000) / 100
    }));
  }
}