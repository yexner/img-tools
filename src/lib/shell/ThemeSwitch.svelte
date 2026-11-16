<script lang="ts">
  import Icon from '#lib/ui/Icon.svelte';
  import { theme } from '#lib/ui/icons';

  function toggle() {
    const d = document.documentElement;
    const next = d.dataset.theme === 'dark' ? 'light' : 'dark';
    d.dataset.theme = next;
    try {
      localStorage.setItem('imgtools:theme', next);
    } catch {
      // not remembered
    }
  }
</script>

<button
  type="button"
  class="icon-btn"
  onclick={toggle}
  aria-label="Switch between light and dark theme"
>
  <Icon svg={theme} />
</button>

<style>
  .icon-btn {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .icon-btn:hover {
    border-color: var(--accent);
  }
</style>
