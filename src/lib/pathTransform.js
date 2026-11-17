export const transformPath = (d, sx, sy, tx, ty) =>
  d.replace(/([MLCHVZ])([^MLCHVZ]*)/g, (match, command, args) => {
    const values = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    const scaled = values.map((v, i) => (command === 'V' || (command !== 'H' && i % 2) ? v * sy + ty : v * sx + tx));
    return command + scaled.join(' ');
  });
