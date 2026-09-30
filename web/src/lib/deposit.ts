// The app's arithmetic. The chase here is the pipeline's, line for line, and
// deposit.test.ts reproduces the pipeline's worked examples exactly.

export interface AreaData {
  code: string;
  name: string;
  region: string;
  level: "la" | "region";
  lq_price: (number | null)[];
  lq_pay: (number | null)[];
  md_price: (number | null)[];
  md_pay: (number | null)[];
}

export interface DepositFile {
  years: number[];
  rates: number[];
  areas: AreaData[];
  checks: { ratios: number; matched: number; suppressed: number; twin_matched: number; twin_total: number };
  examples: {
    code: string;
    deposit: number;
    saving: number;
    interest: boolean;
    start: number;
    years: number;
    bought: boolean;
    pot: number;
  }[];
}

export interface Plan {
  deposit: number; // share of the price
  saving: number; // share of the area's lower-quartile pay, each year
  interest: boolean;
}

export interface Chase {
  start: number;
  years: number; // to the purchase, or so far if still saving
  bought: boolean;
  pot: number;
}

/**
 * A saver who starts in `start` on the area's lower-quartile pay, saving
 * `plan.saving` of it at the end of each year, with the pot earning that year's
 * one-year bond rate: the first year the pot reaches `plan.deposit` of that
 * year's lower-quartile price. Null where the data have a gap.
 */
export function chase(d: DepositFile, area: AreaData, start: number, plan: Plan): Chase | null {
  let pot = 0;
  const last = d.years[d.years.length - 1]!;
  let target = 0;
  for (let t = start; t <= last; t++) {
    const i = t - d.years[0]!;
    const p = area.lq_price[i];
    const e = area.lq_pay[i];
    if (p == null || e == null) return null;
    const rate = plan.interest ? d.rates[i]! / 100 : 0;
    pot = pot * (1 + rate) + plan.saving * e;
    target = plan.deposit * p;
    if (pot >= target) return { start, years: t - start + 1, bought: true, pot };
  }
  void target;
  return { start, years: last - start + 1, bought: false, pot };
}

/** Years to save the deposit at one year's price and pay, if nothing moved. */
export function onPaper(d: DepositFile, area: AreaData, year: number, plan: Plan): number | null {
  const i = year - d.years[0]!;
  const p = area.lq_price[i];
  const e = area.lq_pay[i];
  if (p == null || e == null) return null;
  return (plan.deposit * p) / (plan.saving * e);
}

export function latest<T>(values: (T | null)[]): T | null {
  return values[values.length - 1] ?? null;
}

/** The page's own plan, before a reader changes it: a tenth of pay. */
export const A_TENTH = 0.1;

/**
 * The area's latest published lower-quartile pay, or null where there is none.
 *
 * The ONS suppresses earnings where too few people are surveyed, which is why
 * the Isles of Scilly has pay for one year in 29 and none for 2025. Nothing on
 * this page can be worked out for an area without pay, and treating the
 * missing figure as zero divides by it.
 */
export function payNow(area: AreaData): number | null {
  return latest(area.lq_pay);
}

/** A tenth of the area's lower-quartile pay, a month, to the nearest £5. */
export function tenth(area: AreaData): number | null {
  const pay = payNow(area);
  return pay === null ? null : Math.round(pay / 120 / 5) * 5;
}

/** A monthly saving as the share of a year's pay it comes out of. */
export function shareOfPay(monthly: number, pay: number): number {
  return (12 * monthly) / pay;
}

/**
 * The plan an area is read on: the reader's saving as a share of that area's
 * lower-quartile pay, so the same share can be followed through every year and
 * across every other area.
 *
 * Where the ONS publishes no pay there is no share of it, and a monthly figure
 * cannot be turned into one: the town falls back to a tenth of pay, which any
 * area can be asked. The reader's own years still come straight from what they
 * save and what a home costs, which needs no pay at all.
 */
export function planFrom(area: AreaData, monthly: number | null, deposit: number): Plan {
  const pay = payNow(area);
  if (pay === null) return { deposit, saving: A_TENTH, interest: true };
  return { deposit, saving: shareOfPay(monthly ?? tenth(area)!, pay), interest: true };
}

// The choice lives in the address, so a shared link opens on the same answer.

export interface Choice {
  area: string;
  monthly: number | null; // null: a tenth of the area's lower-quartile pay
  deposit: number;
}

export const DEPOSITS = [0.05, 0.1, 0.15, 0.2];
export const DEFAULT_AREA = "K04000001";

export function readChoice(search: string, codes: Set<string>): Choice {
  const q = new URLSearchParams(search);
  const a = q.get("a");
  const m = Number(q.get("m"));
  const dep = Number(q.get("d"));
  return {
    area: a && codes.has(a) ? a : DEFAULT_AREA,
    monthly: Number.isFinite(m) && m >= 10 && m <= 20000 ? Math.round(m) : null,
    deposit: DEPOSITS.includes(dep / 100) ? dep / 100 : 0.1,
  };
}

export function writeChoice(c: Choice): string {
  const q = new URLSearchParams();
  if (c.area !== DEFAULT_AREA) q.set("a", c.area);
  if (c.monthly !== null) q.set("m", String(c.monthly));
  if (c.deposit !== 0.1) q.set("d", String(Math.round(c.deposit * 100)));
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * True when a parsed JSON body looks like the deposit file, rather than an
 * error page or a stale deploy's wrong file. file.areas.map already runs in
 * the load path, so a bad body throws there today; this states the requirement
 * rather than leaving it to that accident, and keeps the six consistent.
 */
export function looksLikeDepositFile(x: unknown): x is DepositFile {
  if (typeof x !== "object" || x === null) return false;
  const f = x as Partial<DepositFile>;
  return Array.isArray(f.areas) && f.areas.length > 0 && Array.isArray(f.years);
}
