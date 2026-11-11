# Technical Decisions

- The world is a fictionalized, compressed Dhaka-inspired district rather than geographic map data.
- Three.js owns rendering; Rapier owns collision and dynamic vehicle movement.
- UI is React DOM over a non-React simulation loop.
- Geometry and ambience are generated in code to avoid unclear asset licensing and large downloads.
- IndexedDB is the authoritative local single-player save; a localStorage fallback is used only if IndexedDB fails.
- Multiplayer is room-based with Colyseus. Server-owned reward transaction IDs prevent duplicate payouts.
- The browser build is authoritative for feature development; Tauri is packaging only.
