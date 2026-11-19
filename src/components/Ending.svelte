<script>
  import { colours, typeScale, spacing, fontWeight } from '../theme.js';
  import { screen } from '../lib/screen.js';
  import story from '../story/solution.json';

  let { width } = $props();

  const sizes = { mobile: typeScale.bodyLarge, ipad: typeScale.heading3, desktop: typeScale.heading2 };
  const maxWidth = 640;
</script>

<div class="ending" style:gap="{spacing['2xl']}px" style:padding="0 {spacing.xl}px">
  {#each story.ending as parts, i (i)}
    <p style:color={colours.navy} style:font-size="{sizes[screen(width)]}px" style:max-width="{maxWidth}px">
      {#each parts as part, j (j)}{j ? ' ' : ''}<span style:font-weight={part.bold ? fontWeight.semibold : fontWeight.regular}>{part.text}</span>{/each}
    </p>
  {/each}
</div>

<style>
  .ending {
    height: 100%;
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
