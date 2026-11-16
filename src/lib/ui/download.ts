import { track } from '#lib/analytics';
import { download } from '#lib/core/intake';

/** Saves a blob and records the single-file download event. */
export function saveBlob(slug: string, name: string, blob: Blob): void {
  download(name, blob);
  track(slug, 'download');
}
