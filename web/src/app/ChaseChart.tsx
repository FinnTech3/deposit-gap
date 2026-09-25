import type { Chase } from "../lib/deposit";
import { useWidth } from "./hooks";

interface Props {
  chases: (Chase | null)[];
  paper: (number | null)[];
  starts: number[];
  area: string;
}

/** How long saving took, by the year it started, with the on-paper figure marked. */
export function ChaseChart({ chases, paper, starts, area }: Props) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const H = W < 520 ? 230 : 270;
  const L = 28;
  const R = 8;
  const T = 12;
  const B = H - 28;
  const hi = Math.max(10, ...chases.map((c) => (c ? c.years : 0)), ...paper.map((p) => p ?? 0));
  const top = Math.ceil(hi / 5) * 5;
  const slot = (W - L - R) / starts.length;
  const y = (v: number) => B - (v / top) * (B - T);
  const ticks = Array.from({ length: top / 5 + 1 }, (_, i) => i * 5);
  const bought = chases.filter((c) => c?.bought);
  const still = chases.filter((c) => c && !c.bought);
  const first = chases.find((c) => c);

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-labelledby="chase-desc">
        <desc id="chase-desc">
          {`${area}: years a saver took to reach the deposit, by the year they started, ${starts[0]} to ${starts[starts.length - 1]}. ` +
            (first ? `Starting in ${first.start}: ${first.bought ? `${first.years} years` : "still saving"}. ` : "") +
            `${bought.length} starts reached it by 2025; ${still.length} were still saving.`}
        </desc>
        {ticks.map((v) => (
          <g key={v}>
            <line className={v ? "c-grid" : "c-base"} x1={L} x2={W - R} y1={y(v) + 0.5} y2={y(v) + 0.5} />
            <text className="c-tick" x={L - 6} y={y(v) + 4} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {starts.map((s, i) => {
          const c = chases[i];
          const x = L + i * slot + 1.5;
          const w = Math.max(1, slot - 3);
          const p = paper[i];
          return (
            <g key={s}>
              {c &&
                (c.bought ? (
                  <rect className="c-bought" x={x} y={y(c.years)} width={w} height={B - y(c.years)} rx={1.5}>
                    <title>{`Started ${s}: bought after ${c.years} years`}</title>
                  </rect>
                ) : (
                  <rect className="c-still" x={x + 0.75} y={y(c.years)} width={w - 1.5} height={B - y(c.years)}>
                    <title>{`Started ${s}: still saving after ${c.years} years`}</title>
                  </rect>
                ))}
              {p != null && <line className="c-paper" x1={x - 1} x2={x + w + 1} y1={y(p)} y2={y(p)} />}
              {(i === 0 || (s % 5 === 0 && s - starts[0]! >= 5)) && (
                <text className="c-tick" x={x + w / 2} y={B + 18} textAnchor="middle">
                  {s}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
