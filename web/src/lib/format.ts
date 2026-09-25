// Numbers as the page prints them. British conventions throughout.

export function gbp(x: number): string {
  return `£${Math.round(x).toLocaleString("en-GB")}`;
}

export function years(x: number): string {
  return `${x.toFixed(1)} years`;
}
