import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const FONT = '500 30px "Geist Mono", ui-monospace, Menlo, monospace';

/** A label drawn onto a small canvas texture: cheap to draw (one sprite each) and crisp at this size. */
const makeLabel = (text, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = FONT;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 4, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: Math.min(canvas.width, ctx.measureText(text).width + 12) / canvas.height };
};

/**
 * Technology names orbiting the stack like a halo. Labels in front of the stack are bright, those behind
 * fade, and the whole ring spins faster as the page is scrolled.
 *   items    the words to show
 *   radius   orbit radius; height the vertical spread; y the centre height
 */
export default function Halo({ items, color, radius = 2.7, height = 3.4, y = 0, speed = 0.18, getBoost = () => 0 }) {
  const [ready, setReady] = useState(false);
  const sprites = useRef([]);
  const spin = useRef(0);

  // the label font must be loaded before it is drawn, or the canvas silently uses a fallback
  useEffect(() => {
    let live = true;
    (document.fonts?.load(FONT) ?? Promise.resolve()).finally(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);

  const labels = useMemo(() => (ready ? items.map((text) => makeLabel(text, color)) : []), [ready, items, color]);
  useEffect(() => () => labels.forEach(({ texture }) => texture.dispose()), [labels]);

  useFrame((_, delta) => {
    spin.current += delta * (speed + Math.min(0.9, Math.abs(getBoost()) * 0.05));
    labels.forEach((label, i) => {
      const sprite = sprites.current[i];
      if (!sprite) return;
      const a = spin.current + (i / labels.length) * Math.PI * 2;
      const front = Math.sin(a) * 0.5 + 0.5; // 1 = nearest the camera
      sprite.position.set(Math.cos(a) * radius, y + (i / labels.length - 0.5) * height + Math.sin(a * 2 + i) * 0.06, Math.sin(a) * radius * 0.6);
      sprite.material.opacity = 0.08 + front * 0.62;
      const grow = 0.7 + front * 0.25;
      sprite.scale.set(0.2 * label.aspect * 3.2 * grow, 0.2 * grow, 1);
    });
  });

  return (
    <group>
      {labels.map((label, i) => (
        <sprite key={`${items[i]}-${i}`} ref={(el) => (sprites.current[i] = el)}>
          <spriteMaterial map={label.texture} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}
