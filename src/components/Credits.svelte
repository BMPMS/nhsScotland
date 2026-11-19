<script>
  import { colours, typeScale, spacing, fontWeight } from '../theme.js';
  import { screen } from '../lib/screen.js';
  import credits from '../story/credits.json';

  let { width } = $props();

  const sizes = {
    mobile: { title: typeScale.heading2, heading: typeScale.bodyLarge, body: typeScale.caption },
    ipad: { title: typeScale.heading1, heading: typeScale.heading3, body: typeScale.body },
    desktop: { title: typeScale.display, heading: typeScale.heading3, body: typeScale.body }
  };
  const maxWidth = 760;

  let size = $derived(sizes[screen(width)]);
</script>

<div class="credits" style:background={colours.navy} style:color={colours.white} style:padding="{spacing['4xl']}px {spacing.xl}px">
  <div class="inner" style:max-width="{maxWidth}px" style:gap="{spacing['3xl']}px">
    <h2 style:font-size="{size.title}px" style:font-weight={fontWeight.semibold}>{credits.title}</h2>
    <section>
      <h3 style:font-size="{size.heading}px" style:font-weight={fontWeight.semibold} style:margin-bottom="{spacing.md}px">{credits.team.title}</h3>
      {#each credits.team.names as name (name)}
        <p style:font-size="{size.body}px">{name}</p>
      {/each}
    </section>
    <section>
      <h3 style:font-size="{size.heading}px" style:font-weight={fontWeight.semibold} style:margin-bottom="{spacing.md}px">{credits.workload.title}</h3>
      <p style:font-size="{size.body}px" style:color={colours.slateFaint}>{credits.workload.note}</p>
    </section>
    {#each credits.sections as section (section.title)}
      <section>
        <h3 style:font-size="{size.heading}px" style:font-weight={fontWeight.semibold} style:margin-bottom="{spacing.md}px">{section.title}</h3>
        <ul style:gap="{spacing.sm}px">
          {#each section.sources as source (source.name)}
            <li style:font-size="{size.body}px">
              {#if source.url}<a href={source.url} target="_blank" rel="noopener" style:color={colours.white}>{source.name}</a>{:else}{source.name}{/if}
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</div>

<style>
  .credits {
    min-height: 100svh;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
  }

  .inner {
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  h2,
  h3,
  p {
    margin: 0;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  li {
    line-height: 1.4;
  }
</style>
