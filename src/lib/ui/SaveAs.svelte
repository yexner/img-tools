<script lang="ts">
  import { loadCodec } from '#lib/codecs';
  import type { OutputFormat } from '#lib/types';

  const labels: Record<OutputFormat, string> = {
    original: 'Original',
    jpeg: 'JPG',
    png: 'PNG',
    webp: 'WebP',
    avif: 'AVIF',
  };

  let {
    value = $bindable<OutputFormat>('original'),
    only,
    needsAlpha = false,
    print = false,
    hide = [],
    describe,
  }: {
    value: OutputFormat;
    /** Restrict to these formats (in this order). */
    only?: OutputFormat[];
    /** The result needs transparency, so JPG is hidden. */
    needsAlpha?: boolean;
    /** Print tools store DPI, which WebP and AVIF cannot do reliably. */
    print?: boolean;
    /** Formats the current settings cannot produce, each with a one-line reason. */
    hide?: { format: OutputFormat; reason: string }[];
    /** One line about the trade-offs of each format, shown for the selected one. */
    describe?: Partial<Record<OutputFormat, string>>;
  } = $props();

  const all: OutputFormat[] = ['original', 'jpeg', 'png', 'webp', 'avif'];
  const hidden = $derived.by(() => {
    const out: { format: OutputFormat; reason: string }[] = [...hide];
    if (needsAlpha)
      out.push({ format: 'jpeg', reason: 'JPG is hidden because this result needs transparency.' });
    if (print) {
      out.push({
        format: 'webp',
        reason: 'WebP is hidden because it cannot store print resolution reliably.',
      });
      out.push({
        format: 'avif',
        reason: 'AVIF is hidden because it cannot store print resolution reliably.',
      });
    }
    return out;
  });
  const shown = $derived(
    (only ?? all).filter(
      (f) => !hidden.some((h) => h.format === f) && !(print && f === 'original'),
    ),
  );
  const id = $props.id();

  // An optional format is warmed the moment it is chosen, so it also works offline afterwards.
  $effect(() => {
    if (value === 'avif' || value === 'webp') void loadCodec(`${value}-enc`).catch(() => {});
  });
</script>

<fieldset>
  <legend id="{id}-l">Save as</legend>
  <div class="chips" role="radiogroup" aria-labelledby="{id}-l">
    {#each shown as f (f)}
      <label class:on={value === f}>
        <input type="radio" name="{id}-fmt" value={f} bind:group={value} />
        <span class="mono">{labels[f]}</span>
      </label>
    {/each}
  </div>
  {#if describe?.[value]}<p class="tiny muted" id="{id}-desc">{describe[value]}</p>{/if}
  {#each hidden.filter((h) => (only ?? all).includes(h.format)) as h (h.format)}
    <p class="tiny muted">{h.reason}</p>
  {/each}
</fieldset>

<style>
  fieldset {
    border: 0;
    padding: 0;
    margin: 0 0 16px;
  }
  legend {
    font-weight: 700;
    margin-bottom: 6px;
    padding: 0;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  label {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    cursor: pointer;
  }
  label.on {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
  input {
    position: absolute;
    opacity: 0;
    inset: 0;
    cursor: pointer;
  }
  label:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  p {
    margin: 8px 0 0;
  }
</style>
