# Technical Decisions

- The world is a fictionalized, compressed Dhaka-inspired district rather than geographic map data.
- Three.js owns rendering; Rapier owns collision and dynamic vehicle movement.
- UI is React DOM over a non-React simulation loop.
- Geometry combines procedural facade/road generation with a small, audited selection of CC0 GLB city and vehicle models. No runtime CDN is required.
- Vehicle motion uses a deterministic longitudinal acceleration/braking model over a Rapier rigid body. This prevents raw-force spikes and keeps controls usable off-road; collisions remain physically resolved.
- IndexedDB is the authoritative local single-player save; a localStorage fallback is used only if IndexedDB fails.
- Multiplayer is room-based with Colyseus. Server-owned reward transaction IDs prevent duplicate payouts.
- The browser build is authoritative for feature development; Tauri is packaging only.
