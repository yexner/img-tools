<script lang="ts">
  import type { Snippet } from 'svelte';
  import { formatBytes, percentChange } from '#lib/core';
  import Box from './Box.svelte';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import { download as downloadIcon, zip as zipIcon } from './icons';
  import { shorten, sizeOut, type FileResult, type Item } from './batch';

  let {
    summary,
    items,
    fileCount,
    auto,
    compress,
    itemView,
    actions,
    onrun,
    onsave,
    onsaveone,
    oncopy,
    ondownloadtext,
    onkeep,
  }: {
    summary: string;
    /** Every item; the ones that finished are listed with their results. */
    items: Item[];
    /** Number of downloadable files across all inputs. */
    fileCount: number;
    /** Auto tools have no "Run again". */
    auto: boolean;
    /** Compress tools offer to keep the original when the output is larger. */
    compress: boolean;
    itemView?: Snippet<[{ data: unknown; file: File }]>;
    actions?: Snippet;
    onrun: () => void;
    onsave: () => void;
    onsaveone: (r: FileResult) => void;
    oncopy: (text: string) => void;
    ondownloadtext: (filename: string, text: string) => void;
    onkeep: (it: Item) => void;
  } = $props();

  const done = $derived(items.filter((i) => i.status === 'done'));
</script>

<div class="result">
  <Box title="Result">
    <div class="result-row">
      <strong class="mono">{summary}</strong>
      <span class="row">
        {@render actions?.()}
        {#if !auto}<Button onclick={onrun}>Run again</Button>{/if}
        {#if fileCount}
          <Button variant="primary" icon={fileCount > 1 ? zipIcon : downloadIcon} onclick={onsave}>
            {fileCount > 1 ? `Download all (ZIP)` : 'Download'}
          </Button>
        {/if}
      </span>
    </div>
    <ul class="list" aria-label="Results">
      {#each done as it (it.id)}
        {@const out = sizeOut(it.results)}
        <li>
          <div class="meta">
            <span class="name" title={it.file.name}>{it.file.name}</span>
            <span class="mono tiny muted">
              {formatBytes(it.file.size)}
              {#if it.results.some((r) => r.type === 'file')}
                → {formatBytes(out)}
                <span class="pill" class:bad={out > it.file.size}
                  >{percentChange(it.file.size, out)}</span
                >
              {/if}
            </span>
            {#each it.results as r, k (k)}
              {#if r.type === 'file' && r.note}<span class="tiny muted">{r.note}</span>{/if}
              {#if r.type === 'text'}
                {#if r.note}<span class="tiny muted">{r.note}</span>{/if}
                <span class="text-out">
                  <code class="mono tiny" title={r.label}>{shorten(r.text)}</code>
                  <Button onclick={() => oncopy(r.text)}>Copy {r.label}</Button>
                  <Button onclick={() => ondownloadtext(r.filename, r.text)}>Download .txt</Button>
                </span>
              {/if}
              {#if r.type === 'data' && itemView}{@render itemView({
                  data: r.data,
                  file: it.file,
                })}{/if}
            {/each}
            {#if compress && out > it.file.size && it.results.length === 1}
              <span class="tiny warn">
                Larger than the original.
                <button type="button" class="link" onclick={() => onkeep(it)}>Keep original</button>
              </span>
            {/if}
          </div>
          <div class="actions">
            {#each it.results.filter((r): r is FileResult => r.type === 'file') as r (r.url)}
              <button
                type="button"
                class="icon-btn"
                aria-label="Download {r.name}"
                onclick={() => onsaveone(r)}
              >
                <Icon svg={downloadIcon} />
              </button>
            {/each}
          </div>
        </li>
      {/each}
    </ul>
  </Box>
</div>

<style>
  .result-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: space-between;
    align-items: center;
  }
  .list {
    display: grid;
    gap: 8px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    align-items: start;
    padding: 8px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .meta {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
  }
  .pill {
    padding: 1px 8px;
    border-radius: 99px;
    background: var(--safe-soft);
    color: var(--safe);
  }
  .pill.bad {
    background: var(--surface-sunk);
    color: var(--warn);
  }
  .warn {
    color: var(--warn);
  }
  .actions {
    display: flex;
    gap: 4px;
  }
  .icon-btn {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .icon-btn:hover {
    border-color: var(--accent);
  }
  .link {
    border: 0;
    background: none;
    padding: 0;
    color: var(--accent);
    text-decoration: underline;
    font-size: inherit;
  }
  .text-out {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  code {
    overflow-wrap: anywhere;
  }
</style>
