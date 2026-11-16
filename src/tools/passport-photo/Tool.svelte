<script lang="ts">
  import { untrack } from 'svelte';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { image, splitName } from '#lib/core';
  import { download } from '#lib/core/intake';
  import { centeredRect, type Bounds, type Rect } from '#lib/core/rect';
  import {
    documentById,
    documentFileName,
    passportDocuments,
    photoPixels,
  } from '#lib/data/passport-documents';
  import type { OutputFormat } from '#lib/types';
  import Box from '#lib/ui/Box.svelte';
  import ResultBox, { type Result } from './ResultBox.svelte';
  import Button from '#lib/ui/Button.svelte';
  import ErrorNotice from '#lib/ui/ErrorNotice.svelte';
  import Notice from '#lib/ui/Notice.svelte';
  import OneFile from '#lib/ui/OneFile.svelte';
  import SaveAs from '#lib/ui/SaveAs.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import RequestLink from './RequestLink.svelte';
  import CropBox from './CropBox.svelte';
  import DocumentSettings from './DocumentSettings.svelte';
  import { decodedPicture } from './picture.svelte';
  import { sheetBlob } from './draw';
  import SheetOptions from './SheetOptions.svelte';
  import SheetPreview from './SheetPreview.svelte';
  import { aspectOf, cropBox, customDocument, guides, maxCrownFraction, type Doc } from './logic';
  import { SHEETS, sheetPlan } from './sheet';
  import { objectUrl, urlBag } from '#lib/objectUrl.svelte';

  const DPI = 300;
  const tool = getTool();

  let file = $state<File>();
  const url = objectUrl(() => file);
  const urls = urlBag();
  let docId = $state(passportDocuments[0].id);
  let rect = $state<Rect | null>(null);
  let bounds = $state<Bounds>({ w: 0, h: 0 });
  let showGuides = $state(true);
  let crown = $state(15);
  let format = $state<OutputFormat>('jpeg');
  let quality = $state(95);
  let working = $state(false);
  let error = $state('');
  let result = $state<Result | null>(null);

  // One photo, or copies of it on a print sheet.
  let output = $state<'single' | 'sheet'>('single');
  let sheetId = $state<string>(SHEETS[0].id);
  let sheetDpi = $state(300);
  let gap = $state<number | undefined>(2);
  let cutLines = $state(true);

  let customInput = $state({
    width: 3.5 as number | undefined,
    height: 4.5 as number | undefined,
    headMin: 3.2 as number | undefined,
    headMax: 3.6 as number | undefined,
    background: '',
  });
  const custom = $derived(customDocument(customInput));
  // A document that is not listed uses the numbers the visitor typed; 3.5 cm × 4.5 cm is only a start.
  const doc = $derived<Doc | null>(docId === 'custom' ? custom : (documentById(docId) ?? null));
  const px = $derived(doc ? photoPixels(doc, DPI) : { width: 0, height: 0 });
  const aspect = $derived(doc ? aspectOf(doc) : 1);
  const sheeted = $derived(output === 'sheet');
  const sheet = $derived(SHEETS.find((s) => s.id === sheetId)!);
  const gapMm = $derived(gap ?? 0);
  const photo = $derived(doc ? { width: doc.width, height: doc.height } : { width: 0, height: 0 });
  // The sheet is drawn from the decoded picture, which is only needed for the print sheet.
  const decoded = decodedPicture(
    () => (sheeted ? file : undefined),
    () => (error = 'This picture could not be read.'),
  );
  const picture = $derived(decoded.current);

  const plan = $derived(sheetPlan(sheet, photo, gapMm, sheetDpi));
  const art = $derived({ picture, rect, photo, gapMm, cutLines });
  const lines = $derived(
    rect && showGuides && doc
      ? guides(rect, doc, Math.min(crown / 100, maxCrownFraction(doc)))
      : null,
  );

  function clear() {
    if (result) urls.revoke(result.url);
    result = null;
    error = '';
  }

  $effect(() => {
    void file;
    untrack(() => {
      rect = null;
      clear();
    });
  });

  // A finished result no longer matches once the output or the sheet settings change.
  $effect(() => {
    void [output, sheetId, sheetDpi, gapMm, cutLines];
    untrack(clear);
  });

  // Choosing another document reshapes the box and drops the old result.
  $effect(() => {
    const a = aspect;
    untrack(() => {
      clear();
      if (rect && bounds.w) rect = centeredRect(bounds, 0.8, a);
    });
  });

  /** Shared by both outputs: tracks the run, keeps `working` honest and reports a failure. */
  async function run(
    make: () => Promise<Blob>,
    size: Omit<Result, 'blob' | 'url'>,
    fail: [string, string],
  ) {
    clear();
    working = true;
    track(tool.slug, 'run', { files: 1, output: format });
    try {
      const blob = await make();
      result = { blob, url: urls.add(blob), ...size };
      track(tool.slug, 'done', { files: 1, output: format });
    } catch (err) {
      error = (err as Error).message || fail[0];
      track(tool.slug, 'error', { reason: fail[1] });
    } finally {
      working = false;
    }
  }

  function create() {
    if (!file || !rect || !doc) return;
    const f = file;
    const b = cropBox(rect, bounds);
    return run(
      async () =>
        (
          await image(f)
            .crop(b.x, b.y, b.w, b.h)
            .resize(px.width, px.height, 'stretch')
            .encode(format, { quality, dpi: DPI })
        ).blob,
      { ...px, dpi: DPI, sheet: false },
      ['This picture could not be read.', 'decode-failed'],
    );
  }

  function createSheet() {
    const { grid: g, px: sp, tooBig } = plan;
    if (!file || !picture || !rect || !g || !sp || tooBig) return;
    const { w, h } = sp;
    return run(
      () => sheetBlob(g, { w, h }, sheetDpi, art, format, quality),
      { width: w, height: h, dpi: sheetDpi, sheet: true },
      ['The sheet could not be made.', 'encoder-failed'],
    );
  }

  function save() {
    if (!result || !file || !doc) return;
    const ext = format === 'png' ? 'png' : 'jpg';
    const name = result.sheet
      ? `${splitName(file.name).stem}-${documentFileName(doc)}-sheet-${sheetId}`
      : `${splitName(file.name).stem}-${documentFileName(doc)}`;
    download(`${name}.${ext}`, result.blob);
    track(tool.slug, 'download');
  }
