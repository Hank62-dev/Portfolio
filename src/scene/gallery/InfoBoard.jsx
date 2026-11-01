import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FRAME_SIZE } from './layout';
import { makeBoardTexture } from './textures';

const [W] = FRAME_SIZE;
const BOARD = [1.5, 1.612]; // matches the texture's 1024 x 1100

/**
 * The reading board that stands beside the frame being looked at: name, what it is, a short summary and
 * its stack. It is the in-world version of the page's text (inside a headset there is no page), and it
 * grows in when a frame is chosen.
 */
export default function InfoBoard({ slot, details, hint }) {
  const visible = Boolean(slot);
  const group = useRef();
  const grow = useRef(0);

  const info = slot ? details[slot.index] : null;
  const texture = useMemo(() => (info ? makeBoardTexture({ ...info, hint }) : null), [info, hint]);
  useEffect(() => () => texture?.dispose(), [texture]);

  useFrame((_, delta) => {
    grow.current += ((visible ? 1 : 0) - grow.current) * Math.min(1, delta * 6);
    if (group.current) group.current.scale.setScalar(Math.max(0.0001, grow.current));
  });

  if (!slot || !texture) return null;
  return (
    <group position={slot.position} rotation={[0, slot.yaw, 0]}>
      <group ref={group} position={[W / 2 + 1.0, -0.1, 0.12]}>
        <mesh>
          <planeGeometry args={BOARD} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
