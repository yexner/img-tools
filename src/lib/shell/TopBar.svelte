<script lang="ts">
  import { repoUrl } from '#lib/config';
  import { url } from '#lib/paths';
  import { ui } from '#lib/ui.svelte';
  import Icon from '#lib/ui/Icon.svelte';
  import { github, home, info, menu, search } from '#lib/ui/icons';
  import ThemeSwitch from './ThemeSwitch.svelte';

  let { title = '' }: { title?: string } = $props();

  function toggleMenu() {
    if (matchMedia('(min-width: 1024px)').matches) {
      const d = document.documentElement;
      const next = d.dataset.sidebar === 'closed' ? 'open' : 'closed';
      d.dataset.sidebar = next;
      try {
        localStorage.setItem('imgtools:sidebar', next);
      } catch {
        // not remembered
      }
    } else {
      ui.drawer = !ui.drawer;
    }
  }
  const mac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);
</script>

<header class="top">
  <button type="button" class="icon-btn" onclick={toggleMenu} aria-label="Toggle menu"
    ><Icon svg={menu} /></button
  >
  <a class="icon-btn" href={url('/')} aria-label="Home"><Icon svg={home} /></a>
  {#if title}<span class="title">{title}</span>{/if}
  <button
    type="button"
    class="search"
    onclick={() => (ui.palette = true)}
    aria-keyshortcuts={mac ? 'Meta+K' : 'Control+K'}
  >
    <Icon svg={search} />
    <span class="ph">Search tools…</span>
    <kbd class="mono" aria-hidden="true">{mac ? '⌘K' : 'Ctrl K'}</kbd>
  </button>
  <span class="right">
    <a class="gh" href={repoUrl} rel="noopener noreferrer"
      ><Icon svg={github} /><span>GitHub</span></a
    >
    <a class="icon-btn" href={url('/about')} aria-label="About"><Icon svg={info} /></a>
    <ThemeSwitch />
  </span>
</header>

<style>
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 64px;
    padding: 0 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  .icon-btn {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--ink);
    text-decoration: none;
  }
  .icon-btn:hover {
    border-color: var(--accent);
  }
  .title {
    display: none;
    font: 600 1.125rem var(--font-display);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    max-width: 480px;
    min-height: 40px;
    padding: 0 12px;
    margin-left: 8px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface-sunk);
    color: var(--ink-2);
    text-align: left;
  }
  .ph {
    flex: 1;
  }
  kbd {
    font-size: 0.8125rem;
    padding: 1px 6px;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--surface);
  }
  .right {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
  .gh {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 0 10px;
    color: var(--ink);
    text-decoration: none;
  }
  @media (max-width: 1199px) {
    .gh span {
      display: none;
    }
  }
  @media (max-width: 699px) {
    .title {
      display: block;
      flex: 1;
    }
    .search {
      flex: none;
      max-width: none;
      width: 40px;
      justify-content: center;
      padding: 0;
      margin-left: 0;
    }
    kbd,
    .gh {
      display: none;
    }
    .ph {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }
</style>
