<script lang="ts">
  import { goto } from '$app/navigation';
  import { tick } from 'svelte';
  import { categories } from '#lib/categories';
  import { search } from '#lib/fuzzy';
  import { toolUrl } from '#lib/paths';
  import { tools } from '#lib/registry';
  import { ui } from '#lib/ui.svelte';
  import Icon from '#lib/ui/Icon.svelte';

  let query = $state('');
  let active = $state(0);
  let input: HTMLInputElement | undefined = $state();
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? '';
  const results = $derived(
    search(query, tools, (t) => [
      t.name,
      t.description,
      ...(t.keywords ?? []),
      catName(t.category),
    ]).slice(0, 12),
  );

  $effect(() => {
    if (ui.palette) {
      query = '';
      active = 0;
      tick().then(() => input?.focus());
    }
  });
  $effect(() => {
    void query;
    active = 0;
  });

  function close() {
    ui.palette = false;
  }
  function open(slug: string) {
    close();
    void goto(toolUrl(slug));
  }
  function key(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = Math.min(active + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(active - 1, 0);
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      open(results[active].slug);
    } else if (e.key === 'Tab') {
      e.preventDefault(); // focus stays in the field while the palette is open
    }
  }
</script>

{#if ui.palette}
  <div class="overlay" role="presentation">
    <button type="button" class="scrim" aria-label="Close search" onclick={close} tabindex="-1"
    ></button>
    <div class="palette" role="dialog" aria-modal="true" aria-label="Search tools">
      <input
        bind:this={input}
        bind:value={query}
        onkeydown={key}
        type="search"
        placeholder="Search tools…"
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-results"
        aria-activedescendant={results[active] ? `pal-${results[active].slug}` : undefined}
        autocomplete="off"
        spellcheck="false"
      />
      <ul id="palette-results" role="listbox">
        {#each results as t, i (t.slug)}
          <li
            id="pal-{t.slug}"
            role="option"
            aria-selected={i === active}
            class:active={i === active}
          >
            <button
              type="button"
              tabindex="-1"
              onclick={() => open(t.slug)}
              onmousemove={() => (active = i)}
            >
              <Icon svg={t.icon} />
              <span class="text">
                <span class="n">{t.name} <span class="muted tiny">{catName(t.category)}</span></span
                >
                <span class="muted tiny">{t.description}</span>
              </span>
            </button>
          </li>
        {:else}
          <li class="empty muted">No tools match “{query}”.</li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 12vh;
  }
  .scrim {
    position: absolute;
    inset: 0;
    border: 0;
    background: rgb(0 0 0 / 0.45);
  }
  .palette {
    position: relative;
    width: min(640px, 94vw);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-box);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  input {
    width: 100%;
    min-height: 52px;
    padding: 0 16px;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: transparent;
    font-size: 1rem;
  }
  input:focus-visible {
    outline-offset: -2px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 8px;
    max-height: 50vh;
    overflow-y: auto;
  }
  li button {
    display: flex;
    gap: 12px;
    align-items: center;
    width: 100%;
    min-height: 48px;
    padding: 6px 12px;
    border: 0;
    border-radius: var(--radius);
    background: none;
    text-align: left;
    color: var(--ink);
  }
  li.active button {
    background: var(--accent-soft);
  }
  .text {
    display: grid;
    min-width: 0;
  }
  .text > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .empty {
    padding: 12px;
  }
</style>
