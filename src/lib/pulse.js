export const pulse = (progress, [start, end]) =>
  progress >= start && progress <= end ? Math.sin((Math.PI * (progress - start)) / (end - start)) : 0;
