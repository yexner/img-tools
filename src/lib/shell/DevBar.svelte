<script lang="ts">
  import { repoUrl } from '#lib/config';
</script>

<div class="dev" role="region" aria-label="Project status">
  <p>
    This project is still in development. Contributions are welcome: see the project on
    <a href={repoUrl} rel="noopener noreferrer">GitHub</a> and the
    <a href="{repoUrl}/blob/main/CONTRIBUTING.md" rel="noopener noreferrer">contributing guide</a>.
  </p>
</div>

<style>
  .dev {
    padding: 6px 16px;
    background: #fff6cc;
    color: #4a3800;
    font-size: 0.875rem;
    text-align: center;
  }
  p {
    margin: 0;
  }
  a {
    color: #1a3ac0;
    font-weight: 600;
    text-decoration: underline;
  }
</style>
