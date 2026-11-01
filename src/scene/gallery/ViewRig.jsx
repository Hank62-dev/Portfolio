import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { EYE, HUB, clampPitch, constrain, shortestTurn } from './layout';
import { stepWalk, walk } from './walk';

const LOOK_SPEED = { yaw: 0.0046, pitch: 0.0036 };
const FOV = { min: 48, max: 86 };
const SPEED = { walk: 2.2, run: 4.2 }; // metres per second
const TURN_RATE = 1.7; // radians per second on the arrow / Q E keys
const GLIDE_MIN_SPEED = 5; // metres per second
const NEAR = 3.6; // how close to a frame counts as "at" it

/**
 * The camera when there is no headset. Until the visitor takes over it stays at the plaza and sways slowly,
 * so the section reads as a live preview. Once `interactive` they walk: W A S D (or the arrows) move, the
 * arrows / Q E turn, Shift runs, dragging looks around, the wheel zooms. Walking stays inside the building,
 * and a head bob follows the steps. Choosing a frame (`target`) glides the camera up to it; touching any
 * control hands the camera straight back. As the visitor nears a frame it is reported through `onNear`, so
 * the reading board and caption follow where they are rather than where they were sent. Inside a headset the
 * headset owns the camera and this does nothing.
 */
export default function ViewRig({ target, interactive, autoPan, slots, length, onNear }) {
  const { camera, gl } = useThree();
  const inXR = useXR((state) => Boolean(state.session));
  const me = useRef({
    x: HUB.position[0],
    z: HUB.position[2],
    yaw: HUB.yaw,
    pitch: 0,
    bob: 0,
    drag: null,
    glide: null,
    near: -2,
    sinceNear: 0,
  });

  // a new destination: glide there, looking straight at it
  useEffect(() => {
    if (!target) return;
    me.current.glide = { x: target.position[0], z: target.position[2], yaw: target.yaw };
  }, [target]);

  useEffect(() => {
    if (!interactive) return undefined;
    const el = gl.domElement;
    const previousTouchAction = el.style.touchAction;
    el.style.touchAction = 'none'; // so a swipe looks around instead of scrolling the page

    const down = (e) => {
      me.current.drag = { x: e.clientX, y: e.clientY };
    };
    const move = (e) => {
      const m = me.current;
      if (!m.drag) return;
      const dx = e.clientX - m.drag.x;
      const dy = e.clientY - m.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 0) m.glide = null; // looking around by hand takes over
      m.yaw += dx * LOOK_SPEED.yaw;
      m.pitch = clampPitch(m.pitch + dy * LOOK_SPEED.pitch);
      m.drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => {
      me.current.drag = null;
    };
    const wheel = (e) => {
      e.preventDefault();
      camera.fov = Math.min(FOV.max, Math.max(FOV.min, camera.fov + e.deltaY * 0.03));
      camera.updateProjectionMatrix();
    };

    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.style.touchAction = previousTouchAction;
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [camera, gl, interactive]);

  useFrame(({ clock }, delta) => {
    if (inXR) return;
    const m = me.current;
    const dt = Math.min(delta, 0.1);

    if (!interactive || autoPan) {
      if (m.glide) {
        // the exhibition was closed: go straight back to where the preview sways
        [m.x, m.z, m.yaw, m.pitch] = [m.glide.x, m.glide.z, m.glide.yaw, 0];
        m.glide = null;
      }
      const t = clock.elapsedTime;
      camera.position.set(m.x, EYE, m.z);
      camera.rotation.set(clampPitch(Math.sin(t * 0.21) * 0.05), m.yaw + (autoPan ? Math.sin(t * 0.13) * 1.15 : 0), 0, 'YXZ');
      return;
    }

    const moving = walk.forward !== 0 || walk.strafe !== 0;
    if (moving || walk.turn !== 0) m.glide = null;

    if (m.glide) {
      const g = m.glide;
      const k = 1 - Math.exp(-delta * 3.2); // ease out, whatever the frame rate
      const dx = g.x - m.x;
      const dz = g.z - m.z;
      const dist = Math.hypot(dx, dz);
      // never slower than a brisk walk, so a long way across the gallery still arrives
      const move = dist > 0 ? Math.min(dist, Math.max(dist * k, GLIDE_MIN_SPEED * delta)) / dist : 0;
      m.x += dx * move;
      m.z += dz * move;
      m.yaw += shortestTurn(m.yaw, g.yaw) * k;
      m.pitch += (0 - m.pitch) * k;
      if (dist < 0.02 && Math.abs(shortestTurn(m.yaw, g.yaw)) < 0.01) m.glide = null;
    } else {
      m.yaw -= walk.turn * TURN_RATE * dt;
      if (moving) {
        const speed = walk.run ? SPEED.run : SPEED.walk;
        const [x, z] = stepWalk([m.x, m.z], m.yaw, walk, speed, dt);
        [m.x, m.z] = constrain(x, z, length);
        m.bob += dt * speed * 2.6;
      }
    }

    camera.position.set(m.x, EYE + (moving ? Math.sin(m.bob) * 0.022 : 0), m.z);
    camera.rotation.set(m.pitch, m.yaw, 0, 'YXZ');

    // which frame the visitor is standing at (the plaza counts as none), reported when it changes
    m.sinceNear += dt;
    if (m.sinceNear > 0.15) {
      m.sinceNear = 0;
      gl.domElement.dataset.at = `${m.x.toFixed(2)},${m.z.toFixed(2)},${m.yaw.toFixed(2)}`; // where the visitor is, for tests and debugging
      if (m.glide) return;
      let nearest = -1;
      let best = NEAR;
      slots.forEach((slot) => {
        const d = Math.hypot(slot.position[0] - m.x, slot.position[2] - m.z);
        if (d < best) {
          best = d;
          nearest = slot.index;
        }
      });
      const inPlaza = Math.hypot(m.x, m.z) < 4.6;
      const report = nearest >= 0 ? nearest : inPlaza ? -1 : -2;
      if (report !== m.near) {
        m.near = report;
        onNear?.(report);
      }
    }
  });

  return null;
}
