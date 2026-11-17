import * as d3 from 'd3';
import { capHeight } from '../theme.js';
import { hospitalBox, outlineTab, personBox } from './paths.js';
import thirty from '../story/thirty.json';
import tree from '../story/tree.json';
import stack from '../story/stack.json';
import lines from '../story/lines.json';
import groups from '../story/groups.json';
import years from '../data/years.json';
import { groupOf } from './groups.js';

export const iconAspect = hospitalBox.width / hospitalBox.height;
export const iconShare = 0.9;
export const sidePadding = 5;
const bottomShare = 0.03;
const cornerCount = 4;

const inHole = ([c, r]) => {
  const { hole } = thirty;
  return c >= hole.col && c < hole.col + hole.cols && r >= hole.row && r < hole.row + hole.rows;
};

const gridCells = (count) => {
  const rows = Math.ceil((count + thirty.hole.cols * thirty.hole.rows) / thirty.cols);
  return d3
    .cross(d3.range(rows), d3.range(thirty.cols))
    .map(([r, c]) => [c, r])
    .filter((cell) => !inHole(cell))
    .slice(0, count);
};

export const thirtyGrid = (count, width, height) => {
  const cells = gridCells(count);
  const rows = d3.max(cells, (d) => d[1]) + 1;
  const cell = (width - 2 * sidePadding) / thirty.cols;
  const iconWidth = cell * iconShare;
  const iconHeight = iconWidth / iconAspect;
  const cellHeight = iconHeight + cell - iconWidth;
  const gridTop = height - sidePadding - height * bottomShare - rows * cellHeight;
  const boxes = cells.map(([c, r]) => ({
    x: sidePadding + c * cell + (cell - iconWidth) / 2,
    y: gridTop + r * cellHeight + (cellHeight - iconHeight) / 2,
    width: iconWidth,
    height: iconHeight
  }));
  return { cells, cell, cellHeight, gridTop, boxes };
};

const fitCorner = (leaves, gap, lift) => {
  const corner = leaves.slice(-cornerCount);
  const above = leaves.at(-cornerCount - 1);
  const x0 = d3.min(corner, (l) => l.x0);
  const x1 = d3.max(corner, (l) => l.x1);
  const y0 = d3.min(corner, (l) => l.y0) - lift;
  const y1 = d3.max(corner, (l) => l.y1);
  const width = (x1 - x0 - gap) / 2;
  const height = (width / iconAspect) * tree.cornerBottomShare;
  const split = x0 + (x1 - x0 - gap) * tree.cornerSplit;
  const [topLeft, topRight, bottomLeft, bottomRight] = corner;
  above.y1 -= lift;
  [
    [topLeft, x0, split, y0, y1 - height - gap],
    [topRight, split + gap, x1, y0, y1 - height - gap],
    [bottomLeft, x0, x0 + width, y1 - height, y1],
    [bottomRight, x1 - width, x1, y1 - height, y1]
  ].forEach(([leaf, left, right, top, bottom]) => Object.assign(leaf, { x0: left, x1: right, y0: top, y1: bottom }));
};

export const inTree = (d) => d.waits2025 >= tree.minWaits;

export const peopleCount = (d) => Math.round(d.waits2025 / tree.perPerson);

export const treeLayout = (data, width, height) => {
  const side = width * tree.sideShare;
  const top = height * tree.topShare;
  const gap = width * tree.gapShare;
  const stroke = width * tree.strokeShare;
  const root = d3
    .hierarchy({ children: data.filter(inTree) })
    .sum(peopleCount)
    .sort((a, b) => b.value - a.value);
  d3.treemap().tile(d3.treemapSquarify).size([width - 2 * side, height - 2 * top]).paddingInner(gap)(root);
  const leaves = root.leaves();
  fitCorner(leaves, gap, width * tree.cornerLiftShare);
  const boxes = new Map(leaves.map((l) => [l.data.id, { x: side + l.x0, y: top + l.y0, width: l.x1 - l.x0, height: l.y1 - l.y0 }]));
  const smallHeight = top * tree.smallShare;
  const smallWidth = smallHeight * iconAspect;
  const smallY = height - (top + smallHeight) / 2;
  const smallGap = smallWidth * tree.smallGapShare;
  const group = groupOf(data);
  const small = d3.sort(
    data.filter((d) => !inTree(d)),
    (d) => tree.smallOrder.indexOf(group(d)),
    (d) => -d.waits2025
  );
  small.forEach((d, i) => boxes.set(d.id, { x: side + i * (smallWidth + smallGap), y: smallY, width: smallWidth, height: smallHeight }));
  return { boxes, width, height, side, top, gap, stroke, smallEnd: side + small.length * (smallWidth + smallGap), smallY, smallHeight };
};

const personAspect = personBox.width / personBox.height;

const bodyOf = ({ width, height }, stroke) => {
  const top = stroke + (height - stroke) * outlineTab.height + stroke / 2;
  return { x: 1.5 * stroke, y: top, width: width - 3 * stroke, height: height - 1.5 * stroke - top };
};

const interiorOf = ({ width, height }, stroke) => ({ x: stroke, y: 1.5 * stroke, width: width - 2 * stroke, height: height - 2.5 * stroke });

const gridsFor = (count) => d3.range(1, count + 1).map((cols) => ({ cols, rows: Math.ceil(count / cols) }));

const cellWidth = 1 + tree.peopleGapShare;
const cellHeight = (1 + tree.peopleGapShare) / personAspect;

const gridScale = (body, { cols, rows }) => Math.min(body.width / (cols * cellWidth), body.height / (rows * cellHeight));

