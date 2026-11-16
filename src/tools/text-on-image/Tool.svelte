<script lang="ts">
  import ColorInput from '#lib/ui/ColorInput.svelte';
  import DrawTool from '#lib/ui/DrawTool.svelte';
  import Button from '#lib/ui/Button.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import type { OutputFormat } from '#lib/types';
  import {
    clamp01,
    FONTS,
    fontCss,
    hitTest,
    layerBox,
    newLayer,
    reorder,
    type FontId,
    type Layer,
  } from './logic';

  type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  let layers = $state<Layer[]>([]);
  let selected = $state<number | null>(null);
  let nextId = 1;
  let format = $state<OutputFormat>('png');
  let announce = $state('');

  const current = $derived(layers.find((l) => l.id === selected));

  function add() {
    const l = newLayer(nextId++, layers.length);
    layers = [...layers, l];
    selected = l.id;
  }
  function remove(id: number) {
    layers = layers.filter((l) => l.id !== id);
    if (selected === id) selected = layers.at(-1)?.id ?? null;
  }
  function shift(id: number, by: -1 | 1) {
    layers = reorder(
      layers,
      layers.findIndex((l) => l.id === id),
      by,
    );
  }

  const scratch =
    typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  const measureFor = (l: Layer) => (text: string, px: number) => {
    scratch!.font = fontCss(l, px);
    return scratch!.measureText(text).width;
  };

  function draw(ctx: Ctx, picture: ImageBitmap) {
    const W = picture.width;
    const H = picture.height;
    ctx.drawImage(picture, 0, 0);
    for (const l of layers) {
      if (!l.text.trim()) continue;
      const px = (l.size / 100) * W;
      const lines = l.text.split('\n');
      ctx.font = fontCss(l, px);
      ctx.textBaseline = 'alphabetic';
      const box = layerBox(l, W, H, (t, p) => {
        ctx.font = fontCss(l, p);
        return ctx.measureText(t).width;
      });
      if (l.box) {
        ctx.fillStyle = l.boxColor;
        ctx.fillRect(box.x, box.y, box.w, box.h);
      }
      const pad = l.box ? px * 0.3 : px * 0.05;
      const left = box.x + pad;
      const right = box.x + box.w - pad;
      ctx.font = fontCss(l, px);
      ctx.fillStyle = l.color;
      ctx.textAlign = l.align;
      ctx.save();
      if (l.shadow) {
        ctx.shadowColor = 'rgb(0 0 0 / 0.55)';
        ctx.shadowBlur = px * 0.12;
        ctx.shadowOffsetY = px * 0.05;
      }
      const x = l.align === 'left' ? left : l.align === 'right' ? right : (left + right) / 2;
      lines.forEach((line, i) => ctx.fillText(line, x, box.y + pad + px * 1.2 * i + px * 0.95));
      ctx.restore();
    }
  }

  // Dragging and arrow keys on the preview.
  let dragging: { id: number; x: number; y: number; from: { x: number; y: number } } | null = null;
  let frame: HTMLElement | undefined = $state();

  function toPicture(e: PointerEvent, picture: ImageBitmap) {
    const r = frame!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * picture.width,
      y: ((e.clientY - r.top) / r.height) * picture.height,
    };
  }
  function down(e: PointerEvent, picture: ImageBitmap) {
    const p = toPicture(e, picture);
    const boxes = layers.map((l) => layerBox(l, picture.width, picture.height, measureFor(l)));
    const hit = hitTest(boxes, p.x, p.y);
    if (hit === null) return;
    const l = layers[hit];
    selected = l.id;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging = { id: l.id, x: p.x, y: p.y, from: { x: l.x, y: l.y } };
  }
  function move(e: PointerEvent, picture: ImageBitmap) {
    if (!dragging) return;
    const p = toPicture(e, picture);
    const l = layers.find((x) => x.id === dragging!.id);
    if (!l) return;
    l.x = clamp01(dragging.from.x + (p.x - dragging.x) / picture.width);
    l.y = clamp01(dragging.from.y + (p.y - dragging.y) / picture.height);
  }
  function key(e: KeyboardEvent) {
    const l = current;
    if (!l) return;
    const step = e.shiftKey ? 0.05 : 0.005;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    l.x = clamp01(l.x + m[0]);
    l.y = clamp01(l.y + m[1]);
    announce = `Text at ${Math.round(l.x * 100)} percent across, ${Math.round(l.y * 100)} percent down`;
  }
