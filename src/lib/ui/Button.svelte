<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Icon from './Icon.svelte';

  let {
    variant = 'secondary',
    icon,
    children,
    ...rest
  }: {
    variant?: 'primary' | 'secondary';
    icon?: string;
    children?: Snippet;
  } & HTMLButtonAttributes = $props();
</script>

<button class={variant} type="button" {...rest}>
  {#if icon}<Icon svg={icon} />{/if}
  {@render children?.()}
</button>

<style>
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    font-weight: 700;
    transition:
      background var(--ease),
      border-color var(--ease);
  }
  button:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .primary:hover:not(:disabled) {
    filter: brightness(1.08);
  }
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
</style>
