<script lang="ts">
  import type { OutputFormat } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import { renderPdf } from './render';

  let format = $state<OutputFormat>('jpeg');
  let dpi = $state(150);
  let quality = $state(90);
</script>

<BatchTool
  verb="Convert"
  noun="PDF"
  track={{ output: format, quality: format === 'jpeg' ? quality : undefined }}
  run={(file, ctx) =>
    renderPdf(file, { format: format === 'png' ? 'png' : 'jpeg', quality, dpi }, ctx)}
>
  {#snippet settings()}
    <SaveAs bind:value={format} only={['jpeg', 'png']} />
    <Segmented
      label="Resolution"
      bind:value={dpi}
      options={[
        { value: 72, label: '72 DPI' },
        { value: 150, label: '150 DPI' },
        { value: 300, label: '300 DPI' },
      ]}
    />
    {#if format === 'jpeg'}<Slider label="Quality" bind:value={quality} min={1} max={100} />{/if}
  {/snippet}
</BatchTool>
