# Performance Notes

Quality presets control pixel ratio, shadows, rain count and traffic population. The production build emits a 5.25 MB JavaScript/WASM chunk (1.91 MB gzip), dominated by embedded Rapier WebAssembly. This avoids a second WASM network request but is a known cold-load cost. The visible browser run was responsive at the default medium preset; exact FPS telemetry should be recorded on each release target machine.
