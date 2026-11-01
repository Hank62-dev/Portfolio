import { useEffect, useRef } from 'react';
import { getAnalyser, player } from './player';
import { useStore } from '../store';

const BARS = 84;

/**
 * The music as a halo: bars grow outward from a circle in time with the sound (the audio is analysed in the browser).
 * Paused, it breathes very slowly instead. It draws only while it is on screen.
 */
export default function RadialVisualizer({ className, tint = '255 91 46' }) {
  const canvas = useRef(null);
  const playing = useStore(player, (s) => s.playing);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return undefined;
    const ctx = el.getContext('2d');
    const data = new Uint8Array(128);
    const smooth = new Float32Array(BARS);
    let frame = 0;
    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(el);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      el.width = el.clientWidth * ratio;
      el.height = el.clientHeight * ratio;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (time) => {
      frame = requestAnimationFrame(draw);
      if (!visible) return;
      const { width, height } = el;
      const cx = width / 2;
      const cy = height / 2;
      const inner = Math.min(width, height) * 0.36;
      const reach = Math.min(width, height) * 0.14;
      ctx.clearRect(0, 0, width, height);
      const analyser = playing ? getAnalyser() : null;
      if (analyser) analyser.getByteFrequencyData(data);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, (Math.PI * 2 * inner) / BARS / 2.2);
      for (let i = 0; i < BARS; i += 1) {
        // mirror the spectrum so the halo is symmetrical, and keep to the part of it that holds music
        const k = i < BARS / 2 ? i : BARS - 1 - i;
        const target = analyser ? (data[Math.floor((k / (BARS / 2)) * 72)] / 255) ** 1.5 : reduce ? 0.04 : 0.05 + 0.035 * Math.sin(time / 1400 + i * 0.35);
        smooth[i] += (target - smooth[i]) * 0.22;
        const angle = (i / BARS) * Math.PI * 2 - Math.PI / 2;
        const length = 4 + smooth[i] * reach;
        const x1 = cx + Math.cos(angle) * inner;
        const y1 = cy + Math.sin(angle) * inner;
        const x2 = cx + Math.cos(angle) * (inner + length);
        const y2 = cy + Math.sin(angle) * (inner + length);
        ctx.strokeStyle = `rgb(${tint} / ${0.28 + smooth[i] * 0.72})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [playing, tint]);

  return <canvas ref={canvas} className={className} aria-hidden="true" />;
}
