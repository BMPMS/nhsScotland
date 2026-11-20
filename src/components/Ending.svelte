<script>
  import { colours, typeScale, spacing, fontWeight } from '../theme.js';
  import { screen } from '../lib/screen.js';
  import story from '../story/solution.json';
  import { stepPhase } from '../lib/phase.js';

  let { width, step, progress } = $props();
  const shown = $derived(stepPhase('ending', 'fadeOut', step, progress));

  const sizes = { mobile: typeScale.bodyLarge, ipad: typeScale.heading3, desktop: typeScale.heading2 };
  const maxWidth = 640;
</script>

<div class="ending" style:opacity={shown} style:gap="{spacing['2xl']}px" style:padding="0 {spacing.xl}px">
  <p style:color={colours.navy} style:font-size="{sizes[screen(width)]}px" style:font-weight={fontWeight.semibold}>{story.endingTitle}</p>
  {#each story.ending as parts, i (i)}
    <p style:color={colours.navy} style:font-size="{sizes[screen(width)]}px" style:max-width="{maxWidth}px">
      {#each parts as part, j (j)}{j ? ' ' : ''}<span style:font-weight={part.bold ? fontWeight.semibold : fontWeight.regular} style:color={part.highlight ? colours.blue : null}>{part.text}</span>{/each}
    </p>
  {/each}
</div>

<style>
  /* div.ending outranks the .step > * rule in App, so the blocks underneath stay hoverable. */
  div.ending {
    position: sticky;
    top: 0;
    height: 100svh;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  p {
    margin: 0;
    line-height: 1.4;
  }
</style>
