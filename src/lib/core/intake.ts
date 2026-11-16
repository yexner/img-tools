/** Files from a drop, including whole folders (where the browser supports it). */
export async function filesFromDrop(dt: DataTransfer, folders: boolean): Promise<File[]> {
  const entries = folders
    ? [...dt.items]
        .filter((i) => i.kind === 'file')
        .map(
          (i) =>
            (
              i as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }
            ).webkitGetAsEntry?.() ?? null,
        )
    : [];
  if (!folders || entries.some((e) => e === null)) return [...dt.files];
  const out: File[] = [];
  for (const entry of entries) if (entry) await walk(entry, out);
  return out;
}

async function walk(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((ok, no) => (entry as FileSystemFileEntry).file(ok, no));
    out.push(file);
    return;
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((ok, no) => reader.readEntries(ok, no));
    if (!batch.length) return;
    for (const child of batch) await walk(child, out);
  }
}

export function filesFromPaste(e: ClipboardEvent): File[] {
  return [...(e.clipboardData?.files ?? [])];
}

export function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
