import { LAYERS } from '../../../data/projects';

const W = 640;
const H = 400;

/**
 * Cover for projects without a real screenshot: a schematic of the project's own
 * architecture. One row per layer, one node per technology recorded for it.
 * It is generated from `project.layers`, so it can never claim more than the data does.
 */
const ProjectMark = ({ project, label }) => {
  const rows = LAYERS.map((layer, i) => {
    const techs = project.layers[layer] ?? [];
    const y = 70 + i * 78;
    const n = Math.min(techs.length, 8);
    const nodes = Array.from({ length: n }, (_, k) => ({ x: 70 + k * 56, y, key: `${layer}-${k}` }));
    return { layer, y, nodes, filled: techs.length > 0 };
  });

  return (
    <svg
      className="size-full"
      viewBox={`0 0 ${W} ${H}`}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={W} height={H} className="fill-ink-2" />
      {rows.map((r, i) => (
        <g key={r.layer}>
          <line x1="30" x2={W - 30} y1={r.y} y2={r.y} className="stroke-line-strong stroke-1 [stroke-dasharray:2_6]" />
          {r.nodes.map((n) => (
            <rect
              key={n.key}
              x={n.x - 9}
              y={n.y - 9}
              width="18"
              height="18"
              className="fill-ink-2 stroke-bone-dim stroke-[1.5]"
            />
          ))}
          {i < rows.length - 1 && r.filled && rows[i + 1].filled && (
            <line x1="70" x2="70" y1={r.y} y2={rows[i + 1].y} className="stroke-signal stroke-[1.5]" />
          )}
        </g>
      ))}
      <text
        x={W - 32}
        y={H - 28}
        textAnchor="end"
        className="fill-signal font-display text-[140px] italic opacity-90"
      >
        {project.name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2)}
      </text>
    </svg>
  );
};

export default ProjectMark;
