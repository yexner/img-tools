<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    title,
    collapsible = false,
    open = true,
    children,
    actions,
  }: {
    title?: string;
    collapsible?: boolean;
    open?: boolean;
    children: Snippet;
    actions?: Snippet;
  } = $props();
</script>

{#if collapsible}
  <details class="box" {open}>
    <summary><h2>{title}</h2></summary>
    <div class="body">{@render children()}</div>
  </details>
{:else}
  <section class="box">
    {#if title || actions}
      <header>
        {#if title}<h2>{title}</h2>{/if}
        {@render actions?.()}
      </header>
    {/if}
    <div class="body">{@render children()}</div>
  </section>
{/if}

<style>
  .box {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-box);
    padding: 24px;
    min-width: 0;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  summary {
    cursor: pointer;
    list-style-position: inside;
  }
  summary h2 {
    display: inline;
  }
  details .body {
    margin-top: 16px;
  }
</style>
