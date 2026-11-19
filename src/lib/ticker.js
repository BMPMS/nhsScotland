import * as d3 from 'd3';

// Scotland-wide 12+ hour waits per year, summed across hospitals.
export const yearTotals = (hospitals, firstYear, lastYear) =>
  d3.range(firstYear, lastYear + 1).map((year) => ({
    year,
    waits: d3.sum(hospitals, (h) => h.waitsByYear.find((d) => d.year === year)?.waits ?? 0)
  }));

// Ticker value at a given elapsed time: steps through the years, easing the count between them.
export const tickerAt = (totals, elapsed, { delay, perYear }) => {
  const t = Math.max(0, (elapsed - delay) / perYear);
  const i = Math.min(totals.length - 1, Math.floor(t));
  const next = totals[Math.min(totals.length - 1, i + 1)];
  const k = i === totals.length - 1 ? 0 : d3.easeCubicInOut(t - i);
  return { year: totals[i].year + (k > 0.5 ? 1 : 0), waits: Math.round(d3.interpolateNumber(totals[i].waits, next.waits)(k)), done: t >= totals.length - 1 };
};
