<script lang="ts">
  // "Advanced" settings that most visitors never need.
  import type { Snippet } from 'svelte';
  let { title, children }: { title: string; children: Snippet } = $props();
</script>

<details>
  <summary>{title}</summary>
  <div class="body">{@render children()}</div>
</details>

<style>
  details {
    margin: 0 0 16px;
  }
  summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 700;
    list-style: none;
  }
  summary::before {
    content: '';
    width: 6px;
    height: 6px;
    border: solid currentColor;
    border-width: 0 2px 2px 0;
    transform: rotate(-45deg);
    transition: transform var(--ease);
  }
  details[open] > summary::before {
    transform: rotate(45deg);
  }
  .body {
    padding-top: 8px;
  }
</style>
