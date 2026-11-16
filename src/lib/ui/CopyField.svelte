<script lang="ts">
  // A piece of generated text with Copy and Download buttons. Long text is cut short on screen, never when copied.
  import { copyText } from '#lib/clipboard';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { download } from '#lib/core/intake';
  import { ui } from '#lib/ui.svelte';
  import Button from './Button.svelte';

  let {
    label,
    value,
    filename,
    multiline = false,
  }: {
    label: string;
    value: string;
    /** When given, a "Download .txt" button saves the text under this name. */
    filename?: string;
    /** Show the whole text in a box, for code that has several lines. */
    multiline?: boolean;
  } = $props();

  const tool = getTool();

  const copy = () => copyText(tool.slug, value);
</script>

<div class="field">
  <div class="head">
    <strong>{label}</strong>
    <span class="row">
      <Button onclick={copy}>Copy</Button>
      {#if filename}
        <Button onclick={() => download(filename, new Blob([value], { type: 'text/plain' }))}
          >Download .txt</Button
        >
      {/if}
    </span>
  </div>
  {#if multiline}
    <pre class="mono">{value}</pre>
  {:else}
    <code class="mono">{value.length > 160 ? value.slice(0, 160) + '…' : value}</code>
  {/if}
</div>

<style>
  .field {
    display: grid;
    gap: 6px;
    margin-bottom: 16px;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .row {
    display: flex;
    gap: 8px;
  }
  code,
  pre {
    margin: 0;
    padding: 10px 12px;
    border-radius: var(--radius);
    background: var(--surface-sunk);
    overflow-wrap: anywhere;
  }
  pre {
    white-space: pre-wrap;
    font-size: 0.8125rem;
  }
</style>
