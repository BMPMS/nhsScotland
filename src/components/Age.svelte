<script>
  import * as d3 from 'd3';
  import { colours, fontWeight, capHeight } from '../theme.js';
  import { treeLayout, stackLayout, commonLayout, panelBox, miniHeight, ageLayout } from '../lib/layouts.js';
  import { barGeometry } from '../lib/common.js';
  import { groupOf } from '../lib/groups.js';
  import { fitSize } from '../lib/wrap.js';
  import { stepPhase } from '../lib/phase.js';
  import { tips, metricTip } from '../lib/tips.js';
  import steps from '../story/steps.json';
  import { standingPath, standingWidth, standingBox, olderPath, olderWidth } from '../lib/paths.js';
  import common from '../story/common.json';
  import groups from '../story/groups.json';
  import age from '../story/age.json';
  import scotland from '../data/scotland.json';

  let { divId, data, width, height, step, progress } = $props();

  const stacked = $derived(stackLayout(data, treeLayout(data, width, height)));
  const panels = $derived(commonLayout(stacked, width));
  const shortlist = $derived(d3.sort(data.filter((d) => groupOf(data, [groups.exception])(d) === 'eleven'), (d) => d.shortName));
  const shares = age.squares.map((s) => scotland[s.key] / 100);
  const fill = (text) => text.replace('{share}', Math.round(scotland.olderShare));
  const waitsLabel = common.panels.find((p) => p.key === 'waits2025').label;

  $effect(() => {
    const phase = (key) => stepPhase('age', key, step, progress);
    const svg = d3.select(`#${divId}`).attr('opacity', 1 - stepPhase('flow', 'fadeOut', step, progress));
    const { size, inset, band, labelSize } = panels;
    const labelFit = fitSize(svg.select('.measure').node(), common.panels.map((p) => p.label), size - 2 * inset, labelSize);
    svg.select('.measure').text('');
    const panelHeight = miniHeight(panels, labelFit);
    const layout = ageLayout(stacked, width, panels, panelHeight);
    const box = panelBox(layout.columns[0], layout.top, size);
    const { rects, lineY } = barGeometry(shortlist.map((d) => ({ id: d.id, value: d.waits2025 })), [d3.mean(data, (d) => d.waits2025)], box);
    const dash = width * common.dashShare;

    const waits = svg.select('.waits').attr('opacity', phase('waits'));
    waits.select('.back').attr('x', box.x).attr('y', box.y).attr('width', size).attr('height', panelHeight).attr('rx', size * common.cornerShare);
    waits.select('.chart').attr('x', box.chart.x).attr('y', box.chart.y).attr('width', box.chart.width).attr('height', box.chart.height);
    waits
      .select('.waitsLabel')
      .attr('x', box.x + size / 2)
      .attr('y', box.y + size - band + labelFit * (common.miniLabelGap + capHeight))
      .attr('font-size', labelFit);
    const bar = waits
      .select('.bars')
      .selectAll('.bar')
      .data(shortlist, (d) => d.id)
      .join((group) => {
        const enter = group.append('rect').attr('class', 'bar').attr('fill', colours.red);
        return enter;
      });
    tips(bar, steps[step]?.id === 'age' && phase('waits') > 0.5, (event, d) => metricTip(d, 'waits2025'));
    bar
      .attr('x', (d) => rects.get(d.id).x)
      .attr('y', (d) => rects.get(d.id).y)
      .attr('width', (d) => rects.get(d.id).width)
      .attr('height', (d) => rects.get(d.id).height);
    waits
      .select('.average')
      .attr('x1', box.chart.x)
      .attr('x2', box.chart.x + box.chart.width)
      .attr('y1', lineY[0])
      .attr('y2', lineY[0])
      .attr('stroke-width', width * common.averageStrokeShare)
      .attr('stroke-dasharray', `${dash} ${dash * 0.75}`);

    svg
      .selectAll('.sentence')
      .attr('x', width / 2)
      .attr('y', (d, i) => layout.sentenceY[i])
      .attr('font-size', stacked.patternSize)
      .attr('opacity', (d, i) => phase(`sentence${i + 1}`));

    const { squareWidth: w, squareHeight: h } = layout;
    const bandPad = w * age.bandPadShare;
    const bandText = labelFit * age.bandTextScale;
    const iconSize = bandText * age.iconScale;
    const labelEnd = bandPad * 1.5 + (olderWidth * iconSize) / standingBox.height + svg.select('.bandLabel').attr('font-size', bandText).node().getComputedTextLength();
    const valueWidth = d3.max(svg.selectAll('.value').attr('font-size', bandText).nodes(), (node) => node.getComputedTextLength()) / bandText;
    const valueSize = Math.min(bandText * age.valueScale, (w - labelEnd - 2 * bandPad) / valueWidth, (h * d3.min(shares) - 2 * bandPad) / capHeight);
    const icon = (x, y, h) => `translate(${x},${y - standingBox.y * (h / standingBox.height)}) scale(${h / standingBox.height})`;
    svg.selectAll('.square').each(function (d, i) {
      const g = d3.select(this).attr('opacity', Math.min(1, phase(`square${i + 1}`) * 2));
      const x = layout.squareColumns[i];
      const y = layout.squareTop;
      const grow = phase(`square${i + 1}`);
      const bandHeight = h * shares[i] * grow;
      g.select('.navy').attr('x', x).attr('y', y).attr('width', w).attr('height', h);
      g.select('.band').attr('x', x).attr('y', y).attr('width', w).attr('height', bandHeight);
      g.select('.olderIcon').attr('transform', icon(x + bandPad, y + bandPad, iconSize)).attr('opacity', grow);
      g.select('.bandLabel').attr('x', x + bandPad * 1.5 + (olderWidth * iconSize) / standingBox.height).attr('y', y + bandPad + (iconSize + bandText * capHeight) / 2).attr('font-size', bandText).attr('opacity', grow);
      g.select('.value').attr('x', x + w - bandPad).attr('y', y + bandHeight - bandPad).attr('font-size', valueSize).attr('opacity', grow);
      g.select('.standing').attr('transform', icon(x + w / 2 - (standingWidth * iconSize) / standingBox.height / 2, y + bandHeight + (h - bandHeight - iconSize) / 2, iconSize));
      g.select('.squareLabel').attr('x', x + w / 2).attr('y', layout.labelY).attr('font-size', labelFit);
    });
  });
