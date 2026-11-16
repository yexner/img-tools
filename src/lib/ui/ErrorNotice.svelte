<script lang="ts">
  import Notice from './Notice.svelte';

  let { error }: { error?: string | null } = $props();
</script>

{#if error}<Notice kind="warn"><span role="alert">{error}</span></Notice>{/if}
