# Asset and Dependency Licenses

Retrieval date: 2026-11-11.

The upgraded build combines project-generated geometry with selected CC0 GLB models from the Low Poly City Kit. The original CC0 license text is shipped beside the models at `public/assets/cc0-city/LICENSE-CC0.txt`.

| Asset pack | Source | License | Files used |
|---|---|---|---|
| Low Poly City Kit | https://github.com/kayquer/kit-cidade-lowpoly | CC0 1.0 | Generic car, taxi, bus, hospital, university, school, hotel, shopping, office, market, restaurant, corner shop, garage, residential buildings, tree, shrubs, streetlight, traffic light, bus stop and bench GLBs |

The CC0 models were copied without geometry modification, then normalized, scaled, shadow-enabled and placed at runtime by `AssetLibrary`.

Runtime libraries:

| Resource | Source | License | Use |
|---|---|---|---|
| Three.js | https://github.com/mrdoob/three.js | MIT | Rendering |
| Rapier | https://github.com/dimforge/rapier | Apache-2.0 | Physics |
| React | https://github.com/facebook/react | MIT | DOM UI |
| Zustand | https://github.com/pmndrs/zustand | MIT | UI state |
| Colyseus | https://github.com/colyseus/colyseus | MIT | Multiplayer server |

No OpenStreetMap data, trademarked vehicle, downloaded music or remote runtime asset is included in this build.
