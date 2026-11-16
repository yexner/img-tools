import { getContext, setContext } from 'svelte';
import type { Tool } from '#lib/types';

const key = Symbol('tool');
export const setTool = (tool: Tool) => setContext(key, tool);
export const getTool = () => getContext<Tool>(key);