export const peopleLayout = (data, layout) => {
  const filled = data.filter(inTree).map((d) => ({ d, count: peopleCount(d), body: (peopleCount(d) === 1 ? interiorOf : bodyOf)(layout.boxes.get(d.id), layout.stroke) }));
  const personWidth = layout.width * tree.personShare;
  const personHeight = personWidth / personAspect;
  const people = new Map(data.map((d) => [d.id, []]));
  filled.forEach(({ d, count, body }) => {
    const { cols, rows } = d3.greatest(gridsFor(count), (grid) => gridScale(body, grid));
    people.set(
      d.id,
      d3.range(count).map((i) => ({
        id: `${d.id}-${i}`,
        x: body.x + ((i % cols) + 0.5) * (body.width / cols) - personWidth / 2,
        y: count === 1 ? body.y : body.y + (Math.floor(i / cols) + 0.5) * (body.height / rows) - personHeight / 2,
        width: personWidth,
        height: personHeight
      }))
    );
  });
  return people;
};

export const stackLayout = (data, layout) => {
  const { width, side, top } = layout;
  const group = groupOf(data);
  const order = d3.sort(data, (d) => groups.stackOrder.indexOf(group(d)), (d) => -d.waits2025);
  const totals = years.map((y, i) => d3.sum(data, (d) => d.waitsByYear[i].waits));
  const start = years[0].year;
  const end = years.at(-1).year + years.at(-1).months / 12;
  const points = [{ t: start, i: 0 }, ...years.map((y, i) => ({ t: y.year + y.months / 24, i })), { t: end, i: years.length - 1 }];
  const table = points.map(({ t, i }) => ({ t, ...Object.fromEntries(data.map((d) => [d.id, d.waitsByYear[i].waits / totals[i]])) }));
  const series = d3.stack().keys(order.map((d) => d.id))(table);
  const left = side + width * stack.leftShare;
  const right = width - side - width * stack.rightShare;
  const labelSize = top * stack.labelShare;
  const titleY = layout.height - labelSize * stack.descentShare;
  const yearY = titleY - labelSize * stack.lineHeight;
  const bottom = yearY - labelSize * capHeight - width * stack.yearGapShare;
  const patternSize = labelSize * stack.patternScale;
  const patternY = width * stack.yearGapShare + patternSize * capHeight;
  const chartTop = Math.max(bottom - (layout.smallY + layout.smallHeight - top), patternY + patternSize * stack.descentShare + width * stack.yearGapShare);
  const x = d3.scaleLinear([start, end], [left, right]);
  const y = d3.scaleLinear([0, 1], [bottom, chartTop]);
  return {
    layers: new Map(series.map((s) => [s.key, s.map((p) => ({ x: x(p.data.t), y0: y(p[0]), y1: y(p[1]) }))])),
    years: years.map(({ year }) => ({ year, x: x(year) })),
    x,
    start,
    end,
    points,
    left,
    right,
    top: chartTop,
    y,
    patternY,
    patternSize,
    bottom,
    yearY,
    titleY,
    centre: (left + right) / 2,
    labelSize
  };
};

const sampleCurve = (line) => {
  const samples = [];
  const context = {
    moveTo: (x, y) => samples.push([x, y]),
    lineTo: (x, y) => samples.push([x, y]),
    bezierCurveTo: (x1, y1, x2, y2, x, y) => {
      const [x0, y0] = samples.at(-1);
      d3.range(1, lines.samples + 1).forEach((step) => {
        const t = step / lines.samples;
        const u = 1 - t;
        samples.push([
          u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
          u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y
        ]);
      });
    },
    closePath: () => {}
  };
  d3.line().curve(d3.curveMonotoneX).context(context)(line);
  return samples;
};

const ribbon = (samples, thickness) => {
  const offset = samples.map(([x, y], i) => {
    const [ax, ay] = samples[Math.max(0, i - 1)];
    const [bx, by] = samples[Math.min(samples.length - 1, i + 1)];
    const length = Math.hypot(bx - ax, by - ay) || 1;
    return [(-(by - ay) / length) * (thickness / 2), ((bx - ax) / length) * (thickness / 2)];
  });
  const side = (sign) => samples.map(([x, y], i) => [x + sign * offset[i][0], y + sign * offset[i][1]]);
  return d3.line()([...side(1), ...side(-1).reverse()]) + 'Z';
};

export const lineLayout = (data, stacked, width) => {
  const group = groupOf(data);
  const { x, points, left, top, bottom } = stacked;
  const members = d3.groups(data, group);
  const rates = (metric) =>
    members.map(([key, list]) => ({
      key,
      count: list.length,
      values: points.map(({ t, i }) => ({ t, rate: (1000 * d3.sum(list, (d) => d.waitsByYear[i][metric])) / d3.sum(list, (d) => d.waitsByYear[i].attendances) }))
    }));
  const chart = (metric) => {
    const series = rates(metric);
    const y = d3
      .scaleLinear([0, d3.max(series, (s) => d3.max(s.values, (v) => v.rate))], [bottom, top])
      .nice(lines.ticks);
    const paths = new Map(
      series.map(({ key, count, values }) => [key, ribbon(sampleCurve(values.map(({ t, rate }) => [x(t), y(rate)])), width * lines.thicknessShare * count)])
    );
    return { y, paths, ticks: y.ticks(lines.ticks).filter((v) => v > 0) };
  };
  return {
    twelve: chart('waits'),
    eight: chart('waits8'),
    covid: { x0: x(lines.covidStart), x1: x(lines.covidEnd) },
    left,
    top,
    bottom
  };
};
