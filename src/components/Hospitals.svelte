<script>
  import * as d3 from 'd3';
  import { colours, groupColours, fontWeight, capHeight } from '../theme.js';
  import { hospitalPath, hospitalBox, outlinePath, outlineBox, outlineTab, personPath, personBox } from '../lib/paths.js';
  import { wrapLines } from '../lib/wrap.js';
  import { groupOf, elevenShare } from '../lib/groups.js';
  import tree from '../story/tree.json';
  import groups from '../story/groups.json';
  import { interpolate } from 'flubber';
  import { thirtyGrid, treeLayout, inTree, peopleLayout, stackLayout, lineLayout, commonLayout, ageLayout } from '../lib/layouts.js';
  import { commonPanels, commonBars } from '../lib/common.js';
  import scotland from '../data/scotland.json';
  import { transformPath } from '../lib/pathTransform.js';
  import stack from '../story/stack.json';
  import { stepPhase } from '../lib/phase.js';
  import { tips, metricTip, fill } from '../lib/tips.js';
  import steps from '../story/steps.json';

  let { divId, data, width, height, step, progress } = $props();

  const startingFill = [colours.blue, colours.navy];
  const stepIndex = (id) => steps.findIndex((s) => s.id === id);
  const visible = (opacity) => (opacity > 0.05 ? null : 'none');

  const group = $derived(groupOf(data));
  const share = $derived(elevenShare(data));
  const layout = $derived(treeLayout(data, width, height));
  const stacked = $derived(stackLayout(data, layout));
  const regrouped = $derived([stackLayout(data, layout, { last: [groups.exception] }), stackLayout(data, layout, { without: [groups.exception] })]);
  const lined = $derived(lineLayout(data, stacked, width));
  const bars = $derived(commonBars(commonPanels(data, scotland), commonLayout(stacked, width)));

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
      const area = d3
        .area()
        .x((p) => p.x - box.x)
        .y0((p) => p.y0 - box.y)
        .y1((p) => p.y1 - box.y);
      const layer = area(stacked.layers.get(d.id));
      const segment = { maxSegmentLength: width * stack.segmentShare };
      const eightLine = transformPath(lined.eight.paths.get(group(d)), 1, 1, -box.x, -box.y);
      const barAt = (key) => {
        const r = bars.get(key).rects.get(d.id);
        return r && `M${r.x - box.x},${r.y - box.y}H${r.x + r.width - box.x}V${r.y + r.height - box.y}H${r.x - box.x}Z`;
      };
      const [startLayer, endLayer] = regrouped.map((s) => area(s.layers.get(d.id)));
      const barArea = (key) => {
        const r = bars.get(key).rects.get(d.id);
        const points = stacked.layers.get(d.id);
        return r && area(points.map((p, i) => ({ x: r.x + (r.width * i) / (points.length - 1), y0: r.y + r.height, y1: r.y })));
      };
      return {
        ...d,
        startingColor,
        startingPosition: { x, y },
        startingSize: { width: w, height: h },
        treeColor: inTree(d) ? startingColor : groupColours[group(d)],
        treePosition: { x: box.x, y: box.y },
        treeSize: { width: box.width, height: box.height },
        strokeColor: groupColours[group(d)],
        shortlistColor: groupColours[groupOf(data, [groups.exception])(d)],
        small: !inTree(d),
        people: people.get(d.id),
        morph: interpolate(outlineAt(box.width, box.height, layout.stroke), layer, segment),
        toLine: interpolate(layer, transformPath(lined.twelve.paths.get(group(d)), 1, 1, -box.x, -box.y), segment),
        regroup: d3.interpolate(startLayer, endLayer),
        toEight: interpolate(transformPath(lined.twelve.paths.get(group(d)), 1, 1, -box.x, -box.y), eightLine, segment),
        toBar: group(d) === 'eleven' && interpolate(eightLine, barAt('waits2025'), segment),
        fromBar: group(d) === 'eleven' && d3.interpolate(barArea('occupancy'), startLayer)
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
    const toBars = stepPhase('common', 'lines', step, progress);
    const inBeds = stepPhase('beds', 'fadeOut', step, progress) > 0;
    const ageOut = 1 - stepPhase('age', 'fadeOut', step, progress);
    const back = stepPhase('beds', 'back', step, progress);
    const regroup = stepPhase('beds', 'regroup', step, progress);
    const leave = back > 0 ? back * ageOut : 1 - stepPhase('common', 'fadeOut', step, progress);
    const colour = (d) => (inBeds && d.id === groups.exception ? colours.blue : d3.interpolateRgb(d.strokeColor, d.shortlistColor)(regroup));
    const { stroke } = layout;
    const baseFill = (d) => (d.small ? 1 : morph);
    const outlineOpacity = (d) => (inBeds ? (d.fromBar ? 1 : back) * ageOut : toBars > 0 && d.toBar ? +(toBars < 1) : outline * leave);

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
        if (inBeds) return d.fromBar && regroup === 0 ? d.fromBar(back) : d.regroup(regroup);
        if (toBars > 0 && d.toBar) return d.toBar(toBars);
        return toEight > 0 ? d.toEight(toEight) : toLines > 0 ? d.toLine(toLines) : morph > 0 ? d.morph(morph) : outlineAt(w, h, stroke);
      })
      .attr('fill', colour)
      .attr('fill-opacity', baseFill)
      .attr('stroke', colour)
      .attr('stroke-opacity', (d) => (d.small ? morph : 1))
      .attr('stroke-width', d3.interpolate(stroke, stroke * stack.seamShare)(morph))
      .attr('opacity', outlineOpacity)
      .attr('pointer-events', (d) => visible(outlineOpacity(d)));

    hospitalGroup.select('.peopleGroup').attr('opacity', appear * fade).attr('pointer-events', visible(appear * fade));
    hospitalGroup.select('.hospitalIcon').attr('pointer-events', visible(1 - outline));
    hospitalGroup.select('.hospitalTitle').attr('pointer-events', visible(outline * fade));

    const members = d3.group(data, group);
    const mode = [stepIndex('eleven'), stepIndex('pareto'), stepIndex('surge'), stepIndex('common'), stepIndex('beds')].includes(step) ? steps[step].id : null;
    const outlines = hospitalGroup.select('.hospitalOutline').style('transition', mode === 'surge' ? `opacity ${tree.hoverFadeMs}ms` : null);
    // Clear any hover fade left over when scrolling out of the line chart.
    if (mode !== 'surge') outlines.style('opacity', null);
    hospitalGroup
      .on('pointerenter.highlight', mode ? function (event, d) {
        // Lines: fade the other groups. Tree and stack: tint the hovered shape.
        if (mode === 'surge') outlines.style('opacity', (o) => (group(o) === group(d) ? null : tree.hoverFadeOpacity));
        else if (mode === 'eleven' || mode === 'pareto' || mode === 'beds') {
          const hover = mode === 'pareto' || mode === 'beds' ? tree.hoverStackOpacity : d.small ? tree.hoverSmallOpacity : Math.max(baseFill(d), tree.hoverOpacity);
          d3.select(this).select('.hospitalOutline').attr('fill-opacity', hover);
        }
      } : null)
      .on('pointerleave.highlight', mode ? function (event, d) {
        if (mode === 'surge') outlines.style('opacity', null);
        else if (mode !== 'common') d3.select(this).select('.hospitalOutline').attr('fill-opacity', baseFill(d));
      } : null);
    tips(hospitalGroup, mode, (event, d) => {
      if (mode === 'surge') return [groups.labels[group(d)], members.get(group(d)).map((m) => m.name)];
      // Stacked areas cover several years, so just the name.
      if (mode === 'pareto' || mode === 'beds') return [d.name, []];
      return metricTip(d, 'waits2025');
    });

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
    const keySize = width * groups.key.textShare;
    // Key sits top left: above the chart, on the legend row in the common step, else in the top margin.
    const commonGrid = commonLayout(stacked, width);
    const ageGrid = ageLayout(stacked, width, commonGrid, 0);
    const keyAt = (id) =>
      ['pareto', 'surge', 'beds'].includes(id)
        ? { x: stacked.left, y: stacked.top - width * groups.key.gapShare - groups.key.padBelow }
        : id === 'age'
          ? { x: ageGrid.columns[0], y: ageGrid.top - width * groups.key.gapShare - groups.key.padBelow }
          : id === 'common'
          ? { x: commonGrid.left, y: commonGrid.gridTop - keySize * stack.descentShare - groups.key.padBelow }
          : { x: stacked.left, y: width * groups.key.marginShare + keySize * capHeight };
    // Glide from the previous step's spot at the start of each step.
    const keyMove = d3.easeCubicInOut(Math.min(1, progress / groups.key.moveShare));
    const keyFrom = keyAt(steps[step - 1]?.id);
    const keyTo = keyAt(steps[step]?.id);
    const keyBaseline = d3.interpolate(keyFrom.y, keyTo.y)(keyMove);
    const keyLeft = d3.interpolate(keyFrom.x, keyTo.x)(keyMove);
    const keyGap = width * groups.key.gapShare;
    // Switch to the shortlist wording halfway through the key's move into the beds step.
    const shortlisted = step > stepIndex('beds') || (step === stepIndex('beds') && keyMove > 0.5);
    const chosenText = svg
      .select('.chosenText')
      .text(fill(shortlisted ? groups.key.shortlist : groups.key.eleven, { count: shortlisted ? groups.elevenCount - 1 : groups.elevenCount }))
      .attr('text-anchor', 'start')
      .attr('y', keyBaseline)
      .attr('font-size', keySize);
    const chosenHeight = keySize * groups.key.iconScale;
    const chosenWidth = (chosenHeight * hospitalBox.width) / hospitalBox.height;
    const chosenX = keyLeft;
    chosenText.attr('x', keyLeft + chosenWidth + keyGap);
    svg
      .select('.chosenIcon')
      .attr('transform', `translate(${chosenX},${keyBaseline - (keySize * capHeight + chosenHeight) / 2}) scale(${chosenWidth / hospitalBox.width},${chosenHeight / hospitalBox.height}) translate(${-hospitalBox.x},${-hospitalBox.y})`);
    svg.select('.chosenKey').attr('opacity', stepPhase('pareto', 'fade', step, progress) * (1 - stepPhase('flow', 'fadeOut', step, progress)));
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
    const keyLeading = noteSize * tree.keyLeading;
    const keyFirst = smallY + (smallHeight + noteSize * capHeight - (tree.keyLabel.length - 1) * keyLeading) / 2;
    const keyLines = svg
      .select('.keyText')
      .attr('font-size', noteSize)
      .selectAll('tspan')
      .attr('x', width - layout.side)
      .attr('y', (d, i) => keyFirst + i * keyLeading);
    const keyX = width - layout.side - d3.max(keyLines.nodes(), (node) => node.getComputedTextLength()) - gap - keyWidth;
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
      .attr('opacity', back > 0 ? back * ageOut : axis * (1 - toLines));

    svg
      .selectAll('.stackTitle')
      .attr('x', stacked.centre)
      .attr('y', stacked.titleY)
      .attr('font-size', labelSize);
    svg.select('.stackTitle.twelve').attr('opacity', back > 0 ? back * ageOut : axis * (1 - toEight));
    svg.select('.stackTitle.eight').attr('opacity', back > 0 ? 0 : toEight * leave);

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
      .attr('opacity', axis * leave);
  });
