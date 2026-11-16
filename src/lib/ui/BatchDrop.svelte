<script lang="ts">
  import { formats } from '#lib/core';
  import Icon from './Icon.svelte';
  import { upload } from './icons';

  let {
    batch,
    accepts,
    onpick,
    ondrop,
  }: {
    batch: boolean;
    accepts: readonly string[];
    onpick: () => void;
    ondrop: (e: DragEvent) => void;
  } = $props();

  let dragging = $state(false);
</script>

<button
  type="button"
  class="drop"
  class:dragging
  onclick={onpick}
  ondragover={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragleave={() => (dragging = false)}
  ondrop={(e) => {
    dragging = false;
    ondrop(e);
  }}
>
  <Icon svg={upload} size={28} />
  <strong>Drop {batch ? 'files' : 'a file'} here, or choose {batch ? 'files' : 'a file'}</strong>
  <span class="muted small">
    {accepts
      .map((a) => (a === 'image' ? 'Any image' : formats[a as keyof typeof formats]?.label))
      .join(', ')}. You can also paste from the clipboard.
  </span>
</button>

<style>
  .drop {
    display: grid;
    justify-items: center;
    gap: 8px;
    width: 100%;
    padding: 40px 16px;
    border: 2px dashed var(--line);
    border-radius: var(--radius-box);
    background: var(--surface-sunk);
    text-align: center;
    transition:
      border-color var(--ease),
      background var(--ease);
  }
  .drop:hover,
  .drop.dragging {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
</style>
