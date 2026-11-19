import * as d3 from 'd3';
import groups from '../story/groups.json';

export const groupOf = (data, without = []) => {
  const eleven = new Set(d3.sort(data, (d) => -d.waits2025).slice(0, groups.elevenCount).map((d) => d.id).filter((id) => !without.includes(id)));
  return (d) => (eleven.has(d.id) ? 'eleven' : groups.tayside.includes(d.id) ? 'tayside' : groups.holding.includes(d.id) ? 'holding' : 'other');
};

export const elevenShare = (data, without = []) => {
  const group = groupOf(data, without);
  return Math.round((100 * d3.sum(data.filter((d) => group(d) === 'eleven'), (d) => d.waits2025)) / d3.sum(data, (d) => d.waits2025));
};
