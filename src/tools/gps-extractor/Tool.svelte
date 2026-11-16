<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import { mapLinks, readMeta } from '#lib/core/meta';
  import { download } from '#lib/core/intake';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import Button from '#lib/ui/Button.svelte';
  import { download as downloadIcon } from '#lib/ui/icons';
  import { toCsv, toGpx, type Row } from './logic';

  let files = $state<File[]>([]);
  const found = new SvelteMap<File, Row>();

  // Only the photos still in the list are exported, in list order.
  const rows = $derived(files.map((f) => found.get(f)).filter((r): r is Row => !!r));
  const located = $derived(rows.filter((r) => r.gps).length);

  async function read(file: File) {
    const m = await readMeta(file);
    found.set(file, { file: file.name, gps: m.gps, takenAt: m.takenAt, takenUtc: m.takenUtc });
    return { data: { gps: m.gps, takenAt: m.takenAt } };
  }

  const save = (name: string, text: string, type: string) =>
    download(name, new Blob([text], { type }));
</script>

<BatchTool verb="Read" auto bind:files run={read}>
  {#snippet settings()}
    <p class="tiny muted">Add photos to see where they were taken.</p>
    <p class="tiny muted">
      {rows.length}
      {rows.length === 1 ? 'photo' : 'photos'}, {located} with a location. The GPX file holds only those.
    </p>
  {/snippet}
  {#snippet actions()}
    <Button
      icon={downloadIcon}
      disabled={!rows.length}
      onclick={() => save('photo-locations.csv', toCsv(rows), 'text/csv;charset=utf-8')}
      >Download CSV</Button
    >
    <Button
      icon={downloadIcon}
      disabled={!located}
      onclick={() => save('photo-locations.gpx', toGpx(rows), 'application/gpx+xml')}
      >Download GPX</Button
    >
  {/snippet}
  {#snippet item({ data })}
    {@const d = data as {
      gps: { latitude: number; longitude: number; altitude?: number } | null;
      takenAt?: string;
    }}
    {#if d.gps}
      <dl>
        <div>
          <dt>Latitude</dt>
          <dd class="mono">{d.gps.latitude.toFixed(6)}</dd>
        </div>
        <div>
          <dt>Longitude</dt>
          <dd class="mono">{d.gps.longitude.toFixed(6)}</dd>
        </div>
        {#if d.gps.altitude !== undefined}
          <div>
            <dt>Altitude</dt>
            <dd class="mono">{d.gps.altitude} m</dd>
          </div>
        {/if}
        {#if d.takenAt}<div>
            <dt>Taken</dt>
            <dd class="mono">{d.takenAt}</dd>
          </div>{/if}
      </dl>
      <a href={mapLinks(d.gps).openStreetMap} target="_blank" rel="noopener noreferrer"
        >Open in map</a
      >
    {:else}
      <p class="muted">No GPS data{d.takenAt ? ` · taken ${d.takenAt}` : ''}</p>
    {/if}
  {/snippet}
</BatchTool>

<style>
  p {
    margin: 0 0 8px;
  }
  dl {
    display: grid;
    gap: 2px;
    margin: 4px 0;
  }
  dl div {
    display: flex;
    gap: 12px;
  }
  dt {
    min-width: 6rem;
    color: var(--muted);
  }
  dd {
    margin: 0;
  }
</style>
