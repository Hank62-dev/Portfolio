import { useEffect, useRef } from 'react';
import { getAnalyser, player } from './player';
import { useStore } from '../store';

const BARS = 48;

/**
 * Bars drawn from the music itself (the audio is analysed in the browser; nothing is simulated). It draws
 * only while a track is playing and the canvas is on screen, and rests at a flat line otherwise.
 */
export default function Visualizer({ className, height = 96 }) {
  const canvas = useRef(null);
  const playing = useStore(player, (s) => s.playing);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return undefined;
    const ctx = el.getContext('2d');
    const data = new Uint8Array(128);
    let frame = 0;
    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(el);

    const style = getComputedStyle(document.documentElement);
    const signal = style.getPropertyValue('--color-signal').trim() || '#ff5b2e';
    const dim = style.getPropertyValue('--color-line-strong').trim() || 'rgba(236,230,218,0.22)';

    const draw = () => {
      frame = requestAnimationFrame(draw);
      if (!visible) return;
      const { width, height: h } = el;
      ctx.clearRect(0, 0, width, h);
      const analyser = playing ? getAnalyser() : null;
      if (analyser) analyser.getByteFrequencyData(data);
      const gap = 3 * (window.devicePixelRatio || 1);
      const bar = (width - gap * (BARS - 1)) / BARS;
      for (let i = 0; i < BARS; i += 1) {
        // the lower two thirds of the spectrum is where music lives
        const level = analyser ? data[Math.floor((i / BARS) * 86)] / 255 : 0;
        const barHeight = Math.max(2, level ** 1.4 * h);
        ctx.fillStyle = level > 0.02 ? signal : dim;
        ctx.fillRect(i * (bar + gap), h - barHeight, bar, barHeight);
      }
      if (!playing) cancelAnimationFrame(frame);
    };
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      el.width = el.clientWidth * ratio;
      el.height = el.clientHeight * ratio;
    };
    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [playing]);

  return <canvas ref={canvas} className={className} style={{ width: '100%', height }} aria-hidden="true" />;
}
