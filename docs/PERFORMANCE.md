# Performance Notes

Quality presets control pixel ratio, shadows, rain count and traffic population. The production build emits a 5.34 MB JavaScript/WASM chunk (1.93 MB gzip), dominated by embedded Rapier WebAssembly. Selected CC0 GLBs add under 1.2 MB of cacheable static assets and are loaded in parallel. The visible browser run was responsive at the default medium preset; exact FPS telemetry should be recorded on each release target machine.
