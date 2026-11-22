// The hero's drawing as numbers: an exploded axonometric of the four layers, the way an architect draws a building taken
// apart floor by floor. Everything is a point on a plate (x, y across it, z up from it) turned into SVG coordinates by a
// flat dimetric projection, so the plates are wide and low and four of them stack without hiding each other.

export const AX = 0.9; // how far x and y run across the page
export const AY = 0.34; // how far they run down it

/** A point on a plate whose centre is at (cx, cy) on the page: [sx, sy]. */
export const iso = (cx, cy, x, y, z = 0) => [cx + (x - y) * AX, cy + (x + y) * AY - z];

const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** A flat shape on the plate (corners in plate x, y at height z) as an SVG points string. */
export const flat = (cx, cy, corners, z = 0) => pts(corners.map(([x, y]) => iso(cx, cy, x, y, z)));

/**
 * A box standing on the plate, its corner at (x, y), `w` along x, `d` along y, `h` high: the three faces we see, as SVG
 * points strings { top, right, left }. `z0` stands it on something that high (a box on a box). We look at it from the +x +y side, so those are the faces drawn.
 */
export const box = (cx, cy, x, y, w, d, h, z0 = 0) => ({
  top: flat(cx, cy, [[x, y], [x + w, y], [x + w, y + d], [x, y + d]], z0 + h),
  right: pts([iso(cx, cy, x + w, y, z0), iso(cx, cy, x + w, y + d, z0), iso(cx, cy, x + w, y + d, z0 + h), iso(cx, cy, x + w, y, z0 + h)]),
  left: pts([iso(cx, cy, x, y + d, z0), iso(cx, cy, x + w, y + d, z0), iso(cx, cy, x + w, y + d, z0 + h), iso(cx, cy, x, y + d, z0 + h)]),
});

/**
 * A cylinder standing on the plate at (x, y), radius `r`, `h` high: its top as an ellipse and its outline as a path (the
 * two sides and the near half of the bottom). A circle on the plate is seen as an ellipse r·√2·AX wide and r·√2·AY high.
 */
export const cylinder = (cx, cy, x, y, r, h) => {
  const [sx, sy] = iso(cx, cy, x, y, 0);
  const rx = r * Math.SQRT2 * AX;
  const ry = r * Math.SQRT2 * AY;
  return {
    top: { cx: sx, cy: sy - h, rx, ry },
    body: `M${(sx - rx).toFixed(1)},${(sy - h).toFixed(1)} V${sy.toFixed(1)} A${rx.toFixed(1)},${ry.toFixed(1)} 0 0 0 ${(sx + rx).toFixed(1)},${sy.toFixed(1)} V${(sy - h).toFixed(1)}`,
    // a band a third of the way down, like the rings drawn on a database symbol
    band: `M${(sx - rx).toFixed(1)},${(sy - h / 2).toFixed(1)} A${rx.toFixed(1)},${ry.toFixed(1)} 0 0 0 ${(sx + rx).toFixed(1)},${(sy - h / 2).toFixed(1)}`,
  };
};

/** Which plate a point at page height `y` is over, given each plate's centre height and half its drawn height; -1 if none. */
export const plateAt = (y, centres, half) => centres.findIndex((c) => Math.abs(y - c) <= half);
