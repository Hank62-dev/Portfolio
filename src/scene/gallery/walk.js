// Keyboard (and on-screen button) walking. A module-level object, read every frame by the camera rig:
// going through React state would re-render on each key press for no reason.

const FORWARD = ['KeyW', 'ArrowUp'];
const BACK = ['KeyS', 'ArrowDown'];
const LEFT = ['KeyA'];
const RIGHT = ['KeyD'];
const TURN_LEFT = ['ArrowLeft', 'KeyQ'];
const TURN_RIGHT = ['ArrowRight', 'KeyE'];
const RUN = ['ShiftLeft', 'ShiftRight'];

export const WALK_KEYS = [...FORWARD, ...BACK, ...LEFT, ...RIGHT, ...TURN_LEFT, ...TURN_RIGHT, ...RUN];

const axis = (down, plus, minus) => (plus.some((k) => down.has(k)) ? 1 : 0) - (minus.some((k) => down.has(k)) ? 1 : 0);

/** What a set of held keys asks for: each axis in -1..1 (forward, sideways to the right, turning right). */
export const moveFromKeys = (down) => ({
  forward: axis(down, FORWARD, BACK),
  strafe: axis(down, RIGHT, LEFT),
  turn: axis(down, TURN_RIGHT, TURN_LEFT),
  run: RUN.some((k) => down.has(k)),
});

const held = new Set();
export const walk = { forward: 0, strafe: 0, turn: 0, run: false };

/** Records a key going down or up and refreshes `walk`. */
export const setKey = (code, isDown) => {
  if (isDown) held.add(code);
  else held.delete(code);
  Object.assign(walk, moveFromKeys(held));
};

/** Lets go of everything (when the hall loses focus, so a key never "sticks"). */
export const releaseAll = () => {
  held.clear();
  Object.assign(walk, moveFromKeys(held));
};

/**
 * One step of walking on the floor plane for a camera facing `yaw`: forward is along the view direction,
 * strafe to its right. Returns the new [x, z]; `speed` is in metres per second.
 */
export const stepWalk = ([x, z], yaw, { forward, strafe }, speed, dt) => {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  // diagonal movement is no faster than straight
  const norm = Math.hypot(forward, strafe) || 1;
  const scale = (speed * dt) / Math.max(1, norm);
  return [x + (fx * forward + rx * strafe) * scale, z + (fz * forward + rz * strafe) * scale];
};
