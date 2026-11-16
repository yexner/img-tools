<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { decodeGif } from '#lib/core/gif';
  import type { RunContext } from '#lib/types';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import Notice from '#lib/ui/Notice.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import { even, timeline, WORKING_BROWSERS } from './logic';

  const tool = getTool();
  let quality = $state<'low' | 'medium' | 'high'>('medium');
  let supported = $state<boolean | null>(null);

  // Whether this browser can write H.264 video (the video encoder is part of the browser).
  onMount(async () => {
    try {
      const { canEncodeVideo } = await import('mediabunny');
      supported = await canEncodeVideo('avc', { width: 320, height: 240 });
    } catch {
      supported = false;
    }
    if (!supported) track(tool.slug, 'unsupported', { browser: [] });
  });

  async function convert(file: File, ctx: RunContext) {
    const {
      BufferTarget,
      CanvasSource,
      Mp4OutputFormat,
      Output,
      QUALITY_HIGH,
      QUALITY_LOW,
      QUALITY_MEDIUM,
    } = await import('mediabunny');
    const gif = decodeGif(new Uint8Array(await file.arrayBuffer()));
    const width = even(gif.width);
    const height = even(gif.height);
    const canvas = new OffscreenCanvas(width, height);
    const g = canvas.getContext('2d')!;
    const frame = new OffscreenCanvas(gif.width, gif.height);
    const fg = frame.getContext('2d')!;
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget(),
    });
    const source = new CanvasSource(canvas, {
      codec: 'avc',
      quality: { low: QUALITY_LOW, medium: QUALITY_MEDIUM, high: QUALITY_HIGH }[quality],
    });
    output.addVideoTrack(source);
    await output.start();
    const times = timeline(gif.frames.map((f) => f.delay));
    for (const [i, f] of gif.frames.entries()) {
      if (ctx.signal.aborted) {
        await output.cancel();
        throw Object.assign(new Error('Canceled.'), { reason: 'cancelled' });
      }
      fg.putImageData(
        new ImageData(f.rgba as Uint8ClampedArray<ArrayBuffer>, gif.width, gif.height),
        0,
        0,
      );
      // MP4 has no transparency: transparent areas are shown on white.
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, width, height);
      g.drawImage(frame, 0, 0, gif.width, gif.height, 0, 0, width, height);
      await source.add(times[i].start, times[i].duration);
      ctx.progress((i + 1) / gif.frames.length);
    }
    await output.finalize();
    const buffer = (output.target as InstanceType<typeof BufferTarget>).buffer!;
    return {
      blob: new Blob([buffer], { type: 'video/mp4' }),
      note: `${gif.frames.length} frames, ${width} × ${height} px`,
    };
  }
</script>

<BatchTool
  verb="Convert"
  noun="GIF"
  suffix=""
  ready={supported === true}
  track={{ quality: undefined }}
  run={convert}
>
  {#snippet settings()}
    <Segmented
      label="Quality"
      bind:value={quality}
      options={[
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ]}
    />
    {#if supported === false}
      <Notice kind="warn">
        <span role="alert">
          This browser cannot write MP4 video, so this tool cannot work here. It works in
          {WORKING_BROWSERS}. The other tools on this site are not affected.
        </span>
      </Notice>
    {/if}
    <p class="tiny muted">Transparent areas become white. The video has no sound.</p>
  {/snippet}
  {#snippet preview(src)}
    {#if src.result}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        src={src.result.url}
        autoplay
        loop
        muted
        playsinline
        controls
        aria-label="Preview of the MP4"
      ></video>
      <p class="tiny muted">
        The preview loops. The MP4 file itself plays once, unless the page showing it loops it.
      </p>
    {:else}
      <div class="stage"><img src={src.url} alt="The GIF {src.file.name}" /></div>
    {/if}
  {/snippet}
</BatchTool>

<style>
  video,
  img {
    display: block;
    max-width: 100%;
    max-height: 420px;
    margin: 0 auto;
    border-radius: var(--radius);
  }
  p {
    margin: 8px 0 0;
  }
</style>
