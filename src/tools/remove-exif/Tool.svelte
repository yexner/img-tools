<script lang="ts">
  import type { OutputFormat } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import { CHOICES, clean, optionsFrom, type ChoiceId } from './logic';

  let format = $state<OutputFormat>('original');
  let quality = $state(95);
  // Everything is removed unless a box is cleared. The choice applies to every file in the batch.
  let removed = $state<Record<ChoiceId, boolean>>({
    location: true,
    camera: true,
    time: true,
    author: true,
    other: true,
    xmpIptc: true,
    icc: true,
  });
  const keepsSomething = $derived(CHOICES.some((c) => !removed[c.id]));
</script>

<BatchTool
  verb="Remove metadata from"
  suffix="clean"
  track={{ output: format, quality: format === 'jpeg' || format === 'webp' ? quality : undefined }}
  run={async (file, ctx) => clean(file, format, quality, ctx.signal, optionsFrom(removed))}
>
  {#snippet settings()}
    <SaveAs bind:value={format} only={['original', 'jpeg', 'png', 'webp']} />
    {#if format === 'jpeg' || format === 'webp'}
      <Slider label="Quality" bind:value={quality} min={1} max={100} />
    {/if}
    {#if format === 'original'}
      <fieldset>
        <legend>Remove from every file</legend>
        {#each CHOICES as c (c.id)}
          <Toggle label={c.label} bind:checked={removed[c.id]} />
        {/each}
      </fieldset>
      {#if keepsSomething}
        <p class="tiny muted">
          Unticked details stay in the files. Camera makers' notes and the embedded thumbnail are
          always removed when "Other Exif tags" is ticked, and details about how to show the picture
          (its orientation and color space) stay.
        </p>
      {/if}
    {:else}
      <p class="tiny muted">
        Saving in another format always removes all metadata. Choose "Original" to pick what to
        remove.
      </p>
    {/if}
    <p class="tiny muted">
      JPG, PNG and WebP files in their own format are cleaned without touching the picture. Anything
      else is saved again.
    </p>
  {/snippet}
</BatchTool>

<style>
  p {
    margin: 0 0 12px;
  }
  fieldset {
    border: 0;
    margin: 0 0 12px;
    padding: 0;
    display: grid;
  }
  legend {
    padding: 0;
    margin-bottom: 4px;
    font-weight: 600;
  }
</style>
