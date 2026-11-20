<script>
  import { colours, typeScale, spacing, fontWeight } from '../theme.js';
  import { screen } from '../lib/screen.js';
  import credits from '../story/credits.json';
  import Workload from './Workload.svelte';

  const logo = `${import.meta.env.BASE_URL}favicon.svg`;

  let { width } = $props();

  const sizes = {
    mobile: { heading: typeScale.body, intro: typeScale.caption, sub: typeScale.caption, source: typeScale.caption },
    ipad: { heading: typeScale.bodyLarge, intro: typeScale.body, sub: typeScale.body, source: typeScale.caption },
    desktop: { heading: typeScale.bodyLarge, intro: typeScale.body, sub: typeScale.body, source: typeScale.caption }
  };
  const maxWidth = 760;

  let size = $derived(sizes[screen(width)]);
</script>

<div class="credits" style:background={colours.navy} style:color={colours.white} style:padding="{spacing['4xl']}px {spacing.xl}px">
  <div class="inner" style:max-width="{maxWidth}px" style:gap="{spacing['3xl']}px">
    <h2 style:font-size="{size.heading}px" style:font-weight={fontWeight.semibold}>{credits.title}</h2>
    <section class="intro" style:font-size="{size.intro}px" style:gap="{spacing.md}px">
      <p style:margin-bottom="{spacing.lg}px">
        {#each credits.intro as part, j (j)}{j && part.join !== false ? ' ' : ''}{#if part.link}<a class="bm" href={part.link === true ? credits.link : part.link} target="_blank" rel="noopener" style:color={colours.white}>{#if part.logo}<img class="logo" src={logo} alt="BM Data Visualisation" style:height="{size.intro * 1.2}px" />{:else}{part.text}{/if}</a>{:else}<span class:italic={part.italic}>{part.text}</span>{/if}{/each}
      </p>
      {#each credits.rules as rule (rule.key)}
        <p>
          <span style:font-weight={fontWeight.semibold}>{rule.key}</span>
          {rule.text}{#if rule.aside}{' '}<span class="italic">{rule.aside}</span>{/if}
        </p>
      {/each}
      <p style:margin-top="{spacing.lg}px"><span style:font-weight={fontWeight.semibold}>{credits.tech.label}</span> {credits.tech.text}</p>
      <p><span style:font-weight={fontWeight.semibold}>{credits.icons.label}</span> <a href={credits.icons.url} target="_blank" rel="noopener" style:color={colours.white}>{credits.icons.text}</a> <span class="italic">{credits.icons.aside}</span></p>
    </section>
    <Workload {width} />
    {#each credits.sections as section (section.title)}
      <section>
        <h3 style:font-size="{section.sub ? size.sub : size.heading}px" style:color={section.sub ? colours.slateFaint : null} style:font-weight={fontWeight.semibold} style:margin-bottom="{spacing.md}px">{section.title}</h3>
        <ul style:gap="{spacing.sm}px">
          {#each section.sources as source (source.name)}
            <li style:font-size="{size.source}px">
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

  .intro {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .logo {
    vertical-align: -0.2em;
    filter: brightness(0) invert(1);
  }

  .bm {
    text-decoration: none;
  }

  .bm:hover {
    text-decoration: underline;
  }

  .italic {
    font-style: italic;
  }
</style>
