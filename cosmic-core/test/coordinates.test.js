import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { Coordinates } from '../src/astronomy/Coordinates.js';

function assertClose(actual, expected, tolerance = 0.0001) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${actual} to be close to ${expected} (tolerance: ${tolerance})`);
  }
}

describe('Coordinates', () => {
  it('toRadians converts degrees to radians', () => {
    assertClose(Coordinates.toRadians(0), 0);
    assertClose(Coordinates.toRadians(90), Math.PI / 2);
    assertClose(Coordinates.toRadians(180), Math.PI);
    assertClose(Coordinates.toRadians(360), Math.PI * 2);
  });

  it('toDegrees converts radians to degrees', () => {
    assertClose(Coordinates.toDegrees(0), 0);
    assertClose(Coordinates.toDegrees(Math.PI / 2), 90);
    assertClose(Coordinates.toDegrees(Math.PI), 180);
    assertClose(Coordinates.toDegrees(Math.PI * 2), 360);
  });

  it('daysSinceJ2000 calculates correctly', () => {
    const j2000 = new Date(Date.UTC(2000, 0, 1, 12));
    strictEqual(Coordinates.daysSinceJ2000(j2000), 0);

    const nextDay = new Date(Date.UTC(2000, 0, 2, 12));
    strictEqual(Coordinates.daysSinceJ2000(nextDay), 1);

    const nextYear = new Date(Date.UTC(2001, 0, 1, 12));
    strictEqual(Coordinates.daysSinceJ2000(nextYear), 366);
  });

  it('localSiderealTime calculation', () => {
    const lst = Coordinates.localSiderealTime(0, 0);
    assertClose(lst, 280.46, 0.1);
  });

  it('hourAngle wraps correctly', () => {
    strictEqual(Coordinates.hourAngle(100, 50), 50);
    strictEqual(Coordinates.hourAngle(50, 100), 310);
    strictEqual(Coordinates.hourAngle(180, 180), 0);
  });

  it('calculateAltitude for star on meridian', () => {
    const obsLatRad = Coordinates.toRadians(45);
    const starDecRad = Coordinates.toRadians(45);
    const haRad = Coordinates.toRadians(0);

    const altRad = Coordinates.calculateAltitude(obsLatRad, starDecRad, haRad);
    const altDeg = Coordinates.toDegrees(altRad);

    assertClose(altDeg, 90, 0.1);
  });

  it('angleBetweenPoints calculates great circle distance', () => {
    strictEqual(Coordinates.angleBetweenPoints(0, 0, 0, 0), 0);
    assertClose(Coordinates.angleBetweenPoints(0, 0, 90, 0), 90, 0.1);
    assertClose(Coordinates.angleBetweenPoints(0, 0, 180, 0), 180, 0.1);
  });

  it('eclipticToEquatorial converts correctly', () => {
    // Vernal equinox point: ecliptic (0,0) should give RA=0, Dec=0
    const { ra, dec } = Coordinates.eclipticToEquatorial(0, 0, Coordinates.toRadians(23.44));
    assertClose(ra, 0, 0.001);
    assertClose(dec, 0, 0.001);
  });

  it('equatorialToHorizontal converts correctly', () => {
    // Star on meridian (HA=0) at declination = latitude should be at zenith
    const lat = Coordinates.toRadians(45);
    const dec = Coordinates.toRadians(45);
    const ha = 0;
    const { altitude } = Coordinates.equatorialToHorizontal(ha, dec, lat);
    assertClose(altitude, Math.PI / 2, 0.01);
  });
});
