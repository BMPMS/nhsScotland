<script>
  import { colours, typeScale, spacing, fontWeight } from '../theme.js';
  import { screen } from '../lib/screen.js';
  import steps from '../story/steps.json';
  import story from '../story/flow.json';

  let { width } = $props();

  const flowStep = steps.find((s) => s.id === 'flow');
  const sizes = { mobile: typeScale.body, ipad: typeScale.bodyLarge, desktop: typeScale.bodyLarge };
</script>

<div class="flowSteps">
  {#each story.narrative as item (item.phase)}
    <div
      class="card"
      style:top="{flowStep[item.phase][0] * flowStep.length * 100}svh"
      style:max-width="calc(100% - {2 * spacing.lg}px)"
      style:white-space={screen(width) === 'mobile' ? 'normal' : 'nowrap'}
      style:padding="{spacing.lg}px {spacing.xl}px"
      style:background={colours.white}
      style:border="1px solid {colours.slateFaint}"
      style:color={colours.slate}
      style:font-size="{sizes[screen(width)]}px"
    >
      {#each item.parts as part, i (i)}{i && part.join !== false ? ' ' : ''}<span style:color={part.highlight ? colours.blue : null} style:font-weight={part.highlight ? fontWeight.semibold : null}>{part.text}</span>{/each}
    </div>
  {/each}
</div>

<style>
  .flowSteps {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .card {
    position: absolute;
    left: 50%;
    transform: translate(-50%, -50%);
    width: max-content;
    text-align: center;
    box-sizing: border-box;
    line-height: 1.4;
    border-radius: 4px;
  }
</style>
