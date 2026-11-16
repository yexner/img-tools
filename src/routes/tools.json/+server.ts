import { json } from '@sveltejs/kit';
import { tools } from '#lib/registry';

export const prerender = true;

/** Feeds the Playwright smoke spec: one test per tool. */
export const GET = () =>
  json(tools.map(({ slug, name, accepts, batch }) => ({ slug, name, accepts, batch })));