</script>

<g id={divId} pointer-events="none">
  <text class="measure" opacity="0" font-weight={fontWeight.semibold}></text>
  <g class="waits">
    <rect class="back" fill={colours.mist} />
    <rect class="chart" fill={colours.white} />
    <g class="bars"></g>
    <line class="average" stroke={colours.slate} />
    <text class="waitsLabel" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>{waitsLabel}</text>
  </g>
  {#each age.sentences as sentence, i (i)}
    <text class="sentence" text-anchor="middle" fill={colours.navy}>{#each sentence as part, j (j)}{j ? ' ' : ''}<tspan font-weight={part.bold ? fontWeight.semibold : fontWeight.regular}>{fill(part.text)}</tspan>{/each}</text>
  {/each}
  {#each age.squares as s (s.key)}
    <g class="square">
      <rect class="navy" fill={colours.navy} />
      <rect class="band" fill={colours.blue} />
      <path class="olderIcon" d={olderPath} fill={colours.white} />
      <text class="bandLabel" fill={colours.white}>{s.band}</text>
      <text class="value" text-anchor="end" fill={colours.white}>{Math.round(scotland[s.key])}%</text>
      <path class="standing" d={standingPath} fill={colours.white} />
      <text class="squareLabel" text-anchor="middle" fill={colours.navy} font-weight={fontWeight.semibold}>{s.label}</text>
    </g>
  {/each}
</g>
