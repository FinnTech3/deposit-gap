import { type PointerEvent, useMemo, useState } from "react";
import { type AreaData, type DepositFile, type Plan, onPaper } from "../lib/deposit";
import { useWidth } from "./hooks";

interface Props {
  d: DepositFile;
  plan: Plan;
  current: string;
  onPick: (code: string) => void;
}

export interface House {
  area: AreaData;
  years: number;
}

/**
 * Every local authority with a figure for this year, shortest first.
 *
 * The middle house is `street()[length >> 1]`, an actual council rather than
 * the average of two: every year from 1997 to 2025 has an odd number of them,
 * which src/app/skyline.test.ts holds to.
 */
export function street(d: DepositFile, plan: Plan, year: number): House[] {
  const out: House[] = [];
  for (const area of d.areas) {
    if (area.level !== "la") continue;
    const years = onPaper(d, area, year, plan);
    if (years !== null) out.push({ area, years });
  }
  return out.sort((a, b) => a.years - b.years || a.area.name.localeCompare(b.area.name, "en-GB"));
}

/**
 * Every local authority as a house, as tall as the years its lower-quartile
 * pay would take to save a deposit on its lower-quartile home at that year's
 * prices. They are laid out as terraces, shortest street at the top, because
 * three hundred houses in one row are too thin to have a roof. Every street is
 * drawn to the same scale, so a house the same height anywhere is the same
 * number of years.
 */
