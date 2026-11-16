<script lang="ts">
  // Convert family: any mix of images in, one file out per input (one per page for a multi-page TIFF),
  // in the format and quality the visitor picks. Used by convert-image.
  import { pages } from '#lib/core';
  import { formatQuality } from '#lib/formatQuality.svelte';
  import type { OutputFormat } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Slider from '#lib/ui/Slider.svelte';

  const formats: OutputFormat[] = ['jpeg', 'png', 'webp', 'avif'];
  const describe: Partial<Record<OutputFormat, string>> = {
    jpeg: 'Small files that open everywhere. Transparent areas become white.',
    png: 'No loss of quality and keeps transparency, but photos become large.',
    webp: 'Smaller than JPG at similar quality, and keeps transparency.',
    avif: 'The smallest files and keeps transparency, but takes longer to create.',
  };

  let format = $state<OutputFormat>('jpeg');
  // Each lossy format keeps its own good default, so switching formats does not carry a poor value over.
  const q = formatQuality();
</script>

<BatchTool
  verb="Convert"
  suffix=""
  track={{ output: format, quality: q.tracked(format) }}
  run={async (file, ctx) => {
    const list = await pages(file, ctx.signal);
    const outputs = [];
    for (const [i, page] of list.entries()) {
      const r = await page.encode(format, { quality: q.qualityFor(format) });
      ctx.progress((i + 1) / list.length);
      // Every page of a multi-page TIFF becomes its own file.
      outputs.push({ blob: r.blob, note: r.note, suffix: list.length > 1 ? `page-${i + 1}` : '' });
    }
    return outputs;
  }}
>
  {#snippet settings()}
    <SaveAs bind:value={format} only={formats} {describe} />
    {#if q.showsQuality(format)}
      <Slider
        label="Quality"
        bind:value={() => q.qualityFor(format), (v) => q.setQuality(format, v)}
        min={1}
        max={100}
      />
    {/if}
  {/snippet}
</BatchTool>
