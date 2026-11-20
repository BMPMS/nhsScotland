import * as d3 from 'd3';
import { colours, capHeight } from '../theme.js';
import { standingPath, standingWidth, olderPath, olderWidth, standingBox, bedBox } from './paths.js';
import story from '../story/flow.json';

const { flow, layout: config } = story;

const roundedTab = (left, right, top, bottom, r) => `M${left},${bottom}V${top + r}A${r},${r} 0 0 1 ${left + r},${top}H${right - r}A${r},${r} 0 0 1 ${right},${top + r}V${bottom}`;

export const flowLayout = (width) => {
  const s = (v) => v * width;
  const body = { left: s(config.body.left), right: s(config.body.right), top: s(config.body.top), bottom: s(config.body.bottom), r: s(config.body.radius) };
  const tab = { left: s(config.tab.left), right: s(config.tab.right), top: s(config.tab.top), r: s(config.tab.radius) };
  const stroke = s(config.strokeShare);
  const divider = (tab.left + tab.right) / 2;
  const outline = `${roundedTab(tab.left, tab.right, tab.top, body.top, tab.r)}H${body.right - body.r}A${body.r},${body.r} 0 0 1 ${body.right},${body.top + body.r}V${body.bottom - body.r}A${body.r},${body.r} 0 0 1 ${body.right - body.r},${body.bottom}H${body.left + body.r}A${body.r},${body.r} 0 0 1 ${body.left},${body.bottom - body.r}V${body.top + body.r}A${body.r},${body.r} 0 0 1 ${body.left + body.r},${body.top}Z`;
  const tabBottom = body.top + stroke / 2;
  const leftCentre = (body.left + divider) / 2;
  const rightCentre = (divider + body.right) / 2;
  const areaWidth = (divider - body.left) * config.area.widthShare;
  const area = (top) => ({ x: leftCentre - areaWidth / 2, y: s(top), width: areaWidth, height: s(config.area.heightShare) });
  const bedWidth = s(config.beds.widthShare);
  const bedHeight = (bedWidth * bedBox.height) / bedBox.width;
  const bedsWidth = config.beds.columns * bedWidth + (config.beds.columns - 1) * s(config.beds.xGapShare);
  const beds = d3.range(config.beds.columns * config.beds.rows).map((i) => ({
    id: i,
    x: rightCentre - bedsWidth / 2 + (i % config.beds.columns) * (bedWidth + s(config.beds.xGapShare)),
    y: s(config.beds.top) + Math.floor(i / config.beds.columns) * (bedHeight + s(config.beds.yGapShare))
  }));
  return {
    body,
    tab,
    stroke,
    divider,
    outline,
    tabShape: `${roundedTab(tab.left, tab.right, tab.top, tabBottom, tab.r)}Z`,
    tabBottom,
    leftCentre,
    rightCentre,
    triage: area(config.area.triageTop),
    assessment: area(config.area.assessmentTop),
    beds,
    bedScale: bedWidth / bedBox.width,
    labelSize: s(config.labelShare),
    labelGap: s(config.labelGapShare),
    tabSize: s(config.tabTextShare),
    dash: s(config.dashShare),
    radius: s(config.area.radiusShare),
    exitY: s(config.exits.y),
    exitWidth: s(config.exits.widthShare),
    exitHeight: s(config.exits.heightShare),
    exitLabelGap: s(config.exits.labelGapShare),
    exitX: { transfer: s(config.exits.transfer), discharge: s(config.exits.discharge) },
    stageTop: s(config.stageTopShare),
    introY: s(config.introY)
  };
};

const icons = { person: { width: standingWidth, path: standingPath }, older: { width: olderWidth, path: olderPath }, top: standingBox.y, height: standingBox.height };

