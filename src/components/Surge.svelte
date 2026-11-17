<script>
  import * as d3 from 'd3';
  import { colours, capHeight } from '../theme.js';
  import { treeLayout, stackLayout, lineLayout } from '../lib/layouts.js';
  import lines from '../story/lines.json';
  import { stepPhase } from '../lib/phase.js';

  let { divId, data, width, height, step, progress } = $props();

  const stacked = $derived(stackLayout(data, treeLayout(data, width, height)));
  const lined = $derived(lineLayout(data, stacked, width));

  $effect(() => {
    const phase = (key) => stepPhase('surge', key, step, progress);
    const svg = d3.select(`#${divId}`);
    const { labelSize } = stacked;
    const { covid, top, bottom } = lined;

    svg
      .select('.covid')
      .attr('x', covid.x0)
      .attr('y', top)
      .attr('width', covid.x1 - covid.x0)
      .attr('height', bottom - top)
      .attr('opacity', phase('covid'));

    svg
      .select('.covidLabel')
      .attr('x', (covid.x0 + covid.x1) / 2)
      .attr('y', top + labelSize * (1 + capHeight))
      .attr('font-size', labelSize)
      .attr('opacity', phase('covid'));

    const change = phase('eight');
    const { twelve, eight, left } = lined;
    const ticks = d3.union(twelve.ticks, eight.ticks);
    const axisGroup = svg
      .select('.yTicks')
      .selectAll('.yTick')
      .data([...ticks], (v) => v)
      .join((group) => {
        const enter = group.append('text').attr('class', 'yTick').attr('text-anchor', 'end').attr('fill', colours.slate);
        return enter;
      });

    axisGroup
      .text((v) => v)
      .attr('x', left - width * lines.tickGapShare)
      .attr('y', (v) => d3.interpolate(twelve.y(v), eight.y(v))(change) + (labelSize * capHeight) / 2)
      .attr('font-size', labelSize)
      .attr('opacity', (v) => phase('axis') * d3.interpolate(+twelve.ticks.includes(v), +eight.ticks.includes(v))(change));

    svg
      .select('.yAxis')
      .attr('x1', left)
      .attr('x2', left)
      .attr('y1', top)
      .attr('y2', bottom)
      .attr('opacity', phase('axis'));

    svg
      .select('.yLabel')
      .attr('transform', `translate(${left + width * lines.tickGapShare + labelSize * capHeight},${top + width * lines.tickGapShare}) rotate(-90)`)
      .attr('font-size', labelSize)
      .attr('opacity', phase('axis'));
  });
</script>

<g id={divId}>
  <rect class="covid" fill={colours.mist} />
  <text class="covidLabel" text-anchor="middle" fill={colours.slate}>Covid</text>
  <line class="yAxis" stroke={colours.slateFaint} />
  <g class="yTicks"></g>
  <text class="yLabel" text-anchor="end" fill={colours.slate}>waits per 1,000 patients</text>
</g>
