<script>
  import * as d3 from 'd3';
  import { colours, fontWeight, capHeight } from '../theme.js';
  import { stepPhase } from '../lib/phase.js';
  import { solutionLayout } from '../lib/solution.js';
  import { wrapSegments, fitSize } from '../lib/wrap.js';
  import story from '../story/solution.json';
  import monthly from '../data/monthly.json';

  let { divId, width, step, progress } = $props();

  const { layout: config } = story;
  const hospitalColour = Object.fromEntries(story.hospitals.map((h) => [h.id, colours[h.colour]]));
  const blocks = story.doors.flatMap((door, d) => door.blocks.map((parts, i) => ({ id: `${d}-${i}`, parts })));
  const words = (parts) => parts.flatMap((part) => part.text.split(' ').map((text) => ({ text, colour: part.only ? hospitalColour[part.only] : colours.navy })));

  $effect(() => {
    const phase = (key) => stepPhase('wholeSystem', key, step, progress);
    const out = 1 - stepPhase('ending', 'fadeOut', step, progress);
    const svg = d3.select(`#${divId}`).attr('opacity', out);
    const s = (v) => v * width;
    const l = solutionLayout(width);

    svg.select('.title').attr('x', width / 2).attr('y', s(config.titleY)).attr('font-size', s(config.titleSize)).attr('opacity', phase('title'));
    const introSize = fitSize(svg.select('.measure').attr('font-weight', fontWeight.semibold).node(), story.intro.map((parts) => parts.map((part) => part.text).join(' ')), s(config.introWidth), s(config.introSize));
    svg.select('.measure').attr('font-weight', null);
    svg
      .selectAll('.introLine')
      .attr('x', width / 2)
      .attr('y', (d, i) => s(config.introY + i * config.introGap))
      .attr('font-size', introSize)
      .attr('opacity', phase('intro'));

    svg.select('.outline').attr('d', l.outline).attr('stroke-width', l.stroke).attr('opacity', phase('outline'));

    const chart = svg.select('.chart').attr('opacity', phase('outline'));
    const months = monthly[story.hospitals[0].id].map((d) => d.month);
    const x = d3.scalePoint(months, [l.chart.left, l.chart.right]);
    const y = d3.scaleLinear([0, config.chart.max], [l.chart.bottom, l.chart.top]);
    chart.select('.chartBack').attr('x', l.chart.left).attr('y', l.chart.top).attr('width', l.chart.right - l.chart.left).attr('height', l.chart.bottom - l.chart.top);
    chart.select('.chartTitle').attr('x', (l.tab.left + l.tab.right) / 2).attr('y', l.tab.top + s(config.chartTitleY)).attr('font-size', s(config.chartTitleSize));
    const tick = chart
      .select('.ticks')
      .selectAll('.tick')
      .data(story.ticks)
      .join((group) => {
        const enter = group.append('g').attr('class', 'tick');
        enter.append('line').attr('stroke', colours.white);
        enter.append('text').attr('text-anchor', 'end').attr('fill', colours.slate);
        return enter;
      });
    tick.select('line').attr('x1', l.chart.left).attr('x2', l.chart.right).attr('y1', y).attr('y2', y);
    tick
      .select('text')
      .attr('x', l.chart.left - s(config.tickGap))
      .attr('y', (d) => y(d) + (s(config.tickSize) * capHeight) / 2)
      .attr('font-size', s(config.tickSize))
      .text(d3.format(','));
    const drawn = phase('chart');
    chart
      .selectAll('.line')
      .data(story.hospitals)
      .attr('d', (d) => d3.line((m) => x(m.month), (m) => y(m.waits))(monthly[d.id]))
      .attr('stroke-width', s(config.lineShare))
      .each(function () {
        const length = this.getTotalLength();
        d3.select(this).attr('stroke-dasharray', `${length * drawn} ${length}`);
      });
    chart
      .selectAll('.year')
      .attr('x', (d, i) => (i ? l.chart.right : l.chart.left))
      .attr('y', l.yearY)
      .attr('font-size', s(config.yearSize))
      .attr('opacity', drawn);

    svg
      .select('.divider')
      .attr('x1', l.middle)
      .attr('x2', l.middle)
      .attr('y1', l.body.top + s(config.yearY) * 2)
      .attr('y2', l.body.bottom)
      .attr('stroke-width', l.stroke)
      .attr('stroke-dasharray', l.dash.join(' '))
      .attr('opacity', phase('doors'));
    svg
      .selectAll('.doorTitle')
      .data(l.doors)
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('font-size', s(config.doorSize))
      .attr('opacity', phase('doors'));

    const b = config.blocks;
    const textSize = s(b.textSize);
    const measure = svg.select('.measure').attr('font-size', textSize).node();
    const placed = l.doors.flatMap((door) => door.blocks);
    const revealed = phase('blocks') * blocks.length;
    svg.selectAll('.block').each(function (d, i) {
      const { x: bx, y: by, parts } = placed[i];
      const g = d3.select(this).attr('opacity', Math.min(1, Math.max(0, revealed - i)));
      g.select('rect')
        .attr('x', bx)
        .attr('y', by)
        .attr('width', l.blockWidth)
        .attr('height', l.blockHeight)
        .attr('rx', s(b.radius))
        .attr('stroke-width', s(b.stroke));
      const lines = wrapSegments(measure, words(parts), l.blockWidth - 2 * s(b.textPad));
      const first = by + l.blockHeight / 2 - ((lines.length - 1) * textSize * b.leading) / 2 + (textSize * capHeight) / 2;
      const line = g
        .select('text')
        .attr('font-size', textSize)
        .selectAll('.blockLine')
        .data(lines)
        .join((group) => {
          const enter = group.append('tspan').attr('class', 'blockLine');
          return enter;
        });
      line.attr('x', bx + l.blockWidth / 2).attr('y', (d, r) => first + r * textSize * b.leading);
      line
        .selectAll('.segment')
        .data((d) => d)
        .join((group) => {
          const enter = group.append('tspan').attr('class', 'segment');
          return enter;
        })
        .attr('fill', (d) => d.colour)
        .text((d) => d.text);
    });
    measure.textContent = '';
  });