export function Skyline({ d, plan, current, onPick }: Props) {
  const [ref, W] = useWidth<HTMLDivElement>(360);
  const [year, setYear] = useState(d.years[d.years.length - 1]!);
  const houses = useMemo(() => street(d, plan, year), [d, plan, year]);

  // The tallest across every year, so the town grows against a fixed sky
  // rather than rescaling itself each time the year moves.
  const ceiling = useMemo(() => {
    let top = 0;
    for (const y of d.years) for (const h of street(d, plan, y)) if (h.years > top) top = h.years;
    return Math.ceil(top / 5) * 5;
  }, [d, plan]);

  const L = 34;
  const R = 8;
  const T = 26;
  // One street, every council along it. Splitting them into terraces made
  // each terrace nearly flat, because sorting first and chunking after puts
  // houses of almost the same height side by side. One row keeps the climb.
  const rows = 1;
  const per = houses.length;
  const rowH = W < 560 ? 300 : 400;
  const H = T + rows * rowH + 40;
  const base = (row: number) => T + (row + 1) * rowH;
  const slot = (W - L - R) / per;
  const x = (i: number) => L + (i % per) * slot;
  const up = (v: number) => (v / ceiling) * (rowH - 14);
  const gap = Math.min(1.1, slot * 0.34);

  const at = houses.findIndex((h) => h.area.code === current);
  const mine = at >= 0 ? houses[at]! : null;
  const median = houses[houses.length >> 1]!;
  // A region has no house of its own, so it is marked as a line across every street.
  const regionYears = useMemo(() => {
    if (mine) return null;
    const area = d.areas.find((a) => a.code === current);
    return area ? { name: area.name, years: onPaper(d, area, year, plan) } : null;
  }, [d, current, year, plan, mine]);

  /** One house: two walls, a pitched roof, drawn from its street's ground line. */
  function house(i: number, years: number, wide = false): string {
    const row = Math.floor(i / per);
    const b = base(row);
    const w = wide ? Math.max(4, slot - gap) : Math.max(0.8, slot - gap);
    const left = x(i);
    const h = up(years);
    const roof = Math.min(h * 0.4, Math.max(1.8, w * 1.3));
    const eaves = b - h + roof;
    return `M${left.toFixed(2)},${b}L${left.toFixed(2)},${eaves.toFixed(2)}L${(left + w / 2).toFixed(2)},${(b - h).toFixed(2)}L${(left + w).toFixed(2)},${eaves.toFixed(2)}L${(left + w).toFixed(2)},${b}Z`;
  }

  const town = useMemo(() => houses.map((h, i) => house(i, h.years)).join(""), [houses, slot, rowH, ceiling, W]);
  const ticks = [10, 20, 30].filter((v) => v < ceiling);

  function locate(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const py = ((e.clientY - box.top) / box.height) * H;
    const row = Math.min(rows - 1, Math.max(0, Math.floor((py - T) / rowH)));
    const col = Math.min(per - 1, Math.max(0, Math.floor((px - L) / slot)));
    return Math.min(houses.length - 1, row * per + col);
  }

  return (
    <div ref={ref} className="skyline-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="skyline"
        role="img"
        aria-labelledby="sky-desc"
        onPointerDown={(e) => onPick(houses[locate(e)]!.area.code)}
      >
        <desc id="sky-desc">
          {`Every one of the ${houses.length} local authorities as a house, as tall as the years its lower-quartile pay would take to save a deposit at ${year} prices, laid out as one terrace with the shortest on the left. They run from ${houses[0]!.years.toFixed(1)} years in ${houses[0]!.area.name} to ${houses[houses.length - 1]!.years.toFixed(1)} in ${houses[houses.length - 1]!.area.name}, with the middle one at ${median.years.toFixed(1)}.` +
            (mine ? ` ${mine.area.name} is picked out at ${mine.years.toFixed(1)} years.` : "") +
            (regionYears?.years != null
              ? ` ${regionYears.name} as a whole is ${regionYears.years.toFixed(1)} years, marked across every street.`
              : "")}
        </desc>

        {Array.from({ length: rows }, (_, row) => (
          <g key={row}>
            {ticks.map((v) => (
              <line key={v} className="sky-rule" x1={L} x2={W - R} y1={base(row) - up(v)} y2={base(row) - up(v)} />
            ))}
            {regionYears?.years != null && (
              <line
                className="region-line"
                x1={L}
                x2={W - R}
                y1={base(row) - up(regionYears.years)}
                y2={base(row) - up(regionYears.years)}
              />
            )}
            <line className="ground" x1={L} x2={W - R} y1={base(row)} y2={base(row)} />
            {row === 0 &&
              ticks.map((v) => (
                <text key={v} className="c-tick" x={L - 6} y={base(row) - up(v) + 4} textAnchor="end">
                  {v}
                </text>
              ))}
          </g>
        ))}

        <path className="town" d={town} />
        {mine && (
          <>
            <path className="mine" d={house(at, mine.years, true)} />
            <text
              className="c-strong c-halo"
              x={Math.min(W - R, Math.max(L, x(at) + slot / 2))}
              y={base(Math.floor(at / per)) - up(mine.years) - 7}
              textAnchor={x(at) > W * 0.72 ? "end" : x(at) < W * 0.28 ? "start" : "middle"}
            >
              {`${mine.area.name}: ${mine.years.toFixed(1)} years`}
            </text>
          </>
        )}
        <text className="c-note" x={L - 28} y={13}>
          {W < 560
            ? `years to a deposit, ${year} prices`
            : `years to a deposit, ${year} prices · one house per council, shortest on the left`}
        </text>
        {regionYears?.years != null && (
          <text className="c-value region-label" x={W - R} y={H - 22} textAnchor="end">
            {`${regionYears.name}: ${regionYears.years.toFixed(1)} years`}
          </text>
        )}
      </svg>

      <div className="scrub">
        <label htmlFor="year">Scrub the years</label>
        <input
          id="year"
          type="range"
          min={d.years[0]}
          max={d.years[d.years.length - 1]}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-valuetext={String(year)}
        />
        <div className="ends" aria-hidden="true">
          <span>{d.years[0]}</span>
          <span>{d.years[d.years.length - 1]}</span>
        </div>
        <p className="readout" aria-live="polite">
          {`In ${year} the middle council needed ${median.years.toFixed(1)} years of saving, from ${houses[0]!.years.toFixed(1)} in ${houses[0]!.area.name} to ${houses[houses.length - 1]!.years.toFixed(1)} in ${houses[houses.length - 1]!.area.name}.`}
        </p>
      </div>
    </div>
  );
}
