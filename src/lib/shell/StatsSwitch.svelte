<script lang="ts">
  import { onMount } from 'svelte';
  import { analyticsConfig } from '#lib/config';
  import { trackingSignal, type TrackingSignal } from '#lib/analytics';
  import { signalSentence } from '#lib/band';
  import { ui } from '#lib/ui.svelte';

  /** Consent switch for opt-in builds only. With a browser privacy signal it shows the reason instead. */
  let signal = $state<TrackingSignal | null>(null);
  onMount(() => {
    signal = trackingSignal();
    ui.refreshStats();
  });
  const id = $props.id();
</script>

{#if analyticsConfig.on && analyticsConfig.mode === 'opt-in'}
  {#if signal}
    <span>{signalSentence(signal)}</span>
  {:else}
    <label class="switch" for={id}>
      <input
        {id}
        type="checkbox"
        role="switch"
        checked={ui.stats}
        onchange={(e) => ui.setStats(e.currentTarget.checked)}
      />
      <span>Anonymous stats</span>
    </label>
  {/if}
{/if}

<style>
  .switch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 24px;
    cursor: pointer;
  }
  input {
    width: 16px;
    height: 16px;
    accent-color: var(--safe);
  }
</style>
