<script lang="ts">
  import { repoUrl } from '#lib/config';
</script>

<p class="request">
  <a
    class="request-link"
    href="{repoUrl}/issues/new?labels=enhancement&title=Passport+photo%3A+add+my+country"
    target="_blank"
    rel="noreferrer noopener">Your country not listed? Submit a feature request!</a
  >
</p>

<style>
  .request {
    margin: 0 0 16px;
  }
  .request-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--accent);
    font-weight: 600;
    text-decoration: none;
  }
  .request-link:hover {
    border-color: var(--accent);
  }
</style>
