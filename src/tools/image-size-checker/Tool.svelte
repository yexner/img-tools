<script lang="ts">
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import { inspect, type Report } from './logic';
</script>

<BatchTool verb="Check" auto run={async (file) => ({ data: await inspect(file) })}>
  {#snippet item({ data })}
    {@const r = data as Report}
    <dl class="facts">
      <div>
        <dt>Format</dt>
        <dd class="mono">{r.format}</dd>
      </div>
      <div>
        <dt>Size in pixels</dt>
        <dd class="mono">
          {#if r.size}{r.size.width} × {r.size.height} ({r.megapixels} MP){:else}Not available{/if}
        </dd>
      </div>
      <div>
        <dt>File size</dt>
        <dd class="mono">{r.fileSize}</dd>
      </div>
      <div>
        <dt>Aspect ratio</dt>
        <dd class="mono">
          {#if r.ratio}{r.ratio}<span class="muted"> · {r.nearest}</span>{:else}Not available{/if}
        </dd>
      </div>
      <div>
        <dt>DPI</dt>
        <dd class="mono">
          {#if r.dpi}{r.dpi.x === r.dpi.y ? r.dpi.x : `${r.dpi.x} × ${r.dpi.y}`}{:else}Not stored in
            this file{/if}
        </dd>
      </div>
    </dl>
    {#if r.extensionNote}<p class="tiny warn">{r.extensionNote}</p>{/if}
  {/snippet}
</BatchTool>

<style>
  .facts {
    display: grid;
    gap: 4px;
    margin: 4px 0 0;
  }
  .facts div {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
  }
  dt {
    min-width: 8.5rem;
    color: var(--muted);
  }
  dd {
    margin: 0;
  }
  p {
    margin: 4px 0 0;
  }
  .warn {
    color: var(--warn);
  }
</style>
