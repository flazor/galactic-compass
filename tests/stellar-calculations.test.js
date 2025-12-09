import { StellarCalculations } from '../modules/astronomy/StellarCalculations.js';
import { Coordinates } from '../modules/astronomy/Coordinates.js';

// Wait for testRunner to be available
if (!window.testRunner) {
    throw new Error('TestRunner not available');
}

const { suite, test, assertEquals, assertClose } = window.testRunner;

suite('StellarCalculations', () => {
    test('calculateStarLocation for known star', () => {
        // Test with Vega (approximately RA 18h 36m, Dec +38° 47')
        // At a specific time and location
        const obsLat = 40.7; // New York latitude
        const obsLon = -74.0; // New York longitude  
        const vegaRA = 18.6; // 18h 36m in decimal hours
        const vegaDec = 38.8; // +38° 47' in decimal degrees
        
        // Use a specific date for reproducible results
        const testDate = new Date('2000-01-01T12:00:00Z'); // J2000 epoch
        
        const [altitude, azimuth] = StellarCalculations.calculateStarLocation(
            obsLat, obsLon, vegaRA, vegaDec, testDate
        );
        
        // Results should be reasonable (altitude between -90 and +90, azimuth 0-360)
        assertEquals(altitude >= -90 && altitude <= 90, true, 'Altitude should be between -90 and +90');
        assertEquals(azimuth >= 0 && azimuth <= 360, true, 'Azimuth should be between 0 and 360');
        
        console.log(`Vega at J2000 from NYC: alt=${altitude.toFixed(1)}°, az=${azimuth.toFixed(1)}°`);
    });

    test('calculateStarLocation for Polaris (North Star)', () => {
        // Polaris: RA ~2h 32m, Dec ~89° 16' (very close to north celestial pole)
        const obsLat = 40.7; // New York latitude
        const obsLon = -74.0;
        const polarisRA = 2.53; // ~2h 32m
        const polarisDec = 89.27; // ~89° 16'
        
        const testDate = new Date('2000-01-01T12:00:00Z');
        
        const [altitude, azimuth] = StellarCalculations.calculateStarLocation(
            obsLat, obsLon, polarisRA, polarisDec, testDate
        );
        
        // Polaris altitude should be approximately equal to observer's latitude
        assertClose(altitude, obsLat, 5.0, 'Polaris altitude should approximate observer latitude');
        
        // Azimuth should be close to north (0° or 360°)
        const azimuthFromNorth = Math.min(azimuth, 360 - azimuth);
        assertEquals(azimuthFromNorth < 30, true, 'Polaris should be near north');
        
        console.log(`Polaris from NYC: alt=${altitude.toFixed(1)}°, az=${azimuth.toFixed(1)}°`);
    });

    test('calculateStarLocation consistency', () => {
        // Same star calculated twice should give same results
        const obsLat = 51.5; // London
        const obsLon = 0.0;
        const testRA = 12.0;
        const testDec = 30.0;
        const testDate = new Date('2000-06-21T12:00:00Z');
        
        const result1 = StellarCalculations.calculateStarLocation(obsLat, obsLon, testRA, testDec, testDate);
        const result2 = StellarCalculations.calculateStarLocation(obsLat, obsLon, testRA, testDec, testDate);
        
        assertClose(result1[0], result2[0], 0.001, 'Altitude should be consistent');
        assertClose(result1[1], result2[1], 0.001, 'Azimuth should be consistent');
    });

    test('calculateStarLocation time dependency', () => {
        // Same star at different times should give different positions
        const obsLat = 0.0; // Equator
        const obsLon = 0.0; // Greenwich
        const testRA = 6.0; // 6 hours RA
        const testDec = 0.0; // On celestial equator
        
        const time1 = new Date('2000-01-01T00:00:00Z'); // Midnight
        const time2 = new Date('2000-01-01T06:00:00Z'); // 6 hours later
        
        const pos1 = StellarCalculations.calculateStarLocation(obsLat, obsLon, testRA, testDec, time1);
        const pos2 = StellarCalculations.calculateStarLocation(obsLat, obsLon, testRA, testDec, time2);
        
        // Positions should be different (star moves due to Earth's rotation)
        const altDiff = Math.abs(pos1[0] - pos2[0]);
        const azDiff = Math.abs(pos1[1] - pos2[1]);
        
        assertEquals(altDiff > 1 || azDiff > 1, true, 'Star position should change over time');
        
        console.log(`Star motion over 6h: Δalt=${altDiff.toFixed(1)}°, Δaz=${azDiff.toFixed(1)}°`);
    });
});