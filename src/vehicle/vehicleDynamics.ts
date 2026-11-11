export interface DriveStepOptions {
  throttle: number;
  handbrake: boolean;
  dt: number;
  onRoad: boolean;
  engineLevel: number;
  brakeLevel: number;
  hasFuel: boolean;
}

function moveToward(current: number, target: number, delta: number) {
  if (current < target) return Math.min(target, current + delta);
  if (current > target) return Math.max(target, current - delta);
  return target;
}

export function stepDriveSpeed(current: number, options: DriveStepOptions) {
  const { throttle, handbrake, dt, onRoad, engineLevel, brakeLevel, hasFuel } = options;
  const maxForward = onRoad ? 31 + engineLevel * 2 : 12.5;
  const maxReverse = onRoad ? 8 : 5;
  const acceleration = (onRoad ? 3.1 : 2.25) * (1 + engineLevel * 0.1) * (hasFuel ? 1 : 0);
  const braking = 7.5 * (1 + brakeLevel * 0.12);
  let next = current;
  if (throttle > 0) next = moveToward(next, maxForward, acceleration * dt);
  else if (throttle < 0) next = moveToward(next, -maxReverse, (next > 0 ? braking : 2.6) * dt);
  else next = moveToward(next, 0, (onRoad ? 0.75 : 1.8) * dt);
  if (handbrake) next = moveToward(next, 0, 12 * dt);
  return next;
}
