<script lang="ts">
  // The only place SVG markup is injected: icons bundled from @tabler/icons at build time.
  let { svg, size = 20 }: { svg: string; size?: number } = $props();
</script>

<span class="icon" style:--s="{size}px" aria-hidden="true">{@html svg}</span>

<style>
  .icon {
    display: inline-flex;
    width: var(--s);
    height: var(--s);
    flex: none;
  }
  .icon :global(svg) {
    width: 100%;
    height: 100%;
    stroke-width: 1.75;
  }
</style>
