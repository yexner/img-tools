<script lang="ts">
  import { onDestroy } from 'svelte';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { splitName, zip } from '#lib/core';
  import { download } from '#lib/core/intake';
  import { runGif, type FramesResult } from '#lib/core/gifjob';
  import { urlBag } from '#lib/objectUrl.svelte';
  import Box from '#lib/ui/Box.svelte';
  import Button from '#lib/ui/Button.svelte';
  import { zip as zipIcon } from '#lib/ui/icons';
  import ErrorNotice from '#lib/ui/ErrorNotice.svelte';
  import OneFile from '#lib/ui/OneFile.svelte';

  const tool = getTool();
  let file = $state<File>();
  let working = $state(false);
  let progress = $state(0);
  let error = $state('');
  let frames = $state<{ n: number; name: string; blob: Blob; url: string; delay: number }[]>([]);
  let size = $state({ width: 0, height: 0 });
  let controller: AbortController | undefined;

  const urls = urlBag();
  const pad = (n: number, total: number) => String(n).padStart(String(total).length, '0');

  function clear() {
    urls.revokeAll();
    frames = [];
    error = '';
  }

  $effect(() => {
    const f = file;
    clear();
    if (!f) return;
    controller?.abort();
    const mine = (controller = new AbortController());
    working = true;
    progress = 0;
    track(tool.slug, 'run', { files: 1, input: 'gif' });
    void (async () => {
      try {
        const r = (await runGif(
          { kind: 'frames', bytes: await f.arrayBuffer() },
          { signal: mine.signal, progress: (p) => (progress = p) },
        )) as FramesResult;
        const stem = splitName(f.name).stem;
        frames = r.frames.map((x, i) => ({
          n: i + 1,
          name: `${stem}-frame-${pad(i + 1, r.frames.length)}.png`,
          blob: x.png,
          url: urls.add(x.png),
          delay: x.delay,
        }));
        size = { width: r.width, height: r.height };
        track(tool.slug, 'done', { files: 1, input: 'gif' });
      } catch (err) {
        if (!mine.signal.aborted) {
          error = (err as Error).message;
          track(tool.slug, 'error', {
            reason: (err as { reason?: string }).reason ?? 'decode-failed',
          });
        }
      } finally {
        if (controller === mine) working = false;
      }
    })();
    return () => mine.abort();
  });

  onDestroy(() => {
    controller?.abort();
  });

  function save(f: (typeof frames)[number]) {
    download(f.name, f.blob);
    track(tool.slug, 'download');
  }

  async function saveAll() {
    download(
      `${splitName(file!.name).stem}-frames.zip`,
      await zip(frames.map((f) => ({ name: f.name, blob: f.blob }))),
    );
    track(tool.slug, 'download-all', { files: frames.length });
  }
</script>

<div class="stack">
  <OneFile bind:file title="Files" />

  {#if working}
    <Box title="Frames">
      <p>Reading frames… {Math.round(progress * 100)}%</p>
      <span class="bar" aria-hidden="true"
        ><span style:width="{Math.round(progress * 100)}%"></span></span
      >
      <Button onclick={() => controller?.abort()}>Cancel</Button>
    </Box>
  {/if}
  <ErrorNotice {error} />

  {#if frames.length}
    <Box title="Frames">
      <div class="top">
        <span class="mono"
          >{frames.length}
          {frames.length === 1 ? 'frame' : 'frames'} · {size.width} × {size.height} px · {frames.reduce(
            (n, f) => n + f.delay,
            0,
          )} ms</span
        >
        <Button variant="primary" icon={zipIcon} onclick={saveAll}>Download all (ZIP)</Button>
      </div>
      <ul class="grid">
        {#each frames as f (f.n)}
          <li>
            <button
              type="button"
              onclick={() => save(f)}
              aria-label="Download Frame {f.n} · {f.delay} ms"
            >
              <img src={f.url} alt="Frame {f.n}" />
              <span class="cap mono tiny">Frame {f.n} · {f.delay} ms</span>
            </button>
          </li>
        {/each}
      </ul>
    </Box>
  {/if}
</div>

<style>
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  .grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
  }
  button {
    display: grid;
    gap: 4px;
    width: 100%;
    padding: 6px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    text-align: left;
  }
  button:hover {
    border-color: var(--accent);
  }
  img {
    width: 100%;
    height: auto;
    border-radius: 4px;
    background: conic-gradient(
        var(--surface-sunk) 25%,
        var(--surface) 0 50%,
        var(--surface-sunk) 0 75%,
        var(--surface) 0
      )
      0 0 / 12px 12px;
  }
  .bar {
    display: block;
    height: 4px;
    margin: 8px 0 12px;
    border-radius: 2px;
    background: var(--surface-sunk);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--accent);
  }
  p {
    margin: 0;
  }
</style>
