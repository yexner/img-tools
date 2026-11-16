import { zipSync, type Zippable } from 'fflate';

/** Build a ZIP from already-unique, already-safe names. Stored (level 0): images are compressed already. */
export function zip(entries: { name: string; blob: Blob }[]): Promise<Blob> {
  return (async () => {
    const files: Zippable = {};
    for (const e of entries)
      files[e.name] = [new Uint8Array(await e.blob.arrayBuffer()), { level: 0 }];
    return new Blob([zipSync(files) as BlobPart], { type: 'application/zip' });
  })();
}
