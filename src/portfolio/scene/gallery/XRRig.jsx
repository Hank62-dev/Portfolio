import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { TeleportTarget, XROrigin, useXRControllerLocomotion } from '@react-three/xr';
import { HUB, NAVE, NAVE_START, PLAZA_RADIUS, constrain } from './layout';

/**
 * Moving about inside a headset: the thumbstick walks (and snap-turns), and pointing a controller at the
 * floor and squeezing teleports you there. The origin is where your feet are, so the headset's own tracking
 * works relative to it; it is kept inside the building each frame, and choosing a frame (`target`) puts you
 * in front of it.
 */
export default function XRRig({ length, target }) {
  const origin = useRef(null);
  useXRControllerLocomotion(origin, { speed: 2.4 }, { type: 'snap', degrees: 45 });

  useFrame(() => {
    const o = origin.current;
    if (!o) return;
    const [x, z] = constrain(o.position.x, o.position.z, length);
    o.position.x = x;
    o.position.z = z;
  });

  useEffect(() => {
    const o = origin.current;
    if (!o || !target) return;
    o.position.set(target.position[0], 0, target.position[2]);
    o.rotation.y = target.yaw;
  }, [target]);

  const place = (point) => origin.current?.position.set(point.x, 0, point.z);
  const naveSpan = length + NAVE_START - 0.8;

  return (
    <>
      {/* start on the plaza, facing down the nave */}
      <XROrigin ref={origin} position={[HUB.position[0], 0, HUB.position[2]]} />
      <TeleportTarget onTeleport={place}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} visible={false}>
          <circleGeometry args={[PLAZA_RADIUS - 0.4, 48]} />
          <meshBasicMaterial />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, NAVE_START - naveSpan / 2]} visible={false}>
          <planeGeometry args={[NAVE.halfWidth * 2 - 0.8, naveSpan]} />
          <meshBasicMaterial />
        </mesh>
      </TeleportTarget>
    </>
  );
}
