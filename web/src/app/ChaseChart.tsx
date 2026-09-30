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
  // A council created after 1997 has no prices from before it existed, so a
  // saver could not have started then. Those years are left off rather than
  // drawn as empty columns, which read as nothing saved rather than no figure.
  const from = chases.findIndex((c) => c);
  const yrs = from < 0 ? starts : starts.slice(from);
  const runs = from < 0 ? chases : chases.slice(from);
  const lines = from < 0 ? paper : paper.slice(from);
  // Only ever fed real years, but a scale is not the place to find out.
  const sizes = [10, ...runs.map((c) => c?.years ?? 0), ...lines.map((p) => p ?? 0)].filter(Number.isFinite);
  const top = Math.max(5, Math.ceil(Math.max(...sizes) / 5) * 5);
  const slot = (W - L - R) / Math.max(1, yrs.length);
  const y = (v: number) => B - (v / top) * (B - T);
  const ticks = Array.from({ length: top / 5 + 1 }, (_, i) => i * 5);
  const bought = runs.filter((c) => c?.bought);
  const still = runs.filter((c) => c && !c.bought);
  const first = runs.find((c) => c);

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-labelledby="chase-desc">
        <desc id="chase-desc">
          {`${area}: years a saver took to reach the deposit, by the year they started, ${yrs[0]} to ${yrs[yrs.length - 1]}. ` +
            (from > 0 ? `Its figures begin in ${yrs[0]}, so there is no earlier start to follow. ` : "") +
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
        {yrs.map((s, i) => {
          const c = runs[i];
          const x = L + i * slot + 1.5;
          const w = Math.max(1, slot - 3);
          const p = lines[i];
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
              {(i === 0 || (s % 5 === 0 && s - yrs[0]! >= 5)) && (
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
