<script lang="ts">
  import { onMount } from 'svelte';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { image, safeName } from '#lib/core';
  import { canvasToBlob, loadPicture } from '#lib/core/bitmap';
  import { download } from '#lib/core/intake';
  import { ui } from '#lib/ui.svelte';
  import Box from '#lib/ui/Box.svelte';
  import Button from '#lib/ui/Button.svelte';
  import ColorInput from '#lib/ui/ColorInput.svelte';
  import ResultBox from '#lib/ui/ResultBox.svelte';
  import Notice from '#lib/ui/Notice.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import { drawDesign, TEMPLATES, type Assets } from './draw';
  import {
    defaultDesign,
    DIRECTIONS,
    FONTS,
    GRADIENTS,
    HEIGHT,
    WIDTH,
    normalized,
    parseDesign,
    type Design,
    type FontId,
    type TemplateId,
  } from './design';

  const tool = getTool();
  let d = $state<Design>({ ...defaultDesign });
  let assets = $state<Assets>({});
  let canvas = $state<HTMLCanvasElement>();
  let fromOk = $state(true);
  let toOk = $state(true);
  let message = $state('');
  let working = $state(false);

  // Pictures the visitor adds (kept out of saved designs).
  const names = $state<{ logo?: string; feature?: string; background?: string }>({});

  async function pick(kind: 'logo' | 'feature' | 'background', file: File | undefined) {
    assets[kind]?.close();
    assets[kind] = null;
    names[kind] = undefined;
    if (!file) return;
    try {
      assets[kind] = await loadPicture(file, 2400);
      names[kind] = file.name;
      message = '';
    } catch {
      message = `${file.name} could not be read as a picture.`;
    }
  }

  // Redraw whenever anything changes. The fonts are loaded first, so the text never flashes in another face.
  let frame = 0;
  $effect(() => {
    const design = normalized({ ...d });
    const a = { ...assets };
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(async () => {
      if (!canvas) return;
      const f = FONTS[design.font];
      await Promise.all(
        [f.weight, 400].map((w) => document.fonts.load(`${w} 40px ${f.family}`).catch(() => [])),
      );
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      drawDesign(canvas.getContext('2d')!, design, a);
    });
  });

  // Cleanup runs in the browser only (`onDestroy` would also run while the page is built).
  onMount(() => () => {
    cancelAnimationFrame(frame);
    for (const k of ['logo', 'feature', 'background'] as const) assets[k]?.close();
  });

  async function save() {
    if (!canvas) return;
    working = true;
    try {
      const png = await canvasToBlob(canvas);
      const blob =
        d.format === 'png' ? png : (await image(png).encode(d.format, { quality: 92 })).blob;
      const ext = d.format === 'jpeg' ? 'jpg' : d.format;
      download(
        `${safeName(d.title.slice(0, 40) || 'social-preview').replace(/\.+$/, '') || 'social-preview'}-og.${ext}`,
        blob,
      );
      track(tool.slug, 'download', { output: d.format });
    } catch (err) {
      message = (err as Error).message;
    } finally {
      working = false;
    }
  }

  // Designs kept on this device. Reading or writing can fail (private windows), so it is all guarded.
  const KEY = 'imgtools:og-designs';
  interface Saved {
    name: string;
    design: Design;
  }
  let saved = $state<Saved[]>([]);
  let saveName = $state('My design');

  function readSaved(): Saved[] {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return (Array.isArray(raw) ? raw : [])
        .map((r) => ({ name: String(r?.name ?? '').slice(0, 40), design: parseDesign(r?.design) }))
        .filter((r): r is Saved => !!r.name && !!r.design);
    } catch {
      return [];
    }
  }
  function writeSaved(list: Saved[]) {
    saved = list;
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      message =
        'Designs cannot be kept in this browser right now, but you can still export them as a file.';
    }
  }
  onMount(() => (saved = readSaved()));

  function keep() {
    const name = saveName.trim().slice(0, 40);
    if (!name) return;
    writeSaved(
      [...saved.filter((s) => s.name !== name), { name, design: normalized({ ...d }) }].slice(-20),
    );
    ui.showToast(`Saved “${name}”`);
  }
  const load = (s: Saved) => (d = normalized({ ...s.design }));
  const remove = (s: Saved) => writeSaved(saved.filter((x) => x !== s));

  function exportFile() {
    download(
      'social-preview-design.json',
      new Blob([JSON.stringify(normalized({ ...d }), null, 2) + '\n'], {
        type: 'application/json',
      }),
    );
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = parseDesign(JSON.parse(await file.text()));
      if (!parsed) throw new Error('not a design');
      d = normalized(parsed);
      message = '';
    } catch {
      message = 'That file is not a design exported from this tool.';
    }
  }

  const dirLabel = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  const templateIds = Object.keys(TEMPLATES) as TemplateId[];
  const valid = $derived(
    d.background !== 'gradient' || d.gradient !== 'custom' || (fromOk && toOk),
  );
