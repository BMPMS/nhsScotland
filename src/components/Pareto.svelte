<script>
  import * as d3 from 'd3';
  import { colours, fontWeight, capHeight } from '../theme.js';
  import { treeLayout, stackLayout, commonLayout, panelBox, miniHeight, ageLayout } from '../lib/layouts.js';
  import { fitSize } from '../lib/wrap.js';
  import { barGeometry } from '../lib/common.js';
  import { groupOf, elevenShare } from '../lib/groups.js';
  import { stepPhase } from '../lib/phase.js';
  import { tips, metricTip } from '../lib/tips.js';
  import steps from '../story/steps.json';
  import groups from '../story/groups.json';
  import pareto from '../story/pareto.json';
  import common from '../story/common.json';
  import scotland from '../data/scotland.json';

  let { divId, data, width, height, step, progress } = $props();

  const share = $derived(elevenShare(data));
  const tenShare = $derived(elevenShare(data, [groups.exception]));
  const shortlist = $derived(d3.sort(data.filter((d) => groupOf(data, [groups.exception])(d) === 'eleven'), (d) => d.shortName));
  const occupancy = $derived(d3.mean(shortlist, (d) => d.occupancy));
  const occupancyPanel = common.panels.find((p) => p.key === 'occupancy');
  const stacked = $derived(stackLayout(data, treeLayout(data, width, height)));
  const panels = $derived(commonLayout(stacked, width));

  $effect(() => {
    const phase = (key) => stepPhase('pareto', key, step, progress);
    const change = phase('switch');
    const out = 1 - stepPhase('surge', 'fadeOut', step, progress);
    const retitle = stepPhase('surge', 'retitle', step, progress);
    const retitle8 = stepPhase('surge', 'retitle8', step, progress);
    const leave = 1 - stepPhase('common', 'fadeOut', step, progress);
    const shown = (key) => phase(key) * out;
    const ageOut = 1 - stepPhase('age', 'fadeOut', step, progress);
    const move = stepPhase('age', 'move', step, progress);
    const ten = (key) => stepPhase('beds', key, step, progress) * (key === 'vital' ? 1 : ageOut);
    const inBeds = ten('back') > 0;
    const svg = d3.select(`#${divId}`);
    const { left, right, top, bottom, y, labelSize, patternY, patternSize, centre } = stacked;
    const pad = width * pareto.padShare;
    const topShare = (inBeds ? 100 - tenShare : d3.interpolate(pareto.paretoTop, 100 - share)(change)) / 100;
    const boundary = y(1 - topShare);
    const bandY = (top + boundary) / 2;
    const smallSize = labelSize * pareto.smallScale;
    const focus = svg.selectAll('.focus').attr('font-size', smallSize);
    focus.selectAll('.number').attr('font-size', labelSize * pareto.numberScale);
    const bigPct = svg.selectAll('.bigPct').attr('font-size', 1);
    const sentence = d3.min(focus.nodes(), (node, i) => (right - left - 3 * pad - node.getComputedTextLength()) / bigPct.nodes()[i].getComputedTextLength());
    const bigSize = Math.min((bottom - top) * pareto.bigShare, sentence);
    const bigY = boundary + pad + (bottom - top) * pareto.bigDrop + bigSize * capHeight;
    const versions = (selection, key) => {
      selection.filter('.pareto').attr('opacity', shown(key) * (1 - change));
      selection.filter('.ours').attr('opacity', shown(key) * change);
      selection.filter('.ten').attr('opacity', ten(key));
    };

    svg.selectAll('.pattern').attr('x', centre).attr('y', patternY).attr('font-size', patternSize);
    svg.select('.pattern.before').attr('opacity', phase('fade') * (1 - retitle));
    svg.select('.pattern.after').attr('opacity', retitle * (1 - retitle8));
    svg.select('.pattern.eight').attr('opacity', retitle8 * leave);
    svg.select('.pattern.shortlist').attr('opacity', ten('title'));

    svg
      .select('.overlay')
      .attr('x', left)
      .attr('y', top)
      .attr('width', right - left)
      .attr('height', boundary - top)
      .attr('fill-opacity', pareto.overlayOpacity)
      .attr('opacity', Math.max(shown('overlay'), ten('overlay')));

    const topSize = labelSize * pareto.topScale;
    const topPct = svg.selectAll('.topPct').attr('font-size', topSize);
    const topWidth = d3.max(topPct.nodes(), (node) => node.getComputedTextLength());
    const question = svg.select('.question').attr('font-size', 1);
    const questionSize = Math.min(labelSize * pareto.questionScale, (right - left - 3 * pad - topWidth) / question.node().getComputedTextLength());
    question
      .attr('x', left + pad)
      .attr('y', bandY + (questionSize * capHeight) / 2)
      .attr('font-size', questionSize)
      .attr('opacity', shown('question'));

    topPct.attr('x', right - pad).attr('y', bandY + (topSize * capHeight) / 2);
    versions(topPct, 'top');

    bigPct.attr('x', right - pad).attr('y', bigY).attr('font-size', bigSize);
    versions(bigPct, 'big');

    const ending = svg
      .selectAll('.ending')
      .attr('x', right - pad)
      .attr('y', bigY + pareto.endingGap * pad + smallSize * capHeight)
      .attr('font-size', smallSize);
    versions(ending, 'ending');

    focus.each(function (d, i) {
      d3.select(this).attr('x', right - 2 * pad - bigPct.nodes()[i].getComputedTextLength());
    });
    focus.attr('y', bigY);
    versions(focus, 'focus');

    const vital = svg
      .select('.vital')
      .attr('x', left + pad)
      .attr('y', bottom - pad - (bottom - top) * pareto.vitalLift)
      .attr('font-size', labelSize * pareto.vitalScale)
      .attr('opacity', shown('vital'));
    vital.select('.instead').attr('font-size', labelSize * pareto.vitalScale * pareto.insteadScale);

    const { size, inset, band, legendSize } = panels;
    const panelLabelSize = fitSize(svg.select('.miniMeasure').node(), common.panels.map((p) => p.label), size - 2 * inset, panels.labelSize);
    const height = miniHeight(panels, panelLabelSize);
    const target = ageLayout(stacked, width, panels, height);
    const box = panelBox(left + pad, bottom - pad - height, size);
    const { rects, lineY } = barGeometry(shortlist.map((d) => ({ id: d.id, value: d.occupancy })), [occupancy, scotland.occupancy], box);
    const dash = width * common.dashShare;
    const mini = svg
      .select('.mini')
      .attr('opacity', ten('vital') * (1 - stepPhase('flow', 'fadeOut', step, progress)))
      .attr('transform', `translate(${(target.columns[1] - box.x) * move},${(target.top - box.y) * move})`);

    const labelGap = width * common.miniLabelGapShare;
    const chartRight = box.chart.x + box.chart.width;
    const averageLabel = mini
      .select('.miniAverage')
      .attr('x', chartRight + labelGap)
      .attr('y', lineY[0] + (legendSize * capHeight) / 2)
      .attr('font-size', legendSize);
    const aboveLabel = mini.select('.miniAbove').attr('font-size', legendSize);
    const aboveLines = aboveLabel.selectAll('tspan');
    const columnWidth = d3.max([averageLabel.node(), ...aboveLines.nodes()], (node) => node.getComputedTextLength());
    aboveLines
      .attr('x', chartRight + labelGap + columnWidth / 2)
      .attr('y', (d, i) => +averageLabel.attr('y') + legendSize * (common.miniAboveGap + i * common.lineHeight));
    const backWidth = d3.interpolate(chartRight + labelGap + columnWidth + inset - box.x, size)(move);
    mini.selectAll('.miniAverage, .miniAbove').attr('opacity', 1 - move);
    mini
      .select('.miniBack')
      .attr('x', box.x)
      .attr('y', box.y)
      .attr('width', backWidth)
      .attr('height', height)
      .attr('rx', size * common.cornerShare)
      .attr('fill', d3.interpolateRgb(colours.white, colours.mist)(move));
    mini.select('.miniChart').attr('x', box.chart.x).attr('y', box.chart.y).attr('width', box.chart.width).attr('height', box.chart.height);
    mini
      .select('.miniLabel')
      .attr('x', box.x + size / 2)
      .attr('y', box.y + size - band + panelLabelSize * (common.miniLabelGap + capHeight))
      .attr('font-size', panelLabelSize);

    const miniBar = mini
      .select('.miniBars')
      .selectAll('.miniBar')
      .data(shortlist, (d) => d.id)
      .join((group) => {
        const enter = group.append('rect').attr('class', 'miniBar').attr('fill', colours.red);
        return enter;
      });

    tips(miniBar, ['beds', 'age'].includes(steps[step]?.id) && ten('vital') > 0.5, (event, d) => metricTip(d, 'occupancy'));
    miniBar
      .attr('x', (d) => rects.get(d.id).x)
      .attr('y', (d) => rects.get(d.id).y)
      .attr('width', (d) => rects.get(d.id).width)
      .attr('height', (d) => rects.get(d.id).height);

    mini
      .select('.miniGap')
      .attr('pointer-events', 'none')
      .attr('x', box.chart.x)
      .attr('y', lineY[0])
      .attr('width', box.chart.width)
      .attr('height', lineY[1] - lineY[0]);

    mini
      .selectAll('.miniLine')
      .attr('x1', box.chart.x)
      .attr('x2', box.chart.x + box.chart.width)
      .attr('y1', (d, i) => lineY[i])
      .attr('y2', (d, i) => lineY[i])
      .attr('stroke-width', width * common.averageStrokeShare)
      .attr('stroke-dasharray', `${dash} ${dash * 0.75}`);

  });
