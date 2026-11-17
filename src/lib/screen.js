import { breakpoints } from '../theme.js';

export const screen = (width) =>
  width >= breakpoints.desktop ? 'desktop' : width >= breakpoints.ipad ? 'ipad' : 'mobile';
