import { Coordinates } from '../astronomy/Coordinates.js';

export class EarthOrbit {
  constructor() {
    // Earth's orbital speed around the Sun: ~30 km/s
    this.orbitalSpeed = 29.8; // km/s
    // Obliquity of ecliptic (axial tilt)
    this.obliquity = Coordinates.toRadians(23.44); // ~23.44 degrees
  }

  /**
   * Calculate orbital velocity (constant regardless of observer position)
   * @param {number} latitude - Observer's latitude in degrees (not used for orbital motion)
   * @param {number} longitude - Observer's longitude in degrees (not used for orbital motion)
   * @returns {number} Velocity in km/s
   */
  getVelocity(latitude, longitude) {
    // Earth's orbital velocity is constant for all observers on Earth
    return this.orbitalSpeed;
  }

  /**
   * Get the apparent sky direction of Earth's orbital velocity vector.
   *
   * IMPORTANT PHYSICAL NOTES:
   * - First-order geometric approximation of Earth's orbital velocity direction.
   * - Assumes circular orbit in the ecliptic plane.
   * - Velocity vector is approximated as 90° ahead of the Sun's true ecliptic longitude.
   * - True elliptical orbit deviates by up to ~1° seasonally.
   *
   * RETURNS:
   * - azimuth / altitude in observer’s LOCAL HORIZON FRAME
   * - Suitable for visualization / HUDs
   * - Not for high-precision astrometry
   *
   * @param {number} latitude  Observer latitude (degrees)
   * @param {number} longitude Observer longitude (degrees)
   * @param {Date}   date      UTC date/time
   * @returns {Object} { azimuth, altitude }
   */
  getDirection(latitude, longitude, date = new Date()) {

    const eps = this.obliquity; // obliquity of ecliptic (radians)

    // Days since J2000 (includes fractional day)
    const d = Coordinates.daysSinceJ2000(date);

    // Sun's mean longitude / anomaly (low-order approximation)
    const L = Coordinates.toRadians(280.460 + 0.9856474 * d);
    const g = Coordinates.toRadians(357.528 + 0.9856003 * d);

    // Sun's true ecliptic longitude
    const lambda = L + Coordinates.toRadians(1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));

    // Apex: tangent to orbit, 90° ahead of Sun
    let lambdaApex = (lambda + Math.PI / 2) % (2 * Math.PI);

    // Convert to equatorial coordinates (RA/Dec)
    const { ra, dec } = Coordinates.eclipticToEquatorial(lambdaApex, 0, eps);

    const latRad = Coordinates.toRadians(latitude);

    // Local Sidereal Time (LST) — fractional day included in 'd', no UT added
    const lstDeg = Coordinates.localSiderealTime(d, longitude);
    const lstRad = Coordinates.toRadians(lstDeg);

    // Hour angle, normalized to [-π, π]
    let ha = lstRad - ra;
    ha = ((ha + Math.PI) % (2 * Math.PI)) - Math.PI;

    // Equatorial → horizontal coordinates
    const horizontal = Coordinates.equatorialToHorizontal(ha, dec, latRad);

    return {
      azimuth: horizontal.azimuth,
      // Flip altitude for Three.js / A-Frame Y-up coordinate system
      // Not sure about the sign on this. It looks right but not sure it's correct
      altitude: -horizontal.altitude,
      description: "Approximate Earth orbital velocity direction (tangent to ecliptic)"
    };
  }

}