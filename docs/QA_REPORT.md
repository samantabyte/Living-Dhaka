# QA Report

Date: 2026-11-12 (Asia/Dhaka)

## Observed browser checks

- Production preview loaded the main menu in the Codex in-app Chromium browser.
- New Career entered the 3D district and generated a ride offer.
- Ride acceptance changed the objective to `approachingPickup`.
- Held `W` input moved the vehicle and HUD reported 50 km/h.
- No browser console errors were observed during menu, driving and ride acceptance.
- Multiplayer server `/health` returned a successful JSON response.
- A private room was created from the game UI and displayed a 1/4 player roster.
- Upgraded vehicle acceleration was measured in the production browser: 11 km/h after one second of full throttle and 44 km/h after a further four-second input with a short coast interval.
- Steering remained active after leaving the road. Manual `R` recovery moved a blocked vehicle from grass/building contact to the nearest road.
- The upgraded production view displayed the CC0 car model, facade windows, sidewalks and streetlights without console errors.

## Automated checks

- TypeScript strict typecheck: passed.
- Unit tests: eight assertions across ride transitions, routing, scoring, idempotent rewards and vehicle dynamics passed.
- Production Vite build: passed.
- Production dependency audit (`npm audit --omit=dev`): zero vulnerabilities after pinning patched Nano ID and Vite releases.
- Playwright CLI launch is restricted by the Codex Windows sandbox; the same flow was verified through the in-app browser automation surface. The spec remains available for an ordinary developer shell.

## Packaging

Tauri 2 source manifests are included. The Windows installer is blocked because Rust/Cargo is not installed on this machine.
