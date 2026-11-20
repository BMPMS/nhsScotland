<script>
  import * as d3 from 'd3';
  import { colours, fontWeight, spacing, capHeight } from '../theme.js';
  import { pulse } from '../lib/pulse.js';
  import { stepPhase } from '../lib/phase.js';
  import { thirtyGrid, iconShare, sidePadding } from '../lib/layouts.js';
  import Hospitals from './Hospitals.svelte';
  import Pareto from './Pareto.svelte';
  import Surge from './Surge.svelte';
  import Common from './Common.svelte';
  import Age from './Age.svelte';
  import Flow from './Flow.svelte';
  import Solution from './Solution.svelte';
  import thirty from '../story/thirty.json';
  import steps from '../story/steps.json';

  let { divId, data, width, height, step, progress } = $props();

  const pulseSize = spacing.lg;
  const labelLines = 2;
  const titleWidthShare = 0.8;

  $effect(() => {
    const { pulse: phases } = steps[step];
    const bump = (key) => (phases ? pulse(progress, phases[key]) * pulseSize : 0);
    const svg = d3.select(`#${divId}`);
    const { cell, cellHeight, gridTop } = thirtyGrid(data.length, width, height);
    const inner = width - 2 * sidePadding;
    const title = svg.select('.title').attr('font-size', inner);
    title.select('.nhs').attr('font-size', null);
    const titleSize = (inner * inner * titleWidthShare) / title.node().getComputedTextLength();
    const centreX = width / 2;
    const holeY = gridTop + (thirty.hole.row + thirty.hole.rows / 2) * cellHeight;
    const holeWidth = thirty.hole.cols * cell * iconShare;
    const holeHeight = thirty.hole.rows * cellHeight * iconShare;
    const label = svg.select('.label').attr('font-size', inner);
    const labelWidth = d3.max(label.selectAll('tspan').nodes(), (node) => node.getComputedTextLength());
    const labelSize = (inner * holeWidth) / labelWidth;
    const labelLeading = labelSize + spacing.xs;
    const labelHeight = labelLeading * labelLines;
    const count = svg.select('.count').attr('font-size', inner);
    const countSize = Math.min((inner * holeWidth) / count.node().getComputedTextLength(), (holeHeight - labelHeight) / capHeight);
    const countY = holeY - (labelHeight - countSize * capHeight) / 2;
    const opacity = 1 - stepPhase('eleven', 'move', step, progress);

    title.attr('x', centreX).attr('y', (gridTop + titleSize * capHeight) / 2).attr('font-size', titleSize).attr('opacity', opacity);
    title.select('.nhs').attr('font-size', titleSize + bump('title'));
    count.attr('x', centreX).attr('y', countY).attr('font-size', countSize + bump('count')).attr('opacity', opacity);
    label.attr('font-size', labelSize).attr('opacity', opacity);
    label
      .selectAll('tspan')
      .attr('x', centreX)
      .attr('y', (d, i) => countY + labelLeading * (i + 1));
  });
</script>

<svg id={divId} {width} {height}>
  <text class="title" text-anchor="middle" fill={colours.navy} font-weight={fontWeight.semibold}><tspan class="nhs">NHS Scotland</tspan> <tspan fill={colours.blue}>has</tspan></text>
  <Surge divId="surge" {data} {width} {height} {step} {progress} />
  <Common divId="common" {data} {width} {height} {step} {progress} />
  <Hospitals divId="hospitals" {data} {width} {height} {step} {progress} />
  <Pareto divId="pareto" {data} {width} {height} {step} {progress} />
  <Age divId="age" {data} {width} {height} {step} {progress} />
  <Flow divId="flow" {width} {step} {progress} />
  <Solution divId="solution" {width} {step} {progress} />
  <text class="count" text-anchor="middle" fill={colours.navy} font-weight={fontWeight.semibold}>{data.length}</text>
  <text class="label" text-anchor="middle" fill={colours.blue} font-weight={fontWeight.semibold}>
    <tspan>hospitals with</tspan>
    <tspan>A &amp; E Departments</tspan>
  </text>
</svg>

<style>
  svg :global(text) {
    pointer-events: none;
  }
</style>
