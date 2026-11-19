<script>
  import logo from '../assets/nhs-scotland-logo.png';
  import hourglass from '../assets/hourglass.svg';
  import alarmClock from '../assets/alarm-clock.svg';
  import arrowDown from '../assets/arrow-down.svg';
  import { colours, typeScale, spacing, fontWeight } from '../theme.js';
  import { screen } from '../lib/screen.js';
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { yearTotals, tickerAt } from '../lib/ticker.js';
  import hospitals from '../data/hospitals.json';
  import intro from '../story/intro.json';

  let { width, height } = $props();

  const logoScale = 0.8;
  const logoPull = 0.6;

  const sizes = {
    mobile: { logo: spacing['4xl'] * 3.375 * logoScale, label: typeScale.heading2, title: typeScale.heading2, question: typeScale.bodyLarge, cue: typeScale.heading2, number: typeScale.display, year: typeScale.heading3, small: typeScale.body, gap: spacing.xl },
    ipad: { logo: spacing['4xl'] * 4.5 * logoScale, label: typeScale.heading1, title: typeScale.heading1, question: typeScale.heading3, cue: typeScale.heading1, number: typeScale.display * 1.25, year: typeScale.heading2, small: typeScale.bodyLarge, gap: spacing['2xl'] },
    desktop: { logo: spacing['4xl'] * 5.625 * logoScale, label: typeScale.display * 1.25, title: typeScale.display, question: typeScale.heading2, cue: typeScale.heading1, number: typeScale.display * 1.5, year: typeScale.heading1, small: typeScale.heading3, gap: spacing['3xl'] }
  };

  const gapShare = 0.04;

  let size = $derived(sizes[screen(width)]);
  let gap = $derived(Math.max(size.gap, height * gapShare));

  const totals = yearTotals(hospitals, intro.ticker.firstYear, intro.ticker.lastYear);
  const format = d3.format(',');
  const worst = d3.max(totals, (d) => d.waits);
  const heat = d3.interpolateRgb(colours.white, colours.red);
  let tick = $state(tickerAt(totals, 0, intro.ticker));

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      tick = tickerAt(totals, Infinity, intro.ticker);
      return;
    }
    const timer = d3.timer((elapsed) => {
      tick = tickerAt(totals, elapsed, intro.ticker);
      if (tick.done) timer.stop();
    });
    return () => timer.stop();
  });
</script>

<div
  class="intro"
  style:background={colours.navy}
  style:color={colours.white}
  style:gap="{gap}px"
  style:padding="0 {spacing.xl}px"
>
  <img src={logo} alt="NHS Scotland" width={size.logo} height={size.logo} style:margin-bottom="{-gap * logoPull}px" />
  <h1
    style:background={colours.red}
    style:font-size="{size.label}px"
    style:font-weight={fontWeight.semibold}
    style:padding="{spacing.sm}px {spacing.lg}px"
  >
    Accident &amp; Emergency
  </h1>
  <p class="row" style:font-size="{size.title}px" style:gap="{spacing.lg}px">
    <span class="icon" style:mask-image="url({hourglass})" style:width="{size.title}px" style:height="{size.title}px"></span>
    Waiting Times
    <span class="icon" style:mask-image="url({alarmClock})" style:width="{size.title}px" style:height="{size.title}px"></span>
  </p>
  <p class="ticker" class:stacked={height > width} style:column-gap="{spacing.md}px">
    <span class="lead">
      <span style:font-size="{size.small}px">{intro.ticker.inLabel}</span>
      <span style:font-size="{size.year}px" style:color={heat(tick.waits / worst)}>{tick.year}</span>
    </span>
    <span class="number" style:font-size="{size.number}px" style:font-weight={fontWeight.semibold} style:color={heat(tick.waits / worst)}>{format(tick.waits)}</span>
    <span class="caption" style:font-size="{size.small}px">{intro.ticker.caption}</span>
  </p>
  <p style:font-size="{size.question}px" style:font-weight={fontWeight.semibold}>
    Are there hidden solutions in the data?
  </p>
  <p class="row cue" style:color={colours.blue} style:font-size="{size.cue}px" style:gap="{spacing.sm}px">
    <span class="icon" style:mask-image="url({arrowDown})" style:width="{size.cue}px" style:height="{size.cue}px"></span>
    scroll
  </p>
</div>

<style>
  .intro {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  h1,
  p {
    margin: 0;
  }

  .ticker {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: baseline;
    line-height: 1;
  }

  .lead {
    display: inline-flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 0.3em;
  }

  .caption {
    text-align: left;
  }

  .ticker.stacked {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4em;
  }

  .stacked .lead {
    justify-content: center;
  }

  .stacked .caption {
    text-align: center;
  }

  .number {
    font-variant-numeric: tabular-nums;
  }

  .row {
    display: flex;
    align-items: center;
  }

  .cue {
    animation: pulse 2s ease-in-out infinite alternate;
  }

  @keyframes pulse {
    from {
      opacity: 0.5;
    }
    to {
      opacity: 1;
    }
  }

  .icon {
    display: inline-block;
    background-color: currentColor;
    mask-repeat: no-repeat;
    mask-size: contain;
    mask-position: center;
  }
</style>
