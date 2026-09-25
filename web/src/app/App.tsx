import { useEffect, useMemo, useState } from "react";
import { gbp, years } from "../lib/format";
import {
  type AreaData,
  type Choice,
  DEPOSITS,
  type DepositFile,
  chase,
  latest,
  onPaper,
  planFor,
  readChoice,
  writeChoice,
} from "../lib/deposit";
import { AreasStrip } from "./AreasStrip";
import { ChaseChart } from "./ChaseChart";
import { ShareCard } from "./ShareCard";
import { useCountUp } from "./hooks";

const REPO = "https://github.com/FinnTech3/deposit-gap";

function useTheme() {
  const [theme, setTheme] = useState<string | undefined>(() => document.documentElement.dataset.theme);
  const systemDark = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme ? theme === "dark" : systemDark;
  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private windows may refuse; the choice then lasts for this visit only.
    }
    setTheme(next);
  }
  return { dark, toggle };
}

/** A tenth of the area's lower-quartile pay, a month, to the nearest £5. */
function tenth(area: AreaData): number {
  return Math.round((latest(area.lq_pay) ?? 0) / 120 / 5) * 5;
}

function chaseLine(c: NonNullable<ReturnType<typeof chase>>, start: number): string {
  return c.bought
    ? `took ${c.years} ${c.years === 1 ? "year" : "years"}, buying in ${start + c.years - 1}`
    : `was still saving in 2025, ${c.years} years on`;
}

