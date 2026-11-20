<script>
  import * as d3 from 'd3';
  import { colours, fontWeight, capHeight } from '../theme.js';
  import { stepPhase } from '../lib/phase.js';
  import { flowLayout, runFlow } from '../lib/flow.js';
  import { bedPath, bedBox } from '../lib/paths.js';
  import steps from '../story/steps.json';
  import story from '../story/flow.json';

  let { divId, width, step, progress } = $props();

  const index = steps.findIndex((s) => s.id === 'flow');
  const running = $derived(step === index);
  const stageKey = $derived(stepPhase('flow', 'pileUp', step, progress) > 0 ? 'pileUp' : 'well');

  $effect(() => {
    const root = d3.select(`#${divId}`).attr('opacity', stepPhase('flow', 'stage', step, progress) * (1 - stepPhase('wholeSystem', 'fadeOut', step, progress)));
    const l = flowLayout(width);

    // Both top lines share one size: the longest shrinks to fit the width and the other matches it.
    const introWidth = d3.max(root.selectAll('.introMeasure').attr('font-size', l.tabSize).nodes(), (n) => n.getComputedTextLength());
    const introSize = Math.min(l.tabSize, (l.tabSize * width * story.layout.introWidthShare) / introWidth);
    root.select('.intro').attr('x', width / 2).attr('y', l.introY).attr('font-size', introSize);
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

    // Key for delayed beds: a red bed with its day count, to the right of the tab.
    const dk = story.layout.dayKey;
    const bedW = width * story.layout.beds.widthShare;
    const bedH = (bedW * bedBox.height) / bedBox.width;
    const keyX = l.tab.right + width * dk.xGapShare;
    const keyY = l.body.top - width * dk.gapShare - dk.padBelow - bedH;
    const dayKey = root.select('.dayKey');
    dayKey.select('.keyBed').attr('transform', `translate(${keyX},${keyY}) scale(${l.bedScale})`);
    dayKey
      .select('.keyDay')
      .attr('x', keyX + bedW * story.layout.beds.dayX)
      .attr('y', keyY + bedH * (story.layout.beds.dayY + (story.layout.beds.dayScale * capHeight) / 2))
      .attr('font-size', bedH * story.layout.beds.dayScale);
    dayKey
      .select('.keyLabel')
      .attr('x', keyX + bedW + width * dk.gapShare)
      .attr('y', keyY + (bedH + width * dk.textShare * capHeight) / 2)
      .attr('font-size', width * dk.textShare);

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
    return runFlow(root, width, story.stages[stageKey]);
  });
</script>

<g id={divId} pointer-events="none">
  <text class="intro" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>{story.stages[stageKey].intro}</text>
  {#each Object.values(story.stages) as stage (stage.intro)}
    <text class="introMeasure" font-weight={fontWeight.semibold} opacity="0">{stage.intro}</text>
  {/each}
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
    <text class="areaLabel triage" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>triage</text>
    <rect class="area triage" fill={colours.mist} />
    <text class="areaLabel assessment" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>assessment + treatment</text>
    <rect class="area assessment" fill={colours.mist} />
    <text class="areaLabel admit" text-anchor="middle" fill={colours.slate} font-weight={fontWeight.semibold}>admit</text>
    <g class="beds"></g>
    <text class="exitLabel transfer" fill={colours.slate} font-weight={fontWeight.semibold}>transfer</text>
    <rect class="exit transfer" fill={colours.mist} />
    <text class="exitLabel discharge" fill={colours.slate} font-weight={fontWeight.semibold}>discharge</text>
    <rect class="exit discharge" fill={colours.mist} />
    <g class="bedDays"></g>
    <g class="dayKey">
      <path class="keyBed" d={bedPath} fill={colours.red} />
      <text class="keyDay" text-anchor="middle" fill={colours.white} font-weight={fontWeight.semibold}>{story.layout.dayKey.example}</text>
      <text class="keyLabel" fill={colours.slate}>{story.layout.dayKey.label}</text>
    </g>
    <g class="people"></g>
  </g>
</g>
