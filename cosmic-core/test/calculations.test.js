import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import {
  calculateCelestialPositions,
  calculateMotionVectors,
  calculateVectorSum,
  calculateAll
} from '../src/calculations/CelestialCalculations.js';

function assertClose(actual, expected, tolerance = 0.5) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${actual} to be close to ${expected} (tolerance: ${tolerance})`);
  }
}

// Fixed test inputs: Dublin, Ireland at J2000 epoch
const LAT = 53.35;
const LON = -6.26;
const DATE = new Date(Date.UTC(2025, 0, 1, 12));

describe('calculateCelestialPositions', () => {
  it('returns sun, moon, galacticCenter, galacticNorthPole, debug', () => {
    const result = calculateCelestialPositions(LAT, LON, DATE);
    for (const key of ['sun', 'moon', 'galacticCenter', 'galacticNorthPole', 'debug']) {
      if (!(key in result)) throw new Error(`Missing key: ${key}`);
    }
  });

  it('sun azimuth and altitude are finite numbers', () => {
    const { sun } = calculateCelestialPositions(LAT, LON, DATE);
    if (!Number.isFinite(sun.azimuth) || !Number.isFinite(sun.altitude)) {
      throw new Error(`Sun position not finite: az=${sun.azimuth} alt=${sun.altitude}`);
    }
  });
});

describe('calculateMotionVectors', () => {
  it('returns 8 vectors', () => {
    const vectors = calculateMotionVectors(LAT, LON, DATE);
    strictEqual(vectors.length, 8);
  });

  it('all vectors are implemented with no errors', () => {
    const vectors = calculateMotionVectors(LAT, LON, DATE);
    for (const v of vectors) {
      if (v.error) throw new Error(`Vector ${v.name} has error: ${v.error}`);
      strictEqual(v.implemented, true);
    }
  });

  it('level 1 is Earth Rotation with correct velocity', () => {
    const vectors = calculateMotionVectors(LAT, LON, DATE);
    const level1 = vectors.find(v => v.level === 1);
    strictEqual(level1.name, 'Earth Rotation');
    // Dublin is at ~53° latitude, so rotational speed should be < 0.465
    if (level1.velocity >= 0.465 || level1.velocity <= 0) {
      throw new Error(`Expected velocity < 0.465 at 53°, got ${level1.velocity}`);
    }
  });
});

describe('calculateVectorSum', () => {
  it('returns resultant with magnitude, azimuth, altitude', () => {
    const { resultant } = calculateVectorSum(LAT, LON, DATE, 3);
    if (!resultant) throw new Error('No resultant');
    for (const key of ['magnitude', 'azimuth', 'altitude']) {
      if (!Number.isFinite(resultant[key])) throw new Error(`${key} is not finite`);
    }
  });

  it('vector sum for level 1 only equals rotation speed', () => {
    const { resultant } = calculateVectorSum(LAT, LON, DATE, 1);
    // At 53° latitude, rotation speed should be ~0.28 km/s
    assertClose(resultant.magnitude, 0.28, 0.05);
  });

  it('vector sum magnitude increases with more levels', () => {
    const sum1 = calculateVectorSum(LAT, LON, DATE, 1).resultant.magnitude;
    const sum3 = calculateVectorSum(LAT, LON, DATE, 3).resultant.magnitude;
    if (sum3 <= sum1) {
      throw new Error(`Expected sum(3 levels)=${sum3} > sum(1 level)=${sum1}`);
    }
  });

  it('level 8 (CMB dipole) is excluded from vector sum as verification', () => {
    const { activeVectors } = calculateVectorSum(LAT, LON, DATE, 8);
    const hasCmb = activeVectors.some(v => v.id === 'cmbDipole');
    if (hasCmb) {
      throw new Error('CMB dipole should be excluded from vector sum (isVerification=true)');
    }
    // Should have 7 active vectors (levels 1-7), not 8
    strictEqual(activeVectors.length, 7);
  });

  it('full vector sum (levels 1-7) is in the right ballpark for CMB dipole', () => {
    const { resultant } = calculateVectorSum(LAT, LON, DATE, 8);
    // Tully decomposition should yield a resultant roughly in the range of the CMB dipole (~370 km/s)
    // Using wide tolerance since directions vary with observer position/time
    if (resultant.magnitude < 100 || resultant.magnitude > 900) {
      throw new Error(`Vector sum ${resultant.magnitude} km/s is outside reasonable range (100-900)`);
    }
  });
});

describe('calculateAll', () => {
  it('returns input, celestialBodies, motionVectors, vectorSum', () => {
    const result = calculateAll(LAT, LON, DATE, 8);
    for (const key of ['input', 'celestialBodies', 'motionVectors', 'vectorSum']) {
      if (!(key in result)) throw new Error(`Missing key: ${key}`);
    }
  });
});
