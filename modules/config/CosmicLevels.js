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
    discoverer: 'Léon Foucault (1851) - first direct experimental proof with pendulum',
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
    name: 'Local Group Motion',
    description: 'Milky Way + Andromeda + ~50 galaxies falling toward each other',
    
    // Physics
    velocity: 110, // km/s
    velocityDescription: '~110 km/s (Andromeda approach)',
    direction: 'Toward M31 (Andromeda Galaxy)',
    period: '~4.5 billion years until collision',
    
    // Scale
    scale: 10000000, // light-years (10 million ly)
    scaleDescription: 'Local Group diameter = ~10 million light-years',
    
    // Coordinates (RA/Dec) - Andromeda Galaxy (M31)
    coordinates: {
      type: 'radec',
      ra: 0.74, // 00h 44m 10.2s (precise Andromeda position)
      dec: 41.4, // +41° 24' 55.5" (precise Andromeda position)
      description: 'RA: 00h 44m, Dec: +41° 25\' (M31 Andromeda Galaxy, 2.5 million ly distant)'
    },
    
    // Implementation
    implemented: true,
    motionClass: CosmicMotion, // Generic motion class for simple constant velocity + RA/Dec
    bodyId: 'localGroupMerger',
    elementId: 'local-group-merger-hud-text',
    
    // Historical
    discoverer: 'Vesto Slipher (1912) - detected Andromeda\'s blueshift',
    references: 'Slipher (1912); van der Marel et al. (2012), ApJ; Sawala et al. (2024), MNRAS'
  },
  
  {
    level: 5,
    id: 'virgoClusterInfall',
    name: 'Virgo Cluster Infall',
    description: 'Local Group falling toward Virgo Cluster center',
    
    // Physics
    velocity: 300, // km/s
    velocityDescription: '~300 km/s',
    direction: 'Toward M87 (Virgo Cluster center)',
    period: 'N/A (ongoing infall)',
    
    // Scale
    scale: 110000000, // light-years (110 million ly)
    scaleDescription: 'Virgo Supercluster diameter = ~110 million light-years',
    
    // Coordinates (RA/Dec)
    coordinates: {
      type: 'radec',
      ra: parseRA('12h 27m'), // 12.45 hours
      dec: parseDec('+12°'), // +12 degrees
      description: 'RA: 12h 27m, Dec: +12° (53 million ly distant, Near: Spica, Virgo A)'
    },
    
    // Implementation
    implemented: true,
    motionClass: CosmicMotion, // Generic motion class
    bodyId: 'virgoClusterInfall',
    elementId: 'virgo-cluster-infall-hud-text',
    
    // Historical
    discoverer: 'Marc Aaronson et al. (1980-1982), Allan Sandage & Gustav Tammann (1985)',
    references: 'Aaronson et al. (1982), ApJ, 258, 64; Tammann & Sandage (1985), ApJ, 294'
  },
  
  {
    level: 6,
    id: 'greatAttractor',
    name: 'Great Attractor',
    description: 'Massive gravity anomaly pulling Virgo Supercluster',
    
    // Physics
    velocity: 600, // km/s
    velocityDescription: '~600 km/s',
    direction: 'Toward Norma Cluster (ACO 3627)',
    period: 'N/A (ongoing attraction)',
    
    // Scale
    scale: 400000000, // light-years (300-500 million ly span)
    scaleDescription: 'Structure spans ~300-500 million light-years (center at ~150-250 million ly)',
    
    // Coordinates (RA/Dec) - Norma Cluster (ACO 3627)
    coordinates: {
      type: 'radec',
      ra: 16.27, // 16h 16m 35.8s (Norma Cluster center)
      dec: -60.92, // -60° 55' 56.7" (Norma Cluster center)
      description: 'RA: 16h 16m, Dec: -60° 56\' (Norma Cluster/ACO 3627, Great Attractor center)'
    },
    
    // Implementation
    implemented: true,
    motionClass: CosmicMotion, // Use generic motion class
    bodyId: 'greatAttractorPull',
    elementId: 'great-attractor-pull-hud-text',
    
    // Historical
    discoverer: 'Alan Dressler (1987)',
    references: 'Dressler, A. (1987), ApJ; Lynden-Bell et al. (1988), ApJ, 326, 19; Woudt et al. (2007), MNRAS, 383, 445'
  },
  
  {
    level: 7,
    id: 'shapleySuperercluster',
    name: 'Shapley Supercluster Pull',
    description: 'Even larger structure beyond Great Attractor',
    
    // Physics
    velocity: 85, // km/s additional
    velocityDescription: '~85 km/s additional',
    direction: 'Toward Shapley Concentration (A3558 core)',
    period: 'N/A (ongoing attraction)',
    
    // Scale
    scale: 350000000, // light-years (300-400 million ly span)
    scaleDescription: 'Supercluster spans ~300-400 million light-years (center at 650 million ly)',
    
    // Coordinates (RA/Dec)
    coordinates: {
      type: 'radec',
      ra: parseRA('13h 25m'), // 13.42 hours
      dec: parseDec('-31°'), // -31 degrees
      description: 'RA: 13h 25m, Dec: -31°'
    },
    
    // Implementation
    implemented: true,
    motionClass: CosmicMotion, // Generic motion class
    bodyId: 'shapleySupererclusterPull',
    elementId: 'shapley-supercluster-pull-hud-text',
    
    // Historical
    discoverer: 'Harlow Shapley (1930)',
    references: 'Shapley, H. (1930); Raychaudhury, S. (1989), ApJ, 347, 17; Proust et al. (2006), A&A, 447, 133'
  },
  
  {
    level: 8,
    id: 'cmbDipole',
    name: 'CMB Dipole / Cosmic Rest Frame',
    description: 'Net motion relative to Cosmic Microwave Background - our ultimate reference frame',
    
    // Physics
    velocity: 370, // km/s net
    velocityDescription: '~370 km/s net',
    direction: 'Toward Leo/Crater boundary',
    period: 'N/A (cosmic reference frame)',
    
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
    motionClass: CosmicMotion, // Generic motion class
    bodyId: 'cmbDipoleMotion',
    elementId: 'cmb-dipole-motion-hud-text',
    
    // Historical
    discoverer: 'Edward Conklin (1969) - first detection; Paul Henry (1971) - declination; Brian Corey & David Wilkinson (1976) - confirmation',
    references: 'Conklin (1969), Nature, 222, 971; Henry (1971), Nature, 231, 516; Kogut et al. (1993), ApJ, 419, 1'
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