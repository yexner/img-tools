<script lang="ts">
  import { image, readSizeOf } from '#lib/core';
  import { platforms, sizeName, socialSizes, type SocialSize } from '#lib/data/social-sizes';
  import type { OutputFormat } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import Button from '#lib/ui/Button.svelte';
  import FocalStage from './FocalStage.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import { cutFor } from './logic';

  const key = (s: SocialSize) => sizeName(s);
  let chosen = $state(new Set(socialSizes.map(key)));
  let focal = $state({ x: 0.5, y: 0.5 });
  let format = $state<OutputFormat>('jpeg');
  let quality = $state(90);

  const picked = $derived(socialSizes.filter((s) => chosen.has(key(s))));

  function toggle(s: SocialSize, on: boolean) {
    const next = new Set(chosen);
    if (on) next.add(key(s));
    else next.delete(key(s));
    chosen = next;
  }
  function all(platform: string, on: boolean) {
    const next = new Set(chosen);
    for (const s of socialSizes)
      if (s.platform === platform) on ? next.add(key(s)) : next.delete(key(s));
    chosen = next;
  }

  async function resize(file: File, ctx: { signal: AbortSignal; progress(f: number): void }) {
    const size = await readSizeOf(file);
    if (!size) throw new Error('The size of this picture could not be read.');
    const bounds = { w: size.width, h: size.height };
    const outputs = [];
    for (const [i, s] of picked.entries()) {
      const cut = cutFor(s, bounds, focal);
      const r = await image(file, ctx.signal)
        .crop(cut.x, cut.y, cut.w, cut.h)
        .resize(s.width, s.height, 'stretch') // the cut already has this shape, so nothing is distorted
        .encode(format, { quality });
      outputs.push({ blob: r.blob, name: sizeName(s), note: r.note });
      ctx.progress((i + 1) / picked.length);
    }
    return outputs;
  }
</script>

<BatchTool
  verb="Resize"
  noun="picture"
  ready={picked.length > 0}
  track={{ output: format, quality: format === 'png' ? undefined : quality }}
  run={resize}
>
  {#snippet settings()}
    {#each platforms as platform (platform)}
      <fieldset>
        <legend>{platform}</legend>
        <div class="bulk">
          <Button onclick={() => all(platform, true)}>All</Button>
          <Button onclick={() => all(platform, false)}>None</Button>
        </div>
        {#each socialSizes.filter((s) => s.platform === platform) as s (key(s))}
          <label class="size">
            <input
              type="checkbox"
              checked={chosen.has(key(s))}
              onchange={(e) => toggle(s, e.currentTarget.checked)}
            />
            <span>
              {s.label}
              <span class="mono tiny muted">{s.width} × {s.height}</span>
              <a class="tiny" href={s.source} target="_blank" rel="noopener noreferrer"
                >source, checked {s.verified}</a
              >
            </span>
          </label>
        {/each}
      </fieldset>
    {/each}
    <SaveAs bind:value={format} only={['jpeg', 'png', 'webp', 'avif']} />
    {#if format !== 'png'}<Slider label="Quality" bind:value={quality} min={1} max={100} />{/if}
  {/snippet}
  {#snippet preview(src)}
    {#key src.file}
      {@render stage(src.file)}
    {/key}
  {/snippet}
</BatchTool>

{#snippet stage(file: File)}
  <p class="tiny muted">
    Click the most important part of the picture. Every crop is centered on it.
  </p>
  <FocalStage {file} bind:focal />
{/snippet}

<style>
  fieldset {
    border: 0;
    padding: 0;
    margin: 0 0 16px;
  }
  legend {
    font-weight: 700;
    margin-bottom: 6px;
    padding: 0;
  }
  .bulk {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
  }
  .size {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-height: 44px;
    padding: 6px 0;
    cursor: pointer;
  }
  .size input {
    width: 20px;
    height: 20px;
    margin-top: 2px;
    accent-color: var(--accent);
  }
  .size span {
    display: grid;
    gap: 2px;
  }
  p {
    margin: 0 0 8px;
  }
</style>
