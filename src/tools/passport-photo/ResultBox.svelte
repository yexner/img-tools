<script lang="ts" module>
  export interface Result {
    blob: Blob;
    url: string;
    width: number;
    height: number;
    dpi: number;
    sheet: boolean;
  }
</script>

<script lang="ts">
  import Box from '#lib/ui/Box.svelte';
  import Button from '#lib/ui/Button.svelte';
  import { download as downloadIcon } from '#lib/ui/icons';

  let {
    result,
    label,
    width,
    height,
    onsave,
  }: {
    result: Result;
    label?: string;
    width?: number;
    height?: number;
    onsave: () => void;
  } = $props();
</script>

<Box title="Result">
  <div class="head">
    <strong>{result.width} × {result.height} px, {result.dpi} DPI</strong>
    <Button variant="primary" icon={downloadIcon} onclick={onsave}>Download</Button>
  </div>
  {#if result.sheet}
    <img class="out sheet-out" src={result.url} alt="The finished print sheet" />
  {:else}
    <img
      class="out"
      src={result.url}
      alt="The finished {label} photo"
      style:aspect-ratio="{width} / {height}"
    />
  {/if}
</Box>

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
  }
  .out {
    display: block;
    max-width: 16rem;
    width: 100%;
    margin-top: 12px;
    border-radius: var(--radius);
    box-shadow: 0 0 0 1px var(--line);
  }
  .out.sheet-out {
    max-width: 30rem;
  }
</style>
