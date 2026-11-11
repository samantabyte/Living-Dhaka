# Asset and Dependency Licenses

Retrieval date: 2026-11-11.

The upgraded build combines project-generated geometry with selected CC0 GLB models from the Low Poly City Kit. The original CC0 license text is shipped beside the models at `public/assets/cc0-city/LICENSE-CC0.txt`.

| Asset pack | Source | License | Files used |
|---|---|---|---|
| Low Poly City Kit | https://github.com/kayquer/kit-cidade-lowpoly | CC0 1.0 | Generic car, taxi, bus, hospital, university, school, hotel, shopping, office, market, restaurant, corner shop, garage, residential buildings, tree, shrubs, streetlight, traffic light, bus stop and bench GLBs |
| FPS Buildings Environment Kit / ambientCG | https://github.com/petroulacl/fps-buildings-env-kit | CC0 1.0 | Asphalt021, Concrete012 and Grass004 2K color, OpenGL normal and roughness maps |
| FPS Buildings Environment Kit / Poly Haven | https://github.com/petroulacl/fps-buildings-env-kit | CC0 1.0 | urban_street_01 2K HDR environment map |

The CC0 models were copied without geometry modification, then normalized, scaled, shadow-enabled and placed at runtime by `AssetLibrary`. PBR maps are loaded locally at runtime; the game does not depend on a remote asset CDN.

Runtime libraries:

| Resource | Source | License | Use |
|---|---|---|---|
| Three.js | https://github.com/mrdoob/three.js | MIT | Rendering |
| Rapier | https://github.com/dimforge/rapier | Apache-2.0 | Physics |
| React | https://github.com/facebook/react | MIT | DOM UI |
| Zustand | https://github.com/pmndrs/zustand | MIT | UI state |
| Colyseus | https://github.com/colyseus/colyseus | MIT | Multiplayer server |

No OpenStreetMap data, trademarked vehicle, downloaded music or remote runtime asset is included in this build.
