<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import { warning, info } from './icons';

  let { kind = 'info', children }: { kind?: 'info' | 'warn' | 'error'; children: Snippet } =
    $props();
</script>

<p class="notice {kind}" role={kind === 'error' ? 'alert' : 'status'}>
  <Icon svg={kind === 'info' ? info : kind === 'warn' ? warning : warning} size={18} />
  <span>{@render children()}</span>
</p>

<style>
  .notice {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin: 0 0 12px;
    padding: 10px 12px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-sunk);
    font-size: 0.9375rem;
  }
  .warn {
    color: var(--warn);
  }
  .error {
    color: var(--danger);
  }
  span {
    color: var(--ink);
  }
</style>