</script>

<g id={divId}>
  <g class="hospitalsGroup"></g>
  <text class="treeTitle" text-anchor="middle" fill={colours.navy} font-weight={fontWeight.regular}>
In 2025, <tspan class="big" font-weight={fontWeight.semibold}>{groups.elevenCount}</tspan> hospitals accounted for <tspan class="big" font-weight={fontWeight.semibold}>{share}%</tspan> of the 12+ hour waiting times.
  </text>
  <text class="treeNote" fill={colours.slate}>{fill(tree.smallLabel, tree)}</text>
  <g class="peopleKey">
    <path class="keyIcon" d={personPath} fill={colours.slate} />
    <text class="keyText" text-anchor="end" fill={colours.slate}>
      {#each tree.keyLabel as line, i (i)}<tspan>{fill(line, tree)}</tspan>{/each}
    </text>
  </g>
  <g class="chosenKey" pointer-events="none">
    <path class="chosenIcon" d={hospitalPath} fill={colours.red} />
    <text class="chosenText" fill={colours.slate}></text>
  </g>
  <text class="stackTop" fill={colours.slate}>100%</text>
  <g class="stackYears"></g>
  <text class="stackTitle twelve" text-anchor="middle" fill={colours.slate}>12+ hour waiting time history</text>
  <text class="stackTitle eight" text-anchor="middle" fill={colours.slate}>8+ hour waiting time history</text>
</g>
