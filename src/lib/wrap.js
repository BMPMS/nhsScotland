import * as d3 from 'd3';

const balanceSteps = 12;

export const wrapLines = (node, words, maxWidth) => {
  const offsets = words.map((word, i) => words.slice(0, i).join(' ').length + (i ? 1 : 0));
  const width = (a, b) => node.getSubStringLength(offsets[a], offsets[b] + words[b].length - offsets[a]);
  const breaks = words.reduce((starts, word, i) => (i > starts.at(-1) && width(starts.at(-1), i) > maxWidth ? [...starts, i] : starts), [0]);
  return breaks.map((a, i) => {
    const b = (breaks[i + 1] ?? words.length) - 1;
    return { text: words.slice(a, b + 1).join(' '), width: width(a, b) };
  });
};

const balanced = (node, texts, maxWidth) => {
  const count = wrapLines(node, texts, maxWidth).length;
  const [, fit] = d3.range(balanceSteps).reduce(([lo, hi]) => {
    const mid = (lo + hi) / 2;
    return wrapLines(node, texts, mid).length > count ? [mid, hi] : [lo, mid];
  }, [maxWidth / count, maxWidth]);
  return wrapLines(node, texts, fit);
};

const sameStyle = (a, b) => Object.keys(b).every((key) => key === 'text' || a[key] === b[key]);

export const wrapSegments = (node, words, maxWidth, balance = false) => {
  const texts = words.map((w) => w.text);
  node.textContent = texts.join(' ');
  let start = 0;
  return (balance ? balanced : wrapLines)(node, texts, maxWidth).map((line) =>
    words.slice(start, (start += line.text.split(' ').length)).reduce((segments, w, i) => {
      const last = segments.at(-1);
      const text = i ? ` ${w.text}` : w.text;
      return last && sameStyle(last, w) ? [...segments.slice(0, -1), { ...last, text: last.text + text }] : [...segments, { ...w, text }];
    }, [])
  );
};

export const fitSize = (node, texts, maxWidth, maxSize) =>
  Math.min(
    maxSize,
    d3.min(texts, (text) => {
      node.textContent = text;
      node.setAttribute('font-size', 1);
      return maxWidth / node.getComputedTextLength();
    })
  );
