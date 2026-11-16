<script lang="ts">
  import { fitText } from '#lib/core/text-fit';
  import ColorInput from '#lib/ui/ColorInput.svelte';
  import DrawTool from '#lib/ui/DrawTool.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import type { OutputFormat } from '#lib/types';
  import { FONT, memeBox, outlineWidth } from './logic';

  let top = $state('');
  let bottom = $state('');
  let upper = $state(true);
  let fill = $state('#ffffff');
  let outline = $state('#000000');
  let format = $state<OutputFormat>('jpeg');

  type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  function draw(ctx: Ctx, picture: ImageBitmap) {
    const { width: w, height: h } = picture;
    ctx.drawImage(picture, 0, 0);
    const box = memeBox(w, h);
    const put = (text: string, where: 'top' | 'bottom') => {
      const t = upper ? text.toUpperCase() : text;
      const fit = fitText(t.trim(), {
        ...box,
        measure: (s, size) => {
          ctx.font = FONT.replace('{px}', String(size));
          return ctx.measureText(s).width;
        },
      });
      if (!fit.lines.length) return;
      ctx.font = FONT.replace('{px}', String(fit.size));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.lineWidth = outlineWidth(fit.size);
      ctx.strokeStyle = outline;
      ctx.fillStyle = fill;
      const lineH = fit.size * box.lineHeight;
      const margin = fit.size * 0.3;
      fit.lines.forEach((line, i) => {
        const y =
          where === 'top'
            ? margin + fit.size * 0.85 + i * lineH
            : h - margin - (fit.lines.length - 1 - i) * lineH - fit.size * 0.2;
        ctx.strokeText(line, w / 2, y);
        ctx.fillText(line, w / 2, y);
      });
    };
    put(top, 'top');
    put(bottom, 'bottom');
  }
</script>

<DrawTool
  {draw}
  size={(p) => ({ width: p.width, height: p.height })}
  suffix="meme"
  bind:format
  formats={['jpeg', 'png', 'webp', 'avif']}
>
  {#snippet settings()}
    <div class="field">
      <label for="meme-top">Top text</label>
      <input id="meme-top" type="text" maxlength="120" bind:value={top} autocomplete="off" />
    </div>
    <div class="field">
      <label for="meme-bottom">Bottom text</label>
      <input id="meme-bottom" type="text" maxlength="120" bind:value={bottom} autocomplete="off" />
    </div>
    <Toggle label="Capital letters" bind:checked={upper} />
    <div class="pair">
      <ColorInput label="Text color" bind:value={fill} />
      <ColorInput label="Outline color" bind:value={outline} />
    </div>
  {/snippet}
</DrawTool>

<style>
  .field {
    display: grid;
    gap: 4px;
    margin-bottom: 12px;
  }
  input[type='text'] {
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    width: 100%;
  }
</style>
