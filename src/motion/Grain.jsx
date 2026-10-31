// Film grain: an SVG noise tile, shifted in steps so it flickers like emulsion instead of sliding.
// Static (and fainter) with reduced motion. Pure CSS, no per-frame JS.
const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export default function Grain() {
  // The tile is shifted with background-position rather than a transform on an oversized layer: a fixed
  // element wider than the viewport makes mobile browsers widen the page, even when it is clipped.
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[80] animate-grain opacity-[0.07] motion-reduce:animate-none motion-reduce:opacity-[0.04]"
      style={{ backgroundImage: NOISE, backgroundSize: '160px 160px' }}
      aria-hidden="true"
    />
  );
}
