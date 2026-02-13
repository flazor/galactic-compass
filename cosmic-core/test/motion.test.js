import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { EarthRotation } from '../src/motion/EarthRotation.js';
import { EarthOrbit } from '../src/motion/EarthOrbit.js';
import { CosmicMotion } from '../src/motion/CosmicMotion.js';

function assertClose(actual, expected, tolerance = 0.01) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${actual} to be close to ${expected} (tolerance: ${tolerance})`);
  }
}

describe('EarthRotation', () => {
  const rotation = new EarthRotation();

  it('returns ~0.465 km/s at equator', () => {
    // getVelocity rounds to 2 decimal places, so 0.465 rounds to 0.47
    assertClose(rotation.getVelocity(0, 0), 0.47, 0.001);
  });

  it('returns 0 km/s at poles', () => {
    assertClose(rotation.getVelocity(90, 0), 0, 0.01);
  });

  it('returns lower velocity at mid-latitudes', () => {
    const v45 = rotation.getVelocity(45, 0);
    if (v45 >= 0.465 || v45 <= 0) {
      throw new Error(`Expected velocity at 45° to be between 0 and 0.465, got ${v45}`);
    }
  });

  it('direction is always eastward', () => {
    const dir = rotation.getDirection(0, 0, new Date());
    assertClose(dir.azimuth, Math.PI / 2, 0.001);
    assertClose(dir.altitude, 0, 0.001);
  });
});

describe('EarthOrbit', () => {
  const orbit = new EarthOrbit();

  it('returns 29.8 km/s everywhere', () => {
    strictEqual(orbit.getVelocity(0, 0), 29.8);
    strictEqual(orbit.getVelocity(90, 180), 29.8);
  });

  it('getDirection returns azimuth and altitude', () => {
    const dir = orbit.getDirection(40, -80, new Date(Date.UTC(2025, 0, 1, 12)));
    if (typeof dir.azimuth !== 'number' || typeof dir.altitude !== 'number') {
      throw new Error('Expected azimuth and altitude to be numbers');
    }
  });
});

describe('CosmicMotion', () => {
  const config = {
    velocity: 220,
    direction: 'Toward Solar Apex',
    coordinates: { ra: 18.8167, dec: 35.7983 },
    name: 'Solar Galactic Orbit',
    velocityDescription: '~220 km/s',
    period: '~230 million years'
  };
  const motion = new CosmicMotion(config);

  it('returns configured velocity', () => {
    strictEqual(motion.getVelocity(0, 0), 220);
  });

  it('getDirection returns azimuth and altitude', () => {
    const dir = motion.getDirection(40, -80, new Date(Date.UTC(2025, 5, 15, 12)));
    if (typeof dir.azimuth !== 'number' || typeof dir.altitude !== 'number') {
      throw new Error('Expected azimuth and altitude to be numbers');
    }
  });

  it('getInfo returns level metadata', () => {
    const info = motion.getInfo();
    strictEqual(info.name, 'Solar Galactic Orbit');
    strictEqual(info.speed, '~220 km/s');
  });
});
