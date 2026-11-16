<script lang="ts">
  import { copyText } from '#lib/clipboard';
  import type { Snippet } from 'svelte';
  import { getTool } from '#lib/context';
  import { track, type RawProps } from '#lib/analytics';
  import { acceptAttr, zip } from '#lib/core';
  import { download } from '#lib/core/intake';
  import type { RunContext, RunResult } from '#lib/types';
  import { ui } from '#lib/ui.svelte';
  import AskDialog from './AskDialog.svelte';
  import BatchDrop from './BatchDrop.svelte';
  import BatchPreview from './BatchPreview.svelte';
  import BatchRow from './BatchRow.svelte';
  import { createPrompts } from './prompts.svelte';
  import Box from './Box.svelte';
  import Button from './Button.svelte';
  import FilePicker from './FilePicker.svelte';
  import FilesActions from './FilesActions.svelte';
  import SkippedNotice from './SkippedNotice.svelte';
  import { createRunner } from './batchRun.svelte';
  import { createIntake } from './intake.svelte';
  import { saveBlob } from './download';
  import ResultBar from './ResultBar.svelte';
  import { countLabel, displayable, type FileResult, type Item } from './batch';
  import { urlBag } from '#lib/objectUrl.svelte';

  let {
    verb,
    noun = 'image',
    suffix = '',
    track: trackProps = {},
    auto = false,
    ready = true,
    files = $bindable([]),
    pick = $bindable(),
    run,
    settings,
    preview,
    item: itemView,
    actions,
  }: {
    /** Verb for the primary button: "Compress", "Strip metadata from". */
    verb: string;
    /** What the files are called in the button label. */
    noun?: string;
    /** Added to output names: `holiday` + `compressed` → `holiday-compressed.jpg`. */
    suffix?: string;
    /** Allowed analytics hints (output format, quality, preset); everything else is dropped. */
    track?: RawProps;
    /** Run as soon as files are added (read-only inspector tools). */
    auto?: boolean;
    /** False while the settings are invalid; disables the primary button. */
    ready?: boolean;
    /** The files in the list, in order; for tools whose settings depend on them. */
    files?: File[];
    /** Set this to a file to select it in the list; it is cleared again. */
    pick?: File | undefined;
    run: (file: File, ctx: RunContext) => Promise<RunResult> | RunResult;
    settings?: Snippet;
    /** `result` is the first file the run produced, of any type (a video, for example). */
    preview?: Snippet<[{ url: string; file: File; result?: { url: string; blob: Blob } }]>;
    /** Renders `{ data }` results of an inspector tool. */
    item?: Snippet<[{ data: unknown; file: File }]>;
    /** Extra buttons in the Result box, for tools that export all results as one file. */
    actions?: Snippet;
  } = $props();

  const tool = getTool();
  const accept = acceptAttr(tool.accepts);

  let items = $state<Item[]>([]);
  let selected = $state<number | null>(null);
  const prompts = createPrompts();
  const { ask, confirm } = prompts;
  let picker: FilePicker;
  let nextId = 1;

  $effect(() => {
    files = items.map((i) => i.file);
  });
  $effect(() => {
    if (!pick) return;
    const it = items.find((i) => i.file === pick);
    if (it) selected = it.id;
    pick = undefined;
  });

  const fileResults = $derived(
    items.flatMap((i) => i.results.filter((r): r is FileResult => r.type === 'file')),
  );
  const current = $derived(items.find((i) => i.id === selected) ?? items[0]);
  const doneCount = $derived(items.filter((i) => i.status === 'done').length);
  const count = $derived(items.length);

  const urls = urlBag();
  const runner = createRunner({
    slug: tool.slug,
    items: () => items,
    run: () => run,
    suffix: () => suffix,
    trackProps: () => trackProps,
    ctx: { ask, confirm },
    urls,
  });
  const runAll = runner.runAll;

  const intake = createIntake<Item>({
    slug: tool.slug,
    accepts: tool.accepts,
    batch: tool.batch,
    make: (file, kind) => ({
      id: nextId++,
      file,
      kind,
      thumb: displayable(kind) ? urls.add(file) : '',
      status: 'queued',
      progress: 0,
      raw: [],
      results: [],
    }),
    onAdd(accepted) {
      const room = tool.batch ? accepted : accepted.slice(0, 1);
      if (!tool.batch) {
        for (const old of items) dispose(old);
        items = [];
      }
      items = [...items, ...room];
      selected ??= room[0].id;
      if (auto) void runAll();
    },
  });

  function dispose(it: Item) {
    urls.revoke(it.thumb);
    for (const r of it.results) if (r.type === 'file') urls.revoke(r.url);
  }

  function remove(id: number) {
    const it = items.find((i) => i.id === id);
    if (it) dispose(it);
    items = items.filter((i) => i.id !== id);
    if (selected === id) selected = items[0]?.id ?? null;
  }

  function clearAll() {
    for (const it of items) dispose(it);
    items = [];
    selected = null;
    runner.reset();
  }

  function keepOriginal(it: Item) {
    const r = it.results.find((x): x is FileResult => x.type === 'file');
    if (!r) return;
    urls.revoke(r.url);
    const ext = it.file.name.split('.').pop() ?? 'bin';
    const idx = it.results.indexOf(r);
    it.results[idx] = {
      type: 'file',
      blob: it.file,
      name: r.name.replace(/\.[^.]+$/, '') + '.' + ext,
      note: 'Original kept.',
      url: urls.add(it.file),
    };
  }

  const ondownloadtext = (name: string, text: string) =>
    download(name, new Blob([text], { type: 'text/plain' }));

  function saveOne(r: FileResult) {
    saveBlob(tool.slug, r.name, r.blob);
  }

  async function saveAll() {
    if (fileResults.length === 1) return saveOne(fileResults[0]);
    const blob = await zip(fileResults.map((r) => ({ name: r.name, blob: r.blob })));
    download(`img-tools-${tool.slug}.zip`, blob);
    track(tool.slug, 'download-all', { files: fileResults.length });
  }

  const copy = (text: string) => copyText(tool.slug, text);

  const label = $derived(countLabel(verb, noun, count));
  const hasSettings = $derived(Boolean(settings));
  const showResult = $derived(runner.ranOnce && !runner.running && doneCount > 0);
