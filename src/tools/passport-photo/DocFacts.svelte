<script lang="ts">
  import { formatRange, formatSize } from '#lib/core/units';
  import type { Doc } from './logic';

  let { doc, px, dpi }: { doc: Doc; px: { width: number; height: number }; dpi: number } = $props();
</script>

<dl class="facts">
  <dt>Size</dt>
  <dd>{formatSize(doc.width, doc.height)}, {px.width} × {px.height} px at {dpi} DPI</dd>
  <dt>Head height</dt>
  <dd>
    {#if doc.head}{formatRange(doc.head.min, doc.head.max)}, chin to crown{:else}Not stated on the
      official page{/if}
  </dd>
  <dt>Background</dt>
  <dd>{doc.background ?? 'Not stated on the official page'}</dd>
</dl>
{#if doc.note}<p class="tiny muted">{doc.note}</p>{/if}
{#if doc.source}
  <p class="tiny muted">
    Source: <a href={doc.source} rel="noreferrer">{new URL(doc.source).host}</a>, checked {doc.verified}.
  </p>
{/if}

<style>
  .facts {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 16px;
    margin: 0 0 12px;
  }
  dt {
    color: var(--text-muted);
  }
  dd {
    margin: 0;
  }
  p {
    margin: 0 0 12px;
  }
</style>
