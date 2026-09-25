import { years } from "../lib/format";
import { useWidth } from "./hooks";

interface Props {
  values: { code: string; name: string; v: number }[];
  mine: string;
}

/** Every local authority's on-paper years, one dot each, with the reader's area lit. */
export function AreasStrip({ values, mine }: Props) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const L = 12;
  const R = 12;
  const hi = Math.max(12, Math.ceil(Math.max(...values.map((d) => d.v)) / 4) * 4);
  const x = (v: number) => L + (Math.min(v, hi) / hi) * (W - L - R);
  const r = W < 520 ? 2.6 : 3.2;
  const step = 2 * r + 0.8;
  const dots = [...values].sort((a, b) => a.v - b.v).map((d) => ({ ...d, cx: x(d.v), row: 0 }));
  const rows: number[][] = [];
  for (const d of dots) {
    let row = 0;
    while (rows[row]?.some((c) => Math.abs(c - d.cx) < step)) row++;
    (rows[row] ??= []).push(d.cx);
    d.row = row;
  }
  const T = 30;
  const base = T + Math.max(1, rows.length) * step + 4;
  const H = base + 40;
  const you = dots.find((d) => d.code === mine);
  const ticks = Array.from({ length: hi / 4 + 1 }, (_, i) => i * 4);

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-labelledby="areas-desc">
        <desc id="areas-desc">
          {`On-paper years to the deposit in each of ${values.length} local authorities at 2025 prices, from ${years(dots[0]!.v)} to ${years(dots[dots.length - 1]!.v)}.` +
            (you
              ? ` ${you.name}: ${years(you.v)}, longer than ${dots.filter((d) => d.v < you.v).length} of them.`
              : "")}
        </desc>
        <line className="c-base" x1={L} x2={W - R} y1={base + 0.5} y2={base + 0.5} />
        {ticks.map((v) => (
          <text key={v} className="c-tick" x={x(v)} y={base + 18} textAnchor="middle">
            {v}
          </text>
        ))}
        {dots.map((d) => (
          <circle
            key={d.code}
            cx={d.cx}
            cy={base - r - 2 - d.row * step}
            r={d.code === mine ? r + 1.4 : r}
            className={d.code === mine ? "c-you" : "c-rest"}
          >
            <title>{`${d.name}: ${years(d.v)}`}</title>
          </circle>
        ))}
        {you && (
          <text
            className="c-strong c-halo"
            x={you.cx}
            y={T - 12}
            textAnchor={you.cx > W * 0.75 ? "end" : you.cx < W * 0.25 ? "start" : "middle"}
          >
            {`${you.name}: ${years(you.v)}`}
          </text>
        )}
        <text className="c-note" x={W - R} y={base + 34} textAnchor="end">
          years, one dot per local authority
        </text>
      </svg>
    </div>
  );
}
