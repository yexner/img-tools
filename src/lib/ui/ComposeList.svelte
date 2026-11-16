<script lang="ts">
  // The ordered file list of ComposeTool: thumbnail, name, size, and move/remove buttons.
  import type { Snippet } from 'svelte';
  import { formatBytes } from '#lib/core';
  import type { ComposeSource as Source } from '#lib/types';
  import Icon from './Icon.svelte';
  import { arrowDown, arrowUp, close } from './icons';

  let {
    sources,
    extra,
    onmove,
    onremove,
  }: {
    sources: Source[];
    extra?: Snippet<[Source, number]>;
    onmove: (index: number, by: -1 | 1) => void;
    onremove: (id: number) => void;
  } = $props();
</script>

<ol class="list" aria-label="Files, in order">
  {#each sources as s, i (s.id)}
    <li>
      <span class="pos mono" aria-hidden="true">{i + 1}</span>
      <span class="thumb">
        {#if s.thumb}<img src={s.thumb} alt="" />{:else}<span class="mono tiny">{s.kind}</span>{/if}
      </span>
      <span class="meta">
        <span class="name" title={s.file.name}>{s.file.name}</span>
        <span class="mono tiny muted">{formatBytes(s.file.size)}</span>
        {@render extra?.(s, i)}
      </span>
      <span class="actions">
        <button
          type="button"
          class="icon-btn"
          aria-label="Move {s.file.name} up"
          disabled={i === 0}
          onclick={() => onmove(i, -1)}><Icon svg={arrowUp} /></button
        >
        <button
          type="button"
          class="icon-btn"
          aria-label="Move {s.file.name} down"
          disabled={i === sources.length - 1}
          onclick={() => onmove(i, 1)}><Icon svg={arrowDown} /></button
        >
        <button
          type="button"
          class="icon-btn"
          aria-label="Remove {s.file.name}"
          onclick={() => onremove(s.id)}><Icon svg={close} /></button
        >
      </span>
    </li>
  {/each}
</ol>

<style>
  .list {
    list-style: none;
    padding: 0;
    margin: 0 0 12px;
    display: grid;
    gap: 8px;
  }
  .list li {
    display: grid;
    grid-template-columns: 24px 56px 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 8px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .pos {
    text-align: center;
    color: var(--muted);
  }
  .thumb {
    width: 56px;
    height: 56px;
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
  .icon-btn:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .icon-btn:disabled {
    opacity: 0.4;
  }
</style>
