<script lang="ts">
  import { mapLinks, readMeta, type Meta } from '#lib/core/meta';
  import BatchTool from '#lib/ui/BatchTool.svelte';
</script>

<BatchTool verb="Read" auto run={async (file) => ({ data: await readMeta(file) })}>
  {#snippet item({ data })}
    {@const m = data as Meta}
    {#if m.empty}
      <p class="muted">This picture has no metadata.</p>
    {:else}
      {#each m.groups as g (g.title)}
        <section>
          <h3>{g.title}</h3>
          <dl>
            {#each g.rows as [label, value] (label)}
              <div>
                <dt>{label}</dt>
                <dd class="mono">{value}</dd>
              </div>
            {/each}
          </dl>
        </section>
      {/each}
      {#if m.gps}
        {@const links = mapLinks(m.gps)}
        <section>
          <h3>Location</h3>
          <dl>
            <div>
              <dt>Latitude</dt>
              <dd class="mono">{m.gps.latitude.toFixed(6)}</dd>
            </div>
            <div>
              <dt>Longitude</dt>
              <dd class="mono">{m.gps.longitude.toFixed(6)}</dd>
            </div>
            {#if m.gps.altitude !== undefined}
              <div>
                <dt>Altitude</dt>
                <dd class="mono">{m.gps.altitude} m</dd>
              </div>
            {/if}
          </dl>
          <p class="links">
            <a href={links.openStreetMap} target="_blank" rel="noopener noreferrer"
              >Open in OpenStreetMap</a
            >
            <a href={links.googleMaps} target="_blank" rel="noopener noreferrer"
              >Open in Google Maps</a
            >
          </p>
        </section>
      {/if}
      <details>
        <summary>All tags ({m.all.length})</summary>
        <dl class="all">
          {#each m.all as [key, value] (key)}
            <div>
              <dt class="mono">{key}</dt>
              <dd class="mono">{value}</dd>
            </div>
          {/each}
        </dl>
      </details>
    {/if}
  {/snippet}
</BatchTool>

<style>
  section {
    margin: 8px 0 12px;
  }
  h3 {
    margin: 0 0 4px;
    font-size: 1rem;
  }
  dl {
    display: grid;
    gap: 2px;
    margin: 0;
  }
  dl div {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
  }
  dt {
    min-width: 9rem;
    color: var(--muted);
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    margin: 8px 0 0;
  }
  details {
    margin-top: 8px;
  }
  summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
    font-weight: 700;
  }
  .all dt {
    min-width: 12rem;
  }
</style>
