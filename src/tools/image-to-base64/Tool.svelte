<script lang="ts">
  import { formats, formatBytes, sniff } from '#lib/core';
  import BatchTool from '#lib/ui/BatchTool.svelte';
  import { cssUrl, dataUri, growth, imgTag, toBase64 } from './logic';

  async function encode(file: File) {
    const kind = await sniff(file);
    const mime = kind && kind !== 'image' && kind in formats ? formats[kind].mime : file.type;
    const uri = dataUri(
      mime || 'application/octet-stream',
      toBase64(new Uint8Array(await file.arrayBuffer())),
    );
    const bytes = new TextEncoder().encode(uri).length;
    const note = `${formatBytes(file.size)} becomes ${formatBytes(bytes)} as text (${growth(file.size, bytes)}).`;
    return [
      { text: uri, label: 'data URI', filename: 'data-uri', note },
      { text: imgTag(uri), label: 'HTML tag', filename: 'img-tag' },
      { text: cssUrl(uri), label: 'CSS url()', filename: 'css-url' },
    ];
  }
</script>

<BatchTool verb="Encode" auto run={encode} />
