<script>
  import { colours, typeScale, spacing, fontWeight } from '../theme.js';
  import { tooltip } from '../lib/tooltip.svelte.js';

  const offset = spacing.lg;
  const borderWidth = 2.5;
  let box = $state({ width: 0, height: 0 });
  let left = $derived(tooltip.x + offset + box.width > window.innerWidth ? tooltip.x - offset - box.width : tooltip.x + offset);
  let top = $derived(tooltip.y + offset + box.height > window.innerHeight ? tooltip.y - offset - box.height : tooltip.y + offset);
</script>

{#if tooltip.visible}
  <div
    class="tooltip"
    bind:clientWidth={box.width}
    bind:clientHeight={box.height}
    style:left="{left}px"
    style:top="{top}px"
    style:background={colours.white}
    style:color={colours.slate}
    style:border="{borderWidth}px solid {tooltip.border ?? colours.slateFaint}"
    style:font-size="{typeScale.caption}px"
    style:padding="{spacing.md}px {spacing.lg}px"
  >
    <p style:font-weight={fontWeight.semibold}>{tooltip.title}</p>
    {#each tooltip.lines as line (line)}
      <p>{line}</p>
    {/each}
  </div>
{/if}

<style>
  .tooltip {
    position: fixed;
    z-index: 10;
    pointer-events: none;
    max-width: 260px;
    line-height: 1.35;
    border-radius: 4px;
  }

  p {
    margin: 0;
  }
</style>
