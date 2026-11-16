<script lang="ts">
  // Intake for tools that work on a single file and show their own result: drop, choose, paste, or the
  // file handed over from the home page. Shows the file with a Remove button once there is one.
  import { onMount } from 'svelte';
  import { track } from '#lib/analytics';
  import { getTool } from '#lib/context';
  import { formatBytes, kindFromName, matchesAccepts, sniff } from '#lib/core';
  import { filesFromPaste } from '#lib/core/intake';
  import { takeHandoff } from '#lib/handoff';
  import Box from './Box.svelte';
  import Button from './Button.svelte';
  import DropZone from './DropZone.svelte';
  import Notice from './Notice.svelte';
  import { trash } from './icons';

  let {
    file = $bindable(),
    title = 'File',
    onadd,
  }: { file: File | undefined; title?: string; onadd?: (file: File) => void } = $props();

  const tool = getTool();
  let skipped = $state('');

  async function add(files: File[]) {
    skipped = '';
    for (const f of files) {
      const kind = (await sniff(f)) ?? kindFromName(f.name);
      if (kind && matchesAccepts(kind, tool.accepts)) {
        file = f;
        track(tool.slug, 'upload');
        onadd?.(f);
        return;
      }
    }
    if (files.length) skipped = files[0].name;
  }

  function paste(e: ClipboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && /^(input|textarea|select)$/i.test(t.tagName)) return;
    const files = filesFromPaste(e);
    if (files.length) {
      e.preventDefault();
      void add(files);
    }
  }

  onMount(() => {
    const handed = takeHandoff();
    if (handed.length) void add(handed);
  });
</script>

<svelte:window onpaste={paste} />

<Box {title}>
  {#if skipped}
    <Notice kind="warn">{skipped} is not a file this tool can read.</Notice>
  {/if}
  {#if !file}
    <DropZone accepts={tool.accepts} batch={false} onfiles={add} />
  {:else}
    <div class="row">
      <strong class="name" title={file.name}>{file.name}</strong>
      <span class="mono tiny muted">{formatBytes(file.size)}</span>
      <Button icon={trash} onclick={() => (file = undefined)}>Remove</Button>
    </div>
  {/if}
</Box>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
</style>
