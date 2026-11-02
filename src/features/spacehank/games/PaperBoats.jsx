import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '../../../design-system';
import { Result, Stat, useBest } from './shared';

const W = 360;
const H = 480;

/** Draws a folded paper boat with its bottom at (0, 0) and its width `s`. */
const drawBoat = (ctx, s, tilt) => {
  ctx.save();
  ctx.rotate(tilt);
  // hull
  ctx.fillStyle = '#efe6d2';
  ctx.beginPath();
  ctx.moveTo(-s / 2, -s * 0.28);
  ctx.lineTo(s / 2, -s * 0.28);
  ctx.lineTo(s * 0.32, 0);
  ctx.lineTo(-s * 0.32, 0);
  ctx.closePath();
  ctx.fill();
  // the two sails, one lighter
  ctx.fillStyle = '#fbf6ea';
  ctx.beginPath();
  ctx.moveTo(-s * 0.36, -s * 0.28);
  ctx.lineTo(0, -s * 0.95);
  ctx.lineTo(0, -s * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9cdb2';
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.28);
  ctx.lineTo(0, -s * 0.95);
  ctx.lineTo(s * 0.36, -s * 0.28);
  ctx.closePath();
  ctx.fill();
  // the folds
  ctx.strokeStyle = 'rgb(120 100 70 / 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-s * 0.18, -s * 0.28);
  ctx.lineTo(-s * 0.1, 0);
  ctx.moveTo(s * 0.18, -s * 0.28);
  ctx.lineTo(s * 0.1, 0);
  ctx.stroke();
  ctx.restore();
};

/**
 * Bắn tàu giấy: paper boats drift down the stream. Drag to slide the little cannon, which throws paper balls by itself;
 * sink the boats before three of them get past you.
 */
