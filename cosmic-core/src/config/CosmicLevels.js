/**
 * Cosmic Levels Configuration
 *
 * Defines the 8 levels of Earth's motion through space, from local rotation
 * to motion relative to the Cosmic Microwave Background.
 *
 * Based on COSMIC_LEVELS.md with peer-reviewed astronomical data.
 */

import { Coordinates } from '../astronomy/Coordinates.js';

// Motion class imports
import { EarthRotation } from '../motion/EarthRotation.js'; // Custom velocity logic
import { EarthOrbit } from '../motion/EarthOrbit.js'; // Custom orbital calculations
import { CosmicMotion } from '../motion/CosmicMotion.js'; // Generic for simple motions

/**
 * Convert RA (hours) and Dec (degrees) to decimal values
 */
function parseRA(raString) {
  // Parse "18h 28m" format to decimal hours
  const match = raString.match(/(\d+)h\s*(\d+)m/);
  if (match) {
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    return hours + minutes / 60;
  }
  return 0;
}

function parseDec(decString) {
  // Parse "+30°" or "-61°" format to decimal degrees
  const match = decString.match(/([+-]?\d+)°/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Cosmic motion levels ordered by scale
 */
export const COSMIC_LEVELS = [
  {
    level: 1,
    id: 'earthRotation',
    name: 'Earth Rotation',
    description: 'Earth rotates eastward, creating day/night cycles',

    // Physics
    velocity: 0.465, // km/s at equator
    velocityDescription: '~465 m/s at equator',
    direction: 'Eastward (toward sunrise)',
    period: '24 hours',

    // Scale
    scale: 0.0000000013, // light-years (Earth diameter ~13,000 km)
    scaleDescription: 'Earth diameter = 0.0000000013 light-years (~13,000 km)',

    // Coordinates (fixed direction)
    coordinates: {
      type: 'fixed',
      azimuth: Math.PI / 2, // 90° = East
      altitude: 0 // Horizontal
    },

    // Implementation
    implemented: true,
    motionClass: EarthRotation,
    bodyId: 'earthRotation',
    elementId: 'earth-rotation-hud-text',

    // Historical
    discoverer: 'Leon Foucault (1851) - first direct experimental proof with pendulum',
    earlierTheory: 'Nicolaus Copernicus (1543) proposed Earth\'s rotation',
    references: 'Foucault, L. (1851), Comptes rendus; Copernicus, N. (1543), De revolutionibus'
  },

  {
    level: 2,
    id: 'earthOrbit',
    name: 'Earth\'s Orbit Around Sun',
    description: 'Earth orbits the Sun along the ecliptic plane',

    // Physics
    velocity: 29.8, // km/s
    velocityDescription: '~30 km/s',
    direction: 'Eastward along ecliptic',
    period: '365.25 days',

    // Scale
    scale: 0.00003, // light-years (2 AU orbital diameter)
    scaleDescription: 'Orbital diameter = 0.00003 light-years (~2 AU, 300 million km)',

    // Coordinates (calculated)
    coordinates: {
      type: 'calculated'
    },

    // Implementation
    implemented: true,
    motionClass: EarthOrbit,
    bodyId: 'earthOrbit',
    elementId: 'earth-orbit-hud-text',

    // Historical
    discoverer: 'Nicolaus Copernicus (1543) - heliocentric model; Johannes Kepler (1609-1619) - elliptical orbits',
    earlierTheory: 'Aristarchus of Samos (~270 BCE)',
    references: 'Copernicus (1543), De revolutionibus; Kepler (1609), Astronomia nova'
  },

  {
    level: 3,
    id: 'solarOrbit',
    name: 'Solar System\'s Galactic Orbit',
    description: 'Solar System orbits around the Milky Way center while oscillating above/below the galactic plane',

    // Physics
    velocity: 220, // km/s
    velocityDescription: '~220 km/s',
    direction: 'Toward Lyra/Hercules (Solar Apex)',
    period: '~230 million years (orbital) + ~30 million years (galactic plane oscillation)',

    // Scale
    scale: 52000, // light-years (galactic orbit diameter)
    scaleDescription: 'Galactic orbit diameter = ~52,000 light-years',

    // Coordinates (RA/Dec) - Solar Apex direction
    coordinates: {
      type: 'radec',
      ra: 18.8167, // 18h 49m 15.8s (toward Lyra constellation)
      dec: 35.7983, // +35° 47' 53.6" (toward Vega region)
      description: 'RA: 18h 49m, Dec: +35° 48\' (Solar Apex in Lyra, near Vega)'
    },

    // Implementation
    implemented: true,
    motionClass: CosmicMotion, // Use generic motion class
    bodyId: 'solarOrbit',
    elementId: 'solar-orbit-hud-text',

    // Historical
    discoverer: 'William Herschel (1783) - solar apex direction; Jan Oort (1927) - galactic rotation',
    references: 'Herschel, W. (1783); Oort, J. (1927), Bull. Astron. Inst. Netherlands, 3, 275; Dehnen & Binney (1998), MNRAS, 298, 387',
    notes: 'Solar System oscillates ~27 parsecs above/below galactic plane with period ~33 Myr (galactic year ~230 Myr). Current motion: ~7 km/s northward from galactic plane.'
  },

  {
    level: 4,
    id: 'localGroupMotion',
    name: 'Milky Way in Local Group',
    description: 'Milky Way falls toward Local Group barycenter (on MW-Andromeda axis)',

    // Physics
    velocity: 62, // km/s (Makarov et al. 2025)
    velocityDescription: '~63 km/s',
    direction: 'Toward Local Group barycenter (near M31)',
    period: '~4.5 billion years until MW-M31 collision',

    // Scale
    scale: 10000000, // light-years (10 million ly)
    scaleDescription: 'Local Group diameter = ~10 million light-years',

    // Coordinates (RA/Dec) - LG barycenter lies on MW-M31 axis
    // Galactic: l = 121.7, b = -21.5 (Makarov et al. 2025)
    coordinates: {
      type: 'radec',
      ra: 0.756, // 00h 45m (toward LG barycenter, near M31)
      dec: 41.36, // +41.4°
      galactic: 'l = 121.7°, b = -21.5°',
      description: 'RA: 00h 45m, Dec: +41° (LG barycenter, near M31)'
    },

    // Implementation
    implemented: true,
    motionClass: CosmicMotion,
    bodyId: 'localGroupMotion',
    elementId: 'local-group-motion-hud-text',

    // Historical
    discoverer: 'Vesto Slipher (1912) - detected Andromeda\'s blueshift',
    references: 'Makarov et al. (2025), A&A; van der Marel et al. (2012), ApJ'
  },

  {
    level: 5,
    id: 'localVoidPush',
    name: 'Local Void Push',
    description: 'Local Sheet of galaxies repelled away from the underdense Local Void',

    // Physics (Tully et al. 2008 decomposition)
    velocity: 259, // km/s
    velocityDescription: '~259 km/s',
    direction: 'Away from Local Void center',
    period: 'N/A (ongoing repulsion)',

    // Scale
    scale: 100000000, // light-years (~100 million ly void diameter)
    scaleDescription: 'Local Void diameter = ~100 million light-years',

    // Coordinates (RA/Dec) - direction AWAY from Local Void
    // Galactic: l = 210, b = -2 (Tully et al. 2008)
    coordinates: {
      type: 'radec',
      ra: 6.649, // 06h 39m
      dec: 1.70, // +1.7°
      galactic: 'l = 210°, b = -2°',
      description: 'RA: 06h 39m, Dec: +2° (away from Local Void, toward Monoceros/Orion)'
    },

    // Implementation
    implemented: true,
    motionClass: CosmicMotion,
    bodyId: 'localVoidPush',
    elementId: 'local-void-push-hud-text',

    // Historical
    discoverer: 'Brent Tully et al. (2008) - identified void repulsion as major component',
    references: 'Tully et al. (2008), ApJ, 676, 184'
  },

  {
    level: 6,
    id: 'virgoPull',
    name: 'Virgo Cluster Pull',
    description: 'Local Group pulled toward Virgo Cluster (Tully 2008 component)',

    // Physics (Tully et al. 2008 decomposition)
    velocity: 185, // km/s
    velocityDescription: '~185 km/s',
    direction: 'Toward M87 (Virgo Cluster center)',
    period: 'N/A (ongoing infall)',

    // Scale
    scale: 110000000, // light-years (110 million ly)
    scaleDescription: 'Virgo Supercluster diameter = ~110 million light-years',

    // Coordinates (RA/Dec) - M87 / Virgo Cluster center
    // Galactic: l = 283.8, b = +74.5
    coordinates: {
      type: 'radec',
      ra: 12.514, // 12h 31m (M87)
      dec: 12.39, // +12.4°
      galactic: 'l = 283.8°, b = +74.5°',
      description: 'RA: 12h 31m, Dec: +12° (M87, Virgo Cluster center, 53 Mly distant)'
    },

    // Implementation
    implemented: true,
    motionClass: CosmicMotion,
    bodyId: 'virgoPull',
    elementId: 'virgo-pull-hud-text',

    // Historical
    discoverer: 'Marc Aaronson et al. (1982); Tully et al. (2008) quantified component',
    references: 'Tully et al. (2008), ApJ, 676, 184; Aaronson et al. (1982), ApJ, 258, 64'
  },

  {
    level: 7,
    id: 'largeScaleFlow',
    name: 'Large-Scale Flow',
    description: 'Combined pull from Great Attractor, Shapley, and Centaurus structures',

    // Physics (Tully et al. 2008 decomposition)
    velocity: 455, // km/s
    velocityDescription: '~455 km/s',
    direction: 'Toward Centaurus/Great Attractor/Shapley region',
    period: 'N/A (ongoing flow)',

    // Scale
    scale: 650000000, // light-years (Shapley at ~650 Mly)
    scaleDescription: 'Flow extends to Shapley Concentration at ~650 million light-years',

    // Coordinates (RA/Dec) - combined flow direction
    // Galactic: l = 299, b = +15 (Tully et al. 2008)
    coordinates: {
      type: 'radec',
      ra: 12.481, // 12h 29m
      dec: -47.70, // -47.7°
      galactic: 'l = 299°, b = +15°',
      description: 'RA: 12h 29m, Dec: -48° (toward Centaurus, includes GA + Shapley)'
    },

    // Implementation
    implemented: true,
    motionClass: CosmicMotion,
    bodyId: 'largeScaleFlow',
    elementId: 'large-scale-flow-hud-text',

    // Historical
    discoverer: 'Tully et al. (2008) - decomposed bulk flow; Dressler (1987) - Great Attractor',
    references: 'Tully et al. (2008), ApJ, 676, 184; Dressler (1987), ApJ; Tully et al. (2014), Nature, 513, 71'
  },

  {
    level: 8,
    id: 'cmbDipole',
    name: 'CMB Dipole / Cosmic Rest Frame',
    description: 'Measured total motion relative to CMB — verification of vector sum, not an additive component',

    // Physics
    velocity: 369.82, // km/s net (Planck measurement)
    velocityDescription: '~370 km/s (measured total)',
    direction: 'Toward Leo/Crater boundary',
    period: 'N/A (cosmic reference frame)',

    // This level is NOT added to the vector sum — it IS the expected result
    isVerification: true,

    // Scale
    scale: 93000000000, // light-years (observable universe diameter)
    scaleDescription: 'Observable universe diameter = ~93 billion light-years',

    // Coordinates (multiple systems)
    coordinates: {
      type: 'radec',
      ra: parseRA('11h 12m'), // 11.2 hours
      dec: parseDec('-7°'), // -7 degrees
      galactic: 'l = 264°, b = +48°',
      description: 'RA: 11h 12m, Dec: -7° (Galactic: l = 264°, b = +48°, Near: Regulus, Hydra)'
    },

    // Implementation
    implemented: true,
    motionClass: CosmicMotion,
    bodyId: 'cmbDipoleMotion',
    elementId: 'cmb-dipole-motion-hud-text',

    // Historical
    discoverer: 'Edward Conklin (1969) - first detection; Paul Henry (1971) - declination; Brian Corey & David Wilkinson (1976) - confirmation',
    references: 'Conklin (1969), Nature, 222, 971; Henry (1971), Nature, 231, 516; Kogut et al. (1993), ApJ, 419, 1; Planck (2020)'
  }
];

/**
 * Get cosmic level by ID
 */
export function getCosmicLevel(id) {
  return COSMIC_LEVELS.find(level => level.id === id);
}

/**
 * Get cosmic level by number (1-8)
 */
export function getCosmicLevelByNumber(levelNumber) {
  return COSMIC_LEVELS.find(level => level.level === levelNumber);
}

/**
 * Get all implemented cosmic levels
 */
export function getImplementedLevels() {
  return COSMIC_LEVELS.filter(level => level.implemented);
}

/**
 * Get all unimplemented cosmic levels
 */
export function getUnimplementedLevels() {
  return COSMIC_LEVELS.filter(level => !level.implemented);
}

/**
 * Get levels up to specified number (inclusive)
 */
export function getLevelsUpTo(maxLevel) {
  return COSMIC_LEVELS.filter(level => level.level <= maxLevel);
}

/**
 * Get total scale range
 */
export function getScaleRange() {
  const scales = COSMIC_LEVELS.map(level => level.scale);
  return {
    min: Math.min(...scales),
    max: Math.max(...scales),
    span: Math.max(...scales) / Math.min(...scales)
  };
}

/**
 * Convert RA/Dec coordinates to appropriate format for motion classes
 */
export function getCoordinatesForLevel(level) {
  if (level.coordinates.type === 'fixed') {
    return {
      azimuth: level.coordinates.azimuth,
      altitude: level.coordinates.altitude
    };
  } else if (level.coordinates.type === 'radec') {
    return {
      ra: level.coordinates.ra,
      dec: level.coordinates.dec
    };
  } else if (level.coordinates.type === 'calculated') {
    return null; // Calculated dynamically by motion class
  }
}

export default COSMIC_LEVELS;
