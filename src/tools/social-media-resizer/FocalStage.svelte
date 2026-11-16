<script lang="ts">
  // The picture as it was added, with the focal point on it.
  import { objectUrl } from '#lib/objectUrl.svelte';
  import FocalPoint from '#lib/ui/FocalPoint.svelte';

  let { file, focal = $bindable() }: { file: File; focal: { x: number; y: number } } = $props();

  const url = objectUrl(() => file);
</script>

{#if url.current}<FocalPoint src={url.current} bind:value={focal} />{/if}
