<script lang="ts">
  import { formatBytes } from '#lib/core';
  import Icon from './Icon.svelte';
  import { close } from './icons';
  import { LARGE, type Item } from './batch';

  let {
    it,
    selected,
    onselect,
    onremove,
  }: {
    it: Item;
    selected: boolean;
    onselect: () => void;
    onremove: () => void;
  } = $props();
</script>

<li class:selected>
  <button type="button" class="thumb" onclick={onselect} aria-label="Select {it.file.name}">
    {#if it.thumb}<img src={it.thumb} alt="" />{:else}<span class="mono tiny">{it.kind ?? '?'}</span
      >{/if}
  </button>
  <div class="meta">
    <span class="name" title={it.file.name}>{it.file.name}</span>
    <span class="mono tiny muted">{formatBytes(it.file.size)}</span>
    {#if it.file.size > LARGE}
      <span class="tiny warn"
        >Large file: this may be slow or run out of memory on this device.</span
      >
    {/if}
    {#if it.status === 'working'}
      <span class="bar" aria-hidden="true"
        ><span style:width="{Math.round(it.progress * 100)}%"></span></span
      >
    {/if}
    {#if it.status === 'error'}<span class="tiny err" role="alert">{it.error}</span>{/if}
  </div>
  <div class="actions">
    <button type="button" class="icon-btn" aria-label="Remove {it.file.name}" onclick={onremove}>
      <Icon svg={close} />
    </button>
  </div>
</li>

<style>
  li {
    display: grid;
    grid-template-columns: 56px 1fr auto;
    gap: 12px;
    align-items: start;
    padding: 8px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  li.selected {
    outline: 2px solid var(--accent);
  }
  .thumb {
    width: 56px;
    height: 56px;
    border: 0;
    padding: 0;
    border-radius: 6px;
    background: var(--surface-sunk);
    overflow: hidden;
    display: grid;
    place-items: center;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
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
  .warn {
    color: var(--warn);
  }
  .err {
    color: var(--danger);
  }
  .bar {
    display: block;
    height: 4px;
    border-radius: 2px;
    background: var(--surface-sunk);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width var(--ease);
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
</style>