</script>

<div class="layout">
  <div class="preview">
    <Box title="Preview">
      <div class="frame" role="img" aria-label="Preview of the social image">
        <canvas bind:this={canvas} width={WIDTH} height={HEIGHT} aria-hidden="true"></canvas>
      </div>
      <p class="tiny muted">{WIDTH} × {HEIGHT} px</p>
    </Box>
  </div>

  <div class="settings">
    <Box title="Text">
      <div class="field">
        <label for="og-tag">Tag (optional)</label>
        <input id="og-tag" type="text" maxlength="40" bind:value={d.tag} autocomplete="off" />
      </div>
      <div class="field">
        <label for="og-title">Title</label>
        <textarea id="og-title" rows="2" maxlength="140" bind:value={d.title}></textarea>
      </div>
      <div class="field">
        <label for="og-sub">Subtitle (optional)</label>
        <input id="og-sub" type="text" maxlength="160" bind:value={d.subtitle} autocomplete="off" />
      </div>
      <Segmented
        label="Font"
        bind:value={d.font}
        options={(Object.keys(FONTS) as FontId[]).map((id) => ({
          value: id,
          label: FONTS[id].label,
        }))}
      />
      <ColorInput label="Text color" bind:value={d.textColor} />
    </Box>

    <Box title="Template">
      <Segmented
        label="Layout"
        bind:value={d.template}
        options={templateIds.map((id) => ({ value: id, label: TEMPLATES[id].label }))}
      />
    </Box>

    <Box title="Background">
      <Segmented
        label="Type"
        bind:value={d.background}
        options={[
          { value: 'gradient', label: 'Gradient' },
          { value: 'solid', label: 'Solid color' },
          { value: 'image', label: 'Picture' },
        ]}
      />
      {#if d.background === 'gradient'}
        <fieldset class="swatches">
          <legend>Gradient</legend>
          <div class="grid">
            {#each GRADIENTS as g (g.id)}
              <label class:on={d.gradient === g.id} title={g.label}>
                <input
                  type="radio"
                  name="og-gradient"
                  value={g.id}
                  bind:group={d.gradient}
                  aria-label={g.label}
                />
                <span style:background="linear-gradient(135deg, {g.from}, {g.to})"></span>
              </label>
            {/each}
            <label class:on={d.gradient === 'custom'} title="Your own two colors">
              <input
                type="radio"
                name="og-gradient"
                value="custom"
                bind:group={d.gradient}
                aria-label="Custom colors"
              />
              <span class="custom">Custom</span>
            </label>
          </div>
        </fieldset>
        {#if d.gradient === 'custom'}
          <div class="pair">
            <ColorInput label="First color" bind:value={d.from} bind:valid={fromOk} />
            <ColorInput label="Second color" bind:value={d.to} bind:valid={toOk} />
          </div>
        {/if}
        <Segmented
          label="Direction"
          bind:value={d.direction}
          options={DIRECTIONS.map((deg, i) => ({
            value: deg as number,
            label: `${dirLabel[i]} ${deg}°`,
          }))}
        />
      {:else if d.background === 'solid'}
        <ColorInput label="Background color" bind:value={d.solid} />
      {:else}
        <div class="field">
          <label for="og-bg">Background picture</label>
          <input
            id="og-bg"
            type="file"
            accept="image/*"
            onchange={(e) => pick('background', e.currentTarget.files?.[0])}
          />
          <p class="tiny muted">
            {names.background
              ? `${names.background}. It is darkened so the text stays easy to read.`
              : 'It is darkened so the text stays easy to read.'}
          </p>
        </div>
      {/if}
      <div class="toggles">
        <Toggle label="Grid" bind:checked={d.grid} />
        <Toggle label="Grain" bind:checked={d.grain} />
      </div>
    </Box>

    <Box title="Pictures">
      <div class="field">
        <label for="og-logo">Logo (optional)</label>
        <input
          id="og-logo"
          type="file"
          accept="image/*"
          onchange={(e) => pick('logo', e.currentTarget.files?.[0])}
        />
      </div>
      <div class="field">
        <label for="og-feature">Feature picture, shown as a card on the right (optional)</label>
        <input
          id="og-feature"
          type="file"
          accept="image/*"
          onchange={(e) => pick('feature', e.currentTarget.files?.[0])}
        />
      </div>
    </Box>

    <Box title="Save as">
      <SaveAs bind:value={d.format} only={['png', 'jpeg', 'webp']} />
    </Box>

    {#if message}<Notice kind="warn"><span role="alert">{message}</span></Notice>{/if}
    <ResultBox
      summary="{WIDTH} × {HEIGHT} px"
      mono
      disabled={working || !valid}
      onDownload={save}
    />

    <Box title="Designs">
      <div class="field">
        <label for="og-name">Name</label>
        <input id="og-name" type="text" maxlength="40" bind:value={saveName} autocomplete="off" />
      </div>
      <div class="row">
        <Button onclick={keep} disabled={!saveName.trim()}>Save on this device</Button>
        <Button onclick={exportFile}>Export as file</Button>
      </div>
      <div class="field">
        <label for="og-import">Import a design file</label>
        <input
          id="og-import"
          type="file"
          accept="application/json,.json"
          onchange={(e) => {
            void importFile(e.currentTarget.files?.[0]);
            e.currentTarget.value = '';
          }}
        />
      </div>
      {#if saved.length}
        <ul class="saved">
          {#each saved as s (s.name)}
            <li>
              <span>{s.name}</span>
              <Button onclick={() => load(s)} aria-label="Open {s.name}">Open</Button>
              <Button onclick={() => remove(s)} aria-label="Delete {s.name}">Delete</Button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="tiny muted">Saved designs stay on this device only.</p>
      {/if}
    </Box>
  </div>
</div>

<style>
  .layout {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr);
  }
  @media (min-width: 1100px) {
    .layout {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
    }
    .preview {
      position: sticky;
      top: 16px;
      grid-column: 2;
      grid-row: 1;
    }
    .settings {
      grid-column: 1;
      grid-row: 1;
    }
  }
  .settings {
    display: grid;
    gap: 16px;
  }
  .frame {
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: 0 0 0 1px var(--line);
    line-height: 0;
  }
  canvas {
    width: 100%;
    height: auto;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }
  .field {
    display: grid;
    gap: 4px;
    margin-bottom: 12px;
  }
  input[type='text'],
  textarea {
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    width: 100%;
    font: inherit;
  }
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
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
    gap: 8px;
  }
  .grid label {
    position: relative;
    display: block;
    height: 44px;
    border: 2px solid transparent;
    border-radius: var(--radius);
    cursor: pointer;
    overflow: hidden;
  }
  .grid label.on {
    border-color: var(--accent);
  }
  .grid label:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .grid input {
    position: absolute;
    opacity: 0;
    inset: 0;
    cursor: pointer;
  }
  .grid span {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
  }
  .custom {
    background: var(--surface-sunk);
    font-size: 0.8125rem;
  }
  .toggles {
    display: flex;
    gap: 24px;
  }
  .saved {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 6px;
  }
  .saved li {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .saved li span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  p {
    margin: 0 0 8px;
  }
</style>
