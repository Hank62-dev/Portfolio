import { useEffect, useRef, useState } from 'react';
import { tr } from '../../core/i18n/lang';
import { INK, InkBox, RED, Score } from './ink';
import { ballHits, layBricks, paddleBounce } from './more';
import { drawPage, fitCanvas, penFont, penRect, penText } from './paper';
import { useBest } from './shared';

const ROWS = 5;
const COLS = 7;
const ROW_COLOURS = ['#ff7f78', '#ffa86b', '#ffd35e', '#7fd39a', '#7f8cff'];
const LIVES = 3;

/** Phá gạch (brick breaker): move the ruler to bounce the ball into the bricks. Clear them all; three balls. */
export default function BrickBreaker() {
  const canvas = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [best, report] = useBest('bricks');
  const tapRef = useRef(() => {});

  useEffect(() => {
    const el = canvas.current;
    if (!el) return undefined;
    let { ctx, w, h } = fitCanvas(el);
    const font = penFont();
    const g = { phase: 'ready', level: 1, score: 0, lives: LIVES, bricks: [], paddle: { x: 0, w: 90, y: 0 }, ball: { x: 0, y: 0, r: 7, vx: 0, vy: 0 }, aim: null, keys: 0, t: 0 };
    const speed = () => 300 + g.level * 30 + Math.min(120, g.score * 0.6);

    const layout = () => {
      g.paddle.y = h - 30;
      g.paddle.w = Math.max(70, w * 0.2);
    };
    const newLevel = () => {
      g.bricks = layBricks(ROWS, COLS, w, { top: 54, h: 18, gap: 5 });
      g.phase = 'ready';
    };
    const seat = () => {
      g.ball.x = g.paddle.x + g.paddle.w / 2;
      g.ball.y = g.paddle.y - g.ball.r - 1;
    };
    layout();
    g.paddle.x = (w - g.paddle.w) / 2;
    newLevel();

    const launch = () => {
      if (g.phase === 'over' || g.phase === 'won') {
        if (g.t < 0.5) return;
        Object.assign(g, { level: 1, score: 0, lives: LIVES });
        setScore(0);
        setLives(LIVES);
        newLevel();
        return;
      }
      if (g.phase !== 'ready') return;
      g.phase = 'playing';
      const v = paddleBounce(g.ball.x + (Math.random() - 0.5) * 20, g.paddle, speed());
      g.ball.vx = v.vx;
      g.ball.vy = v.vy;
    };
    tapRef.current = launch;

    let raf = 0;
    let prev = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.025, (now - prev) / 1000);
      prev = now;
      g.t += dt;
      // the ruler follows the pointer, or the arrow keys
      if (g.aim !== null) g.paddle.x += (g.aim - g.paddle.w / 2 - g.paddle.x) * Math.min(1, dt * 22);
      g.paddle.x += g.keys * 520 * dt;
      g.paddle.x = Math.max(4, Math.min(w - g.paddle.w - 4, g.paddle.x));

      if (g.phase === 'ready') seat();
      if (g.phase === 'playing') {
        const b = g.ball;
        // in small steps, so a fast ball never jumps through a brick
        const steps = Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 4);
        for (let s = 0; s < steps && g.phase === 'playing'; s += 1) {
          b.x += (b.vx * dt) / steps;
          b.y += (b.vy * dt) / steps;
          if (b.x < b.r) {
            b.x = b.r;
            b.vx = Math.abs(b.vx);
          }
          if (b.x > w - b.r) {
            b.x = w - b.r;
            b.vx = -Math.abs(b.vx);
          }
          if (b.y < b.r) {
            b.y = b.r;
            b.vy = Math.abs(b.vy);
          }
          const p = g.paddle;
          if (b.vy > 0 && ballHits(b, { x: p.x, y: p.y, w: p.w, h: 10 })) {
            const v = paddleBounce(b.x, p, speed());
            b.vx = v.vx;
            b.vy = v.vy;
            b.y = p.y - b.r - 0.5;
          }
          for (const brick of g.bricks) {
            if (!brick.alive) continue;
            const side = ballHits(b, brick);
            if (!side) continue;
            brick.alive = false;
            if (side === 'x') b.vx = -b.vx;
            else b.vy = -b.vy;
            g.score += (ROWS - brick.row) * 10;
            setScore(g.score);
            navigator.vibrate?.(8);
            break;
          }
          if (g.bricks.every((br) => !br.alive)) {
            g.level += 1;
            newLevel();
          }
          if (b.y > h + b.r) {
            g.lives -= 1;
            setLives(g.lives);
            navigator.vibrate?.(60);
            if (g.lives <= 0) {
              g.phase = 'over';
              g.t = 0;
              report(g.score);
            } else g.phase = 'ready';
          }
        }
      }

      drawPage(ctx, w, h);
      for (const brick of g.bricks) if (brick.alive) penRect(ctx, brick.x, brick.y, brick.w, brick.h, { stroke: INK, fill: ROW_COLOURS[brick.row % ROW_COLOURS.length], seed: brick.x + brick.y });
      // the ruler, with its marks
      const p = g.paddle;
      penRect(ctx, p.x, p.y, p.w, 10, { stroke: INK, fill: '#fff3c4' });
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let m = 6; m < p.w; m += 6) {
        ctx.moveTo(p.x + m, p.y);
        ctx.lineTo(p.x + m, p.y + (m % 30 === 0 ? 6 : 3));
      }
      ctx.stroke();
      // the ball: a scrunched-up paper ball
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(g.ball.x, g.ball.y, g.ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(g.ball.x - 3, g.ball.y - 2);
      ctx.lineTo(g.ball.x + 2, g.ball.y + 1);
      ctx.lineTo(g.ball.x - 1, g.ball.y + 3);
      ctx.lineWidth = 1;
      ctx.stroke();
      penText(ctx, `${tr('Level')} ${g.level}`, w / 2, 26, { size: 22, color: RED, font });
      if (g.phase === 'ready') penText(ctx, tr('Tap to serve'), w / 2, h * 0.62, { size: 28, font });
      if (g.phase === 'over') {
        penText(ctx, tr('Out of balls!'), w / 2, h * 0.55, { size: 36, color: RED, font });
        penText(ctx, tr('Tap to play again'), w / 2, h * 0.55 + 40, { size: 22, font });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      g.aim = e.clientX - r.left;
    };
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        g.aim = null;
        g.keys = e.type === 'keydown' ? (e.key === 'ArrowLeft' ? -1 : 1) : 0;
      } else if (e.type === 'keydown' && e.code === 'Space') {
        e.preventDefault();
        launch();
      }
    };
    const onResize = () => {
      ({ ctx, w, h } = fitCanvas(el));
      layout();
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onMove);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onMove);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the game loop is set up once
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('points')} value={score} tone={RED} />
        <Score label={tr('balls')} value={'●'.repeat(Math.max(0, lives)) || '-'} />
        <Score label={tr('best')} value={best ?? '-'} />
      </div>
      <InkBox className="overflow-hidden p-1.5">
        <canvas
          ref={canvas}
          onPointerDown={() => tapRef.current()}
          className="block h-[28rem] w-full touch-none select-none"
          aria-label={tr('Brick breaker. Move the ruler with the pointer or the arrow keys; tap or press space to serve.')}
        />
      </InkBox>
      <p className="text-center font-hand text-[0.95rem] text-[#20296a]/70">{tr('Move the ruler under the ball. Drag on a phone, the mouse or the arrow keys on a computer.')}</p>
    </div>
  );
}
