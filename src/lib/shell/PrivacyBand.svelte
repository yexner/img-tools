<script lang="ts">
  import { onMount } from 'svelte';
  import { analyticsConfig } from '#lib/config';
  import { bandText } from '#lib/band';
  import { url } from '#lib/paths';
  import Icon from '#lib/ui/Icon.svelte';
  import { laptopCheck } from '#lib/ui/icons';
  import { trackingSignal, type TrackingSignal } from '#lib/analytics';
  import StatsSwitch from './StatsSwitch.svelte';

  // The browser's privacy signal is read after mount; the prerendered HTML shows the normal text.
  let signal = $state<TrackingSignal | null>(null);
  const text = $derived(bandText(analyticsConfig.on, analyticsConfig.mode, signal));

  // First visit: compact band. Later visits: slim band (set before paint by static/boot.js).
  onMount(() => {
    signal = trackingSignal();
    try {
      localStorage.setItem('imgtools:band-seen', '1');
    } catch {
      // storage unavailable: the band simply stays compact
    }
  });

  function toggle() {
    const d = document.documentElement;
    d.dataset.band = d.dataset.band === 'slim' ? 'compact' : 'slim';
  }
</script>

<div class="band" role="region" aria-label="Privacy">
  <div class="line">
    <button type="button" class="lead" onclick={toggle}>
      <Icon svg={laptopCheck} size={18} />
      <strong>{text.lead}</strong>
    </button>
    <a href={url('/privacy')}>Learn more →</a>
  </div>
  <span class="rest">{text.rest}</span>
  {#if analyticsConfig.on && analyticsConfig.mode === 'opt-in' && !signal}
    <span class="stats"><StatsSwitch /></span>
  {/if}
</div>

<style>
  .band {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 4px 16px;
    background: var(--safe-soft);
    color: var(--safe);
    font-size: 0.875rem;
    text-align: center;
    overflow: hidden;
  }
  :global(html[data-band='compact']) .band {
    min-height: 40px;
  }
  :global(html[data-band='slim']) .band {
    min-height: 28px;
    font-size: 0.8125rem;
  }
  :global(html[data-band='slim']) .rest,
  :global(html[data-band='slim']) .stats {
    display: none;
  }
  .line {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0 12px;
  }
  .lead {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 0;
    background: none;
    padding: 4px 0;
    color: inherit;
  }
  .lead strong {
    white-space: nowrap;
  }
  .rest {
    font-weight: 400;
    max-width: 90ch;
  }
  a {
    color: inherit;
    font-weight: 700;
    white-space: nowrap;
  }
</style>