</script>

<g id={divId} pointer-events="none">
  <text class="measure" opacity="0"></text>
  <text class="title" text-anchor="middle" fill={colours.navy} font-weight={fontWeight.semibold}>{story.title}</text>
  {#each story.intro as parts, i (i)}
    <text class="introLine" text-anchor="middle" fill={colours.navy}
      >{#each parts as part, j (j)}{j ? ' ' : ''}<tspan fill={part.hospital ? hospitalColour[part.hospital] : colours.navy} font-weight={part.hospital || part.bold ? fontWeight.semibold : fontWeight.regular}>{part.text}</tspan>{/each}</text
    >
  {/each}
  <path class="outline" fill="none" stroke={colours.blue} />
  <g class="chart">
    <text class="chartTitle" text-anchor="middle" fill={colours.navy} font-weight={fontWeight.semibold}>{story.chartTitle}</text>
    <rect class="chartBack" fill={config.chart.back} />
    <g class="ticks"></g>
    {#each story.hospitals as hospital (hospital.id)}
      <path class="line" fill="none" stroke={colours[hospital.colour]} stroke-linejoin="round" />
    {/each}
    {#each story.monthLabels as label, i (i)}
      <text class="year" text-anchor={i ? 'end' : 'start'} fill={colours.navy}>{label}</text>
    {/each}
  </g>
  <line class="divider" stroke={colours.blue} />
  {#each story.doors as door (door.title)}
    <text class="doorTitle" text-anchor="middle" fill={colours.navy} font-weight={fontWeight.semibold}>{door.title}</text>
  {/each}
  {#each blocks as block (block.id)}
    <g class="block">
      <rect fill={colours.white} stroke={colours.navy} stroke-opacity={config.blocks.strokeOpacity} />
      <text text-anchor="middle"></text>
    </g>
  {/each}
</g>