export default function PaperBoats() {
  const canvas = useRef(null);
  const game = useRef(null);
  const [phase, setPhase] = useState('ready'); // ready | playing | over
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, report] = useBest('boats');
  const [record, setRecord] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el.getContext('2d');
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    el.width = W * ratio;
    el.height = H * ratio;
    ctx.scale(ratio, ratio);
    const g = { x: W / 2, target: W / 2, shots: [], boats: [], splashes: [], score: 0, lives: 3, fire: 0, spawn: 0, time: 0, playing: false, last: 0 };
    game.current = g;
    let raf = 0;

    const draw = () => {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#102a43');
      sky.addColorStop(1, '#0a1624');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      // the stream
      ctx.strokeStyle = 'rgb(120 190 230 / 0.12)';
      ctx.lineWidth = 2;
      for (let row = 0; row < 12; row += 1) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 12) ctx.lineTo(x, row * 42 + 12 + Math.sin((x + g.time * 40 + row * 30) / 22) * 4);
        ctx.stroke();
      }
      for (const b of g.boats) {
        ctx.save();
        ctx.translate(b.x, b.y);
        drawBoat(ctx, b.size, Math.sin(g.time * 2 + b.phase) * 0.12);
        ctx.restore();
      }
      ctx.fillStyle = '#ffd166';
      for (const s of g.shots) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const p of g.splashes) {
        ctx.fillStyle = `rgb(200 230 255 / ${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 + (1 - p.life) * 10, 0, Math.PI * 2);
        ctx.fill();
      }
      // the cannon: a little paper plane
      ctx.save();
      ctx.translate(g.x, H - 34);
      ctx.fillStyle = '#ff8a5c';
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(18, 14);
      ctx.lineTo(0, 7);
      ctx.lineTo(-18, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffb38a';
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(0, 7);
      ctx.lineTo(-18, 14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - (g.last || now)) / 1000);
      g.last = now;
      g.time += dt;
      g.x += (g.target - g.x) * Math.min(1, dt * 14);
      if (g.playing) {
        g.fire -= dt;
        if (g.fire <= 0) {
          g.fire = 0.34;
          g.shots.push({ x: g.x, y: H - 60 });
        }
        g.spawn -= dt;
        if (g.spawn <= 0) {
          const speed = 42 + Math.min(70, g.score * 0.6);
          g.spawn = Math.max(0.55, 1.5 - g.score * 0.01);
          const size = 34 + Math.random() * 16;
          g.boats.push({ x: 30 + Math.random() * (W - 60), y: -size, size, speed: speed * (0.8 + Math.random() * 0.5), phase: Math.random() * 6 });
        }
        for (const s of g.shots) s.y -= 420 * dt;
        for (const b of g.boats) b.y += b.speed * dt;
        // a ball that reaches a boat sinks it
        for (const b of g.boats) {
          const hit = g.shots.find((s) => Math.abs(s.x - b.x) < b.size * 0.5 && s.y < b.y && s.y > b.y - b.size);
          if (hit) {
            b.sunk = true;
            hit.gone = true;
            g.splashes.push({ x: b.x, y: b.y - b.size * 0.3, life: 1 });
            g.score += 10;
            setScore(g.score);
          }
        }
        const escaped = g.boats.filter((b) => !b.sunk && b.y - b.size > H - 20);
        if (escaped.length) {
          g.lives -= escaped.length;
          setLives(Math.max(0, g.lives));
          navigator.vibrate?.(40);
        }
        g.boats = g.boats.filter((b) => !b.sunk && !escaped.includes(b));
        g.shots = g.shots.filter((s) => !s.gone && s.y > -10);
        if (g.lives <= 0) {
          g.playing = false;
          setPhase('over');
        }
      }
      for (const p of g.splashes) p.life -= dt * 2.2;
      g.splashes = g.splashes.filter((p) => p.life > 0);
      draw();
    };
    raf = requestAnimationFrame(frame);

    const move = (clientX) => {
      const box = el.getBoundingClientRect();
      g.target = Math.max(18, Math.min(W - 18, ((clientX - box.left) / box.width) * W));
    };
    const onPointer = (e) => move(e.clientX);
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') g.target = Math.max(18, g.target - 36);
      if (e.key === 'ArrowRight') g.target = Math.min(W - 18, g.target + 36);
    };
    el.addEventListener('pointermove', onPointer);
    el.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onPointer);
      el.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (phase === 'over') setRecord(report(game.current.score));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report once, when the game ends
  }, [phase]);

  const begin = () => {
    const g = game.current;
    Object.assign(g, { shots: [], boats: [], splashes: [], score: 0, lives: 3, fire: 0, spawn: 0.4, playing: true });
    setScore(0);
    setLives(3);
    setRecord(false);
    setPhase('playing');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Stat label="Score" value={score} tone="text-signal" />
        <Stat label="Lives" value={lives} tone={lives === 1 ? 'text-danger' : undefined} />
        <Stat label="Best" value={best ?? '-'} />
      </div>
      <div className="relative">
        <canvas ref={canvas} className="aspect-[3/4] w-full touch-none rounded-2xl border border-line-strong" role="img" aria-label="Paper boats floating down a stream, with a paper plane at the bottom" />
        {phase !== 'playing' && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-ink-0/70 p-6 text-center backdrop-blur-[2px]">
            {phase === 'ready' ? (
              <div className="flex flex-col items-center gap-3">
                <h3 className="font-display text-h3 leading-tight text-bone">Sink the paper boats</h3>
                <p className="max-w-[16rem] text-fine text-bone-dim">Slide your finger to move the paper plane. It throws by itself. Do not let three boats get past.</p>
                <Button onClick={begin}>Start</Button>
              </div>
            ) : (
              <Result title={record ? 'A new record' : 'The stream wins'} detail={`${score} points`}>
                <Button size="sm" onClick={begin}>
                  <RotateCcw size={14} aria-hidden="true" /> Play again
                </Button>
              </Result>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
