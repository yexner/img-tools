import type { Component } from 'svelte';
import type { Help, Tool, ToolMeta } from '#lib/types';

// Every tool is a folder in src/tools/<slug>/. The folder name is the slug; nothing else lists it.
const metas = import.meta.glob<ToolMeta>('/src/tools/*/meta.ts', {
  eager: true,
  import: 'default',
});
const uis = import.meta.glob<{ default: Component }>('/src/tools/*/Tool.svelte');
const helps = import.meta.glob<Help>('/src/tools/*/help.ts', { import: 'default' });

const compareSpec = (a: string, b: string) => {
  const [a1, a2] = a.split('.').map(Number);
  const [b1, b2] = b.split('.').map(Number);
  return a1 - b1 || a2 - b2;
};

export const tools: Tool[] = Object.entries(metas)
  .map(([path, meta]) => ({ ...meta, slug: path.split('/')[3] }))
  .sort((a, b) => compareSpec(a.spec, b.spec));

export const toolBySlug = (slug: string) => tools.find((t) => t.slug === slug);

export async function loadTool(slug: string) {
  const [ui, help] = await Promise.all([
    uis[`/src/tools/${slug}/Tool.svelte`](),
    helps[`/src/tools/${slug}/help.ts`](),
  ]);
  return { Tool: ui.default, help };
}