</script>

<div class="stack">
  <OneFile bind:file title="Files" />

  <Box title="Settings">
    <Segmented
      label="Output"
      bind:value={output}
      options={[
        { value: 'single', label: 'Single photo' },
        { value: 'sheet', label: 'Print sheet' },
      ]}
    />
    <DocumentSettings
      bind:docId
      bind:customInput
      bind:showGuides
      bind:crown
      {doc}
      {px}
      dpi={DPI}
      usable={!!custom}
    />
    <RequestLink />
    {#if sheeted}
      <SheetOptions bind:sheetId bind:sheetDpi bind:gap bind:cutLines {plan} {gapMm} />
    {/if}
    <SaveAs bind:value={format} only={['jpeg', 'png']} print />
    {#if format !== 'png'}<Slider label="Quality" bind:value={quality} min={1} max={100} />{/if}
    <Notice kind="info">
      This tool handles size only. Whether a photo is accepted also depends on lighting, background
      and expression, which are not changed here.
    </Notice>
  </Box>

  {#if url.current}
    <Box title="Crop">
      <p class="tiny muted">
        Move the box so the head sits between the lines. It keeps the shape of the printed photo.
      </p>
      <CropBox
        src={url.current}
        bind:rect
        bind:bounds
        {aspect}
        label="Crop box for the {doc?.label} photo"
        {lines}
      />
      {#if sheeted && plan.grid?.count}
        <SheetPreview grid={plan.grid} sheetPx={plan.px} {sheetDpi} {art} />
      {/if}
      <div class="actions">
        {#if sheeted}
          <Button
            variant="primary"
            disabled={!rect || !picture || !plan.grid?.count || working || plan.tooBig}
            onclick={createSheet}
          >
            {working ? 'Creating…' : 'Create sheet'}
          </Button>
        {:else}
          <Button variant="primary" disabled={!rect || !doc || working} onclick={create}>
            {working ? 'Creating…' : 'Create photo'}
          </Button>
        {/if}
      </div>
    </Box>
  {/if}

  <ErrorNotice {error} />

  {#if result}
    <ResultBox {result} label={doc?.label} width={doc?.width} height={doc?.height} onsave={save} />
  {/if}
</div>

<style>
  p {
    margin: 0 0 12px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
  }
</style>
