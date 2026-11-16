<script lang="ts">
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { formatBytes, percentChange, splitName } from '#lib/core';
  import { download } from '#lib/core/intake';
  import Box from '#lib/ui/Box.svelte';
  import ResultBox from '#lib/ui/ResultBox.svelte';
  import CopyField from '#lib/ui/CopyField.svelte';
  import ErrorNotice from '#lib/ui/ErrorNotice.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import OneFile from '#lib/ui/OneFile.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import { bytesOf, defaults, optimizeSvg } from './logic';
  import { objectUrl } from '#lib/objectUrl.svelte';

  const tool = getTool();
  let file = $state<File>();
  let markup = $state('');
  let precision = $state<number | undefined>(defaults.precision);
  let keepViewBox = $state(defaults.keepViewBox);
  let removeSize = $state(defaults.removeSize);
  let keepIds = $state(defaults.keepIds);

  let output = $state('');
  let error = $state('');

  // A file's text goes into the box, where it can also be edited or replaced by pasted markup.
  $effect(() => {
    const f = file;
    if (f) void f.text().then((t) => (markup = t));
  });

  // Removing width and height needs the viewBox.
  $effect(() => {
    if (removeSize) keepViewBox = true;
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  let run = 0;
  $effect(() => {
    const source = markup;
    const options = {
      precision: Math.min(8, Math.max(0, Math.round(precision ?? defaults.precision))),
      keepViewBox,
      removeSize,
      keepIds,
    };
    clearTimeout(timer);
    const mine = ++run;
    if (!source.trim()) {
      output = '';
      error = '';
      return;
    }
    timer = setTimeout(async () => {
      const r = await optimizeSvg(source, options);
      if (mine !== run) return;
      if (r.ok) {
        output = r.text;
        error = '';
        track(tool.slug, 'done', { files: 1, input: 'svg' });
      } else {
        output = '';
        error = r.message;
        track(tool.slug, 'error', { reason: 'decode-failed', input: 'svg' });
      }
    }, 250);
  });

  // Both versions are shown as pictures (blob address), so scripts inside an SVG never run.
  const svgBlob = (text: string) =>
    text ? new Blob([text], { type: 'image/svg+xml' }) : undefined;
  const beforeUrl = objectUrl(() => svgBlob(markup.trim() ? markup : ''));
  const afterUrl = objectUrl(() => svgBlob(output));

  const before = $derived(bytesOf(markup));
  const after = $derived(bytesOf(output));
  const name = $derived(file ? `${splitName(file.name).stem}.min.svg` : 'optimized.svg');

  function save() {
    download(name, new Blob([output], { type: 'image/svg+xml' }));
    track(tool.slug, 'download');
  }
</script>

<div class="stack">
  <OneFile bind:file title="Files" />

  <Box title="SVG markup">
    <label class="tiny muted" for="svg-markup">Paste SVG markup here, or add a file above.</label>
    <textarea
      id="svg-markup"
      class="mono"
      rows="6"
      spellcheck="false"
      bind:value={markup}
      placeholder={'<svg xmlns="http://www.w3.org/2000/svg" …>'}></textarea>
  </Box>

  <Box title="Settings">
    <NumberField
      label="Number precision (digits after the point)"
      bind:value={precision}
      min={0}
      max={8}
    />
    <div class="toggles">
      <Toggle label="Keep the viewBox" bind:checked={keepViewBox} />
      <Toggle label="Remove width and height" bind:checked={removeSize} />
      <Toggle label="Keep IDs" bind:checked={keepIds} />
    </div>
    <p class="tiny muted">
      The defaults are safe. Lower precision gives smaller files and may move shapes slightly.
    </p>
  </Box>

  <ErrorNotice {error} />

  {#if output}
    <ResultBox mono live onDownload={save}>
      {#snippet summary()}
        {formatBytes(before)} → {formatBytes(after)}
        <span class="pill" class:bad={after > before}>{percentChange(before, after)}</span>
      {/snippet}
      <div class="previews">
        <figure>
          <img src={beforeUrl.current} alt="The original SVG" />
          <figcaption class="tiny muted">Before</figcaption>
        </figure>
        <figure>
          <img src={afterUrl.current} alt="The optimized SVG" />
          <figcaption class="tiny muted">After</figcaption>
        </figure>
      </div>
      <CopyField label="Optimized markup" value={output} filename={name} multiline />
    </ResultBox>
  {/if}
</div>

<style>
  textarea {
    width: 100%;
    margin-top: 6px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    resize: vertical;
    font-size: 0.8125rem;
  }
  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 0 24px;
  }
  .pill {
    padding: 1px 8px;
    border-radius: 99px;
    background: var(--safe-soft);
    color: var(--safe);
  }
  .pill.bad {
    background: var(--surface-sunk);
    color: var(--warn);
  }
  .previews {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  figure {
    margin: 0;
    display: grid;
    gap: 4px;
  }
  img {
    width: 100%;
    max-height: 260px;
    object-fit: contain;
    border-radius: var(--radius);
    background: conic-gradient(
        var(--surface-sunk) 25%,
        var(--surface) 0 50%,
        var(--surface-sunk) 0 75%,
        var(--surface) 0
      )
      0 0 / 16px 16px;
    box-shadow: 0 0 0 1px var(--line);
  }
  p {
    margin: 0;
  }
</style>
