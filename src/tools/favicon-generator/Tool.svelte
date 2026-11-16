<script lang="ts">
  import { untrack } from 'svelte';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { sniff, splitName, zip } from '#lib/core';
  import { loadPicture } from '#lib/core/bitmap';
  import { buildIco } from '#lib/core/ico';
  import { renderIcon, squareOf } from '#lib/core/icon-render';
  import { download } from '#lib/core/intake';
  import { centeredRect, type RelRect } from '#lib/core/rect';
  import CropStage from '#lib/families/CropStage.svelte';
  import Box from '#lib/ui/Box.svelte';
  import ResultBox from '#lib/ui/ResultBox.svelte';
  import Button from '#lib/ui/Button.svelte';
  import ColorInput from '#lib/ui/ColorInput.svelte';
  import CopyField from '#lib/ui/CopyField.svelte';
  import ErrorNotice from '#lib/ui/ErrorNotice.svelte';
  import OneFile from '#lib/ui/OneFile.svelte';
  import { cropSvg, headSnippet, HEX, ICO_SIZES, manifest, PNG_ICONS } from './logic';
  import { urlBag } from '#lib/objectUrl.svelte';

  const tool = getTool();
  let file = $state<File>();
  let region = $state<RelRect | null>(null);
  let name = $state('My site');
  let shortName = $state('Site');
  let themeColor = $state('#3355cc');
  let colorOk = $state(true);
  let working = $state(false);
  let error = $state('');
  let result = $state<{
    zip: Blob;
    previews: { name: string; url: string }[];
    head: string;
  } | null>(null);

  const urls = urlBag();

  function clear() {
    result?.previews.forEach((p) => urls.revoke(p.url));
    result = null;
    error = '';
  }

  // A new picture starts over.
  $effect(() => {
    void file;
    untrack(() => {
      region = null;
      clear();
    });
  });

  const valid = $derived(
    !!file && name.trim() !== '' && shortName.trim() !== '' && colorOk && HEX.test(themeColor),
  );

  async function create() {
    if (!file || !valid) return;
    clear();
    working = true;
    track(tool.slug, 'run', { files: 1, input: (await sniff(file)) ?? undefined });
    try {
      const isSvg = (await sniff(file)) === 'svg';
      const picture = await loadPicture(file, isSvg ? 1024 : undefined);
      const part = squareOf(picture, region);
      const site = { name: name.trim(), shortName: shortName.trim(), themeColor };
      const entries: { name: string; blob: Blob }[] = [];
      const previews: { name: string; url: string }[] = [];
      const pngs = new Map<number, Blob>();
      for (const size of new Set([...ICO_SIZES, ...PNG_ICONS.map((p) => p.size)])) {
        pngs.set(size, await renderIcon(picture, part, size));
      }
      const ico = buildIco(
        await Promise.all(
          ICO_SIZES.map(async (size) => ({
            size,
            png: new Uint8Array(await pngs.get(size)!.arrayBuffer()),
          })),
        ),
      );
      entries.push({
        name: 'favicon.ico',
        blob: new Blob([ico as BlobPart], { type: 'image/x-icon' }),
      });
      for (const p of PNG_ICONS) {
        // The Apple touch icon is put on white, because iPhones draw black behind transparency.
        const blob =
          'opaque' in p ? await renderIcon(picture, part, p.size, '#ffffff') : pngs.get(p.size)!;
        entries.push({ name: p.name, blob });
        previews.push({ name: `${p.name} (${p.size} px)`, url: urls.add(blob) });
      }
      if (isSvg) {
        const text = await file.text();
        entries.push({
          name: 'favicon.svg',
          blob: new Blob([region ? cropSvg(text, region) : text], { type: 'image/svg+xml' }),
        });
      }
      entries.push({
        name: 'site.webmanifest',
        blob: new Blob([manifest(site)], { type: 'application/manifest+json' }),
      });
      picture.close();
      result = { zip: await zip(entries), previews, head: headSnippet(site, isSvg) };
      track(tool.slug, 'done', { files: 1 });
    } catch (err) {
      error = (err as Error).message || 'This picture could not be read.';
      track(tool.slug, 'error', { reason: 'decode-failed' });
    } finally {
      working = false;
    }
  }

  function save() {
    if (!result || !file) return;
    download(`${splitName(file.name).stem}-favicons.zip`, result.zip);
    track(tool.slug, 'download');
  }
</script>

<div class="stack">
  <OneFile bind:file title="Files" />

  {#if file}
    <Box title="Square crop">
      <p class="tiny muted">
        Move the box over the part of the picture to use. It always stays square.
      </p>
      {#key file}
        <CropStage
          {file}
          {region}
          aspect={1}
          shape="rect"
          fallback={(b) => centeredRect(b, 1, 1)}
          onedit={(r) => (region = r)}
        />
      {/key}
    </Box>
  {/if}

  <Box title="Settings">
    <div class="field">
      <label for="site-name">Site name</label>
      <input id="site-name" type="text" bind:value={name} maxlength="60" autocomplete="off" />
    </div>
    <div class="field">
      <label for="short-name">Short name</label>
      <input id="short-name" type="text" bind:value={shortName} maxlength="12" autocomplete="off" />
    </div>
    <ColorInput label="Theme color" bind:value={themeColor} bind:valid={colorOk} />
    <Button variant="primary" disabled={!valid || working} onclick={create}>
      {working ? 'Creating…' : 'Create icons'}
    </Button>
  </Box>

  <ErrorNotice {error} />

  {#if result}
    <ResultBox summary="Your icons are ready." downloadLabel="Download ZIP" onDownload={save}>
      <ul class="previews">
        {#each result.previews as p (p.name)}
          <li><img src={p.url} alt={p.name} /><span class="mono tiny">{p.name}</span></li>
        {/each}
      </ul>
      <CopyField
        label="HTML for the head of your pages"
        value={result.head}
        filename="favicon-head.html"
        multiline
      />
    </ResultBox>
  {/if}
</div>

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
    max-width: 22rem;
  }
  .previews {
    list-style: none;
    padding: 0;
    margin: 0 0 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-end;
  }
  .previews li {
    display: grid;
    gap: 4px;
    justify-items: center;
  }
  .previews img {
    max-width: 128px;
    max-height: 128px;
    border-radius: 6px;
    background: conic-gradient(
        var(--surface-sunk) 25%,
        var(--surface) 0 50%,
        var(--surface-sunk) 0 75%,
        var(--surface) 0
      )
      0 0 / 12px 12px;
    box-shadow: 0 0 0 1px var(--line);
  }
  p {
    margin: 0 0 8px;
  }
</style>
