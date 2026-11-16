<script lang="ts">
  import { ui } from '#lib/ui.svelte';
</script>

<div class="toast-wrap" role="status" aria-live="polite">
  {#if ui.toast}<span class="toast">{ui.toast}</span>{/if}
</div>

<style>
  .toast-wrap {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(24px + env(safe-area-inset-bottom));
    display: flex;
    justify-content: center;
    pointer-events: none;
    z-index: 50;
  }
  .toast {
    padding: 8px 16px;
    border-radius: var(--radius);
    background: var(--ink);
    color: var(--paper);
    box-shadow: var(--shadow);
  }
</style>
