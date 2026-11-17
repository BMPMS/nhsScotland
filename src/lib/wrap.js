export const wrapLines = (node, words, maxWidth) => {
  const offsets = words.map((word, i) => words.slice(0, i).join(' ').length + (i ? 1 : 0));
  const width = (a, b) => node.getSubStringLength(offsets[a], offsets[b] + words[b].length - offsets[a]);
  const breaks = words.reduce((starts, word, i) => (i > starts.at(-1) && width(starts.at(-1), i) > maxWidth ? [...starts, i] : starts), [0]);
  return breaks.map((a, i) => {
    const b = (breaks[i + 1] ?? words.length) - 1;
    return { text: words.slice(a, b + 1).join(' '), width: width(a, b) };
  });
};
