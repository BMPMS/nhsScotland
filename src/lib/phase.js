import steps from '../story/steps.json';

export const phase = (progress, [start, end]) => Math.min(1, Math.max(0, (progress - start) / (end - start)));

export const stepPhase = (id, key, step, progress) => {
  const index = steps.findIndex((s) => s.id === id);
  return step < index ? 0 : step > index ? 1 : phase(progress, steps[index][key]);
};
