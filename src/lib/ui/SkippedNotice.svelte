<script lang="ts">
  import Notice from './Notice.svelte';

  let { skipped }: { skipped: string[] } = $props();
</script>

{#if skipped.length}
  <Notice kind="warn">
    Skipped {skipped.length}
    {skipped.length === 1 ? 'file' : 'files'} this tool cannot read: {skipped
      .slice(0, 5)
      .join(', ')}{skipped.length > 5 ? '…' : ''}
  </Notice>
{/if}
