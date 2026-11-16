<script lang="ts">
  import '../app.css';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { trackPageView } from '#lib/analytics';
  import { toolBySlug } from '#lib/registry';
  import { ui } from '#lib/ui.svelte';
  import CommandPalette from '#lib/shell/CommandPalette.svelte';
  import DevBar from '#lib/shell/DevBar.svelte';
  import PrivacyBand from '#lib/shell/PrivacyBand.svelte';
  import Sidebar from '#lib/shell/Sidebar.svelte';
  import Toast from '#lib/shell/Toast.svelte';
  import TopBar from '#lib/shell/TopBar.svelte';

  let { children } = $props();
  let main: HTMLElement | undefined = $state();

  const slug = $derived(page.params.slug ?? '');
  const title = $derived(toolBySlug(slug)?.name ?? '');

  afterNavigate(({ type }) => {
    ui.drawer = false;
    trackPageView();
    if (type !== 'enter') main?.focus({ preventScroll: true });
    main?.scrollTo(0, 0);
  });

  function onkeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      ui.palette = !ui.palette;
    }
  }
</script>

<svelte:window {onkeydown} />

<a class="skip" href="#main">Skip to content</a>
<div class="frame">
  <DevBar />
  <PrivacyBand />
  <div class="body">
    <Sidebar current={slug} />
    <div class="col">
      <TopBar {title} />
      <main id="main" tabindex="-1" bind:this={main}>
        {@render children()}
      </main>
    </div>
  </div>
</div>
<CommandPalette />
<Toast />

<style>
  .skip {
    position: absolute;
    left: 8px;
    top: -60px;
    z-index: 100;
    padding: 10px 16px;
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 700;
  }
  .skip:focus {
    top: 8px;
  }
  .frame {
    display: flex;
    flex-direction: column;
    height: 100dvh;
  }
  .body {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  }
  .col {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  main {
    flex: 1;
    overflow-y: auto;
    padding: 24px 24px 48px;
    outline: none;
  }
  :global(html[data-sidebar='closed']) .body {
    grid-template-columns: 0 minmax(0, 1fr);
  }
  :global(html[data-sidebar='closed']) .body :global(.sidebar) {
    visibility: hidden;
  }
  @media (max-width: 1023px) {
    .body,
    :global(html[data-sidebar='closed']) .body {
      grid-template-columns: minmax(0, 1fr);
    }
    main {
      padding: 16px 16px 32px;
    }
  }
</style>
