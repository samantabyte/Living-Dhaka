# Living Dhaka

A browser-native 3D driving and ride-sharing career game set in a fictionalized, compressed interpretation of Dhaka. It uses open web libraries rather than a game engine.

## Play locally

Requirements: Node.js 20+ and npm.

```powershell
npm install
npm run dev:all
```

Open `http://localhost:5175`. The multiplayer server runs on port `2568`.

Production browser build:

```powershell
npm run build
npm run preview
```

Verification:

```powershell
npm run typecheck
npm run lint
npm run test
npm run test:e2e
```

The Playwright config uses an installed Microsoft Edge browser on Windows. In a normal unsandboxed developer shell it runs the production smoke test.

## Controls

- `WASD` / arrow keys: drive and steer
- `Space`: handbrake
- `C`: change camera
- `M`: city map
- `R`: recover when nearly stationary
- `F2`: toggle clear/rain weather
- `Esc`: pause

## Features

- Continuous Dhaka-inspired district with procedural windowed facades plus audited CC0 GLB landmarks, roadside props, vegetation and vehicles.
- Rapier fixed-step collisions with a deterministic realistic acceleration/braking model, off-road traction, anti-stuck recovery, chase/cockpit cameras and quality presets.
- Complete ride offer, pickup, boarding, destination, scoring and reward loop.
- Idempotent economy ledger, fuel, repairs, upgrades, XP and reputation.
- Versioned IndexedDB saves with local backup.
- English and Bangla locale data.
- Day/night and monsoon rain systems, ambient traffic and signal-ready lane layout.
- Colyseus authoritative private rooms for 3–4 players with validated reward transaction IDs.
- Tauri 2 Windows wrapper manifests.

## Multiplayer

Run `npm run server`, open Multiplayer, create a room and share its room code. Up to four clients can join. The server rejects implausible teleport updates and duplicate/invalid ride rewards.

## Desktop build

The wrapper source is under `src-tauri`. Install the current Rust toolchain and Tauri CLI, then run:

```powershell
npm install --save-dev @tauri-apps/cli
npx tauri dev
npx tauri build
```

Rust/Cargo was not installed on the original development machine, so the Windows installer could not be produced there. Steamworks remains a partner-account integration and is intentionally not faked.

## Project structure

- `src/core` — Three.js/Rapier simulation
- `src/rides`, `src/economy`, `src/save` — testable game rules
- `src/ui`, `src/state`, `src/localization` — interface and player state
- `src/multiplayer`, `server` — Colyseus client/server
- `tests` — unit and browser smoke tests
- `docs` — decisions, performance, licensing and limitations

See `THIRD_PARTY_NOTICES.md` and `docs/ASSET_LICENSES.md` for licensing.
