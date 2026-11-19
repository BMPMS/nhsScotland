import * as d3 from 'd3';
import { groupOf } from './groups.js';
import common from '../story/common.json';

export const commonPanels = (data, scotland) => {
  const group = groupOf(data);
  const eleven = d3.sort(data.filter((d) => group(d) === 'eleven'), (d) => d.shortName);
  return common.panels.map((panel) => ({
    ...panel,
    values: eleven.map((d) => ({ id: d.id, value: d[panel.key] })),
    average: panel.average === 'scotland' ? scotland[panel.key] : d3.mean(data, (d) => d[panel.key])
  }));
};

export const commonBars = (panels, layout) =>
  new Map(
    panels.map((p, i) => {
      const { rects, lineY } = barGeometry(p.values, [p.average], layout.panels[i]);
      return [p.key, { rects, averageY: lineY[0] }];
    })
  );

export const barGeometry = (values, lines, { bars, chart }) => {
  const y = d3.scaleLinear([0, d3.max([...values.map((v) => v.value), ...lines]) * common.headroom], [0, bars.height]);
  const x = d3.scaleBand(values.map((v) => v.id), [bars.left, bars.left + chart.width]).paddingInner(1 - common.barShare).paddingOuter((1 - common.barShare) / 2);
  return {
    rects: new Map(values.map((v) => [v.id, { x: x(v.id), y: bars.bottom - y(v.value), width: x.bandwidth(), height: y(v.value) }])),
    lineY: lines.map((v) => bars.bottom - y(v))
  };
};
