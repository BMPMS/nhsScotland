<script>
  import { onMount } from 'svelte';
  import scrollama from 'scrollama';
  import Stage from './components/Stage.svelte';
  import Intro from './components/Intro.svelte';
  import Ending from './components/Ending.svelte';
  import Credits from './components/Credits.svelte';
  import steps from './story/steps.json';
  import hospitals from './data/hospitals.json';
  import { colours, font, spacing } from './theme.js';
  import { screen } from './lib/screen.js';

  let width = $state(0);
  let height = $state(0);
  let step = $state(0);
  let progress = $state(0);

  const padding = { mobile: spacing.md, ipad: spacing['2xl'], desktop: spacing['4xl'] };

  let side = $derived(Math.max(0, Math.min(width, height) - 2 * padding[screen(Math.min(width, height))]));

  onMount(() => {
    const scroller = scrollama();
    scroller
      .setup({ step: '.step', offset: 0.5, progress: true })
      .onStepProgress((response) => {
        step = response.index;
        progress = response.progress;
      });
    const onResize = () => scroller.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      scroller.destroy();
    };
  });
</script>

<main style:font-family={font} style:color={colours.navy} style:background={colours.white}>
  <div class="stage" bind:clientWidth={width} bind:clientHeight={height}>
    <Stage divId="stage" data={hospitals} width={side} height={side} {step} {progress} />
  </div>
  <div class="steps">
    {#each steps as s (s.id)}
      <section class="step" data-step={s.id} style:height={s.fit ? null : `${s.length * 100}svh`} style:min-height={s.fit ? `${s.length * 100}svh` : null}>
        {#if s.id === 'load'}
          <Intro {width} {height} />
        {:else if s.id === 'ending'}
          <Ending {width} />
        {:else if s.id === 'footer'}
          <Credits {width} />
        {/if}
      </section>
    {/each}
  </div>
</main>

<style>
  .stage {
    position: sticky;
    top: 0;
    height: 100svh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .steps {
    position: relative;
    margin-top: -100svh;
  }

  .step {
    position: relative;
    z-index: 1;
  }

  .stage :global(svg) {
    display: block;
  }
</style>
