import * as d3 from 'd3';
import common from '../story/common.json';
import { showTip, hideTip } from './tooltip.svelte.js';

const panels = new Map(common.panels.map((p) => [p.key, p]));

export const fill = (template, values) => template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);

// Hospital name, then the value of one metric, worded as in common.json.
export const metricTip = (d, key) => {
  const panel = panels.get(key);
  return [d.name, [fill(panel.tip, { value: d3.format(panel.format)(d[key]) })]];
};

// Attach hover tooltips to a selection; content(event, d) returns [title, lines] or null.
export const tips = (selection, active, content) =>
  selection
    .attr('pointer-events', active ? 'all' : 'none')
    .style('cursor', active ? 'pointer' : null)
    .on('pointermove', active ? (event, d) => {
      const tip = content(event, d);
      // Border takes the colour of the shape being hovered.
      if (tip) showTip(event, tip[0], tip[1], tip[2] ?? getComputedStyle(event.target).fill);
      else hideTip();
    } : null)
    .on('pointerleave', active ? hideTip : null);
