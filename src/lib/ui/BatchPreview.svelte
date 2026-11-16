<script lang="ts">
  import type { Snippet } from 'svelte';
  import Box from './Box.svelte';
  import type { FileResult, Item } from './batch';

  let {
    current,
    preview,
  }: {
    /** The selected item, or undefined while the list is empty. */
    current: Item | undefined;
    preview?: Snippet<[{ url: string; file: File; result?: { url: string; blob: Blob } }]>;
  } = $props();

  const currentResult = $derived(
    current?.results.find(
      (r): r is FileResult => r.type === 'file' && r.blob.type.startsWith('image/'),
    ),
  );
</script>

<Box title="Preview">
  {#if current}
    {#if preview && (current.thumb || currentResult)}
      {@render preview({
        url: currentResult?.url ?? current.thumb,
        file: current.file,
        result: current.results.find((r): r is FileResult => r.type === 'file'),
      })}
    {:else if currentResult || current.thumb}
      <div class="stage">
        <img src={currentResult?.url ?? current.thumb} alt="Preview of {current.file.name}" />
      </div>
    {:else}
      <p class="muted">No preview is available for this file type.</p>
    {/if}
  {:else}
    <p class="muted">Add a file to see a preview.</p>
  {/if}
</Box>

<style>
  .stage {
    display: grid;
    place-items: center;
    min-height: 200px;
    max-height: 480px;
    padding: 12px;
    border-radius: var(--radius);
    background: conic-gradient(
        var(--surface) 25%,
        var(--surface-sunk) 0 50%,
        var(--surface) 0 75%,
        var(--surface-sunk) 0
      )
      0 0 / 20px 20px;
    overflow: hidden;
  }
  .stage img {
    max-width: 100%;
    max-height: 456px;
    object-fit: contain;
  }
</style>