</script>

<svelte:window onpaste={intake.onPaste} />

<div class="stack">
  <Box title="Files">
    <SkippedNotice skipped={intake.skipped} />
    {#if !items.length}
      <BatchDrop
        batch={tool.batch}
        accepts={tool.accepts}
        onpick={() => picker.open()}
        ondrop={intake.onDrop}
      />
    {:else}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <ul
        class="tray"
        aria-label="Files"
        ondragover={(e) => e.preventDefault()}
        ondrop={intake.onDrop}
      >
        {#each items as it (it.id)}
          <BatchRow
            {it}
            selected={it.id === current?.id}
            onselect={() => (selected = it.id)}
            onremove={() => remove(it.id)}
          />
        {/each}
      </ul>
      <FilesActions canAdd={tool.batch} onadd={() => picker.open()} onclear={clearAll} />
    {/if}
    <FilePicker bind:this={picker} {accept} multiple={tool.batch} onfiles={intake.addFiles} />
  </Box>

  <div class="work" class:single={!hasSettings}>
    {#if hasSettings}
      <Box title="Settings">
        {@render settings?.()}
        {#if !auto}
          {#if runner.running}
            <Button onclick={runner.cancel}>Cancel</Button>
          {:else}
            <Button variant="primary" disabled={!count || !ready} onclick={runAll}>{label}</Button>
          {/if}
        {/if}
      </Box>
    {/if}
    <BatchPreview {current} {preview} />
  </div>

  {#if !hasSettings && !auto}
    <div class="row">
      {#if runner.running}<Button onclick={runner.cancel}>Cancel</Button>{:else}<Button
          variant="primary"
          disabled={!count || !ready}
          onclick={runAll}>{label}</Button
        >{/if}
    </div>
  {/if}

  {#if showResult}
    <ResultBar
      summary={runner.summary}
      {items}
      fileCount={fileResults.length}
      {auto}
      compress={tool.category === 'compress'}
      {itemView}
      {actions}
      onrun={runAll}
      onsave={saveAll}
      onsaveone={saveOne}
      oncopy={copy}
      {ondownloadtext}
      onkeep={keepOriginal}
    />
  {/if}
</div>

{#if prompts.asking}
  {#key prompts.asking}
    <AskDialog
      label={prompts.asking.label}
      secret={prompts.asking.secret}
      confirm={prompts.asking.confirm}
      onsubmit={prompts.submit}
      oncancel={prompts.cancel}
    />
  {/key}
{/if}

<div class="sr-only" aria-live="polite">{runner.announce}</div>

<style>
  .tray {
    list-style: none;
    padding: 0;
    margin: 0 0 12px;
    display: grid;
    gap: 8px;
  }
  .work {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr);
  }
  @media (min-width: 1200px) {
    .work:not(.single) {
      grid-template-columns: 360px minmax(0, 1fr);
    }
  }
</style>
