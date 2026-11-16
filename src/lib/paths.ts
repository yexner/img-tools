import { resolve } from '$app/paths';

/** Relative-safe internal link with a trailing slash (every route is prerendered as dir/index.html). */
export function url(path: string): string {
  const resolved = (resolve as (p: string) => string)(path);
  return resolved.endsWith('/') ? resolved : resolved + '/';
}

export const toolUrl = (slug: string) => url('/' + slug);

/** Relative-safe link to a file in `static/` (no trailing slash). */
export const fileUrl = (path: string): string => (resolve as (p: string) => string)(path);
