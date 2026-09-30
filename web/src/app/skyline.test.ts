// The town, held to the figures the README quotes. Each house is a council and
// the middle house is the one the readout calls the middle council, so the
// street has to be sorted, complete, and an odd number long.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DepositFile, Plan } from "../lib/deposit";
import { street } from "./Skyline";

const d = JSON.parse(readFileSync("public/data/deposit.json", "utf8")) as DepositFile;
// the page's starting plan: a 10% deposit, a tenth of pay saved, which makes
// the years on paper the ONS's own lower-quartile ratio
const PLAN: Plan = { deposit: 0.1, saving: 0.1, interest: true };
const middle = (year: number) => {
  const s = street(d, PLAN, year);
  return s[s.length >> 1]!;
};

describe("the street", () => {
  it("says what the README says about the middle council", () => {
    expect(middle(1997).years).toBeCloseTo(3.7, 1);
    expect(middle(2025).years).toBeCloseTo(8.1, 1);
    expect(street(d, PLAN, 1997)).toHaveLength(289);
    expect(street(d, PLAN, 2025)).toHaveLength(317);
    expect(street(d, PLAN, 1997).filter((h) => h.years >= 10)).toHaveLength(1);
    expect(street(d, PLAN, 2025).filter((h) => h.years >= 10)).toHaveLength(93);
  });

  it("leaves a real council in the middle, in every year", () => {
    for (const year of d.years) {
      const s = street(d, PLAN, year);
      expect(s.length % 2).toBe(1);
      const mid = s[s.length >> 1]!;
      expect(s.filter((h) => h.years < mid.years).length).toBe(s.filter((h) => h.years > mid.years).length);
    }
  });

  it("runs shortest to tallest, so the ends of the terrace are the ends of the town", () => {
    for (const year of d.years) {
      const s = street(d, PLAN, year);
      for (let i = 1; i < s.length; i++) expect(s[i]!.years).toBeGreaterThanOrEqual(s[i - 1]!.years);
      const ys = s.map((h) => h.years);
      expect(s[0]!.years).toBe(Math.min(...ys));
      expect(s[s.length - 1]!.years).toBe(Math.max(...ys));
    }
  });

  it("keeps every house under the sky it fixed, so heights compare across years", () => {
    let top = 0;
    for (const year of d.years) for (const h of street(d, PLAN, year)) top = Math.max(top, h.years);
    const ceiling = Math.ceil(top / 5) * 5;
    for (const year of d.years) for (const h of street(d, PLAN, year)) expect(h.years).toBeLessThanOrEqual(ceiling);
    expect(ceiling).toBeGreaterThanOrEqual(top);
  });

  it("gives Kensington and Chelsea the tallest house in both ends of the record", () => {
    expect(street(d, PLAN, 1997).at(-1)!.area.name).toBe("Kensington and Chelsea");
    expect(street(d, PLAN, 2025).at(-1)!.area.name).toBe("Kensington and Chelsea");
  });
});