export function App() {
  const [d, setD] = useState<DepositFile | null>(null);
  const [failed, setFailed] = useState(false);
  const [c, setC] = useState<Choice | null>(null);
  const theme = useTheme();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/deposit.json`)
      .then((r) => r.json() as Promise<DepositFile>)
      .then((file) => {
        setC(readChoice(location.search, new Set(file.areas.map((a) => a.code))));
        setD(file);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (c) history.replaceState(null, "", `${location.pathname}${writeChoice(c)}`);
  }, [c]);

  return (
    <div className="wrap">
      <header>
        <div className="mark">
          <span className="ladder" aria-hidden="true">
            {[6, 9, 12, 15, 16].map((h, i) => (
              <i key={i} className={i === 4 ? "d" : undefined} style={{ height: h }} />
            ))}
          </span>
          <b>Deposit gap</b>
          <small>how long a deposit takes</small>
        </div>
        <button
          className="toggle"
          type="button"
          onClick={theme.toggle}
          aria-label={`Switch to ${theme.dark ? "light" : "dark"} theme`}
        >
          {theme.dark ? "Light" : "Dark"}
        </button>
      </header>

      <main>
        <div className="hero">
          <h1>How long would a deposit take you, and how long did it take before?</h1>
          <p className="lede">
            Pick where you live and what you can put aside. Every area's house prices and pay come from the ONS, from
            1997 to 2025, rebuilt to its published figures.
          </p>
          {d && c ? (
            <Controls d={d} c={c} set={(patch) => setC({ ...c, ...patch })} />
          ) : (
            <div className="controls skeleton-controls" aria-hidden="true" />
          )}
        </div>

        <div className={d && c ? "answer" : "answer skeleton"} aria-live="polite">
          {failed ? (
            <p>The data did not load. Refresh the page to try again.</p>
          ) : d && c ? (
            <Answer d={d} c={c} />
          ) : (
            <p>Loading 29 years of prices and pay for every area</p>
          )}
        </div>

        {d && c && <Sections d={d} c={c} />}
      </main>

      <footer>
        <p>
          Sources: ONS, house price to workplace-based earnings ratio, 1997 to 2025 (House Price Statistics for Small
          Areas; Annual Survey of Hours and Earnings); Bank of England, quoted one-year fixed-rate bond rate for
          households (IUMWTFA).
        </p>
        <p>
          Lower-quartile prices and full-time pay, England and Wales. On paper means at 2025 prices and before interest.
          Rent, stamp duty, fees and family help are not counted, and neither is whether a lender would lend the rest.
        </p>
        <p>
          Built by Finn Lakin. The method, the code and every check are at{" "}
          <a href={REPO}>github.com/FinnTech3/deposit-gap</a>. No cookies, no tracking.
        </p>
      </footer>
    </div>
  );
}

function Controls({ d, c, set }: { d: DepositFile; c: Choice; set: (patch: Partial<Choice>) => void }) {
  const area = d.areas.find((a) => a.code === c.area)!;
  const groups = useMemo(() => {
    const out = new Map<string, AreaData[]>();
    for (const a of d.areas.filter((x) => x.level === "la")) out.set(a.region, [...(out.get(a.region) ?? []), a]);
    return [...out.entries()].sort(([x], [y]) => x.localeCompare(y));
  }, [d]);
  const monthly = c.monthly ?? tenth(area);

  return (
    <div className="controls">
      <div className="field">
        <label htmlFor="area">Where you would buy</label>
        <select id="area" value={c.area} onChange={(e) => set({ area: e.target.value, monthly: null })}>
          <optgroup label="Countries and regions">
            {d.areas
              .filter((a) => a.level === "region")
              .map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name}
                </option>
              ))}
          </optgroup>
          {groups.map(([region, list]) => (
            <optgroup key={region} label={region}>
              {list.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="monthly">What you can save a month</label>
        <div className="money">
          <span aria-hidden="true">£</span>
          <input
            id="monthly"
            inputMode="numeric"
            value={String(monthly)}
            onChange={(e) => {
              const v = Number(e.target.value.replace(/[^0-9]/g, ""));
              set({ monthly: v > 0 ? Math.min(v, 20000) : null });
            }}
          />
        </div>
        <span className="hint">{`A tenth of lower-quartile pay here is ${gbp(tenth(area))}.`}</span>
      </div>
      <div className="field">
        <span id="deposit">Deposit</span>
        <div className="segmented" role="group" aria-labelledby="deposit">
          {DEPOSITS.map((v) => (
            <button key={v} type="button" aria-pressed={c.deposit === v} onClick={() => set({ deposit: v })}>
              {`${Math.round(v * 100)}%`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Answer({ d, c }: { d: DepositFile; c: Choice }) {
  const area = d.areas.find((a) => a.code === c.area)!;
  const monthly = c.monthly ?? tenth(area);
  const price = latest(area.lq_price);
  const plan = planFor(area, monthly, c.deposit);
  const target = price === null ? null : c.deposit * price;
  const paper = target === null ? null : target / (12 * monthly);
  const shown = useCountUp(paper);
  const then = onPaper(d, area, 1997, plan);
  const from1997 = chase(d, area, 1997, plan);
  const from2015 = chase(d, area, 2015, plan);

  if (paper === null || target === null) return <p>The ONS does not publish a 2025 price for this area.</p>;
  return (
    <>
      <div className="answer-main">
        <div className="where">
          <b>{area.name}</b>
          <span>{`saving ${gbp(monthly)} a month for a ${Math.round(c.deposit * 100)}% deposit`}</span>
        </div>
        <div className="big">
          <span className="num">{years(shown ?? paper)}</span>
          <span className="unit">{`to save ${gbp(target)} on a lower-quartile home of ${gbp(price!)}, at 2025 prices and before interest`}</span>
        </div>
        {from2015 && (
          <p className="context">
            {`Someone here saving the same share of lower-quartile pay who started in 2015 ${chaseLine(from2015, 2015)}.`}
          </p>
        )}
      </div>
      <div className="answer-side">
        <dl className="facts">
          <div>
            <dt>The same share of pay, on paper in 1997</dt>
            <dd>{then === null ? "no data" : years(then)}</dd>
          </div>
          <div>
            <dt>Started saving in 1997</dt>
            <dd>{from1997 ? (from1997.bought ? `${from1997.years} years` : "still saving") : "no data"}</dd>
          </div>
          <div>
            <dt>Started saving in 2015</dt>
            <dd>{from2015 ? (from2015.bought ? `${from2015.years} years` : "still saving") : "no data"}</dd>
          </div>
        </dl>
      </div>
    </>
  );
}

function Sections({ d, c }: { d: DepositFile; c: Choice }) {
  const area = d.areas.find((a) => a.code === c.area)!;
  const monthly = c.monthly ?? tenth(area);
  const plan = planFor(area, monthly, c.deposit);
  const starts = d.years.slice(0, -1);
  const chases = useMemo(() => starts.map((s) => chase(d, area, s, plan)), [d, area, plan.saving, plan.deposit]);
  const paper = useMemo(() => starts.map((s) => onPaper(d, area, s, plan)), [d, area, plan.saving, plan.deposit]);
  const values = useMemo(
    () =>
      d.areas
        .filter((a) => a.level === "la")
        .map((a) => ({ code: a.code, name: a.name, v: onPaper(d, a, 2025, plan) }))
        .filter((x): x is { code: string; name: string; v: number } => x.v !== null),
    [d, plan.saving, plan.deposit],
  );
  const still = values.filter((x) => {
    const a = d.areas.find((y) => y.code === x.code)!;
    const ch = chase(d, a, 2015, plan);
    return ch && !ch.bought;
  }).length;
  const price = latest(area.lq_price);
  const paperNow = price === null ? null : (c.deposit * price) / (12 * monthly);
  const from1997 = chase(d, area, 1997, plan);
  const card = useMemo(
    () => ({
      lead: `Saving ${gbp(monthly)} a month for a ${Math.round(c.deposit * 100)}% deposit in ${area.name}:`,
      big: paperNow === null ? "no data" : years(paperNow),
      unit: "on paper, at 2025 prices",
      lines: [
        from1997
          ? `Starting in 1997 on the same share of pay, it ${from1997.bought ? `took ${from1997.years} years` : "never happened"}.`
          : "",
        "From ONS prices and pay, rebuilt to its published ratios.",
      ].filter(Boolean),
      bars: chases.map((ch) => (ch ? (ch.bought ? ch.years : -ch.years) : 0)),
    }),
    [monthly, c.deposit, area.name, paperNow, from1997, chases],
  );

  return (
    <>
      <section>
        <h2>How long it actually took here</h2>
        <p className="sub">
          {`A saver in ${area.name} putting aside the same share of lower-quartile pay each year, with the pot earning what a one-year savings bond paid, by the year they started. Prices and pay moved while they saved; the line on each bar is the on-paper figure for that year.`}
        </p>
        <div className="fig">
          <ChaseChart chases={chases} paper={paper} starts={starts} area={area.name} />
          <ul className="legend" aria-hidden="true">
            <li className="l-bought">years it took</li>
            <li className="l-still">still saving in 2025</li>
            <li className="l-paper">on paper</li>
          </ul>
        </div>
      </section>

      <section>
        <h2>Every area, at the same share of pay</h2>
        <p className="sub">
          {`On paper at 2025 prices, for someone on each area's lower-quartile pay saving the same share of it. At this plan, a 2015 starter was still saving in 2025 in ${still} of ${values.length} local authorities.`}
        </p>
        <div className="fig">
          <AreasStrip values={values} mine={c.area} />
        </div>
      </section>

      <section>
        <h2>How I know the numbers are right</h2>
        <p className="sub">
          Everything here is built from the ONS's price and earnings tables, so the first check is that they really do
          make the ONS's published ratios.
        </p>
        <ul className="checks">
          <li>
            <span className="pill">Pass</span>
            <div>
              <b>Every published affordability ratio, rebuilt from its parts</b>
              <span>
                {`${d.checks.matched.toLocaleString("en-GB")} of ${d.checks.ratios.toLocaleString("en-GB")}, exact to two decimal places, every area and year from 1997 to 2025. The ONS suppresses ${d.checks.suppressed} more.`}
              </span>
            </div>
          </li>
          <li>
            <span className="pill neutral">Twin</span>
            <div>
              <b>The same sum with a one-year slip</b>
              <span>
                {`Dividing each year's prices by the previous year's pay gets ${d.checks.twin_matched} of ${d.checks.twin_total.toLocaleString("en-GB")} right, so the check can fail.`}
              </span>
            </div>
          </li>
        </ul>
      </section>

      <section>
        <h2>Save your result</h2>
        <ShareCard content={card} file={`deposit-gap-${area.code}.png`} />
      </section>
    </>
  );
}
