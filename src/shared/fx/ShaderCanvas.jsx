import { useEffect, useRef, useState } from 'react';
import { canGL, fxDpr } from './gate';
import { createShader } from './shader';

/**
 * A fragment shader as an element: it fills its parent (put it in a positioned box) and draws `fragment` there.
 * `uniforms(time, dt)` is asked for the values of each frame (read refs in it, not state, so it never re-renders).
 * It draws frames only while `running`, while it is on screen and while the page is visible, and at most `fps` a second;
 * when it stops it keeps its last frame. `scale` draws it at a fraction of the screen's pixels (a soft picture needs fewer).
 * Where a shader cannot run (no WebGL, less motion asked for, a weak device) it renders `fallback` instead.
 */
export default function ShaderCanvas({ fragment, uniforms, running = true, fps = 60, scale = 1, className = '', fallback = null, onReady }) {
  const canvas = useRef(null);
  const [ok, setOk] = useState(() => canGL());
  const read = useRef(uniforms);
  read.current = uniforms;
  const live = useRef(running);
  live.current = running;
  const wake = useRef(() => {});

  useEffect(() => {
    if (!ok) return undefined;
    // a canvas of its own each time: a context that was let go cannot be had again from the same element
    const el = document.createElement('canvas');
    el.className = 'absolute inset-0 size-full';
    canvas.current?.appendChild(el);
    const shader = createShader(el, fragment);
    if (!shader) {
      el.remove();
      setOk(false);
      return undefined;
    }
    onReady?.();
    let raf = 0;
    let visible = true;
    let last = 0;
    let prev = performance.now();
    const start = prev;
    const size = () => {
      const r = el.getBoundingClientRect();
      const dpr = fxDpr() * scale;
      el.width = Math.max(1, Math.round(r.width * dpr));
      el.height = Math.max(1, Math.round(r.height * dpr));
    };
    const paint = (now) => {
      const t = (now - start) / 1000;
      shader.draw(read.current?.(t, Math.min(0.05, (now - prev) / 1000)) ?? {}, t);
      prev = now;
    };
    const frame = (now) => {
      raf = 0;
      if (!visible || document.hidden || !live.current) return;
      if (now - last >= 1000 / fps - 2) {
        last = now;
        paint(now);
      }
      raf = requestAnimationFrame(frame);
    };
    const go = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    wake.current = go;
    size();
    paint(performance.now());
    const ro = new ResizeObserver(() => {
      size();
      paint(performance.now());
    });
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) go();
    });
    io.observe(el);
    const onVisibility = () => !document.hidden && go();
    document.addEventListener('visibilitychange', onVisibility);
    go();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      wake.current = () => {};
      shader.dispose();
      el.remove();
    };
  }, [ok, fragment, fps, scale, onReady]);

  useEffect(() => {
    if (running) wake.current();
  }, [running]);

  if (!ok) return fallback;
  return <div ref={canvas} aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} />;
}
