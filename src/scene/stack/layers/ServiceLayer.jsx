import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOT, TOP, seeded } from '../config';

// Service: a small network. Requests (bright pulses) hop along its links, and a node pops when one arrives.
const PULSES = 9;

const buildGraph = () => {
  const nodes = [new THREE.Vector3(0, 0, 0)];
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    nodes.push(new THREE.Vector3(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.5));
  }
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    nodes.push(new THREE.Vector3(Math.cos(a) * 1.3, 0, Math.sin(a) * 0.88));
  }
  const links = new Set();
  const add = (a, b) => links.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  for (let i = 1; i <= 6; i += 1) {
    add(0, i);
    add(i, i === 6 ? 1 : i + 1);
  }
  // each outer node links to the two nearest inner nodes
  for (let o = 7; o < nodes.length; o += 1) {
    nodes
      .slice(1, 7)
      .map((n, k) => [n.distanceTo(nodes[o]), k + 1])
      .sort((a, b) => a[0] - b[0])
      .slice(0, 2)
      .forEach(([, k]) => add(k, o));
  }
  const edges = [...links].map((key) => key.split('-').map(Number));
  return { nodes, edges };
};

export default function ServiceLayer({ palette }) {
  const nodeMesh = useRef();
  const pulseMesh = useRef();
  const graph = useMemo(buildGraph, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pop = useMemo(() => new Float32Array(graph.nodes.length), [graph]);
  const pulses = useMemo(() => {
    const rand = seeded(7);
    return Array.from({ length: PULSES }, () => ({ edge: Math.floor(rand() * graph.edges.length), t: rand(), speed: 0.5 + rand() * 0.7, dir: 1 }));
  }, [graph]);

  const lineGeometry = useMemo(() => {
    const points = graph.edges.flatMap(([a, b]) => [graph.nodes[a], graph.nodes[b]]);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [graph]);

  useFrame((_, delta) => {
    graph.nodes.forEach((p, i) => {
      pop[i] = Math.max(0, pop[i] - delta * 2.2);
      dummy.position.copy(p).setY(0.06);
      dummy.scale.setScalar(1 + pop[i] * 1.6);
      dummy.updateMatrix();
      nodeMesh.current.setMatrixAt(i, dummy.matrix);
    });
    nodeMesh.current.instanceMatrix.needsUpdate = true;

    pulses.forEach((pulse, i) => {
      pulse.t += delta * pulse.speed * pulse.dir;
      const [a, b] = graph.edges[pulse.edge];
      if (pulse.t >= 1 || pulse.t <= 0) {
        // arrived: pop the node, then continue along a random link from there
        const at = pulse.t >= 1 ? b : a;
        pop[at] = 1;
        const options = graph.edges.map((e, k) => [e, k]).filter(([e]) => e[0] === at || e[1] === at);
        const [nextEdge, k] = options[Math.floor(Math.random() * options.length)];
        pulse.edge = k;
        pulse.dir = nextEdge[0] === at ? 1 : -1;
        pulse.t = pulse.dir === 1 ? 0 : 1;
      }
      dummy.position.lerpVectors(graph.nodes[a], graph.nodes[b], pulse.t).setY(0.075);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      pulseMesh.current.setMatrixAt(i, dummy.matrix);
    });
    pulseMesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[0, TOP, 0]}>
      <lineSegments geometry={lineGeometry} position={[0, 0.04, 0]}>
        <lineBasicMaterial color="#ff7a4a" transparent opacity={0.4} />
      </lineSegments>
      <instancedMesh ref={nodeMesh} args={[undefined, undefined, graph.nodes.length]} frustumCulled={false}>
        <sphereGeometry args={[0.05, 12, 10]} />
        <meshBasicMaterial color={palette.bone} />
      </instancedMesh>
      <instancedMesh ref={pulseMesh} args={[undefined, undefined, PULSES]} frustumCulled={false}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshBasicMaterial color={HOT} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