// Runs the patient flow simulation for one stage inside root; returns a function that stops it.
export const runFlow = (root, width, stage) => {
  const l = flowLayout(width);
  const s = (v) => v * width;
  const timers = [];
  const labels = root.selectAll('.areaLabel, .exitLabel');
  const labelSize = l.labelSize;
  const highlight = (elapsed) => {
    const t = elapsed - flow.highlightAfter;
    const up = Math.min(1, Math.max(0, t / flow.highlightTime));
    const down = Math.min(1, Math.max(0, (t - flow.highlightTime - flow.highlightHold) / flow.highlightTime));
    const grow = up * (1 - down);
    labels.attr('font-size', labelSize + s(flow.highlightGrowShare) * grow).attr('font-weight', grow > 0.5 ? 600 : 400);
    if (down === 1) highlightTimer.stop();
  };
  const highlightTimer = d3.timer(highlight);
  if (!stage.highlight) highlightTimer.stop();
  timers.push(highlightTimer);

  const size = s(flow.personShare);
  const r = (size / 2) * stage.collidePad;
  const scale = size / icons.height;
  const pad = size / 2 + s(flow.boxPadShare);
  const inset = (box) => ({ x0: box.x + pad, x1: box.x + box.width - pad, y0: box.y + pad, y1: box.y + box.height - pad });
  const boxes = { triage: inset(l.triage), assess: inset(l.assessment) };
  const capacity = (box) => Math.floor((((box.x1 - box.x0 + 2 * r) * (box.y1 - box.y0 + 2 * r)) / (4 * r * r)) * stage.packingDensity);
  const capacities = { triage: capacity(boxes.triage), assess: capacity(boxes.assess) };
  const exitY = l.body.bottom + s(flow.exitGapShare);
  const exitSpot = (key) => {
    const node = root.select(`.exit.${key}`);
    const x = +node.attr('x') + +node.attr('width') / 2;
    return { above: { x, y: +node.attr('y') - size / 2 - s(flow.exitAboveShare) }, inside: { x, y: +node.attr('y') + +node.attr('height') / 2 } };
  };
  const exits = { transfer: exitSpot('transfer'), discharge: exitSpot('discharge') };
  const bedSize = { width: l.bedScale * bedBox.width, height: l.bedScale * bedBox.height };
  const belowBeds = d3.max(l.beds, (b) => b.y) + bedSize.height + r;
  const fillOrder = d3.sort(l.beds, (b) => -b.y, (b) => b.x);

  const steady = (share) => {
    let count = 0;
    return () => Math.floor(++count * share) > Math.floor((count - 1) * share);
  };
  const isOlder = steady(flow.olderShare);
  const isOlderInBed = steady(flow.bedOlderShare);
  const baseColour = (older) => (older ? colours.blue : colours.navy);

  const full = fillOrder.slice(0, Math.round(l.beds.length * stage.start.occupancy));
  const beds = fillOrder.map((b) => ({ ...b, cx: b.x + bedSize.width / 2, cy: b.y + bedSize.height / 2, level: 0, older: false, busy: false, delayedAt: null, colour: null }));
  beds.slice(0, full.length).forEach((b) => Object.assign(b, { level: 1, older: isOlderInBed() }));

  const people = d3.range(flow.pool).map((id) => ({ id, older: false, state: 'idle', x: 0, y: 0, opacity: 0, scale: 1, route: [] }));
  const active = () => people.filter((p) => p.state !== 'idle');
  const inState = (key) => people.filter((p) => p.state === key).length;

  const spotIn = (key) => {
    const box = boxes[key];
    const taken = active()
      .filter((p) => p.state === key && p.spot)
      .map((p) => p.spot);
    return d3.greatest(
      d3.range(flow.candidates).map(() => ({ x: box.x0 + Math.random() * (box.x1 - box.x0), y: box.y0 + Math.random() * (box.y1 - box.y0) })),
      (c) => d3.min(taken, (t) => Math.hypot(t.x - c.x, t.y - c.y)) ?? 0
    );
  };

  const routes = {
    arrive: () => [{ x: boxes.triage.x0, y: boxes.triage.y0 }],
    toAssess: () => [
      { x: boxes.triage.x1, y: boxes.triage.y1 + pad },
      { x: boxes.assess.x1, y: boxes.assess.y0 - pad }
    ],
    admit: (b) => [
      { x: boxes.assess.x1 + pad, y: boxes.assess.y1 - pad },
      { x: l.divider, y: b.cy },
      { x: b.cx, y: b.cy }
    ],
    exit: (key) => [{ x: boxes.assess.x1 - r, y: boxes.assess.y1 + pad }, { x: boxes.assess.x1 - r, y: exitY }, { x: exits[key].above.x, y: exitY }, exits[key].above, exits[key].inside],
    fromBed: (b) => [{ x: b.cx, y: belowBeds }, { x: exits.discharge.above.x, y: belowBeds }, exits.discharge.above, exits.discharge.inside]
  };

  const use = (props) => Object.assign(people.find((p) => p.state === 'idle'), { vx: 0, vy: 0, opacity: 1, scale: 1, route: [], spot: null, lane: null, colour: null, waiting: false, since: d3.now() }, props);

  const enterBox = (p, key, now) => Object.assign(p, { state: key, route: [], since: now }, stage.packing === 'spread' ? { spot: spotIn(key) } : { lane: boxes[key].x0 + Math.random() * (boxes[key].x1 - boxes[key].x0) });

  ['triage', 'assess'].forEach((key) =>
    d3.range(stage.start[key]).forEach(() => {
      const p = use({ older: isOlder() });
      enterBox(p, key, d3.now() - Math.random() * (key === 'triage' ? stage.triageDwell : flow.assessDwell));
      Object.assign(p, spotIn(key));
    })
  );

  const arrive = () => use({ older: isOlder(), state: 'arriving', x: boxes.triage.x0, y: l.body.top - size, route: routes.arrive() });

  const delayProgress = (b, now) => (b.delayedAt === null ? 0 : Math.min(1, (now - b.delayedAt) / flow.delayToRed));
  const bedColour = (b, now) => b.colour ?? d3.interpolateRgb(baseColour(b.older), colours.red)(delayProgress(b, now));

  const leaveBed = (chosen) => {
    const ready = beds.filter((q) => q.level === 1 && !q.busy && q.delayedAt === null);
    const younger = ready.filter((q) => !q.older);
    const b = chosen ?? d3.shuffle(younger.length && Math.random() < flow.olderStayChance ? younger : ready)[0];
    if (!b) return;
    Object.assign(b, { busy: true, colour: bedColour(b, d3.now()), delayedAt: null });
    use({ older: b.older, colour: b.colour, state: 'rising', bed: b, x: b.cx, y: b.cy, scale: 0, opacity: 0 });
  };

  const delay = (b, now) => {
    const [low, high] = Math.random() < stage.longDelayChance ? stage.longDelayLength : stage.delayLength;
    Object.assign(b, { delayedAt: now, until: now + low + Math.random() * (high - low) });
  };

  const startDelay = () => {
    const free = beds.filter((q) => q.level === 1 && !q.busy && q.delayedAt === null);
    const older = free.filter((q) => q.older);
    const b = d3.shuffle(older.length && Math.random() < flow.delayOlderShare ? older : free.filter((q) => !q.older))[0];
    if (b) delay(b, d3.now());
  };

  const startDelays = Math.round(full.length * stage.start.delayed);
  d3.range(startDelays).forEach(() => startDelay());
  beds.filter((b) => b.delayedAt !== null).forEach((b) => Object.assign(b, { delayedAt: b.delayedAt - Math.random() * flow.delayToRed, until: b.delayedAt + Math.random() * (b.until - b.delayedAt) }));

  const occupied = () => beds.filter((b) => b.level === 1 || b.busy).length / beds.length;
  const target = () => stage.occupancyRange[0] + (stage.occupancyRange[1] - stage.occupancyRange[0]) * (0.5 - 0.5 * Math.cos((2 * Math.PI * d3.now()) / stage.cycle));
  const admitShare = () => stage.admitShare ?? stage.admitShares[+(occupied() < target())];

  const outcome = (p) => {
    const base = admitShare() / (1 + flow.olderShare * (flow.olderAdmitRatio - 1));
    const admit = Math.min(1, p.older ? base * flow.olderAdmitRatio : base);
    const u = Math.random();
    return u < admit ? 'admit' : u < admit + flow.transfer ? 'transfer' : 'discharge';
  };

  const vacant = () => beds.filter((q) => q.level === 0 && !q.busy);

  const decide = (p, now) => {
    if (p.state === 'triage' && now - p.since > stage.triageDwell && inState('assess') + inState('toAssess') < capacities.assess) Object.assign(p, { state: 'toAssess', spot: null, lane: null, route: routes.toAssess() });
    if (p.state !== 'assess' || now - p.since < flow.assessDwell) return;
    const choice = p.waiting ? 'admit' : outcome(p);
    if (choice === 'admit' && stage.minFree && vacant().length <= stage.minFree) leaveBed(beds.find((q) => q.delayedAt !== null && !q.busy));
    const b = choice === 'admit' && vacant()[0];
    if (b) {
      Object.assign(b, { busy: true, older: p.older, colour: null });
      Object.assign(p, { state: 'toBed', spot: null, lane: null, bed: b, route: routes.admit(b) });
    } else if (choice === 'admit' && stage.waitForBed) p.waiting = true;
    else {
      const key = choice === 'transfer' ? 'transfer' : 'discharge';
      Object.assign(p, { state: 'leaving', spot: null, lane: null, route: routes.exit(key) });
    }
  };

  const reached = (p, now) => {
    if (p.state === 'arriving') enterBox(p, 'triage', now);
    else if (p.state === 'toAssess') enterBox(p, 'assess', now);
    else if (p.state === 'toBed') Object.assign(p, { state: 'merging', since: now });
    else if (p.state === 'leaving') Object.assign(p, { state: 'fading', since: now });
  };

  const move = () => {
    const now = d3.now();
    active().forEach((p) => {
      decide(p, now);
      if (p.route.length) {
        const [next] = p.route;
        p.vx += (next.x - p.x) * flow.steer;
        p.vy += (next.y - p.y) * flow.steer;
        if (Math.hypot(next.x - p.x, next.y - p.y) < r) {
          p.route.shift();
          if (!p.route.length) reached(p, now);
        }
      } else if (p.spot) {
        p.vx += (p.spot.x - p.x) * flow.settle;
        p.vy += (p.spot.y - p.y) * flow.settle;
      } else if (p.lane !== null) {
        p.vx *= 1 - stage.boxDamping;
        p.vy *= 1 - stage.boxDamping;
        p.vy += stage.gravity;
        p.vx += (p.lane - p.x) * flow.lanePull;
      }
    });
  };

  const contain = (p, box) => {
    if (p.x < box.x0) (p.x = box.x0), (p.vx = 0);
    if (p.x > box.x1) (p.x = box.x1), (p.vx = 0);
    if (p.y < box.y0) (p.y = box.y0), (p.vy = 0);
    if (p.y > box.y1) (p.y = box.y1), (p.vy = 0);
  };

  const delays = (now) => beds.filter((b) => b.delayedAt !== null && !b.busy && now > b.until).forEach((b) => leaveBed(b));

  const animate = (now) => {
    delays(now);
    active().forEach((p) => {
      const t = Math.min(1, (now - p.since) / (p.state === 'fading' ? flow.fadeTime : flow.mergeTime));
      if (p.state === 'triage' || p.state === 'assess') contain(p, boxes[p.state]);
      if (p.state === 'merging') {
        Object.assign(p, { scale: 1 - t, opacity: 1 - t, vx: 0, vy: 0, x: p.bed.cx, y: p.bed.cy });
        p.bed.level = t;
        if (t === 1) (p.bed.busy = false), (p.state = 'idle');
      }
      if (p.state === 'rising') {
        Object.assign(p, { scale: t, opacity: t, vx: 0, vy: 0, x: p.bed.cx, y: p.bed.cy });
        p.bed.level = 1 - t;
        if (t === 1) (p.bed.busy = false), Object.assign(p, { state: 'leaving', route: routes.fromBed(p.bed) });
      }
      if (p.state === 'fading') Object.assign(p, { opacity: 1 - t, vx: 0, vy: 0 }), t === 1 && (p.state = 'idle');
    });
  };

  const bedById = new Map(beds.map((b) => [b.id, b]));
  const bedIcon = root.selectAll('.bed');
  const render = (now) => {
    const person = root
      .select('.people')
      .selectAll('.person')
      .data(people, (p) => p.id)
      .join((group) => {
        const enter = group.append('path').attr('class', 'person');
        return enter;
      });
    person
      .attr('opacity', (p) => (p.state === 'idle' ? 0 : p.opacity))
      .attr('transform', (p) => {
        const k = scale * p.scale;
        const w = (p.older ? icons.older : icons.person).width;
        return `translate(${p.x - (w / 2) * k},${p.y - (icons.top + icons.height / 2) * k}) scale(${k})`;
      });
    person.attr('d', (p) => (p.older ? icons.older : icons.person).path).attr('fill', (p) => p.colour ?? baseColour(p.older));

    const pulse = stage.pulse.low + ((1 - stage.pulse.low) * (1 + Math.sin((2 * Math.PI * now) / stage.pulse.period))) / 2;
    // Days in delay on each delayed bed, counting up from day 1.
    const delayed = beds.filter((b) => b.delayedAt !== null && !b.busy && b.level === 1);
    root
      .select('.bedDays')
      .selectAll('.bedDay')
      .data(delayed, (b) => b.id)
      .join((group) => {
        const enter = group.append('text').attr('class', 'bedDay').attr('text-anchor', 'middle').attr('fill', colours.white).attr('font-weight', 600);
        return enter;
      })
      .attr('x', (b) => b.x + bedSize.width * config.beds.dayX)
      // dayY is the middle of the bed's solid block; drop by half the cap height to centre the digits.
      .attr('y', (b) => b.y + bedSize.height * (config.beds.dayY + (config.beds.dayScale * capHeight) / 2))
      .attr('font-size', bedSize.height * config.beds.dayScale)
      .text((b) => Math.max(1, Math.ceil((now - b.delayedAt) / story.dayMs)));
    bedIcon.attr('opacity', (d) => (delayProgress(bedById.get(d.id), now) === 1 ? pulse : 1)).attr('fill', (d) => d3.interpolateRgb(colours.slateFaint, bedColour(bedById.get(d.id), now))(bedById.get(d.id).level));
  };

  const inBox = (p) => p.state === 'triage' || p.state === 'assess';
  const collide = d3.forceCollide(r).strength(stage.collideStrength).iterations(3);
  const simulation = d3
    .forceSimulation()
    .alphaDecay(0)
    .velocityDecay(flow.velocityDecay)
    .force('move', move)
    .force('collide', (alpha) => {
      collide.initialize(active().filter(inBox), Math.random);
      collide(alpha);
    })
    .on('tick', () => {
      const now = d3.now();
      animate(now);
      simulation.nodes(active().filter((p) => !['merging', 'rising', 'fading'].includes(p.state)));
      active()
        .filter(inBox)
        .forEach((p) => contain(p, boxes[p.state]));
      render(now);
    });

  simulation.nodes(active());
  render(d3.now());
  const delayedShare = () => beds.filter((b) => b.delayedAt !== null).length / Math.max(1, beds.filter((b) => b.level === 1).length);
  timers.push(d3.interval(arrive, stage.arriveEvery), d3.interval(startDelay, stage.delayEvery));
  if (stage.capacityDelays) timers.push(d3.interval(() => occupied() === 1 && delayedShare() < stage.capacityDelays && startDelay(), flow.capacityCheckEvery));
  timers.push(stage.bedLeaveEvery ? d3.interval(() => leaveBed(), stage.bedLeaveEvery) : d3.interval(() => occupied() > target() && leaveBed(), stage.bedCheckEvery));

  return () => {
    simulation.stop();
    timers.forEach((t) => t.stop());
    labels.attr('font-size', labelSize).attr('font-weight', 400);
  };
};
