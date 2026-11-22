import { useEffect, useRef, useState } from 'react';
import { tr } from '../../core/i18n/lang';
import { INK, InkBox, RED, Score } from './ink';
import { PLANE, planeHits } from './more';
import { drawPage, fitCanvas, penFont, penRect, penText } from './paper';
import { useBest } from './shared';

/** A pencil standing up from the floor or hanging from the top, its sharpened end at `tipY`, pointing `dir` (1 down, -1 up). */
const drawPencil = (ctx, x, from, tipY, dir, width) => {
  const body = dir === 1 ? [x, from, width, tipY - from - 20] : [x, tipY + 20, width, from - tipY - 20];
  penRect(ctx, ...body, { stroke: INK, fill: '#ffd35e', seed: x });
  ctx.strokeStyle = 'rgba(201,138,0,0.6)';
  ctx.beginPath();
  ctx.moveTo(x + width / 3, body[1]);
  ctx.lineTo(x + width / 3, body[1] + body[3]);
  ctx.moveTo(x + (2 * width) / 3, body[1]);
  ctx.lineTo(x + (2 * width) / 3, body[1] + body[3]);
  ctx.stroke();
  // the wood and the lead
  const base = dir === 1 ? tipY - 20 : tipY + 20;
  ctx.fillStyle = '#f3d9b1';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + width, base);
  ctx.lineTo(x + width / 2, tipY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3a3a44';
  ctx.beginPath();
  ctx.moveTo(x + width / 2 - 5, tipY - dir * 7);
  ctx.lineTo(x + width / 2 + 5, tipY - dir * 7);
  ctx.lineTo(x + width / 2, tipY);
  ctx.closePath();
  ctx.fill();
};

/** The paper plane, tilted with its climb or fall. */
const drawPlane = (ctx, x, y, vy) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.max(-0.5, Math.min(0.8, vy / 700)));
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-16, -11);
  ctx.lineTo(-8, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#dfe3ff';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-8, 1);
  ctx.lineTo(-14, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

/** Máy bay giấy (paper plane): tap, click or press space to lift the plane; slip it through the gaps between the pencils. */
export default function PaperPlane() {
  const canvas = useRef(null);
  const [score, setScore] = useState(0);
  const [best, report] = useBest('plane');
  const game = useRef(null);
  const flapRef = useRef(() => {});

  useEffect(() => {
    const el = canvas.current;
    if (!el) return undefined;
    let { ctx, w, h } = fitCanvas(el);
    const font = penFont();
    const g = { phase: 'ready', x: w * 0.28, y: h / 2, vy: 0, pipes: [], next: 0, scroll: 0, score: 0, t: 0 };
    game.current = g;
    let raf = 0;
    let prev = performance.now();

    const reset = () => Object.assign(g, { phase: 'ready', y: h / 2, vy: 0, pipes: [], next: 0.6, scroll: 0, score: 0, t: 0 });
    const flap = () => {
      if (g.phase === 'over') {
        if (g.t > 0.5) reset();
        return;
      }
      if (g.phase === 'ready') g.phase = 'flying';
      g.vy = PLANE.flap;
    };
    flapRef.current = flap;

    const frame = (now) => {
      const dt = Math.min(0.033, (now - prev) / 1000);
      prev = now;
      g.t += dt;
      if (g.phase === 'flying') {
        g.vy += PLANE.gravity * dt;
        g.y += g.vy * dt;
        const speed = PLANE.speed + g.score * 2.5;
        g.scroll += speed * dt;
        g.next -= dt;
        if (g.next <= 0) {
          const margin = PLANE.gap / 2 + 30;
          g.pipes.push({ x0: w + 10, gapY: margin + Math.random() * (h - margin * 2), passed: false });
          g.next = PLANE.every;
        }
        for (const p of g.pipes) {
          p.x0 -= speed * dt;
          if (!p.passed && p.x0 + PLANE.width < g.x) {
            p.passed = true;
            g.score += 1;
            setScore(g.score);
          }
        }
        g.pipes = g.pipes.filter((p) => p.x0 > -PLANE.width - 10);
        const plane = { x: g.x, y: g.y, r: 11 };
        if (g.y > h - 11 || g.y < 11 || g.pipes.some((p) => planeHits(plane, p))) {
          g.phase = 'over';
          g.t = 0;
          navigator.vibrate?.(70);
          report(g.score);
        }
      } else if (g.phase === 'ready') {
        g.y = h / 2 + Math.sin(g.t * 3) * 8;
      }

      drawPage(ctx, w, h, g.scroll);
      for (const p of g.pipes) {
        drawPencil(ctx, p.x0, -4, p.gapY - PLANE.gap / 2, 1, PLANE.width);
        drawPencil(ctx, p.x0, h + 4, p.gapY + PLANE.gap / 2, -1, PLANE.width);
      }
      drawPlane(ctx, g.x, g.y, g.vy);
      penText(ctx, String(g.score), w / 2, 36, { size: 38, color: RED, font });
      if (g.phase === 'ready') penText(ctx, tr('Tap to fly'), w / 2, h * 0.72, { size: 30, font });
      if (g.phase === 'over') {
        penText(ctx, tr('Crashed!'), w / 2, h * 0.42, { size: 40, color: RED, font });
        penText(ctx, tr('Tap to try again'), w / 2, h * 0.42 + 44, { size: 24, font });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKey = (e) => {
      if (e.code === 'Space' || e.key === 'ArrowUp') {
        e.preventDefault();
        flap();
      }
    };
    const onResize = () => {
      ({ ctx, w, h } = fitCanvas(el));
      g.x = w * 0.28;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the game loop is set up once
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('pencils passed')} value={score} tone={RED} />
        <Score label={tr('best')} value={best ?? '-'} />
      </div>
      <InkBox className="overflow-hidden p-1.5">
        <canvas ref={canvas} onPointerDown={() => flapRef.current()} className="block h-[26rem] w-full touch-manipulation select-none" aria-label={tr('Paper plane. Tap or press space to fly up.')} />
      </InkBox>
      <p className="text-center font-hand text-[0.95rem] text-[#20296a]/70">{tr('Tap, click or press space to lift the plane. Do not touch the pencils.')}</p>
    </div>
  );
}
