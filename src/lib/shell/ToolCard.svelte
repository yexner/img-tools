<script lang="ts">
  import { toolUrl } from '#lib/paths';
  import type { Tool } from '#lib/types';
  import { ui } from '#lib/ui.svelte';
  import Icon from '#lib/ui/Icon.svelte';
  import { pin, pinned } from '#lib/ui/icons';

  let { tool, onopen }: { tool: Tool; onopen?: () => void } = $props();
  const isPinned = $derived(ui.isPinned(tool.slug));
</script>

<article class="card">
  <div class="top">
    <span class="tool-icon"><Icon svg={tool.icon} size={28} /></span>
    <button
      type="button"
      class="pin"
      class:on={isPinned}
      aria-pressed={isPinned}
      aria-label={isPinned ? `Unpin ${tool.name}` : `Pin ${tool.name}`}
      onclick={() => ui.togglePin(tool.slug)}
    >
      <Icon svg={isPinned ? pinned : pin} />
    </button>
  </div>
  <h3><a href={toolUrl(tool.slug)} onclick={onopen}>{tool.name}</a></h3>
  <p class="desc">{tool.description}</p>
  {#if tool.hint}<span class="mono tiny hint">{tool.hint}</span>{/if}
</article>

<style>
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-box);
    transition:
      border-color var(--ease),
      box-shadow var(--ease);
  }
  .card:hover,
  .card:focus-within {
    border-color: var(--accent);
    box-shadow: var(--shadow);
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    color: var(--ink-2);
  }
  h3 {
    font-size: 1.125rem;
  }
  h3 a {
    color: var(--ink);
    text-decoration: none;
  }
  /* The whole card is one link. */
  h3 a::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--radius-box);
  }
  .desc {
    margin: 0;
    color: var(--ink-2);
    font-size: 0.875rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .hint {
    margin-top: auto;
    color: var(--ink-2);
  }
  .pin {
    position: relative;
    z-index: 1;
    width: 40px;
    height: 40px;
    margin: -8px -8px 0 0;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: var(--radius);
    background: none;
    color: var(--ink-2);
  }
  .pin.on {
    color: var(--accent);
  }
  .pin:hover {
    background: var(--accent-soft);
  }
</style>