</script>

<DrawTool
  {draw}
  size={(p) => ({ width: p.width, height: p.height })}
  suffix="text"
  bind:format
  formats={['png', 'jpeg', 'webp', 'avif']}
>
  {#snippet settings()}
    <div class="row">
      <Button variant="primary" onclick={add}>Add text</Button>
      <span class="tiny muted" aria-live="polite"
        >{layers.length} {layers.length === 1 ? 'layer' : 'layers'}</span
      >
    </div>
    {#if layers.length}
      <ul class="layers" aria-label="Text layers">
        {#each layers as l, i (l.id)}
          <li class:on={l.id === selected}>
            <button
              type="button"
              class="pick"
              aria-pressed={l.id === selected}
              onclick={() => (selected = l.id)}
            >
              {l.text.split('\n')[0].slice(0, 28) || '(empty)'}
            </button>
            <button
              type="button"
              class="icon"
              aria-label="Move layer {i + 1} up the list"
              disabled={i === 0}
              onclick={() => shift(l.id, -1)}>↑</button
            >
            <button
              type="button"
              class="icon"
              aria-label="Move layer {i + 1} down the list"
              disabled={i === layers.length - 1}
              onclick={() => shift(l.id, 1)}>↓</button
            >
            <button
              type="button"
              class="icon"
              aria-label="Delete layer {i + 1}"
              onclick={() => remove(l.id)}>×</button
            >
          </li>
        {/each}
      </ul>
    {:else}
      <p class="tiny muted">Press Add text to start.</p>
    {/if}

    {#if current}
      <div class="field">
        <label for="layer-text">Text</label>
        <textarea id="layer-text" rows="3" bind:value={current.text}></textarea>
      </div>
      <Segmented
        label="Font"
        bind:value={current.font}
        options={(Object.keys(FONTS) as FontId[]).map((id) => ({
          value: id,
          label: FONTS[id].label,
        }))}
      />
      <Slider
        label="Size (percent of the picture's width)"
        bind:value={current.size}
        min={1}
        max={40}
      />
      <div class="pair">
        <ColorInput label="Text color" bind:value={current.color} />
      </div>
      <Segmented
        label="Weight"
        bind:value={current.weight}
        options={[
          { value: 400, label: 'Regular' },
          { value: 700, label: 'Bold' },
        ]}
      />
      <Segmented
        label="Alignment"
        bind:value={current.align}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ]}
      />
      <Toggle label="Shadow" bind:checked={current.shadow} />
      <Toggle label="Background box" bind:checked={current.box} />
      {#if current.box}<ColorInput label="Box color" bind:value={current.boxColor} />{/if}
    {/if}
  {/snippet}
  {#snippet stage({ canvas, picture })}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div
      class="frame"
      bind:this={frame}
      role="group"
      tabindex="0"
      aria-label="Preview. Drag a text layer to move it. With a layer selected, the arrow keys move it, and Shift moves it faster."
      onpointerdown={(e) => down(e, picture)}
      onpointermove={(e) => move(e, picture)}
      onpointerup={() => (dragging = null)}
      onpointercancel={() => (dragging = null)}
      onkeydown={key}
    >
      <canvas {@attach canvas} aria-hidden="true"></canvas>
    </div>
    <span class="sr-only" aria-live="polite">{announce}</span>
  {/snippet}
</DrawTool>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  .layers {
    list-style: none;
    padding: 0;
    margin: 0 0 16px;
    display: grid;
    gap: 6px;
  }
  .layers li {
    display: flex;
    gap: 4px;
    align-items: stretch;
  }
  .pick {
    flex: 1;
    min-height: 44px;
    padding: 0 12px;
    text-align: left;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .on .pick {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .icon {
    width: 44px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .icon:disabled {
    opacity: 0.4;
  }
  .field {
    display: grid;
    gap: 4px;
    margin-bottom: 12px;
  }
  textarea {
    padding: 8px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    width: 100%;
  }
  .frame {
    line-height: 0;
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: 0 0 0 1px var(--line);
    cursor: move;
    touch-action: none;
    outline: none;
  }
  .frame:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }
  canvas {
    width: 100%;
    height: auto;
  }
</style>
