<script lang="ts">
  import { tick } from 'svelte';
  import { categories } from '#lib/categories';
  import { tools } from '#lib/registry';
  import { fileUrl, toolUrl, url } from '#lib/paths';
  import { ui } from '#lib/ui.svelte';
  import Icon from '#lib/ui/Icon.svelte';
  import { chevronDown, chevronRight } from '#lib/ui/icons';

  let { current = '' }: { current?: string } = $props();
  let nav: HTMLElement | undefined = $state();

  const byCategory = $derived(
    categories.map((c) => ({ ...c, tools: tools.filter((t) => t.category === c.id) })),
  );
  const activeCategory = $derived(tools.find((t) => t.slug === current)?.category);

  function isOpen(id: string): boolean {
    return ui.catOpen(id) ?? id === activeCategory;
  }

  // Focus stays inside the drawer while it is open (below 1024 px).
  function trap(e: KeyboardEvent) {
    if (!ui.drawer || !nav) return;
    if (e.key === 'Escape') {
      ui.drawer = false;
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = [...nav.querySelectorAll<HTMLElement>('a[href], button')].filter(
      (el) => el.offsetParent,
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  $effect(() => {
    if (ui.drawer) tick().then(() => nav?.querySelector<HTMLElement>('a[href], button')?.focus());
  });
</script>

<svelte:window onkeydown={trap} />

{#if ui.drawer}
  <button
    type="button"
    class="backdrop"
    aria-label="Close menu"
    onclick={() => (ui.drawer = false)}
    tabindex="-1"
  ></button>
{/if}

<nav class="sidebar" class:open={ui.drawer} aria-label="Tools" bind:this={nav}>
  <div class="brand">
    <a class="wordmark" href={url('/')}>
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"
        ><rect width="32" height="32" rx="8" fill="var(--accent)" /><rect
          x="7"
          y="7"
          width="18"
          height="18"
          rx="3"
          fill="none"
          stroke="var(--on-accent)"
          stroke-width="2.5"
        /><rect x="12" y="12" width="8" height="8" rx="1.5" fill="var(--on-accent)" /></svg
      >
      IMG-TOOLS
    </a>
    <p class="tagline">Image tools that run in your browser</p>
  </div>
  <div class="list">
    {#each byCategory as c (c.id)}
      {@const open = isOpen(c.id)}
      <div class="cat">
        <button type="button" aria-expanded={open} onclick={() => ui.setCatOpen(c.id, !open)}>
          <Icon svg={open ? chevronDown : chevronRight} size={16} />
          <span class="cname">{c.name}</span>
          <span class="mono count">{c.tools.length}</span>
        </button>
        {#if open}
          <ul>
            {#each c.tools as t (t.slug)}
              <li>
                <a
                  href={toolUrl(t.slug)}
                  class:active={t.slug === current}
                  aria-current={t.slug === current ? 'page' : undefined}
                  title={t.name}
                  onclick={() => (ui.drawer = false)}
                >
                  <Icon svg={t.icon} />
                  <span>{t.name}</span>
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/each}
  </div>
  <div class="foot">
    <a href={url('/privacy')} onclick={() => (ui.drawer = false)}>How we know</a>
    <a
      href={fileUrl('/third-party-notices.txt')}
      data-sveltekit-reload
      onclick={() => (ui.drawer = false)}>Open-source licenses</a
    >
    <a href={url('/datenschutz')} onclick={() => (ui.drawer = false)}>Datenschutzerklärung</a>
    <a href={url('/about')} onclick={() => (ui.drawer = false)}>About</a>
    <a href={url('/llm-info')} onclick={() => (ui.drawer = false)}>For AI assistants</a>
  </div>
</nav>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--surface);
    border-right: 1px solid var(--line);
    overflow: hidden;
  }
  .brand {
    padding: 16px;
    border-bottom: 1px solid var(--line);
  }
  .wordmark {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font: 700 1.25rem var(--font-display);
    color: var(--ink);
    text-decoration: none;
  }
  .tagline {
    margin: 4px 0 0;
    font-size: 0.8125rem;
    color: var(--ink-2);
  }
  .list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  .cat > button {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-height: 40px;
    padding: 0 8px;
    border: 0;
    border-radius: var(--radius);
    background: none;
    color: var(--ink-2);
    font-weight: 700;
    text-align: left;
  }
  .cat > button:hover {
    background: var(--accent-soft);
  }
  .cname {
    flex: 1;
  }
  .count {
    font-size: 0.8125rem;
    font-weight: 400;
  }
  ul {
    list-style: none;
    margin: 0 0 4px;
    padding: 0;
  }
  li a {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 36px;
    padding: 0 12px;
    border-radius: var(--radius);
    color: var(--ink);
    text-decoration: none;
    font-size: 0.9375rem;
  }
  li a span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  li a:hover {
    background: var(--accent-soft);
  }
  li a.active {
    background: var(--accent-soft);
    color: var(--accent);
  }
  li a.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: 2px;
    background: var(--accent);
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    padding: 12px 16px;
    border-top: 1px solid var(--line);
    font-size: 0.8125rem;
  }
  .backdrop {
    display: none;
  }
  @media (max-width: 1023px) {
    .sidebar {
      position: fixed;
      z-index: 20;
      top: 0;
      bottom: 0;
      left: 0;
      width: min(86vw, var(--sidebar-w));
      transform: translateX(-100%);
      visibility: hidden;
      transition:
        transform 150ms ease-out,
        visibility 150ms;
      box-shadow: var(--shadow);
    }
    .sidebar.open {
      transform: none;
      visibility: visible;
    }
    .backdrop {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 19;
      border: 0;
      background: rgb(0 0 0 / 0.45);
    }
    @media (pointer: coarse) {
      li a {
        min-height: 44px;
      }
    }
  }
</style>
