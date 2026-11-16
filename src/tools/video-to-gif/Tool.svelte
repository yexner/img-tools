<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { formatBytes, splitName } from '#lib/core';
  import { download } from '#lib/core/intake';
  import { runGif, type GifResult } from '#lib/core/gifjob';
  import Box from '#lib/ui/Box.svelte';
  import ResultBox from '#lib/ui/ResultBox.svelte';
  import Button from '#lib/ui/Button.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import ErrorNotice from '#lib/ui/ErrorNotice.svelte';
  import Notice from '#lib/ui/Notice.svelte';
  import OneFile from '#lib/ui/OneFile.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import { clock, countFrames, MAX_FRAMES, outputSize, plan } from './logic';
  import { objectUrl, urlBag } from '#lib/objectUrl.svelte';

  const tool = getTool();
  let file = $state<File>();
  const url = objectUrl(() => file);
  const urls = urlBag();
  let video = $state<HTMLVideoElement>();
  let duration = $state(0);
  let size = $state({ w: 0, h: 0 });
  let start = $state<number | undefined>(0);
  let end = $state<number | undefined>(0);
  let wanted = $state<number | 'original'>(480);
  let fps = $state(8);
  let colors = $state(128);
  let loop = $state(true);
  let unplayable = $state(false);

  let working = $state(false);
  let progress = $state(0);
  let error = $state('');
  let result = $state<{
    url: string;
    blob: Blob;
    name: string;
    frames: number;
    width: number;
    height: number;
  } | null>(null);
  let controller: AbortController | undefined;

  $effect(() => {
    void file;
    // Only the file may restart this; clearing the old result reads state that must not.
    untrack(() => {
      unplayable = false;
      duration = 0;
      clearResult();
    });
  });

  function clearResult() {
    if (result) urls.revoke(result.url);
    result = null;
    error = '';
  }

  function loaded() {
    if (!video) return;
    duration = video.duration;
    size = { w: video.videoWidth, h: video.videoHeight };
    start = 0;
    end = Math.round(Math.min(duration, 5) * 10) / 10;
  }

  const frames = $derived(countFrames(start ?? 0, end ?? 0, fps));
  const tooMany = $derived(frames > MAX_FRAMES);
  const fitsRange = $derived((start ?? 0) >= 0 && (end ?? 0) <= duration + 0.05 && frames > 0);
  const out = $derived(size.w ? outputSize(size.w, size.h, wanted) : { width: 0, height: 0 });
  const ready = $derived(!!file && duration > 0 && fitsRange && !tooMany && !working);

  const seek = (t: number) =>
    new Promise<void>((resolve, reject) => {
      const v = video!;
      const done = () => {
        v.removeEventListener('seeked', done);
        resolve();
      };
      v.addEventListener('seeked', done);
      v.addEventListener('error', () => reject(new Error('The video stopped playing.')), {
        once: true,
      });
      v.currentTime = Math.min(t, Math.max(0, duration - 0.001));
    });

  async function create() {
    if (!ready || !video) return;
    clearResult();
    video.pause();
    controller = new AbortController();
    const mine = controller;
    working = true;
    progress = 0;
    const started = performance.now();
    track(tool.slug, 'run', { files: 1, input: 'video' });
    const p = plan(start ?? 0, end ?? 0, fps);
    const canvas = document.createElement('canvas');
    canvas.width = out.width;
    canvas.height = out.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingQuality = 'high';
    try {
      await runGif(
        { kind: 'video-start', width: out.width, height: out.height, colors, loop },
        { signal: mine.signal },
      );
      for (let i = 0; i < p.frames; i++) {
        if (mine.signal.aborted) throw new Error('Canceled.');
        await seek(p.times[i]);
        ctx.drawImage(video, 0, 0, out.width, out.height);
        const rgba = ctx.getImageData(0, 0, out.width, out.height).data;
        await runGif(
          { kind: 'video-frame', rgba, delay: p.delays[i] },
          { signal: mine.signal, transfer: [rgba.buffer] },
        );
        progress = (i + 1) / p.frames;
      }
      const r = (await runGif({ kind: 'video-end' }, { signal: mine.signal })) as GifResult;
      const blob = new Blob([r.bytes as BlobPart], { type: 'image/gif' });
      result = {
        blob,
        url: urls.add(blob),
        name: `${splitName(file!.name).stem}.gif`,
        frames: r.frames,
        width: r.width,
        height: r.height,
      };
      track(tool.slug, 'done', { files: 1, input: 'video', ms: performance.now() - started });
    } catch (err) {
      if (!mine.signal.aborted) {
        error = (err as Error).message;
        track(tool.slug, 'error', {
          reason: (err as { reason?: string }).reason ?? 'encoder-failed',
        });
      } else error = 'Canceled.';
    } finally {
      working = false;
    }
  }

  function save() {
    if (!result) return;
    download(result.name, result.blob);
    track(tool.slug, 'download');
  }

  onDestroy(() => {
    controller?.abort();
  });
