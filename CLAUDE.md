# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tilt Meter is a WebVR/AR application that visualizes how we're flying through space at multiple scales. Built on a modular architecture, it shows Earth's motion vectors (rotation, orbital motion, galactic motion) while maintaining accurate celestial reference points. Uses A-Frame for 3D rendering and device sensors for real-time positioning.

## Modular Architecture

### Core Modules

- **modules/sensors/DeviceOrientation.js**: Device compass and orientation handling with proper event cleanup
- **modules/sensors/Geolocation.js**: GPS positioning with error handling
- **modules/astronomy/Coordinates.js**: Mathematical utilities and coordinate transformations
- **modules/astronomy/StellarCalculations.js**: Star positioning calculations using astronomical algorithms
- **modules/astronomy/GalacticCenter.js**: Milky Way galactic center positioning (Sagittarius A*)

### Main Application

- **index.html**: A-Frame VR scene with celestial objects and containers
- **script.js**: Main application orchestrating modules with ES6 imports
- **suncalc.js**: Third-party library for sun/moon position calculations  
- **main.css**: Minimal styling for UI elements

### Key Features

- **Device Orientation**: Uses `deviceorientation` event to determine compass heading
- **Geolocation**: Gets user's GPS coordinates for astronomical calculations
- **Celestial Positioning**: Calculates real-time positions of:
  - Galactic center (Sagittarius A*)
  - Sun and moon
  - Cardinal directions (N/S/E/W markers)
- **A-Frame Integration**: 3D scene with skybox, spheres, and lighting

### Mathematical Functions

The application includes several astronomical calculation functions:
- `current_milky_way_position()`: Calculates galactic center position
- `calculate_star_location()`: General star position calculator
- `days_since_j2000()`: J2000 epoch calculations
- `local_sidereal_time()`: Sidereal time calculations
- Coordinate transformation utilities (radians/degrees)

### Dependencies

- A-Frame 
- SunCalc library (vendored in suncalc.js)
- Native browser APIs: geolocation, deviceorientation

## Important Notes

- The application is designed for mobile devices with orientation sensors
- Requires user permission for location access
- Compass heading correction varies between portrait/landscape orientation
- All astronomical calculations use real-time date and GPS coordinates

