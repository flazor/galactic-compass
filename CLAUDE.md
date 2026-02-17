# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Tilt Meter is a WebVR/AR application that visualizes how you're flying through space at multiple scales. It shows motion vectors for an observer on Earth's surface across 8 cosmic levels (rotation through CMB dipole) while maintaining accurate celestial reference points. Uses A-Frame for 3D rendering and device sensors for real-time positioning.

## Architecture

### cosmic-core/ — Pure calculation library (Node.js + browser)

Standalone ES module library with no browser dependencies. Runs in Node.js with its own test suite.

- **Entry point:** `cosmic-core/src/index.js` (barrel export, 21 public symbols)
- **Tests:** `cd cosmic-core && npm test` (node:test + node:assert)
- **SunCalc:** Uses `globalThis.SunCalc ?? (await import('suncalc')).default` for browser/Node.js compatibility

Modules:
- `astronomy/Coordinates.js` — Coordinate transforms, J2000 epoch, sidereal time
- `astronomy/StellarCalculations.js` — Star position from RA/Dec to az/alt
- `astronomy/GalacticCenter.js` — Sagittarius A* positioning
- `motion/EarthRotation.js` — Latitude-dependent rotational velocity
- `motion/EarthOrbit.js` — Ecliptic orbital motion direction
- `motion/CosmicMotion.js` — Generic class for levels 3-8 (constant velocity + RA/Dec)
- `math/VectorSum.js` — 3D velocity vector addition
- `config/CosmicLevels.js` — All 8 level definitions (velocity, coordinates, scale, metadata)
- `config/LevelManager.js` — Level selection state and event system
- `calculations/CelestialCalculations.js` — Top-level API: `calculateAll(lat, lon, date, maxLevel)`

### modules/ — Browser-only code (A-Frame, sensors)

- `sensors/DeviceOrientation.js` — Compass heading from device
- `sensors/Geolocation.js` — GPS coordinates
- `rendering/CelestialRenderer.js` — Positions objects in A-Frame scene, imports from cosmic-core
- `rendering/SceneManager.js` — A-Frame scene lifecycle
- `rendering/UIControls.js` — Gear icon, level slider, debug panels
- `assets/AssetManager.js` — Image caching for skybox textures

### Entry Points

- **index.html** — A-Frame 3D VR/AR scene (main app)
- **data.html** — Text-only calculation interface (no A-Frame, useful for debugging)
- **script.js** — Main orchestrator (imports sensors, rendering, and cosmic-core)

### Dependencies

- A-Frame (vendored in `lib/aframe.min.js`)
- SunCalc (vendored in `lib/suncalc.js`, also npm dependency in cosmic-core)
- Native browser APIs: geolocation, deviceorientation

## Reference Data

- `docs/COSMIC_LEVELS.md` — Scientific reference for the 8 cosmic motion levels (coordinates, velocities, citations)

## Important Notes

- Mobile-first: designed for devices with orientation sensors
- Requires user permission for location access
- Compass heading correction varies between portrait/landscape orientation
- All astronomical calculations use real-time date and GPS coordinates
