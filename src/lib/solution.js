import * as d3 from 'd3';
import story from '../story/solution.json';

const { layout: config } = story;

// Hospital outline with a tab on top: the tab holds the line chart, the body holds the front + back door blocks.
export const solutionLayout = (width) => {
  const s = (v) => v * width;
  const body = { left: s(config.body.left), right: s(config.body.right), top: s(config.body.top), bottom: s(config.body.bottom), r: s(config.body.radius) };
  const tab = { left: s(config.tab.left), right: s(config.tab.right), top: s(config.tab.top), r: s(config.tab.radius) };
  const outline = `M${tab.left},${body.top}V${tab.top + tab.r}A${tab.r},${tab.r} 0 0 1 ${tab.left + tab.r},${tab.top}H${tab.right - tab.r}A${tab.r},${tab.r} 0 0 1 ${tab.right},${tab.top + tab.r}V${body.top}H${body.right - body.r}A${body.r},${body.r} 0 0 1 ${body.right},${body.top + body.r}V${body.bottom - body.r}A${body.r},${body.r} 0 0 1 ${body.right - body.r},${body.bottom}H${body.left + body.r}A${body.r},${body.r} 0 0 1 ${body.left},${body.bottom - body.r}V${body.top + body.r}A${body.r},${body.r} 0 0 1 ${body.left + body.r},${body.top}Z`;
  const chart = { left: tab.left + s(config.chart.left), right: tab.right - s(config.chart.right), top: tab.top + s(config.chart.top), bottom: body.top - s(config.chart.bottom) };
  const middle = width / 2;
  const b = config.blocks;
  const top = body.top + s(b.top);
  const bottom = body.bottom - s(b.bottom);
  const rows = Math.ceil(d3.max(story.doors, (door) => door.blocks.length) / b.columns);
  const blockWidth = (middle - body.left - 2 * s(b.pad) - (b.columns - 1) * s(b.gap)) / b.columns;
  const blockHeight = (bottom - top - (rows - 1) * s(b.gap)) / rows;
  const doorLeft = [body.left + s(b.pad), middle + s(b.pad)];
  const doors = story.doors.map((door, d) => ({
    ...door,
    x: doorLeft[d] + (b.columns * blockWidth + (b.columns - 1) * s(b.gap)) / 2,
    y: body.top + s(config.doorY),
    blocks: door.blocks.map((parts, i) => ({
      parts,
      x: doorLeft[d] + (i % b.columns) * (blockWidth + s(b.gap)),
      y: top + Math.floor(i / b.columns) * (blockHeight + s(b.gap))
    }))
  }));
  return {
    outline,
    body,
    tab,
    chart,
    middle,
    doors,
    blockWidth,
    blockHeight,
    stroke: s(config.strokeShare),
    dash: [s(config.dashShare), s(config.dashGapShare)],
    yearY: body.top + s(config.yearY)
  };
};
