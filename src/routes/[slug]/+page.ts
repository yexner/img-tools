import { error } from '@sveltejs/kit';
import { loadTool, toolBySlug, tools } from '#lib/registry';

export const entries = () => tools.map((t) => ({ slug: t.slug }));

export async function load({ params }) {
  const meta = toolBySlug(params.slug) ?? error(404, 'Tool not found');
  const { Tool, help } = await loadTool(params.slug);
  return { meta, Tool, help };
}
