import { onDestroy, untrack } from 'svelte';
import { loadPicture } from '#lib/core/bitmap';

/** The decoded picture of `source()`, closed when the file changes or the tool goes away. */
export function decodedPicture(source: () => File | undefined, onError: () => void) {
  let picture = $state<ImageBitmap>();
  $effect(() => {
    const f = source();
    untrack(() => {
      picture?.close();
      picture = undefined;
    });
    if (!f) return;
    let alive = true;
    loadPicture(f).then(
      (p) => (alive ? (picture = p) : p.close()),
      () => alive && onError(),
    );
    return () => (alive = false);
  });
  onDestroy(() => picture?.close());
  return {
    get current() {
      return picture;
    },
  };
}
