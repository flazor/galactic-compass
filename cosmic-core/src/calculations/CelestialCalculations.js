/**
 * Pure calculation layer for celestial and motion calculations
 *
 * This module provides pure functions that take inputs (lat, lon, date)
 * and return calculation results without any DOM manipulation or side effects.
 */

import { GalacticCenter } from '../astronomy/GalacticCenter.js';
import { StellarCalculations } from '../astronomy/StellarCalculations.js';
import { Coordinates } from '../astronomy/Coordinates.js';
import { COSMIC_LEVELS } from '../config/CosmicLevels.js';
import { VectorSum } from '../math/VectorSum.js';

// SunCalc: use globalThis (browser sets window.SunCalc via <script>), fall back to npm package in Node.js
const SunCalc = globalThis.SunCalc ?? (await import('suncalc')).default;

/**
 * Calculate all celestial body positions
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {Date} date - Date object (will be used as-is, timezone handled by individual functions)
 * @returns {Object} - Celestial body positions and debug info
 */
export function calculateCelestialPositions(lat, lon, date) {
  // Sun and Moon positions using SunCalc
  const sunLoc = SunCalc.getPosition(date, lat, lon);
  const moonLoc = SunCalc.getMoonPosition(date, lat, lon);

  // Galactic center position
  const galacticRotations = GalacticCenter.currentMilkyWayPosition(lat, lon, date);

  // Galactic North Pole position
  // J2000 coordinates: RA 12h 51m 26.28s, Dec +27° 07' 41.7"
  const galacticNorthPole = StellarCalculations.calculateStarLocation(lat, lon, 12.8573, 27.1283, date);

  // Debug timezone information
  const debugInfo = {
    inputDate: {
      iso: date.toISOString(),
      local: date.toString(),
      utc: date.toUTCString(),
      timestamp: date.valueOf(),
      timezoneOffset: date.getTimezoneOffset()
    },
    location: {
      latitude: lat,
      longitude: lon
    },
    calculations: {
      daysSinceJ2000: Coordinates.daysSinceJ2000(date),
      localSiderealTime: Coordinates.localSiderealTime(Coordinates.daysSinceJ2000(date), lon)
    }
  };

  return {
    sun: {
      azimuth: sunLoc.azimuth + Math.PI, // SunCalc adjustment
      altitude: sunLoc.altitude,
      source: 'SunCalc.getPosition'
    },
    moon: {
      azimuth: moonLoc.azimuth + Math.PI, // SunCalc adjustment
      altitude: moonLoc.altitude,
      source: 'SunCalc.getMoonPosition'
    },
    galacticCenter: {
      rotations: galacticRotations,
      source: 'GalacticCenter.currentMilkyWayPosition'
    },
    galacticNorthPole: {
      rotations: [galacticNorthPole[1], galacticNorthPole[0]], // [azimuth, altitude]
      source: 'StellarCalculations.calculateStarLocation'
    },
    debug: debugInfo
  };
}

/**
 * Calculate all motion vectors for the 8 cosmic levels
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {Date} date - Date object
 * @returns {Array} - Array of motion vector calculations
 */
export function calculateMotionVectors(lat, lon, date) {
  const motionVectors = [];

  COSMIC_LEVELS.forEach(level => {
    if (!level.implemented || !level.motionClass) {
      motionVectors.push({
        level: level.level,
        name: level.name,
        implemented: false,
        error: 'Not implemented'
      });
      return;
    }

    try {
      // Create motion class instance
      const instance = new level.motionClass(level);

      // Get calculations
      const velocity = instance.getVelocity(lat, lon);
      const direction = instance.getDirection(lat, lon, date);

      motionVectors.push({
        level: level.level,
        name: level.name,
        id: level.id,
        bodyId: level.bodyId,
        velocity: velocity,
        direction: {
          azimuth: direction.azimuth,
          altitude: direction.altitude,
          azimuthDegrees: Coordinates.toDegrees(direction.azimuth),
          altitudeDegrees: Coordinates.toDegrees(direction.altitude)
        },
        implemented: true,
        isVerification: level.isVerification || false,
        motionClass: level.motionClass.name
      });
    } catch (error) {
      motionVectors.push({
        level: level.level,
        name: level.name,
        implemented: level.implemented,
        error: error.message
      });
    }
  });

  return motionVectors;
}

/**
 * Calculate vector sum for active motion levels
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {Date} date - Date object
 * @param {number} maxLevel - Maximum level to include (1-8)
 * @returns {Object} - Vector sum calculation results
 */
export function calculateVectorSum(lat, lon, date, maxLevel = 8) {
  const vectorSum = new VectorSum();
  const motionVectors = calculateMotionVectors(lat, lon, date);

  // Add vectors up to maxLevel, excluding verification-only levels (e.g. CMB dipole)
  const activeVectors = motionVectors
    .filter(vector => vector.level <= maxLevel && vector.implemented && !vector.error && !vector.isVerification);

  activeVectors.forEach(vector => {
    vectorSum.addVector(
      vector.name,
      vector.velocity,
      vector.direction.azimuth,
      vector.direction.altitude
    );
  });

  const resultant = vectorSum.getResultant();

  return {
    vectorSum: vectorSum,
    resultant: resultant,
    summary: vectorSum.getSummary(),
    activeVectors: activeVectors,
    motionVectors: motionVectors,
    maxLevel: maxLevel
  };
}

/**
 * Main calculation function that returns all results
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {Date} date - Date object
 * @param {number} maxLevel - Maximum motion level to include
 * @returns {Object} - Complete calculation results
 */
export function calculateAll(lat, lon, date, maxLevel = 8) {
  return {
    input: {
      latitude: lat,
      longitude: lon,
      date: date,
      maxLevel: maxLevel
    },
    celestialBodies: calculateCelestialPositions(lat, lon, date),
    motionVectors: calculateMotionVectors(lat, lon, date),
    vectorSum: calculateVectorSum(lat, lon, date, maxLevel)
  };
}
