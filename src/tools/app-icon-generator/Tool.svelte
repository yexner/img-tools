<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { splitName, zip } from '#lib/core';
  import { loadPicture } from '#lib/core/bitmap';
  import { hasAlpha, renderIcon, squareOf } from '#lib/core/icon-render';
  import { download } from '#lib/core/intake';
  import { centeredRect, type RelRect } from '#lib/core/rect';
  import { androidLauncher, iosClassic, iosSingle, playStore } from '#lib/data/icon-sizes';
  import CropStage from '#lib/families/CropStage.svelte';
  import Box from '#lib/ui/Box.svelte';
  import ResultBox from '#lib/ui/ResultBox.svelte';
  import Button from '#lib/ui/Button.svelte';
  import ColorInput from '#lib/ui/ColorInput.svelte';
  import ErrorNotice from '#lib/ui/ErrorNotice.svelte';
  import Notice from '#lib/ui/Notice.svelte';
  import OneFile from '#lib/ui/OneFile.svelte';
  import { classicContents, layout, singleContents } from './logic';

  const tool = getTool();
  let file = $state<File>();
  let region = $state<RelRect | null>(null);
  let background = $state('#ffffff');
  let colorOk = $state(true);
  let transparent = $state(false);
  let working = $state(false);
  let error = $state('');
  let result = $state<{ zip: Blob; files: string[] } | null>(null);

  // A new picture starts over, and is checked for transparent areas.
  $effect(() => {
    const f = file;
    untrack(() => {
      region = null;
      result = null;
      error = '';
      transparent = false;
    });
    if (!f) return;
    let alive = true;
    void loadPicture(f, 1024).then((p) => {
      if (alive) transparent = hasAlpha(p, { x: 0, y: 0, w: p.width, h: p.height });
      p.close();
    });
    return () => {
      alive = false;
    };
  });

  async function create() {
    if (!file || !colorOk) return;
    working = true;
    error = '';
    result = null;
    track(tool.slug, 'run', { files: 1 });
    try {
      const picture = await loadPicture(file, 2048);
      const part = squareOf(picture, region);
      const entries: { name: string; blob: Blob }[] = [];
      const cache = new Map<string, Blob>();
      const icon = async (px: number, fill?: string) => {
        const key = `${px}:${fill ?? ''}`;
        if (!cache.has(key)) cache.set(key, await renderIcon(picture, part, px, fill));
        return cache.get(key)!;
      };
      for (const f of layout()) {
        if (f.px === null) {
          const text = f.path.startsWith('ios/')
            ? singleContents(`icon-${iosSingle.px}.png`)
            : classicContents();
          entries.push({ name: f.path, blob: new Blob([text], { type: 'application/json' }) });
        } else {
          // iOS icons must be opaque; Android keeps transparency.
          entries.push({
            name: f.path,
            blob: await icon(f.px, f.path.startsWith('ios') ? background : undefined),
          });
        }
      }
      picture.close();
      result = { zip: await zip(entries), files: entries.map((e) => e.name) };
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
    download(`${splitName(file.name).stem}-app-icons.zip`, result.zip);
    track(tool.slug, 'download');
  }

  onDestroy(() => (result = null));

  const sources = [
    { label: 'iOS, single 1024 pixel icon', href: iosSingle.source, date: iosSingle.verified },
    { label: 'iOS, classic sizes', href: iosClassic.source, date: iosClassic.verified },
    {
      label: 'Android launcher icons',
      href: androidLauncher.source,
      date: androidLauncher.verified,
    },
    { label: 'Google Play icon', href: playStore.source, date: playStore.verified },
  ];
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
    {#if transparent}
      <Notice kind="warn">
        <span role="alert">
          This picture has transparent areas. iOS app icons must be opaque, so those areas are
          filled with the color below. The Android icons keep their transparency.
        </span>
      </Notice>
    {/if}
    <ColorInput
      label="Background fill color for iOS"
      bind:value={background}
      bind:valid={colorOk}
    />
    <Button variant="primary" disabled={!file || !colorOk || working} onclick={create}>
      {working ? 'Creating…' : 'Create icons'}
    </Button>
  </Box>

  <ErrorNotice {error} />

  {#if result}
    <ResultBox
      summary="{result.files.length} files are ready."
      downloadLabel="Download ZIP"
      onDownload={save}
    >
      <ul class="files mono tiny">
        {#each result.files as f (f)}<li>{f}</li>{/each}
      </ul>
    </ResultBox>
  {/if}

  <Box title="Where the sizes come from">
    <ul class="sources">
      {#each sources as s (s.href)}
        <li>
          <a href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a>
          <span class="tiny muted">checked {s.date}</span>
        </li>
      {/each}
    </ul>
  </Box>
</div>

<style>
  .files {
    list-style: none;
    padding: 0;
    margin: 0;
    columns: 2 18rem;
    overflow-wrap: anywhere;
  }
  .sources {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 6px;
  }
  p {
    margin: 0 0 8px;
  }
</style>
