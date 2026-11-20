<script>
  import * as d3 from 'd3';
  import { colours, fontWeight, capHeight } from '../theme.js';
  import { stepPhase } from '../lib/phase.js';
  import { flowLayout, runFlow } from '../lib/flow.js';
  import { bedPath } from '../lib/paths.js';
  import steps from '../story/steps.json';
  import story from '../story/flow.json';

  let { divId, width, step, progress } = $props();

  const index = steps.findIndex((s) => s.id === 'flow');
  const running = $derived(step === index);
  const stageKey = $derived(stepPhase('flow', 'pileUp', step, progress) > 0 ? 'pileUp' : 'well');

  $effect(() => {
    const root = d3.select(`#${divId}`).attr('opacity', stepPhase('flow', 'stage', step, progress) * (1 - stepPhase('wholeSystem', 'fadeOut', step, progress)));
    const l = flowLayout(width);

    root.select('.intro').attr('x', width / 2).attr('y', l.introY).attr('font-size', l.tabSize);
    root.select('.stageGroup').attr('transform', `translate(0,${l.stageTop})`);
    root.select('.tabShape').attr('d', l.tabShape);
    root.select('.outlineFill').attr('d', l.outline);
    root.select('.outline').attr('d', l.outline).attr('stroke-width', l.stroke);
    root.select('.tabFill.ae').attr('x', l.tab.left).attr('width', l.divider - l.tab.left);
    root.select('.tabFill.other').attr('x', l.divider).attr('width', l.tab.right - l.divider);
    root.selectAll('.tabFill').attr('y', l.tab.top).attr('height', l.tabBottom - l.tab.top);
    root.select('.divider').attr('x1', l.divider).attr('x2', l.divider).attr('y1', l.tab.top).attr('y2', l.body.bottom).attr('stroke-width', l.stroke).attr('stroke-dasharray', `${l.dash} ${l.dash * 0.8}`);

    root.selectAll('.tabLabel').attr('font-size', l.tabSize).each(function () {
      const text = d3.select(this);
      const x = text.classed('ae') ? (l.tab.left + l.divider) / 2 : (l.divider + l.tab.right) / 2;
      const lines = text.selectAll('tspan').size();
      const block = l.tabSize * capHeight + (lines - 1) * l.tabSize * story.layout.tabLeading;
      const first = (l.tab.top + l.body.top) / 2 - block / 2 + l.tabSize * capHeight;
      text.selectAll('tspan').attr('x', x).attr('y', (d, i) => first + i * l.tabSize * story.layout.tabLeading);
    });

    root.selectAll('.areaLabel, .exitLabel').attr('font-size', l.labelSize);
    ['triage', 'assessment'].forEach((key) => {
      const a = l[key];
      root.select(`.area.${key}`).attr('x', a.x).attr('y', a.y).attr('width', a.width).attr('height', a.height).attr('rx', l.radius);
      root.select(`.areaLabel.${key}`).attr('x', l.leftCentre).attr('y', a.y - l.labelGap);
    });
    root.select('.areaLabel.admit').attr('x', l.rightCentre).attr('y', l.triage.y - l.labelGap);

    const bed = root
      .select('.beds')
      .selectAll('.bed')
      .data(l.beds, (d) => d.id)
      .join((group) => {
        const enter = group.append('path').attr('class', 'bed').attr('d', bedPath).attr('fill', colours.slateFaint);
        return enter;
      });
    bed.attr('transform', (d) => `translate(${d.x},${d.y}) scale(${l.bedScale})`);

    ['transfer', 'discharge'].forEach((key) => {
      const label = root
        .select(`.exitLabel.${key}`)
        .attr('x', l.exitX[key])
        .attr('y', l.exitY + (l.exitHeight + l.labelSize * capHeight) / 2);
      root
        .select(`.exit.${key}`)
        .attr('x', l.exitX[key] + label.node().getComputedTextLength() + l.exitLabelGap)
        .attr('y', l.exitY)
        .attr('width', l.exitWidth)
        .attr('height', l.exitHeight)
        .attr('rx', l.radius);
    });
  });

  $effect(() => {
    if (!running || !width) return;
    const root = d3.select(`#${divId}`);
    root.select('.intro').text(story.stages[stageKey].intro);
    return runFlow(root, width, story.stages[stageKey]);
  });
</script>

<g id={divId} pointer-events="none">
  <text class="intro" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>{story.stages.well.intro}</text>
  <g class="stageGroup">
    <defs><clipPath id="{divId}TabClip"><path class="tabShape" /></clipPath></defs>
    <path class="outlineFill" fill={colours.white} />
    <g clip-path="url(#{divId}TabClip)">
      <rect class="tabFill ae" fill={colours.red} />
      <rect class="tabFill other" fill={colours.navy} />
    </g>
    <path class="outline" fill="none" stroke={colours.blue} />
    <line class="divider" stroke={colours.blue} />
    <text class="tabLabel ae" text-anchor="middle" fill={colours.white} font-weight={fontWeight.semibold}><tspan>Accident</tspan><tspan>and</tspan><tspan>Emergency</tspan></text>
    <text class="tabLabel other" text-anchor="middle" fill={colours.white} font-weight={fontWeight.semibold}><tspan>Other</tspan><tspan>Hospital</tspan><tspan>Departments</tspan></text>
    <text class="areaLabel triage" text-anchor="middle" fill={colours.slate}>triage</text>
    <rect class="area triage" fill={colours.mist} />
    <text class="areaLabel assessment" text-anchor="middle" fill={colours.slate}>assessment + treatment</text>
    <rect class="area assessment" fill={colours.mist} />
    <text class="areaLabel admit" text-anchor="middle" fill={colours.slate}>admit</text>
    <g class="beds"></g>
    <text class="exitLabel transfer" fill={colours.slate}>transfer</text>
    <rect class="exit transfer" fill={colours.mist} />
    <text class="exitLabel discharge" fill={colours.slate}>discharge</text>
    <rect class="exit discharge" fill={colours.mist} />
    <g class="people"></g>
  </g>
</g>
