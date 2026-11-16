<script lang="ts">
  import { GRADIENTS } from '#lib/data/gradients';
  import ColorInput from '#lib/ui/ColorInput.svelte';
  import DrawTool from '#lib/ui/DrawTool.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import type { OutputFormat } from '#lib/types';
  import { drawBar, STYLES, type WindowStyle } from './bar';
  import { layoutFor, type Shape } from './logic';

  const presets = GRADIENTS.slice(0, 8);
  let kind = $state<'gradient' | 'solid'>('gradient');
  let gradient = $state(presets[0].id);
  let solid = $state('#e8ecf5');
  let padding = $state(80);
  let radius = $state(18);
  let titleBar = $state(true);
  let style = $state<WindowStyle>('mac');
  let shadow = $state(true);
  let strength = $state(50);
  let shape = $state<Shape>('auto');
  let format = $state<OutputFormat>('png');

  type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  const options = $derived({ padding, radius, titleBar, shadow, shadowStrength: strength, shape });

  function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
    const k = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + k, y);
    ctx.arcTo(x + w, y, x + w, y + h, k);
    ctx.arcTo(x + w, y + h, x, y + h, k);
    ctx.arcTo(x, y + h, x, y, k);
    ctx.arcTo(x, y, x + w, y, k);
    ctx.closePath();
  }

  function draw(ctx: Ctx, picture: ImageBitmap) {
    const l = layoutFor(picture.width, picture.height, options);
    const u = l.unit;
    // Background.
    if (kind === 'solid') {
      ctx.fillStyle = solid;
    } else {
      const g = presets.find((p) => p.id === gradient) ?? presets[0];
      const fill = ctx.createLinearGradient(0, 0, l.width, l.height);
      fill.addColorStop(0, g.from);
      fill.addColorStop(1, g.to);
      ctx.fillStyle = fill;
    }
    ctx.fillRect(0, 0, l.width, l.height);

    const { x, y, w, h } = l.win;
    const r = radius * u;
    if (shadow) {
      ctx.save();
      ctx.shadowColor = `rgb(0 0 0 / ${0.15 + (strength / 100) * 0.3})`;
      ctx.shadowBlur = (8 + strength * 0.6) * u;
      ctx.shadowOffsetY = (4 + strength * 0.25) * u;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, x, y, w, h, r);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
    if (titleBar) drawBar(ctx, style, x, y, w, l.barHeight);
    ctx.drawImage(picture, x, y + l.barHeight, picture.width, picture.height);
    ctx.restore();
  }
</script>

<DrawTool
  {draw}
  size={(p) => {
    const l = layoutFor(p.width, p.height, options);
    return { width: l.width, height: l.height };
  }}
  suffix="framed"
  bind:format
  formats={['png', 'jpeg', 'webp', 'avif']}
  maxSide={4000}
>
  {#snippet settings()}
    <Segmented
      label="Background"
      bind:value={kind}
      options={[
        { value: 'gradient', label: 'Gradient' },
        { value: 'solid', label: 'Solid color' },
      ]}
    />
    {#if kind === 'gradient'}
      <fieldset class="swatches">
        <legend>Gradient</legend>
        <div class="grid">
          {#each presets as g (g.id)}
            <label class:on={gradient === g.id} title={g.label}>
              <input
                type="radio"
                name="shot-gradient"
                value={g.id}
                bind:group={gradient}
                aria-label={g.label}
              />
              <span style:background="linear-gradient(135deg, {g.from}, {g.to})"></span>
            </label>
          {/each}
        </div>
      </fieldset>
    {:else}
      <ColorInput label="Background color" bind:value={solid} />
    {/if}
    <Slider label="Padding" bind:value={padding} min={0} max={300} />
    <Segmented
      label="Window style"
      bind:value={style}
      options={STYLES.map((s) => ({ value: s.value, label: s.label }))}
      onchange={(v) => (radius = STYLES.find((s) => s.value === v)?.radius ?? radius)}
    />
    <Slider label="Corner radius" bind:value={radius} min={0} max={60} />
    <Toggle label="Window title bar" bind:checked={titleBar} />
    <Toggle label="Shadow" bind:checked={shadow} />
    {#if shadow}<Slider label="Shadow strength" bind:value={strength} min={0} max={100} />{/if}
    <Segmented
      label="Shape of the picture"
      bind:value={shape}
      options={[
        { value: 'auto', label: 'Auto' },
        { value: '16:9', label: '16:9' },
        { value: '1:1', label: '1:1' },
        { value: '4:5', label: '4:5' },
      ]}
    />
  {/snippet}
</DrawTool>

<style>
  .swatches {
    border: 0;
    padding: 0;
    margin: 0 0 16px;
  }
  legend {
    font-weight: 700;
    margin-bottom: 6px;
    padding: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
  label {
    position: relative;
    display: block;
    height: 44px;
    border: 2px solid transparent;
    border-radius: var(--radius);
    cursor: pointer;
    overflow: hidden;
  }
  label.on {
    border-color: var(--accent);
  }
  label:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  input {
    position: absolute;
    opacity: 0;
    inset: 0;
    cursor: pointer;
  }
  span {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
