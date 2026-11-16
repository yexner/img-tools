<script lang="ts">
  import { copyText } from '#lib/clipboard';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { loadPicture } from '#lib/core/bitmap';
  import { toHex, toHsl } from '#lib/core/color';
  import { ui } from '#lib/ui.svelte';
  import Box from '#lib/ui/Box.svelte';
  import Button from '#lib/ui/Button.svelte';
  import ErrorNotice from '#lib/ui/ErrorNotice.svelte';
  import OneFile from '#lib/ui/OneFile.svelte';

  const tool = getTool();
  const MAX_SAMPLES = 24;
  const MAX_SIDE = 6000;
  const ZOOM = 12; // screen pixels per picture pixel in the magnifier
  const RADIUS = 5; // the magnifier shows 11 x 11 pixels

  let file = $state<File>();
  let canvas = $state<HTMLCanvasElement>();
  let loupe = $state<HTMLCanvasElement>();
  let size = $state({ w: 0, h: 0 });
  let error = $state('');
  let at = $state<{ x: number; y: number } | null>(null);
  let samples = $state<string[]>([]);
  let announce = $state('');

  // The picture is drawn once at its own resolution, so every pixel can be read exactly.
  $effect(() => {
    const f = file;
    at = null;
    error = '';
    size = { w: 0, h: 0 };
    if (!f) return;
    let alive = true;
    loadPicture(f, MAX_SIDE).then(
      (bitmap) => {
        if (!alive || !canvas) return void bitmap.close();
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d', { willReadFrequently: true })!.drawImage(bitmap, 0, 0);
        size = { w: bitmap.width, h: bitmap.height };
        bitmap.close();
      },
      () => alive && (error = 'This picture could not be read.'),
    );
    return () => {
      alive = false;
    };
  });

  function colorAt(x: number, y: number) {
    const [r, g, b, a] = canvas!.getContext('2d')!.getImageData(x, y, 1, 1).data;
    const rgb: [number, number, number] = [r, g, b];
    return {
      hex: a === 255 ? toHex(rgb) : toHex(rgb) + Math.round(a).toString(16).padStart(2, '0'),
      rgb: a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${+(a / 255).toFixed(2)})`,
      hsl: `hsl(${toHsl(rgb)
        .map((v, i) => (i ? v + '%' : v))
        .join(', ')})`,
    };
  }

  const current = $derived(at && size.w ? colorAt(at.x, at.y) : null);

  // The magnifier: the pixels around the pointer, enlarged without smoothing, with the center marked.
  $effect(() => {
    if (!at || !loupe || !canvas) return;
    const n = RADIUS * 2 + 1;
    loupe.width = n * ZOOM;
    loupe.height = n * ZOOM;
    const g = loupe.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#888';
    g.fillRect(0, 0, loupe.width, loupe.height);
    g.drawImage(canvas, at.x - RADIUS, at.y - RADIUS, n, n, 0, 0, n * ZOOM, n * ZOOM);
    g.strokeStyle = '#fff';
    g.lineWidth = 3;
    g.strokeRect(RADIUS * ZOOM, RADIUS * ZOOM, ZOOM, ZOOM);
    g.strokeStyle = '#000';
    g.lineWidth = 1;
    g.strokeRect(RADIUS * ZOOM + 1.5, RADIUS * ZOOM + 1.5, ZOOM - 3, ZOOM - 3);
  });

  function point(e: PointerEvent) {
    if (!canvas || !size.w) return;
    const box = canvas.getBoundingClientRect();
    at = {
      x: Math.min(
        size.w - 1,
        Math.max(0, Math.floor(((e.clientX - box.left) / box.width) * size.w)),
      ),
      y: Math.min(
        size.h - 1,
        Math.max(0, Math.floor(((e.clientY - box.top) / box.height) * size.h)),
      ),
    };
  }

  const copy = (text: string) => copyText(tool.slug, text, `Copied ${text}`);

  function pick() {
    if (!current) return;
    samples = [current.hex, ...samples.filter((_, i) => i < MAX_SAMPLES - 1)];
    void copy(current.hex);
  }

  function key(e: KeyboardEvent) {
    if (!size.w) return;
    const step = e.shiftKey ? 10 : 1;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!at) at = { x: size.w >> 1, y: size.h >> 1 };
      pick();
      return;
    }
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    const from = at ?? { x: size.w >> 1, y: size.h >> 1 };
    at = {
      x: Math.min(size.w - 1, Math.max(0, from.x + m[0])),
      y: Math.min(size.h - 1, Math.max(0, from.y + m[1])),
    };
    announce = `x ${at.x}, y ${at.y}, ${colorAt(at.x, at.y).hex}`;
  }
</script>

<div class="stack">
  <OneFile bind:file title="Files" />
  <ErrorNotice {error} />

  <div class="work" hidden={!file}>
    <Box title="Picture">
      <p class="tiny muted">
        Move over the picture and click to pick a color. With the keyboard, use the arrow keys and
        Enter.
      </p>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
      <div
        class="frame"
        role="group"
        tabindex="0"
        aria-label="Picture. Arrow keys move the crosshair by one pixel, Shift by ten. Enter picks the color."
        onpointermove={point}
        onpointerdown={(e) => {
          point(e);
          pick();
        }}
        onkeydown={key}
      >
        <canvas bind:this={canvas} aria-hidden="true"></canvas>
        {#if at && size.w}
          <span
            class="cross"
            style:left="{((at.x + 0.5) / size.w) * 100}%"
            style:top="{((at.y + 0.5) / size.h) * 100}%"
            aria-hidden="true"
          ></span>
        {/if}
      </div>
      <span class="sr-only" aria-live="polite">{announce}</span>
    </Box>

    <Box title="Color">
      {#if current && at}
        <canvas class="loupe" bind:this={loupe} aria-hidden="true"></canvas>
        <div class="values">
          <span class="chip" style:background={current.hex} aria-hidden="true"></span>
          <div>
            <p class="mono value"><strong>{current.hex}</strong></p>
            <p class="mono tiny">{current.rgb}</p>
            <p class="mono tiny">{current.hsl}</p>
            <p class="mono tiny muted">x {at.x}, y {at.y}</p>
          </div>
        </div>
      {:else}
        <p class="muted">Move over the picture to see its colors.</p>
      {/if}
      <div class="samples-head">
        <h3>Samples</h3>
        <Button onclick={() => (samples = [])} disabled={!samples.length}>Clear</Button>
      </div>
      {#if samples.length}
        <ul class="samples">
          {#each samples as s, i (i)}
            <li>
              <button type="button" onclick={() => copy(s)} aria-label="Copy {s}">
                <span class="chip small" style:background={s}></span>
                <span class="mono tiny">{s}</span>
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="tiny muted">Picked colors appear here. The last {MAX_SAMPLES} are kept.</p>
      {/if}
    </Box>
  </div>
</div>

<style>
  .work {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr);
  }
  .work[hidden] {
    display: none;
  }
  @media (min-width: 1000px) {
    .work {
      grid-template-columns: minmax(0, 1fr) 300px;
      align-items: start;
    }
  }
  .frame {
    position: relative;
    line-height: 0;
    cursor: crosshair;
    touch-action: none;
    border-radius: var(--radius);
    overflow: hidden;
    outline: none;
    background: conic-gradient(
        var(--surface-sunk) 25%,
        var(--surface) 0 50%,
        var(--surface-sunk) 0 75%,
        var(--surface) 0
      )
      0 0 / 16px 16px;
  }
  .frame:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }
  .frame canvas {
    display: block;
    width: 100%;
    height: auto;
  }
  .cross {
    position: absolute;
    width: 20px;
    height: 20px;
    margin: -10px 0 0 -10px;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow:
      0 0 0 1px #000,
      inset 0 0 0 1px #000;
    pointer-events: none;
  }
  .loupe {
    display: block;
    width: 100%;
    max-width: 264px;
    height: auto;
    image-rendering: pixelated;
    border-radius: var(--radius);
    box-shadow: 0 0 0 1px var(--line);
    margin-bottom: 12px;
  }
  .values {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .chip {
    width: 56px;
    height: 56px;
    border-radius: var(--radius);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.2);
    flex: none;
  }
  .chip.small {
    width: 28px;
    height: 28px;
  }
  p {
    margin: 0 0 2px;
  }
  .value {
    font-size: 1.25rem;
  }
  .samples-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 16px 0 8px;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
  }
  .samples {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 6px;
  }
  .samples button {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-height: 44px;
    padding: 4px 6px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .samples button:hover {
    border-color: var(--accent);
  }
</style>
