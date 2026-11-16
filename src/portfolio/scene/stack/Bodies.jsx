import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { motionStore } from '../../motion/store';
import { EMBER, seeded } from './config';
import { createBodies, step } from './physics';

const COUNT = { high: 16, low: 10 };
const POINTER_RADIUS = 1.35;

// glossy pieces in the site's colours: ember, bone, ink and a hot one that the bloom picks up
const TONES = {
  dark: ['#ff5b2e', '#ece6da', '#24272d', '#ff7a4a'],
  light: ['#ff5b2e', '#17140f', '#ece6da', '#ff7a4a'],
};

const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const hit = new THREE.Vector3();
const tmp = new THREE.Object3D();
const axis = new THREE.Vector3();
const spin = new THREE.Quaternion();

/**
 * Glossy spheres and capsules floating round the stack. The pointer pushes them (the canvas takes no
 * pointer events, so the window's pointer is projected onto the scene), they knock into each other and
 * into the stack, and a click on the hero throws them outwards. They drift wider as the hero scrolls away.
 */
export default function Bodies({ theme, quality, getInput, getBurst }) {
  const { camera, gl } = useThree();
  const count = COUNT[quality] ?? COUNT.low;
  const bodies = useMemo(() => createBodies(count, seeded(42)), [count]);
  // on capable machines the pale and dark capsules are glass instead: clear, refracting what is behind them
  const glassy = quality === 'high';
  const isGlass = (b) => glassy && b.kind === 'capsule' && (b.tone === 1 || b.tone === 2);
  const spheres = useMemo(() => bodies.filter((b) => b.kind === 'sphere'), [bodies]);
  const capsules = useMemo(() => bodies.filter((b) => b.kind === 'capsule' && !isGlass(b)), [bodies, glassy]); // eslint-disable-line react-hooks/exhaustive-deps
  const glass = useMemo(() => bodies.filter(isGlass), [bodies, glassy]); // eslint-disable-line react-hooks/exhaustive-deps
  const turns = useMemo(() => bodies.map(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, 0))), [bodies]);
  const sphereMesh = useRef();
  const capsuleMesh = useRef();
  const glassMesh = useRef();
  const lastBurst = useRef(getBurst());
  const homes = useMemo(() => bodies.map((b) => [b.hx, b.hy, b.hz]), [bodies]);

  // colours are set once per theme: instanceColor multiplies the material's white
  useEffect(() => {
    const tones = TONES[theme] ?? TONES.dark;
    const color = new THREE.Color();
    [
      [sphereMesh.current, spheres],
      [capsuleMesh.current, capsules],
    ].forEach(([mesh, list]) => {
      if (!mesh) return;
      list.forEach((b, i) => {
        color.set(tones[b.tone]);
        if (b.tone === 3) color.copy(EMBER).multiplyScalar(2.2); // the hot one glows under the bloom
        mesh.setColorAt(i, color);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [theme, spheres, capsules]);

  useFrame(({ clock }, delta) => {
    const input = getInput();
    const s = Math.min(1, Math.max(0, input.scroll ?? 0));
    bodies.forEach((b, i) => {
      const spread = 1 + s * 0.9;
      b.hx = homes[i][0] * spread;
      b.hy = homes[i][1] * spread + s * 1.4;
      b.hz = homes[i][2];
    });

    // where the window's pointer lands on the z = 0 plane through the stack
    let pointer = null;
    const rect = gl.domElement.getBoundingClientRect();
    const px = motionStore.pointerX * window.innerWidth;
    const py = motionStore.pointerY * window.innerHeight;
    if (rect.width > 0 && px >= rect.left - 80 && px <= rect.right + 80 && py >= rect.top && py <= rect.bottom) {
      ndc.set(((px - rect.left) / rect.width) * 2 - 1, -((py - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) pointer = { x: hit.x, y: hit.y, z: 0, radius: POINTER_RADIUS };
    }

    const burst = getBurst();
    const kick = burst !== lastBurst.current;
    lastBurst.current = burst;
    step(bodies, delta, { pointer, core: 2.25, time: clock.elapsedTime, kick });

    const write = (mesh, list) => {
      if (!mesh) return;
      list.forEach((b, i) => {
        const q = turns[bodies.indexOf(b)];
        // roll with the motion: turn about the axis across the velocity, plus a slow idle turn
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > 1e-3) {
          axis.set(-b.vy, b.vx, 0).normalize();
          q.premultiply(spin.setFromAxisAngle(axis, (speed * delta) / b.r));
        }
        q.premultiply(spin.setFromAxisAngle(axis.set(0.3, 1, 0).normalize(), delta * 0.2));
        tmp.position.set(b.x, b.y, b.z);
        tmp.quaternion.copy(q);
        tmp.scale.setScalar(b.r);
        tmp.updateMatrix();
        mesh.setMatrixAt(i, tmp.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    write(sphereMesh.current, spheres);
    write(capsuleMesh.current, capsules);
    write(glassMesh.current, glass);
  });

  const material = (
    <meshPhysicalMaterial roughness={0.22} metalness={0.05} clearcoat={1} clearcoatRoughness={0.15} envMapIntensity={1.4} />
  );

  return (
    <group>
      <instancedMesh ref={sphereMesh} args={[undefined, undefined, spheres.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 32, 20]} />
        {material}
      </instancedMesh>
      {/* a capsule of radius 1 and body 1.4, scaled to the body's radius like the spheres */}
      <instancedMesh ref={capsuleMesh} args={[undefined, undefined, capsules.length]} frustumCulled={false}>
        <capsuleGeometry args={[0.62, 0.9, 8, 20]} />
        {material}
      </instancedMesh>
      {glass.length > 0 && (
        <instancedMesh ref={glassMesh} args={[undefined, undefined, glass.length]} frustumCulled={false}>
          <capsuleGeometry args={[0.62, 0.9, 8, 24]} />
          <meshPhysicalMaterial
            transmission={1}
            thickness={0.9}
            roughness={0.04}
            ior={1.45}
            iridescence={0.6}
            iridescenceIOR={1.3}
            clearcoat={1}
            attenuationColor="#ff9a6e"
            attenuationDistance={2.2}
            envMapIntensity={1.6}
          />
        </instancedMesh>
      )}
    </group>
  );
}
