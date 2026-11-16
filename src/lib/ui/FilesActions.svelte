<script lang="ts">
  // The row under the file list: Add files / Remove all, plus optional extras (a total).
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';
  import { trash, upload } from './icons';

  let {
    canAdd = true,
    onadd,
    onclear,
    children,
  }: { canAdd?: boolean; onadd: () => void; onclear: () => void; children?: Snippet } = $props();
</script>

<div class="row">
  {#if canAdd}<Button icon={upload} onclick={onadd}>Add files</Button>{/if}
  <Button icon={trash} onclick={onclear}>Remove all</Button>
  {@render children?.()}
</div>
