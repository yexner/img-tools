<script lang="ts">
  // The sheet and the CSS as they will be written, redrawn when pictures or settings change.
  import { onDestroy } from 'svelte';
  import type { ComposeSource } from '#lib/types';
  import CopyField from '#lib/ui/CopyField.svelte';
  import { closeAll, drawSheet, layoutOf } from './sheet';
  import { urlBag } from '#lib/objectUrl.svelte';

  let { sources, gap, retina }: { sources: ComposeSource[]; gap: number; retina: boolean } =
    $props();

  let view = $state<{ url: string; css: string; width: number; height: number; count: number }>();
  let failed = $state('');
  let run = 0;
  const urls = urlBag();

  $effect(() => {
    const files = [...sources];
    const g = gap;
    const r = retina;
    const mine = ++run;
    void (async () => {
      try {
        const made = await layoutOf(files, g, r);
        const blob = await drawSheet(made, 1);
        closeAll(made);
        if (mine !== run) return;
        if (view) urls.revoke(view.url);
        view = {
          url: urls.add(blob),
          css: made.css,
          width: made.packed.width,
          height: made.packed.height,
          count: files.length,
        };
        failed = '';
      } catch {
        if (mine === run) failed = 'One of the images could not be read.';
      }
    })();
  });

  onDestroy(() => {
    run++;
  });
</script>

{#if failed}
  <p class="err" role="alert">{failed}</p>
{:else if view}
  <p class="mono tiny muted">{view.count} images · sheet {view.width} × {view.height} px</p>
  <div class="sheet"><img src={view.url} alt="The sprite sheet" /></div>
  <CopyField label="CSS" value={view.css} filename="sprite.css" multiline />
{:else}
  <p class="muted">Preparing the sheet…</p>
{/if}

<style>
  .sheet {
    overflow: auto;
    max-height: 420px;
    margin-bottom: 16px;
    border-radius: var(--radius);
    background: conic-gradient(
        var(--surface-sunk) 25%,
        var(--surface) 0 50%,
        var(--surface-sunk) 0 75%,
        var(--surface) 0
      )
      0 0 / 16px 16px;
  }
  img {
    display: block;
    image-rendering: pixelated;
  }
  p {
    margin: 0 0 8px;
  }
  .err {
    color: var(--danger);
  }
</style>
