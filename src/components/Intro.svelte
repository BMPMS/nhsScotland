<script>
  import logo from '../assets/nhs-scotland-logo.png';
  import hourglass from '../assets/hourglass.svg';
  import alarmClock from '../assets/alarm-clock.svg';
  import arrowDown from '../assets/arrow-down.svg';
  import { colours, typeScale, spacing, fontWeight } from '../theme.js';
  import { screen } from '../lib/screen.js';

  let { width, height } = $props();

  const sizes = {
    mobile: { logo: spacing['4xl'] * 3.375, label: typeScale.heading2, title: typeScale.heading2, question: typeScale.bodyLarge, cue: typeScale.heading2, gap: spacing.xl },
    ipad: { logo: spacing['4xl'] * 4.5, label: typeScale.heading1, title: typeScale.heading1, question: typeScale.heading3, cue: typeScale.heading1, gap: spacing['2xl'] },
    desktop: { logo: spacing['4xl'] * 5.625, label: typeScale.display * 1.25, title: typeScale.display, question: typeScale.heading2, cue: typeScale.heading1, gap: spacing['3xl'] }
  };

  const gapShare = 0.04;

  let size = $derived(sizes[screen(width)]);
  let gap = $derived(Math.max(size.gap, height * gapShare));
</script>

<div
  class="intro"
  style:background={colours.navy}
  style:color={colours.white}
  style:gap="{gap}px"
  style:padding="0 {spacing.xl}px"
>
  <img src={logo} alt="NHS Scotland" width={size.logo} height={size.logo} />
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
