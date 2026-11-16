<script lang="ts">
  import type { Snippet } from 'svelte';
  import Box from './Box.svelte';
  import Button from './Button.svelte';
  import { download as downloadIcon } from './icons';

  let {
    summary,
    downloadLabel = 'Download',
    onDownload,
    disabled = false,
    mono = false,
    live = false,
    children,
  }: {
    /** A line of text, or a snippet when the summary needs markup. */
    summary: string | Snippet;
    downloadLabel?: string;
    onDownload: () => void;
    /** Disables the button, for example while the file is being made. */
    disabled?: boolean;
    /** Set the summary in the monospace face. */
    mono?: boolean;
    /** Announce changes to the summary to screen readers. */
    live?: boolean;
    children?: Snippet;
  } = $props();
</script>

<Box title="Result">
  <div class="head">
    <strong class:mono aria-live={live ? 'polite' : undefined}>
      {#if typeof summary === 'string'}{summary}{:else}{@render summary()}{/if}
    </strong>
    <Button variant="primary" icon={downloadIcon} {disabled} onclick={onDownload}
      >{downloadLabel}</Button
    >
  </div>
  {@render children?.()}
</Box>

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
</style>
