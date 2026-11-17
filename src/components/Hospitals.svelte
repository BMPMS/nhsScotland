<script>
  import * as d3 from 'd3';
  import { colours, groupColours, fontWeight, capHeight } from '../theme.js';
  import { hospitalPath, hospitalBox, outlinePath, outlineBox, outlineTab, personPath, personBox } from '../lib/paths.js';
  import { wrapLines } from '../lib/wrap.js';
  import { groupOf, elevenShare } from '../lib/groups.js';
  import tree from '../story/tree.json';
  import groups from '../story/groups.json';
  import { interpolate } from 'flubber';
  import { thirtyGrid, treeLayout, inTree, peopleLayout, stackLayout, lineLayout } from '../lib/layouts.js';
  import { transformPath } from '../lib/pathTransform.js';
  import stack from '../story/stack.json';
  import { stepPhase } from '../lib/phase.js';

  let { divId, data, width, height, step, progress } = $props();

  const startingFill = [colours.blue, colours.navy];

  const group = $derived(groupOf(data));
  const share = $derived(elevenShare(data));
  const layout = $derived(treeLayout(data, width, height));
  const stacked = $derived(stackLayout(data, layout));
  const lined = $derived(lineLayout(data, stacked, width));

  const outlineAt = (w, h, stroke) => {
    const sx = (w - stroke) / outlineBox.width;
    const sy = (h - stroke) / outlineBox.height;
    return transformPath(outlinePath, sx, sy, stroke / 2 - outlineBox.x * sx, stroke / 2 - outlineBox.y * sy);
  };

  const hospitals = $derived.by(() => {
    const grid = thirtyGrid(data.length, width, height);
    const people = peopleLayout(data, layout);
    return data.map((d, i) => {
      const { x, y, width: w, height: h } = grid.boxes[i];
      const box = layout.boxes.get(d.id);
      const startingColor = startingFill[(grid.cells[i][0] + grid.cells[i][1]) % 2];
      const layer = d3
        .area()
        .x((p) => p.x - box.x)
        .y0((p) => p.y0 - box.y)
        .y1((p) => p.y1 - box.y)(stacked.layers.get(d.id));
      const segment = { maxSegmentLength: width * stack.segmentShare };
      return {
        ...d,
        startingColor,
        startingPosition: { x, y },
        startingSize: { width: w, height: h },
        treeColor: inTree(d) ? startingColor : groupColours[group(d)],
        treePosition: { x: box.x, y: box.y },
        treeSize: { width: box.width, height: box.height },
        strokeColor: groupColours[group(d)],
        small: !inTree(d),
        people: people.get(d.id),
        morph: interpolate(outlineAt(box.width, box.height, layout.stroke), layer, segment),
        toLine: interpolate(layer, transformPath(lined.twelve.paths.get(group(d)), 1, 1, -box.x, -box.y), segment),
        toEight: interpolate(transformPath(lined.twelve.paths.get(group(d)), 1, 1, -box.x, -box.y), transformPath(lined.eight.paths.get(group(d)), 1, 1, -box.x, -box.y), segment)
      };
    });
  });

  $effect(() => {
    const t = stepPhase('eleven', 'move', step, progress);
    const outline = stepPhase('eleven', 'outline', step, progress);
    const appear = stepPhase('eleven', 'people', step, progress);
    const fade = 1 - stepPhase('pareto', 'fade', step, progress);
    const morph = stepPhase('pareto', 'morph', step, progress);
    const axis = stepPhase('pareto', 'axis', step, progress);
    const toLines = stepPhase('surge', 'lines', step, progress);
    const toEight = stepPhase('surge', 'eight', step, progress);
    const { stroke } = layout;

    const hospitalGroup = d3
      .select(`#${divId} .hospitalsGroup`)
      .selectAll('.hospitalGroup')
      .data(hospitals, (d) => d.id)
      .join((group) => {
        const enter = group.append('g').attr('class', 'hospitalGroup');
        enter.append('path').attr('class', 'hospitalIcon').attr('d', hospitalPath);
        enter.append('path').attr('class', 'hospitalOutline');
        enter.append('g').attr('class', 'peopleGroup');
        enter.append('text').attr('class', 'hospitalTitle').attr('text-anchor', 'middle').attr('font-weight', fontWeight.regular).attr('fill', colours.slate);
        return enter;
      });

    hospitalGroup.attr('transform', (d) => {
      const x = d3.interpolate(d.startingPosition.x, d.treePosition.x)(t);
      const y = d3.interpolate(d.startingPosition.y, d.treePosition.y)(t);
      return `translate(${x},${y})`;
    });

    const size = (d) => ({
      w: d3.interpolate(d.startingSize.width, d.treeSize.width)(t),
      h: d3.interpolate(d.startingSize.height, d.treeSize.height)(t)
    });

    hospitalGroup
      .select('.hospitalIcon')
      .attr('transform', (d) => {
        const { w, h } = size(d);
        return `scale(${w / hospitalBox.width},${h / hospitalBox.height}) translate(${-hospitalBox.x},${-hospitalBox.y})`;
      })
      .attr('fill', (d) => d3.interpolateRgb(d.startingColor, d.treeColor)(t))
      .attr('opacity', 1 - outline);

    hospitalGroup
      .select('.hospitalOutline')
      .attr('d', (d) => {
        const { w, h } = size(d);
        return toEight > 0 ? d.toEight(toEight) : toLines > 0 ? d.toLine(toLines) : morph > 0 ? d.morph(morph) : outlineAt(w, h, stroke);
      })
      .attr('fill', (d) => d.strokeColor)
      .attr('fill-opacity', (d) => (d.small ? 1 : morph))
      .attr('stroke', (d) => d.strokeColor)
      .attr('stroke-opacity', (d) => (d.small ? morph : 1))
      .attr('stroke-width', d3.interpolate(stroke, stroke * stack.seamShare)(morph))
      .attr('opacity', outline);

    hospitalGroup.select('.peopleGroup').attr('opacity', appear * fade);

    const peopleGroupItems = hospitalGroup
      .select('.peopleGroup')
      .selectAll('.peopleGroupItems')
      .data((d) => d.people.map((person) => ({ ...person, colour: d.strokeColor })), (p) => p.id)
      .join((group) => {
        const enter = group.append('g').attr('class', 'peopleGroupItems');
        enter.append('path').attr('class', 'peopleSvg').attr('d', personPath);
        return enter;
      });

    peopleGroupItems.attr('transform', (p) => `translate(${p.x},${p.y})`);

    peopleGroupItems
      .select('.peopleSvg')
      .attr('transform', (p) => `scale(${p.width / personBox.width},${p.height / personBox.height}) translate(${-personBox.x},${-personBox.y})`)
      .attr('fill', (p) => p.colour);

    const nameSize = width * tree.nameShare;

    hospitalGroup.select('.hospitalTitle').each(function (d) {
      const w = d.treeSize.width - stroke;
      const h = d.treeSize.height - stroke;
      const tabWidth = w * outlineTab.width - 2 * stroke;
      const tabHeight = h * outlineTab.height - stroke;
      const text = d3.select(this).attr('font-size', nameSize);
      const fit = (name) => {
        const measure = text.selectAll('tspan').data([name]).join('tspan').text(name);
        const lines = wrapLines(measure.node(), name.split(' '), tabWidth);
        return { lines, fits: lines.length <= tree.nameLines && d3.max(lines, (l) => l.width) <= tabWidth && lines.length * nameSize <= tabHeight };
      };
      const full = fit(d.name);
      const { lines, fits } = full.fits ? full : fit(d.shortName);
      const centreX = stroke / 2 + w * (outlineTab.x + outlineTab.width / 2);
      const centreY = stroke + (h * outlineTab.height) / 2;
      text
        .selectAll('tspan')
        .data(lines)
        .join('tspan')
        .text((l) => l.text)
        .attr('x', centreX)
        .attr('y', (l, i) => centreY + (i - (lines.length - 1) / 2) * nameSize + (nameSize * capHeight) / 2);
      text.attr('opacity', fits ? outline * fade : 0);
    });

    const { top, gap, smallEnd, smallY, smallHeight } = layout;
    const titleSize = top * tree.titleShare;
    const bigSize = titleSize * tree.titleBigScale;
    const noteSize = smallHeight * tree.noteShare;
    const svg = d3.select(`#${divId}`);
    const title = svg
      .select('.treeTitle')
      .attr('x', width / 2)
      .attr('y', (top + bigSize * capHeight) / 2)
      .attr('font-size', titleSize)
      .attr('opacity', outline * fade);
    title.selectAll('.big').attr('font-size', bigSize);
    svg
      .select('.treeNote')
      .attr('x', smallEnd + gap)
      .attr('y', smallY + (smallHeight + noteSize * capHeight) / 2)
      .attr('font-size', noteSize)
      .attr('opacity', outline * fade);

    const keyWidth = width * tree.personShare;
    const keyHeight = (keyWidth * personBox.height) / personBox.width;
    const keyText = svg
      .select('.keyText')
      .attr('x', width - layout.side)
      .attr('y', smallY + (smallHeight + noteSize * capHeight) / 2)
      .attr('font-size', noteSize);
    const keyX = width - layout.side - keyText.node().getComputedTextLength() - gap - keyWidth;
    svg
      .select('.keyIcon')
      .attr('transform', `translate(${keyX},${smallY + (smallHeight - keyHeight) / 2}) scale(${keyWidth / personBox.width},${keyHeight / personBox.height}) translate(${-personBox.x},${-personBox.y})`);
    svg.select('.peopleKey').attr('opacity', appear * fade);

    const { labelSize } = stacked;
    svg
      .select('.stackTop')
      .attr('x', stacked.right + width * stack.labelGapShare)
      .attr('y', stacked.top + labelSize * capHeight)
      .attr('font-size', labelSize)
      .attr('opacity', axis * (1 - toLines));

    svg
      .selectAll('.stackTitle')
      .attr('x', stacked.centre)
      .attr('y', stacked.titleY)
      .attr('font-size', labelSize);
    svg.select('.stackTitle.twelve').attr('opacity', axis * (1 - toEight));
    svg.select('.stackTitle.eight').attr('opacity', toEight);

    const stackYear = svg
      .select('.stackYears')
      .selectAll('.stackYear')
      .data(stacked.years, (y) => y.year)
      .join((group) => {
        const enter = group.append('text').attr('class', 'stackYear').attr('text-anchor', 'middle').attr('fill', colours.slate);
        return enter;
      });

    stackYear
      .text((y) => y.year)
      .attr('x', (y) => y.x)
      .attr('y', stacked.yearY)
      .attr('font-size', labelSize)
      .attr('opacity', axis);
  });
</script>

<g id={divId}>
  <g class="hospitalsGroup"></g>
  <text class="treeTitle" text-anchor="middle" fill={colours.navy} font-weight={fontWeight.regular}>
In 2025, <tspan class="big" font-weight={fontWeight.semibold}>{groups.elevenCount}</tspan> hospitals accounted for <tspan class="big" font-weight={fontWeight.semibold}>{share}%</tspan> of the 12+ hour waiting times.
  </text>
  <text class="treeNote" fill={colours.slate}>&lt; {tree.minWaits} 12+ hour waits</text>
  <g class="peopleKey">
    <path class="keyIcon" d={personPath} fill={colours.slate} />
    <text class="keyText" text-anchor="end" fill={colours.slate}>= {tree.perPerson} waits</text>
  </g>
  <text class="stackTop" fill={colours.slate}>100%</text>
  <g class="stackYears"></g>
  <text class="stackTitle twelve" text-anchor="middle" fill={colours.slate}>12+ hour waiting time history</text>
  <text class="stackTitle eight" text-anchor="middle" fill={colours.slate}>8+ hour waiting time history</text>
</g>
