# Vehicle Tuning

The original prototype applied raw force directly to a heavy chassis and countered lateral motion with another force. It could hit its speed cap too quickly and lose effective drive force when wedged against off-road geometry.

The current controller uses:

- 3.1 m/s² base road acceleration (approximately nine seconds from 0–100 km/h);
- 7.5 m/s² base braking, improved by brake upgrades;
- 31 m/s base forward cap and 8 m/s reverse cap;
- 12.5 m/s off-road cap with reduced grip but working acceleration;
- speed-sensitive steering and reduced wet-road/off-road grip;
- deterministic coasting and handbrake deceleration;
- automatic nearest-road recovery after a sustained blocked throttle;
- manual nearest-road recovery with `R` below 18 km/h.

These values target believable urban driving rather than motorsport simulation.
