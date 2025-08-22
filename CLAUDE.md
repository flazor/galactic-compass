# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Galactic Compass is a WebVR/AR application that displays a 3D celestial compass showing the position of the Milky Way galaxy, sun, moon, and cardinal directions relative to the user's location and device orientation. It uses A-Frame for 3D rendering and device sensors for real-time positioning.

## Architecture

### Core Components

- **index.html**: Main application entry point using A-Frame VR framework
- **script.js**: Main application logic containing:
  - Device orientation handling and compass calibration
  - Astronomical calculations for celestial body positioning
  - Milky Way galactic center positioning algorithms
  - Real-time coordinate transformations
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

## Development

### Running the Application

This is a client-side web application. Serve the files using any HTTP server:
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js http-server
npx http-server

# Using PHP
php -S localhost:8000
```

### Testing

The application requires:
- HTTPS connection (for device orientation API)
- Mobile device with compass/orientation sensors
- GPS/location services enabled
- WebVR-compatible browser

### File Structure

- Root directory contains the main application
- `smash/` subdirectory contains a separate HTML file (purpose unclear from analysis)
- `cache.manifest` enables offline application caching

### Dependencies

- A-Frame 1.0.0 (loaded from CDN)
- SunCalc library (vendored in suncalc.js)
- Native browser APIs: geolocation, deviceorientation

## Important Notes

- The application is designed for mobile devices with orientation sensors
- Requires user permission for location access
- Compass heading correction varies between portrait/landscape orientation
- All astronomical calculations use real-time date and GPS coordinates

## Recent Work (August 2025)

### Service Worker Implementation
- Added `sw.js` for offline functionality
- Caches essential assets: main.css, script.js, suncalc.js, and external starmap image
- Implements cache-first strategy with network fallback
- Automatically caches same-origin resources and images during usage
- Ready for PWA conversion if needed in future

### Pending Tasks
- Test offline functionality on mobile device
- Consider adding manifest.json for full PWA support
- Verify all external dependencies are properly cached