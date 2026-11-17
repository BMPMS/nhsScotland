<script>
  import * as d3 from 'd3';
  import { colours, fontWeight, capHeight } from '../theme.js';
  import { treeLayout, stackLayout } from '../lib/layouts.js';
  import { elevenShare } from '../lib/groups.js';
  import { stepPhase } from '../lib/phase.js';
  import groups from '../story/groups.json';
  import pareto from '../story/pareto.json';

  let { divId, data, width, height, step, progress } = $props();

  const share = $derived(elevenShare(data));
  const stacked = $derived(stackLayout(data, treeLayout(data, width, height)));

  $effect(() => {
    const phase = (key) => stepPhase('pareto', key, step, progress);
    const change = phase('switch');
    const out = 1 - stepPhase('surge', 'fadeOut', step, progress);
    const retitle = stepPhase('surge', 'retitle', step, progress);
    const retitle8 = stepPhase('surge', 'retitle8', step, progress);
    const shown = (key) => phase(key) * out;
    const svg = d3.select(`#${divId}`);
    const { left, right, top, bottom, y, labelSize, patternY, patternSize, centre } = stacked;
    const pad = width * pareto.padShare;
    const topShare = d3.interpolate(pareto.paretoTop, 100 - share)(change) / 100;
    const boundary = y(1 - topShare);
    const bandY = (top + boundary) / 2;
    const smallSize = labelSize * pareto.smallScale;
    const focus = svg.selectAll('.focus').attr('font-size', smallSize);
    focus.selectAll('.number').attr('font-size', labelSize * pareto.numberScale);
    const bigPct = svg.selectAll('.bigPct').attr('font-size', 1);
    const sentence = d3.min(focus.nodes(), (node, i) => (right - left - 3 * pad - node.getComputedTextLength()) / bigPct.nodes()[i].getComputedTextLength());
    const bigSize = Math.min((bottom - top) * pareto.bigShare, sentence);
    const bigY = boundary + pad + (bottom - top) * pareto.bigDrop + bigSize * capHeight;
    const versions = (selection, opacity) => {
      selection.filter('.pareto').attr('opacity', opacity * (1 - change));
      selection.filter('.ours').attr('opacity', opacity * change);
    };

    svg.selectAll('.pattern').attr('x', centre).attr('y', patternY).attr('font-size', patternSize);
    svg.select('.pattern.before').attr('opacity', phase('fade') * (1 - retitle));
    svg.select('.pattern.after').attr('opacity', retitle * (1 - retitle8));
    svg.select('.pattern.eight').attr('opacity', retitle8);

    svg
      .select('.overlay')
      .attr('x', left)
      .attr('y', top)
      .attr('width', right - left)
      .attr('height', boundary - top)
      .attr('fill-opacity', pareto.overlayOpacity)
      .attr('opacity', shown('overlay'));

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
    versions(topPct, shown('top'));

    bigPct.attr('x', right - pad).attr('y', bigY).attr('font-size', bigSize);
    versions(bigPct, shown('big'));

    const ending = svg
      .selectAll('.ending')
      .attr('x', right - pad)
      .attr('y', bigY + pareto.endingGap * pad + smallSize * capHeight)
      .attr('font-size', smallSize);
    versions(ending, shown('ending'));

    focus.each(function (d, i) {
      d3.select(this).attr('x', right - 2 * pad - bigPct.nodes()[i].getComputedTextLength());
    });
    focus.attr('y', bigY);
    versions(focus, shown('focus'));

    const vital = svg
      .select('.vital')
      .attr('x', left + pad)
      .attr('y', bottom - pad - (bottom - top) * pareto.vitalLift)
      .attr('font-size', labelSize * pareto.vitalScale)
      .attr('opacity', shown('vital'));
    vital.select('.instead').attr('font-size', labelSize * pareto.vitalScale * pareto.insteadScale);
  });
</script>

<g id={divId}>
  <text class="pattern before" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>This pattern has been consistent since 2016</text>
  <text class="pattern after" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>The problem started during Covid - and it's getting worse.</text>
  <text class="pattern eight" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>It's a similar story for 8+ hour waits</text>
  <rect class="overlay" fill={colours.white} />
  <text class="question" fill={colours.slate}>Have you heard of the Pareto Principle - the 80/20 rule?</text>
  <text class="topPct pareto" text-anchor="end" fill={colours.slate}>{pareto.paretoTop}%</text>
  <text class="topPct ours" text-anchor="end" fill={colours.slate}>{100 - share}%</text>
  <text class="bigPct pareto" text-anchor="end" fill={colours.white}>{100 - pareto.paretoTop}%</text>
  <text class="bigPct ours" text-anchor="end" fill={colours.white}>{share}%</text>
  <text class="ending pareto" text-anchor="end" fill={colours.white}>to solve most of the problem.</text>
  <text class="ending ours" text-anchor="end" fill={colours.white}>of the longest waits.</text>
  <text class="focus pareto" text-anchor="end" fill={colours.white}>Focus on the</text>
  <text class="focus ours" text-anchor="end" fill={colours.white}>Focus on the <tspan class="number">{groups.elevenCount}</tspan> hospitals and tackle</text>
  <text class="vital" fill={colours.white}>
    <tspan font-weight={fontWeight.semibold}>Vital Many</tspan>
    <tspan class="instead" font-weight={fontWeight.regular}>instead of</tspan>
    <tspan font-weight={fontWeight.semibold}>Insignificant Few</tspan>
  </text>
</g>
