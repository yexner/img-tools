<script lang="ts">
  import Seo from '#lib/shell/Seo.svelte';
  import { siteUrl } from '#lib/config';
  import { goto } from '$app/navigation';
  import { categories } from '#lib/categories';
  import { formats, kindFromName, matchesAccepts, sniff } from '#lib/core';
  import { setHandoff } from '#lib/handoff';
  import { toolUrl } from '#lib/paths';
  import { tools } from '#lib/registry';
  import type { InputKind } from '#lib/types';
  import { ui } from '#lib/ui.svelte';
  import Box from '#lib/ui/Box.svelte';
  import Icon from '#lib/ui/Icon.svelte';
  import { upload } from '#lib/ui/icons';
  import ToolCard from '#lib/shell/ToolCard.svelte';

  let dropped = $state<File | null>(null);
  let kind = $state<InputKind | null>(null);
  let dragging = $state(false);
  let picker: HTMLInputElement | undefined = $state();

  const matches = $derived(dropped ? tools.filter((t) => matchesAccepts(kind, t.accepts)) : []);
  const pinned = $derived(tools.filter((t) => ui.pins.includes(t.slug)));

  async function take(files: File[]) {
    const file = files[0];
    if (!file) return;
    dropped = file;
    kind = (await sniff(file)) ?? kindFromName(file.name);
  }
  function open(slug: string) {
    if (dropped) setHandoff([dropped]);
    void goto(toolUrl(slug));
  }
</script>

<Seo
  title="IMG-TOOLS: image tools that run in your browser"
  description="Convert, compress, resize and edit images without uploading them anywhere."
  path="/"
  jsonLd={[
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'IMG-TOOLS', url: `${siteUrl}/` },
  ]}
/>

<div class="page">
  <h1>Image tools that run in your browser</h1>
  <p class="muted lead">
    Convert, compress, resize and edit images. Your files stay on this device.
  </p>

  <Box title="Find tools for a file">
    <button
      type="button"
      class="finder"
      class:dragging
      onclick={() => picker?.click()}
      ondragover={(e) => {
        e.preventDefault();
        dragging = true;
      }}
      ondragleave={() => (dragging = false)}
      ondrop={async (e) => {
        e.preventDefault();
        dragging = false;
        await take([...(e.dataTransfer?.files ?? [])]);
      }}
    >
      <Icon svg={upload} size={24} />
      <span>Drop an image, PDF, GIF or video to see which tools can handle it.</span>
    </button>
    <input
      bind:this={picker}
      class="sr-only"
      type="file"
      tabindex="-1"
      aria-hidden="true"
      onchange={async (e) => {
        const input = e.currentTarget;
        await take([...(input.files ?? [])]);
        input.value = '';
      }}
    />
    {#if dropped}
      <div class="found" aria-live="polite">
        {#if matches.length}
          <p class="small">
            <strong>{dropped.name}</strong> looks like {kind
              ? formats[kind as keyof typeof formats]?.label
              : 'a file'}. These tools can handle it:
          </p>
          <div class="grid">
            {#each matches as t (t.slug)}<ToolCard
                tool={t}
                onopen={() => dropped && setHandoff([dropped])}
              />{/each}
          </div>
        {:else}
          <p class="small">
            No tool can open <strong>{dropped.name}</strong> yet. Try a JPG, PNG, WebP, GIF, PDF or video
            file.
          </p>
        {/if}
      </div>
    {/if}
  </Box>

  {#if pinned.length}
    <section>
      <h2>Pinned</h2>
      <div class="grid">
        {#each pinned as t (t.slug)}<ToolCard tool={t} />{/each}
      </div>
    </section>
  {/if}

  <section>
    <h2>All tools</h2>
    {#each categories as c (c.id)}
      {@const list = tools.filter((t) => t.category === c.id)}
      {#if list.length}
        <h3 class="cat">{c.name} <span class="mono muted count">{list.length}</span></h3>
        <div class="grid">
          {#each list as t (t.slug)}<ToolCard tool={t} />{/each}
        </div>
      {/if}
    {/each}
  </section>
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    gap: 24px;
  }
  .lead {
    margin: -16px 0 0;
  }
  .finder {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    min-height: 140px;
    padding: 16px;
    border: 1px dashed var(--line);
    border-radius: var(--radius-box);
    color: var(--ink);
    background:
      linear-gradient(var(--line) 1px, transparent 1px) 0 0 / 24px 24px,
      linear-gradient(90deg, var(--line) 1px, transparent 1px) 0 0 / 24px 24px,
      var(--surface-sunk);
    background-blend-mode: soft-light;
  }
  .finder:hover,
  .finder.dragging {
    border-color: var(--accent);
  }
  .found {
    margin-top: 16px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }
  section > h2 {
    margin-bottom: 12px;
  }
  .cat {
    margin: 24px 0 12px;
    font-size: 1.125rem;
  }
  .count {
    font-size: 0.8125rem;
    font-weight: 400;
  }
</style>
