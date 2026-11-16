<script lang="ts">
  import Seo from '#lib/shell/Seo.svelte';
  import { ACTIONS, PROPERTIES } from '#lib/analytics';
  import { analyticsConfig, repoUrl } from '#lib/config';
  import { ui } from '#lib/ui.svelte';
  import Box from '#lib/ui/Box.svelte';
  import Button from '#lib/ui/Button.svelte';
  import StatsSwitch from '#lib/shell/StatsSwitch.svelte';
  import { onMount } from 'svelte';
  import { trackingSignal, type TrackingSignal } from '#lib/analytics';
  import { signalSentence } from '#lib/band';

  let signal = $state<TrackingSignal | null>(null);
  onMount(() => (signal = trackingSignal()));

  function clearSaved() {
    try {
      for (const k of Object.keys(localStorage))
        if (k.startsWith('imgtools:')) localStorage.removeItem(k);
      ui.showToast('Saved data cleared');
      ui.refreshStats();
    } catch {
      ui.showToast('Nothing to clear');
    }
  }
</script>

<Seo
  title="How we know · IMG-TOOLS"
  description="Your images are never uploaded: how IMG-TOOLS works in your browser, what it counts anonymously, and how you can check it yourself."
  path="/privacy/"
/>

<div class="page">
  <h1>How we know your images stay private</h1>
  <Box>
    <article>
      <h2>What happens to your file</h2>
      <p>
        Your browser opens the file, a small program running in your browser changes it, and you
        download the result. At no point is the file sent to a server: this site is a set of static
        files, and it has no server that could receive an upload.
      </p>

      <h2>Check it yourself</h2>
      <ol>
        <li>
          Open your browser’s developer tools and watch the Network panel (include worker requests)
          while you use a tool. You will see no requests that carry your files.
        </li>
        <li>
          Load a tool page, switch off your internet connection, and use the tool. It still works,
          because everything it needs has already been downloaded.
        </li>
      </ol>

      <h2>What we count</h2>
      {#if analyticsConfig.on}
        <p>
          To see which tools are used, this site sends anonymous usage events to Umami Cloud (<a
            href="https://umami.is"
            rel="noopener noreferrer">Umami</a
          >), an analytics service built to comply with the GDPR. It sets no cookies. The counting
          runs in your browser and sends only the events listed below, never your images. Like any
          web server, Umami Cloud receives your IP address and browser name with the request; it
          does not use them to build a profile. See the
          <a href="https://umami.is/docs" rel="noopener noreferrer">Umami documentation</a> for additional
          details.
        </p>
        {#if analyticsConfig.mode === 'opt-out'}
          <p>
            Counting is anonymous and there is no switch for it. If your browser sends Do Not Track
            or Global Privacy Control, counting is off: nothing is sent, and Umami’s script is not
            even requested. You can also block the requests to <span class="mono"
              >cloud.umami.is</span
            >
            and <span class="mono">gateway.umami.is</span> in your browser or with a content blocker;
            the site works the same.
          </p>
          {#if signal}<p>{signalSentence(signal)}</p>{/if}
        {:else}
          <p>
            Counting is off unless you switch it on. If your browser sends Do Not Track or Global
            Privacy Control, nothing is sent, even if you switch it on. Umami’s script is only
            loaded while counting is on.
          </p>
          <p><StatsSwitch /></p>
        {/if}
        <h3>Events</h3>
        <p>
          Event names look like <code class="mono">convert-image:run</code>: a tool, then one of
          <span class="mono">{ACTIONS.join(', ')}</span>.
        </p>
        <h3>Properties</h3>
        <table>
          <thead><tr><th>Property</th><th>Values</th></tr></thead>
          <tbody>
            {#each PROPERTIES as p (p.name)}<tr
                ><td class="mono">{p.name}</td><td>{p.values}</td></tr
              >{/each}
          </tbody>
        </table>
        <p>
          Never sent: file names, file contents, exact sizes or dimensions, metadata values,
          anything you type, colors you pick, or anything else derived from your files.
        </p>
      {:else}
        <p>Nothing. This version of the site has no analytics and sets no cookies.</p>
      {/if}

      <h2>Hosting</h2>
      <p>
        The site is served by GitHub Pages, which keeps access logs that include visitor IP
        addresses. These logs record that a page was requested, never your files.
      </p>

      <h2>Stored on your device</h2>
      <p>
        Your pinned tools, theme and menu state{analyticsConfig.on &&
        analyticsConfig.mode === 'opt-in'
          ? ', and your statistics choice,'
          : ''} are kept in your browser’s local storage. Nothing else is stored, and there are no cookies.
      </p>
      <p><Button onclick={clearSaved}>Clear saved data</Button></p>

      <h2>Source code</h2>
      <p>
        Read exactly what runs on this page: <a href={repoUrl} rel="noopener noreferrer"
          >the source code</a
        >.
      </p>
    </article>
  </Box>
</div>

<style>
  .page {
    max-width: 820px;
    margin: 0 auto;
    display: grid;
    gap: 16px;
  }
  article {
    max-width: 68ch;
  }
  article h2 {
    margin: 24px 0 8px;
  }
  article h2:first-child {
    margin-top: 0;
  }
  h3 {
    font-size: 1rem;
    margin: 16px 0 6px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 12px;
    font-size: 0.9375rem;
  }
  th,
  td {
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }
</style>