</script>

<g id={divId} pointer-events="none">
  <text class="pattern before" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>This pattern has been consistent since 2016</text>
  <text class="pattern after" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>The problem started during Covid - and it's getting worse.</text>
  <text class="pattern eight" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>It's a similar story for 8+ hour waits</text>
  <text class="pattern shortlist" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>Does our new shortlist still meet the Pareto principle? ..... almost</text>
  <rect class="overlay" fill={colours.white} />
  <text class="question" fill={colours.slate}>So in relation to our problem</text>
  <text class="topPct pareto" text-anchor="end" fill={colours.slate}>{pareto.paretoTop}%</text>
  <text class="topPct ours" text-anchor="end" fill={colours.slate}>{100 - share}%</text>
  <text class="topPct ten" text-anchor="end" fill={colours.slate}>{100 - tenShare}%</text>
  <text class="bigPct pareto" text-anchor="end" fill={colours.white}>{100 - pareto.paretoTop}%</text>
  <text class="bigPct ours" text-anchor="end" fill={colours.white}>{share}%</text>
  <text class="bigPct ten" text-anchor="end" fill={colours.white}>{tenShare}%</text>
  <text class="ending pareto" text-anchor="end" fill={colours.white}>to solve most of the problem.</text>
  <text class="ending ours" text-anchor="end" fill={colours.white}>of the longest waits.</text>
  <text class="ending ten" text-anchor="end" fill={colours.white}>of 12+ hour waits</text>
  <text class="focus pareto" text-anchor="end" fill={colours.white}>Focus on the</text>
  <text class="focus ours" text-anchor="end" fill={colours.white}>Focus on the <tspan class="number">{groups.elevenCount}</tspan> hospitals and tackle</text>
  <text class="focus ten" text-anchor="end" fill={colours.white}>The {shortlist.length} hold</text>
  <g class="mini">
    <rect class="miniBack" />
    <rect class="miniChart" fill={colours.white} />
    <g class="miniBars"></g>
    <rect class="miniGap" fill={colours.white} fill-opacity={pareto.overlayOpacity} />
    <line class="miniLine" stroke={colours.navy} />
    <line class="miniLine" stroke={colours.blue} />
    <text class="miniAverage" fill={colours.navy}>average <tspan font-weight={fontWeight.semibold}>{Math.round(occupancy)}%</tspan></text>
    <text class="miniAbove" text-anchor="middle">
      <tspan fill={colours.navy}>{Math.round(occupancy - scotland.occupancy)} points</tspan>
      <tspan fill={colours.navy}>above</tspan>
      <tspan fill={colours.blue} font-weight={fontWeight.semibold}>Scotland</tspan>
      <tspan fill={colours.blue}>overall</tspan>
    </text>
    <text class="miniLabel" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>{occupancyPanel.label}</text>
  </g>
  <text class="miniMeasure" opacity="0" font-weight={fontWeight.semibold}></text>
  <text class="vital" fill={colours.white}>
    <tspan font-weight={fontWeight.semibold}>Vital Many</tspan>
    <tspan class="instead" font-weight={fontWeight.regular}>instead of</tspan>
    <tspan font-weight={fontWeight.semibold}>Insignificant Few</tspan>
  </text>
</g>
