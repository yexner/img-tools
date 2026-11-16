<script lang="ts">
  import { copyText } from '#lib/clipboard';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { image } from '#lib/core';
  import { ui } from '#lib/ui.svelte';
  import Box from '#lib/ui/Box.svelte';
  import CopyField from '#lib/ui/CopyField.svelte';
  import ErrorNotice from '#lib/ui/ErrorNotice.svelte';
  import Notice from '#lib/ui/Notice.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import OneFile from '#lib/ui/OneFile.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import { extractPalette, toCssVariables, toJson, toTailwind } from './logic';
  import { objectUrl } from '#lib/objectUrl.svelte';

  const tool = getTool();
  let file = $state<File>();
  let choice = $state<number | 'custom'>(6);
  let custom = $state<number | undefined>(12);
  // Any whole number from 1 to 64; an empty or out-of-range field keeps the last good palette size.
  const count = $derived(
    choice === 'custom' ? Math.min(64, Math.max(1, Math.round(custom ?? 6))) : choice,
  );
  const url = objectUrl(() => file);
  let rgba = $state<Uint8ClampedArray>();
  let error = $state('');

  $effect(() => {
    const f = file;
    rgba = undefined;
    error = '';
    if (!f) return;
    let alive = true;
    // A small copy is plenty to find the main colors, and keeps this quick.
    image(f)
      .limit(200)
      .rgba()
      .then(
        (r) => alive && (rgba = new Uint8ClampedArray(r.data)),
        () => alive && (error = 'This picture could not be read.'),
      );
    return () => (alive = false);
  });

  const swatches = $derived(rgba ? extractPalette(rgba, count) : []);

  const copy = (text: string) => copyText(tool.slug, text, `Copied ${text}`);
</script>

<div class="stack">
  <OneFile bind:file title="Files" />

  <Box title="Settings">
    <Segmented
      label="Number of colors"
      bind:value={choice}
      options={[
        ...[4, 6, 8, 10].map((n) => ({ value: n, label: String(n) })),
        { value: 'custom', label: 'Custom' },
      ]}
    />
    {#if choice === 'custom'}
      <NumberField
        label="How many colors (1 to 64)"
        bind:value={custom}
        min={1}
        max={64}
        step={1}
      />
    {/if}
  </Box>

  <ErrorNotice {error} />
  {#if rgba && !swatches.length}
    <Notice kind="info">This picture is fully transparent, so it has no colors to find.</Notice>
  {/if}

  {#if swatches.length}
    <Box title="Palette">
      <div class="layout">
        <img src={url.current} alt="Preview of {file?.name}" />
        <ul class="swatches">
          {#each swatches as s (s.hex)}
            <li>
              <button
                type="button"
                onclick={() => copy(s.hex)}
                aria-label="Copy {s.hex} rgb({s.rgb.join(', ')}) hsl({s.hsl[0]}, {s.hsl[1]}%, {s
                  .hsl[2]}%) {s.share.toFixed(1)}%"
              >
                <span class="chip" style:background={s.hex}></span>
                <span class="info">
                  <strong class="mono">{s.hex}</strong>
                  <span class="mono tiny muted">rgb({s.rgb.join(', ')})</span>
                  <span class="mono tiny muted">hsl({s.hsl[0]}, {s.hsl[1]}%, {s.hsl[2]}%)</span>
                  <span class="mono tiny">{s.share.toFixed(1)}%</span>
                </span>
              </button>
            </li>
          {/each}
        </ul>
      </div>
      <CopyField
        label="CSS variables"
        value={toCssVariables(swatches)}
        filename="palette.css"
        multiline
      />
      <CopyField label="JSON" value={toJson(swatches)} filename="palette.json" multiline />
      <CopyField
        label="Tailwind theme"
        value={toTailwind(swatches)}
        filename="tailwind-palette.js"
        multiline
      />
    </Box>
  {/if}
</div>

<style>
  .layout {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr);
    margin-bottom: 16px;
  }
  @media (min-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
      align-items: start;
    }
  }
  img {
    width: 100%;
    height: auto;
    border-radius: var(--radius);
    box-shadow: 0 0 0 1px var(--line);
  }
  .swatches {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  }
  button {
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 10px;
    width: 100%;
    padding: 8px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    text-align: left;
  }
  button:hover {
    border-color: var(--accent);
  }
  .chip {
    width: 44px;
    height: 100%;
    min-height: 56px;
    border-radius: 6px;
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.15);
  }
  .info {
    display: grid;
    gap: 1px;
    min-width: 0;
  }
</style>
