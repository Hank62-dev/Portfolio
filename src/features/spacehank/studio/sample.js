// Sample pictures for trying the gallery without spending any AI budget: abstract pieces drawn on a canvas in
// the workspace's own palette. Browser only.

const SIZE = 768;

const INK = '#0b0c0e';
const BONE = '#ece6da';
const SIGNAL = '#ff5b2e';

const SAMPLES = [
  {
    prompt: 'Concentric rings of light over a dark grid, editorial, one orange accent',
    draw: (ctx) => {
      ctx.strokeStyle = 'rgba(236,230,218,0.12)';
      for (let i = 0; i <= SIZE; i += 48) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, SIZE);
        ctx.moveTo(0, i);
        ctx.lineTo(SIZE, i);
        ctx.stroke();
      }
      for (let r = 40; r < 420; r += 38) {
        ctx.strokeStyle = r % 114 === 40 ? SIGNAL : 'rgba(236,230,218,0.5)';
        ctx.lineWidth = r % 114 === 40 ? 3 : 1.4;
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  },
  {
    prompt: 'Four stacked translucent layers seen at an angle, restrained, warm black ground',
    draw: (ctx) => {
      for (let i = 0; i < 4; i += 1) {
        const cy = 250 + i * 110;
        ctx.beginPath();
        ctx.moveTo(SIZE / 2, cy - 90);
        ctx.lineTo(SIZE / 2 + 280, cy);
        ctx.lineTo(SIZE / 2, cy + 90);
        ctx.lineTo(SIZE / 2 - 280, cy);
        ctx.closePath();
        ctx.fillStyle = i === 1 ? 'rgba(255,91,46,0.55)' : `rgba(236,230,218,${0.07 + i * 0.05})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(236,230,218,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.fillStyle = SIGNAL;
      ctx.fillRect(SIZE / 2 - 2, 150, 4, 470);
    },
  },
  {
    prompt: 'Soft orange aurora drifting across a night sky, subtle film grain',
    draw: (ctx) => {
      for (let i = 0; i < 6; i += 1) {
        const g = ctx.createRadialGradient(120 + i * 110, 200 + (i % 3) * 150, 10, 120 + i * 110, 200 + (i % 3) * 150, 260);
        g.addColorStop(0, i % 2 ? 'rgba(255,91,46,0.55)' : 'rgba(255,170,120,0.4)');
        g.addColorStop(1, 'rgba(255,91,46,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, SIZE, SIZE);
      }
      for (let i = 0; i < 160; i += 1) {
        ctx.fillStyle = `rgba(236,230,218,${0.2 + ((i * 37) % 60) / 100})`;
        ctx.fillRect((i * 193) % SIZE, (i * 71) % (SIZE / 1.6), 2, 2);
      }
    },
  },
  {
    prompt: 'A signal wave travelling across fine hairlines, minimal, bone on black',
    draw: (ctx) => {
      for (let y = 120; y < SIZE; y += 64) {
        ctx.strokeStyle = y === 376 ? SIGNAL : 'rgba(236,230,218,0.35)';
        ctx.lineWidth = y === 376 ? 3 : 1.2;
        ctx.beginPath();
        for (let x = 0; x <= SIZE; x += 4) {
          const amp = 26 * Math.sin((x / SIZE) * Math.PI);
          const py = y + Math.sin(x / 22 + y / 40) * amp;
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        }
        ctx.stroke();
      }
    },
  },
  {
    prompt: 'A field of dots that swell towards one point, halftone, editorial',
    draw: (ctx) => {
      for (let y = 24; y < SIZE; y += 32) {
        for (let x = 24; x < SIZE; x += 32) {
          const d = Math.hypot(x - SIZE * 0.68, y - SIZE * 0.32) / SIZE;
          ctx.fillStyle = d < 0.12 ? SIGNAL : BONE;
          ctx.globalAlpha = Math.max(0.12, 0.95 - d * 1.5);
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1.5, 14 - d * 26), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    prompt: 'Two overlapping circles and a thin horizon line, quiet and geometric',
    draw: (ctx) => {
      ctx.fillStyle = 'rgba(255,91,46,0.85)';
      ctx.beginPath();
      ctx.arc(SIZE * 0.4, SIZE * 0.46, 170, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = BONE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(SIZE * 0.58, SIZE * 0.5, 170, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = BONE;
      ctx.fillRect(60, SIZE * 0.78, SIZE - 120, 2);
    },
  },
];

const paint = (draw) =>
  new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    const ground = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    ground.addColorStop(0, '#16181c');
    ground.addColorStop(1, INK);
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, SIZE, SIZE);
    draw(ctx);
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });

/** The sample pictures as [{ prompt, blob }]. */
export const drawSamplePictures = () => Promise.all(SAMPLES.map(async ({ prompt, draw }) => ({ prompt, blob: await paint(draw) })));

export const SAMPLE_PROMPTS = SAMPLES.map((s) => s.prompt);
