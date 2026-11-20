<script>
  import { interpolateRgb } from 'd3';
  import { colours, typeScale, spacing, fontWeight } from '../theme.js';
  import { screen } from '../lib/screen.js';
  import workload from '../story/credits.json';

  let { width } = $props();

  const story = workload.workload;
  const logo = `${import.meta.env.BASE_URL}favicon.svg`;
  const shade = interpolateRgb(colours.white, colours.navy);

  // Cell and type sizes per screen; everything else follows from these.
  const sizes = {
    mobile: { title: typeScale.body, label: typeScale.caption, column: typeScale.caption, cell: [64, 20], gap: spacing.sm, icon: 20, card: spacing.lg, labelPad: spacing.lg, split: spacing.xl, pad: spacing.md },
    ipad: { title: typeScale.bodyLarge, label: typeScale.body, column: typeScale.body, cell: [160, 24], gap: spacing.sm, icon: 24, card: spacing['2xl'], labelPad: spacing['2xl'], split: spacing['3xl'], pad: spacing.xl },
    desktop: { title: typeScale.bodyLarge, label: typeScale.body, column: typeScale.body, cell: [190, 26], gap: spacing.sm, icon: 26, card: spacing['3xl'], labelPad: spacing['2xl'], split: spacing['4xl'], pad: spacing['2xl'] }
  };
  let size = $derived(sizes[screen(width)]);
  const columns = [story.human, ...story.ai];
  const rows = story.rows.length;
</script>

<div class="workload" style:gap="{spacing.lg}px" style:background={colours.white} style:padding="{size.card}px">
  <h3 style:font-size="{size.title}px" style:font-weight={fontWeight.semibold} style:color={colours.navy}>{story.title}</h3>

  <div
    class="grid"
    style:grid-template-columns="auto {size.cell[0]}px {size.split}px {columns
      .slice(1)
      .map(() => `${size.cell[0]}px`)
      .join(' ')}"
    style:column-gap="{size.gap}px"
    style:row-gap="{size.gap}px"
    style:padding="0 {size.pad}px {size.pad}px 0"
  >
    <div class="legend" style:grid-column="2 / -1" style:grid-row="1" style:gap="{spacing.md}px" style:font-size="{size.label}px" style:color={colours.slate} style:margin-bottom="{size.gap * 3}px">
      <span class="ramp" style:width="{size.cell[0] * 0.6}px" style:height="{size.cell[1] * 0.4}px" style:background="linear-gradient(to right, {colours.white}, {colours.navy})" style:border-color={colours.slateFaint}></span>
      <span>{story.legend}</span>
    </div>

    <!-- AI panel sits behind the AI columns, from the icon row to the last row. -->
    <div class="panel" style:grid-column="4 / -1" style:grid-row="2 / {rows + 4}" style:background={colours.navySoft} style:margin="0 -{size.pad}px -{size.pad}px"></div>

    <div class="icon" style:grid-column="2" style:grid-row="2" style:padding-top="{size.pad}px">
      <a href={workload.link} target="_blank" rel="noopener"><img src={logo} alt="BM Data Visualisation" style:height="{size.icon}px" /></a>
    </div>
    <div class="icon" style:grid-column="4 / -1" style:grid-row="2" style:padding-top="{size.pad}px">
      <svg width={size.icon} height={size.icon} viewBox="0 0 40 40" aria-hidden="true">
        <line x1="20" y1="4" x2="20" y2="12" stroke={colours.slate} stroke-width="2.5" />
        <circle cx="20" cy="4" r="3" fill={colours.slate} />
        <rect x="6" y="12" width="28" height="24" rx="7" fill={colours.slate} />
        <circle cx="14" cy="24" r="3.2" fill={colours.white} />
        <circle cx="26" cy="24" r="3.2" fill={colours.white} />
      </svg>
    </div>

    {#each columns as name, c (name)}
      <div class="column" style:grid-column={c ? c + 3 : 2} style:grid-row="3" style:font-size="{size.column}px" style:color={colours.slate}>
        {#if c}{name}{:else}<a class="bm" href={workload.link} target="_blank" rel="noopener" style:color={colours.slate}>{name}</a>{/if}
      </div>
    {/each}

    {#each story.rows as row, r (row.task)}
      <div class="task" style:grid-column="1" style:grid-row={r + 4} style:font-size="{size.label}px" style:color={colours.slate} style:padding-right="{size.labelPad}px">{row.task}</div>
      {#each row.shares as share, c (c)}
        <div
          class="cell"
          style:grid-column={c ? c + 3 : 2}
          style:grid-row={r + 4}
          style:height="{size.cell[1]}px"
          style:background={shade(share)}
          style:border-color={colours.slateFaint}
        ></div>
      {/each}
    {/each}
  </div>
</div>

<style>
  .workload {
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  h3 {
    margin: 0;
  }

  .legend {
    justify-self: end;
    display: flex;
    align-items: center;
  }

  .ramp {
    border: 1px solid;
    border-radius: 3px;
  }

  .grid {
    display: grid;
    align-items: center;
    position: relative;
  }

  .panel {
    border-radius: 16px;
    align-self: stretch;
    z-index: 0;
  }

  .icon,
  .legend,
  .column,
  .cell {
    z-index: 1;
  }

  .icon {
    display: flex;
    justify-content: center;
  }

  .column {
    text-align: center;
  }

  .task {
    text-align: left;
    white-space: nowrap;
    line-height: 1.2;
  }

  .bm {
    text-decoration: none;
  }

  .bm:hover {
    text-decoration: underline;
  }

  .cell {
    border: 1.5px solid;
    border-radius: 6px;
    box-sizing: border-box;
  }
</style>
