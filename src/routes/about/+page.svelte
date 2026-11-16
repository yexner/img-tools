<script lang="ts">
  import Seo from '#lib/shell/Seo.svelte';
  import { appInfo, repoUrl } from '#lib/config';
  import Box from '#lib/ui/Box.svelte';
  import { fileUrl, url } from '#lib/paths';
</script>

<Seo
  title="About · IMG-TOOLS"
  description="About IMG-TOOLS: free, open source image tools that run in your browser, who makes them, and what inspired them."
  path="/about/"
/>

<div class="page">
  <h1>About IMG-TOOLS</h1>
  <Box>
    <p>
      IMG-TOOLS is a collection of image tools that run entirely in your browser: convert, compress,
      resize, crop, remove metadata and more. It is free, open source and has no accounts.
    </p>
    <p>
      Version <span class="mono">{appInfo.version}</span> (<span class="mono">{appInfo.commit}</span
      >).
    </p>
    <p>
      It is made by <a href="https://github.com/yexner" rel="noopener noreferrer">yexner</a> and
      open to contributions: report a file that fails, suggest a tool, or help with an
      <a href="{repoUrl}/issues" rel="noopener noreferrer">open issue</a>.
    </p>
    <ul>
      <li><a href={repoUrl} rel="noopener noreferrer">Source code and contributing</a></li>
      <li><a href={url('/privacy')}>How we know your images stay private</a></li>
      <li><a href={url('/datenschutz')} hreflang="de">Datenschutzerklärung (German)</a></li>
      <li>
        <a href={fileUrl('/third-party-notices.txt')} data-sveltekit-reload>Open-source licenses</a>
      </li>
    </ul>
    <p class="muted small">
      Inspired by the amazingly helpful
      <a href="https://it-tools.tech" rel="noopener noreferrer">it-tools.tech</a>.
    </p>
  </Box>
</div>

<style>
  .page {
    max-width: 720px;
    margin: 0 auto;
    display: grid;
    gap: 16px;
  }
</style>
