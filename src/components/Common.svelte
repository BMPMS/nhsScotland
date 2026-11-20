<script>
  import * as d3 from 'd3';
  import { colours, fontWeight, capHeight } from '../theme.js';
  import { treeLayout, stackLayout, commonLayout } from '../lib/layouts.js';
  import { commonPanels, commonBars } from '../lib/common.js';
  import { wrapSegments } from '../lib/wrap.js';
  import { stepPhase } from '../lib/phase.js';
  import { tips, metricTip } from '../lib/tips.js';
  import steps from '../story/steps.json';
  import common from '../story/common.json';
  import stack from '../story/stack.json';
  import groups from '../story/groups.json';
  import scotland from '../data/scotland.json';

  let { divId, data, width, height, step, progress } = $props();

  const commonStep = steps.findIndex((s) => s.id === 'common');
  const byId = $derived(new Map(data.map((d) => [d.id, d])));
  const exceptionTip = $derived.by(() => {
    const d = data.find((h) => h.id === groups.exception);
    const rank = d3.sort(data, (h) => -h.waits2025).indexOf(d) + 1;
    const values = { rank: `${rank}${['th', 'st', 'nd', 'rd'][rank % 10 > 3 || Math.floor(rank / 10) === 1 ? 0 : rank % 10]}`, waits: d3.format(',')(d.waits2025), occupancy: Math.round(d.occupancy), scotland: Math.round(scotland.occupancy) };
    return common.exceptionTip.map((line) => line.replace(/\{(\w+)\}/g, (m, key) => values[key]));
  });

  const stacked = $derived(stackLayout(data, treeLayout(data, width, height)));
  const layout = $derived(commonLayout(stacked, width));
  const panels = $derived(commonPanels(data, scotland));
  const geometry = $derived(commonBars(panels, layout));
  const mixItems = common.panels.filter((p) => p.mix);
  const toWords = (parts) => parts.flatMap(({ text, ...style }) => text.split(' ').map((word) => ({ text: word, bold: false, blue: false, ...style })));
  const mixWords = toWords([...common.intro, ...mixItems.map((item, i) => ({ text: `${item.label}${i < mixItems.length - 1 ? ',' : ''}`, bold: true, blue: true, tag: item.key }))]);
  const exception = $derived(data.find((d) => d.id === groups.exception).shortName);
  const standoutWords = $derived(toWords(common.standout.map((part) => (part.exception ? { text: exception, green: true, bold: true } : part))));

  $effect(() => {
    const phase = (key) => stepPhase('common', key, step, progress);
    const svg = d3.select(`#${divId}`).attr('opacity', 1 - stepPhase('beds', 'fadeOut', step, progress));
    const { size, inset, band, mixSize, mixY, leading, gridTop, standoutY, left, right } = layout;
    const centre = width / 2;
    const highlight = phase('highlight');
    const standout = phase('standout');
    const dash = width * common.dashShare;
    const stroke = width * common.averageStrokeShare;

    svg
      .select('.commonQuestion')
      .attr('x', centre)
      .attr('y', stacked.patternY)
      .attr('font-size', stacked.patternSize)
      .attr('opacity', phase('question'));


    const labels = svg.selectAll('.panelLabel').attr('font-size', 1);
    const labelSize = Math.min(layout.labelSize, d3.min(labels.nodes(), (node) => (size - 2 * inset) / node.getComputedTextLength()));

    const panelGroup = svg
      .select('.panels')
      .selectAll('.panel')
      .data(panels, (p) => p.key)
      .join((group) => {
        const enter = group.append('g').attr('class', 'panel');
        enter.append('rect').attr('class', 'panelBack');
        enter.append('rect').attr('class', 'panelChart').attr('fill', colours.white);
        enter.append('g').attr('class', 'bars');
        enter.append('line').attr('class', 'average').attr('stroke', colours.slate);
        enter.append('text').attr('class', 'panelLabel').attr('text-anchor', 'middle').attr('fill', colours.slate).attr('font-weight', fontWeight.semibold);
        return enter;
      });

    panelGroup.attr('opacity', (p) => phase(p.key) * (p.highlight ? 1 : d3.interpolate(1, common.fadedOpacity)(highlight)));

    panelGroup
      .select('.panelBack')
      .attr('x', (p, i) => layout.panels[i].x)
      .attr('y', (p, i) => layout.panels[i].y)
      .attr('width', size)
      .attr('height', size)
      .attr('rx', size * common.cornerShare)
      // Light blue at panelTint opacity (blended on white); 12+ hour waits is red throughout, other highlights turn red.
      .attr('fill', (p) => d3.interpolateRgb(d3.interpolateRgb(colours.white, colours.blue)(common.panelTint), colours.redSoft)(p.morph ? 1 : p.highlight ? highlight : 0));

    panelGroup
      .select('.panelChart')
      .attr('x', (p, i) => layout.panels[i].chart.x)
      .attr('y', (p, i) => layout.panels[i].chart.y)
      .attr('width', (p, i) => layout.panels[i].chart.width)
      .attr('height', (p, i) => layout.panels[i].chart.height);

    panelGroup
      .select('.panelLabel')
      .text((p) => p.label)
      .attr('x', (p, i) => layout.panels[i].x + size / 2)
      .attr('y', (p, i) => layout.panels[i].y + size - (band - labelSize * capHeight) / 2)
      .attr('font-size', labelSize);

    panelGroup.each(function (p, i) {
      const { chart } = layout.panels[i];
      const { rects, averageY } = geometry.get(p.key);
      const grow = p.morph ? 1 : phase(p.key);
      const shown = p.morph && phase('lines') < 1 ? 0 : 1;
      const panel = d3.select(this);

      const bar = panel
        .select('.bars')
        .selectAll('.bar')
        .data(p.values, (v) => v.id)
        .join((group) => {
          const enter = group.append('rect').attr('class', 'bar');
          return enter;
        });

      bar
        .attr('x', (v) => rects.get(v.id).x)
        .attr('width', (v) => rects.get(v.id).width)
        .attr('y', (v) => rects.get(v.id).y + rects.get(v.id).height * (1 - grow))
        .attr('height', (v) => rects.get(v.id).height * grow)
        .attr('fill', (v) => d3.interpolateRgb(colours.red, colours.green)(p.exception && v.id === groups.exception ? standout : 0))
        .attr('opacity', (v) => shown * (v.value >= p.average ? 1 : p.exception && v.id === groups.exception ? d3.interpolate(common.belowOpacity, 1)(standout) : common.belowOpacity));
      tips(bar, step === commonStep && grow * shown > 0, (event, v) =>
        p.exception && v.id === groups.exception && standout > 0.5 ? [byId.get(v.id).name, exceptionTip] : metricTip(byId.get(v.id), p.key)
      );

      panel
        .select('.average')
        .attr('x1', chart.x)
        .attr('x2', chart.x + chart.width)
        .attr('y1', averageY)
        .attr('y2', averageY)
        .attr('stroke-width', stroke)
        .attr('stroke-dasharray', `${dash} ${dash * 0.75}`);
    });

    // Same size and row as the chosen hospitals key.
    const legendSize = width * groups.key.textShare;
    const legendY = gridTop - legendSize * stack.descentShare - groups.key.padBelow;
    const legendText = svg
      .select('.legendText')
      .attr('x', right)
      .attr('y', legendY)
      .attr('font-size', legendSize);
    const lineEnd = right - legendText.node().getComputedTextLength() - width * common.legendTextGapShare;
    // Whole dashes only, so the line starts and ends on a dash.
    const dashCount = Math.max(1, Math.round((width * common.legendLineShare + dash * 0.75) / (dash * 1.75)));
    const lineLength = dashCount * dash + (dashCount - 1) * dash * 0.75;
    svg
      .select('.legendLine')
      .attr('x1', lineEnd - lineLength)
      .attr('x2', lineEnd)
      .attr('y1', legendY - (legendSize * capHeight) / 2)
      .attr('y2', legendY - (legendSize * capHeight) / 2)
      .attr('stroke-width', stroke)
      .attr('stroke-dasharray', `${dash} ${dash * 0.75}`);
    svg.select('.legend').attr('opacity', phase('question'));

    const measure = svg.select('.measure').attr('font-size', mixSize).node();
    const paragraph = (selector, lines, y) => {
      const line = svg
        .select(selector)
        .selectAll('.line')
        .data(lines)
        .join((group) => {
          const enter = group.append('text').attr('class', 'line').attr('text-anchor', 'middle');
          return enter;
        });

      line
        .attr('x', centre)
        .attr('y', (l, i) => y + i * leading)
        .attr('font-size', mixSize);

      const part = line
        .selectAll('.part')
        .data((l) => l)
        .join((group) => {
          const enter = group.append('tspan').attr('class', 'part');
          return enter;
        });

      part
        .text((s) => s.text)
        .attr('fill', (s) => (s.blue ? colours.blue : s.green ? colours.green : colours.slate))
        .attr('font-weight', (s) => (s.bold ? fontWeight.semibold : fontWeight.regular))
        .attr('opacity', (s) => (s.tag ? phase(s.tag) : 1));
    };

    paragraph('.mix', wrapSegments(measure, mixWords, right - left, true), mixY);
    paragraph('.standout', wrapSegments(measure, standoutWords, right - left), standoutY);
    svg.select('.standout').attr('opacity', standout);
  });
</script>

<g id={divId}>
  <text class="commonQuestion" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>What do the {groups.elevenCount} hospitals have in common?</text>
  <g class="mix"></g>
  <g class="panels"></g>
  <text class="measure" opacity="0"></text>
  <g class="standout"></g>
  <g class="legend">
    <line class="legendLine" stroke={colours.slate} />
    <text class="legendText" text-anchor="end" fill={colours.slate}>Scotland average</text>
  </g>
</g>
