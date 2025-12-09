import { Coordinates } from '../modules/astronomy/Coordinates.js';

// Wait for testRunner to be available
if (!window.testRunner) {
    throw new Error('TestRunner not available');
}

const { suite, test, assertEquals, assertClose } = window.testRunner;

suite('Coordinates', () => {
    test('toRadians converts degrees to radians', () => {
        assertClose(Coordinates.toRadians(0), 0);
        assertClose(Coordinates.toRadians(90), Math.PI / 2);
        assertClose(Coordinates.toRadians(180), Math.PI);
        assertClose(Coordinates.toRadians(360), Math.PI * 2);
    });

    test('toDegrees converts radians to degrees', () => {
        assertClose(Coordinates.toDegrees(0), 0);
        assertClose(Coordinates.toDegrees(Math.PI / 2), 90);
        assertClose(Coordinates.toDegrees(Math.PI), 180);
        assertClose(Coordinates.toDegrees(Math.PI * 2), 360);
    });

    test('daysSinceJ2000 calculates correctly', () => {
        // J2000 epoch: January 1, 2000, 12:00 TT
        const j2000 = new Date(2000, 0, 1, 12); // Note: month is 0-indexed
        assertEquals(Coordinates.daysSinceJ2000(j2000), 0);
        
        // One day later
        const nextDay = new Date(2000, 0, 2, 12);
        assertEquals(Coordinates.daysSinceJ2000(nextDay), 1);
        
        // One year later (366 days - 2000 was a leap year)
        const nextYear = new Date(2001, 0, 1, 12);
        assertEquals(Coordinates.daysSinceJ2000(nextYear), 366);
    });

    test('localSiderealTime calculation', () => {
        // Test known values - this is approximate
        const days = 0; // J2000
        const lonDeg = 0; // Greenwich
        const hours = 12; // Noon UT
        
        const lst = Coordinates.localSiderealTime(days, lonDeg, hours);
        // At J2000 epoch, LST should be around 280.46 degrees at Greenwich noon
        assertClose(lst, 280.46, 0.1);
    });

    test('hourAngle wraps correctly', () => {
        assertEquals(Coordinates.hourAngle(100, 50), 50); // Normal case
        assertEquals(Coordinates.hourAngle(50, 100), 310); // Wrapped case (50 - 100 + 360)
        assertEquals(Coordinates.hourAngle(180, 180), 0); // Same RA and LST
    });

    test('calculateAltitude for star on meridian', () => {
        // At latitude 45°, a star at declination 45° on the meridian (HA=0) 
        // Formula: sin(alt) = sin(lat)×sin(dec) + cos(lat)×cos(dec)×cos(HA)
        // sin(alt) = sin(45°)×sin(45°) + cos(45°)×cos(45°)×cos(0°) = 0.5 + 0.5 = 1
        // Therefore alt = 90° (zenith)
        const obsLatRad = Coordinates.toRadians(45);
        const starDecRad = Coordinates.toRadians(45);
        const haRad = Coordinates.toRadians(0); // On meridian
        
        const altRad = Coordinates.calculateAltitude(obsLatRad, starDecRad, haRad);
        const altDeg = Coordinates.toDegrees(altRad);
        
        assertClose(altDeg, 90, 0.1);
    });

    test('angleBetweenPoints calculates great circle distance', () => {
        // Two points at same position should have 0 distance
        assertEquals(Coordinates.angleBetweenPoints(0, 0, 0, 0), 0);
        
        // Points 90 degrees apart should be 90 degrees
        assertClose(Coordinates.angleBetweenPoints(0, 0, 90, 0), 90, 0.1);
        
        // Points 180 degrees apart in azimuth at same altitude should be 180 degrees
        assertClose(Coordinates.angleBetweenPoints(0, 0, 180, 0), 180, 0.1);
    });
});