</script>

<div class="stack">
  <OneFile bind:file title="Files" />

  <Box title="Video">
    {#if url.current}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        bind:this={video}
        src={url.current}
        controls
        preload="auto"
        muted
        playsinline
        data-loaded={duration > 0 ? '' : undefined}
        onloadedmetadata={loaded}
        onerror={() => (unplayable = true)}
      ></video>
      {#if unplayable}
        <Notice kind="warn">
          This browser cannot play this video, so it cannot be turned into a GIF here. Try an MP4 or
          WebM file, or another browser.
        </Notice>
      {/if}
      {#if duration > 0}
        <p class="mono tiny muted">
          {size.w} × {size.h} px · {clock(duration)} long · now at {clock(video?.currentTime ?? 0)}
        </p>
        <div class="times">
          <div class="time">
            <NumberField label="Start (seconds)" bind:value={start} min={0} step={0.1} unit="s" />
            <Button onclick={() => (start = Math.round((video?.currentTime ?? 0) * 10) / 10)}
              >Use current position</Button
            >
          </div>
          <div class="time">
            <NumberField label="End (seconds)" bind:value={end} min={0} step={0.1} unit="s" />
            <Button onclick={() => (end = Math.round((video?.currentTime ?? 0) * 10) / 10)}
              >Use current position</Button
            >
          </div>
        </div>
      {/if}
    {:else}
      <p class="muted">Add a video to see it here.</p>
    {/if}
  </Box>

  <Box title="Settings">
    <Segmented
      label="Width"
      bind:value={wanted}
      options={[
        { value: 'original', label: 'Original' },
        { value: 640, label: '640 px' },
        { value: 480, label: '480 px' },
        { value: 320, label: '320 px' },
      ]}
    />
    <Segmented
      label="Frame rate"
      bind:value={fps}
      options={[5, 8, 10, 12, 15].map((n) => ({ value: n, label: `${n} fps` }))}
    />
    <Segmented
      label="Colors"
      bind:value={colors}
      options={[
        { value: 256, label: '256' },
        { value: 128, label: '128' },
        { value: 64, label: '64' },
        { value: 32, label: '32' },
      ]}
    />
    <Toggle label="Loop" bind:checked={loop} />
    <p class="mono count" class:over={tooMany} aria-live="polite">
      {frames}
      {frames === 1 ? 'frame' : 'frames'} of {MAX_FRAMES} allowed
      {#if out.width}· {out.width} × {out.height} px{/if}
    </p>
    {#if tooMany}
      <Notice kind="warn">
        <span role="alert">
          That is {frames - MAX_FRAMES} frames too many. A GIF stores every frame as a whole picture,
          so long clips get very large. Shorten the clip or lower the frame rate.
        </span>
      </Notice>
    {/if}
    {#if file && duration > 0 && !fitsRange && !tooMany}
      <Notice kind="warn"
        >The start must be before the end, and both must be inside the video.</Notice
      >
    {/if}
    {#if working}
      <span class="bar" aria-hidden="true"
        ><span style:width="{Math.round(progress * 100)}%"></span></span
      >
      <p class="tiny muted" aria-live="polite">
        Making frame {Math.max(1, Math.round(progress * frames))} of {frames}…
      </p>
      <Button onclick={() => controller?.abort()}>Cancel</Button>
    {:else}
      <Button variant="primary" disabled={!ready} onclick={create}>Create GIF</Button>
    {/if}
  </Box>

  <ErrorNotice {error} />

  {#if result}
    <ResultBox
      mono
      summary="{result.name} · {result.frames} frames · {result.width} × {result.height} px · {formatBytes(
        result.blob.size,
      )}"
      onDownload={save}
    >
      <img src={result.url} alt="The finished GIF" />
    </ResultBox>
  {/if}
</div>

<style>
  video {
    display: block;
    max-width: 100%;
    max-height: 420px;
    border-radius: var(--radius);
    background: #000;
  }
  .times {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 32px;
    margin-top: 12px;
  }
  .time {
    display: grid;
    gap: 4px;
    justify-items: start;
  }
  .count {
    margin: 0 0 12px;
  }
  .count.over {
    color: var(--danger);
  }
  p {
    margin: 8px 0;
  }
  .bar {
    display: block;
    height: 4px;
    margin-bottom: 8px;
    border-radius: 2px;
    background: var(--surface-sunk);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width var(--ease);
  }
  img {
    max-width: 100%;
    border-radius: var(--radius);
    box-shadow: 0 0 0 1px var(--line);
  }
</style>
