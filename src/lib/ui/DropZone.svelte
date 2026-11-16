<script lang="ts">
  // Empty-state drop target: click to choose, or drop files (and folders, when `batch`).
  import { acceptAttr, formats } from '#lib/core';
  import { filesFromDrop } from '#lib/core/intake';
  import type { InputKind } from '#lib/types';
  import Icon from './Icon.svelte';
  import { upload } from './icons';

  let {
    accepts,
    batch,
    onfiles,
  }: { accepts: InputKind[]; batch: boolean; onfiles: (files: File[]) => void } = $props();

  let dragging = $state(false);
  let picker: HTMLInputElement;

  async function drop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    if (e.dataTransfer) onfiles(await filesFromDrop(e.dataTransfer, batch));
  }

  function pick(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    onfiles(files);
  }

  const kinds = $derived(
    accepts
      .map((a) => (a === 'image' ? 'Any image' : formats[a as keyof typeof formats]?.label))
      .join(', '),
  );
</script>

<button
  type="button"
  class="drop"
  class:dragging
  onclick={() => picker.click()}
  ondragover={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragleave={() => (dragging = false)}
  ondrop={drop}
>
  <Icon svg={upload} size={28} />
  <strong>Drop {batch ? 'files' : 'a file'} here, or choose {batch ? 'files' : 'a file'}</strong>
  <span class="muted small">{kinds}. You can also paste from the clipboard.</span>
</button>
<input
  bind:this={picker}
  class="sr-only"
  type="file"
  accept={acceptAttr(accepts)}
  multiple={batch}
  onchange={pick}
  tabindex="-1"
  aria-hidden="true"
/>

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
