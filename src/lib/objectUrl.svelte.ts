// Blob URLs that clean up after themselves. Every URL made here is revoked when it is replaced and
// when the component is destroyed, and never more than once. Call both from a component's setup.
// SSR: `$effect` does not run there; `onDestroy` does, but the bag is empty then (add() only runs in
// the browser), so nothing touches `URL` on the server.
import { onDestroy } from 'svelte';

/** A URL for the current blob; `''` while there is none. Re-made when the source changes. */
export function objectUrl(source: () => Blob | null | undefined): { readonly current: string } {
  let url = $state('');
  $effect(() => {
    const blob = source();
    if (!blob) return void (url = '');
    const u = URL.createObjectURL(blob);
    url = u;
    return () => URL.revokeObjectURL(u);
  });
  return {
    get current() {
      return url;
    },
  };
}

/** Owns URLs made on demand (results, frames, thumbnails). `revoke` ignores URLs it does not hold. */
export function urlBag() {
  const live = new Set<string>();
  const revoke = (url: string) => {
    if (url && live.delete(url)) URL.revokeObjectURL(url);
  };
  const revokeAll = () => {
    for (const u of live) URL.revokeObjectURL(u);
    live.clear();
  };
  onDestroy(revokeAll);
  return {
    add(blob: Blob): string {
      const u = URL.createObjectURL(blob);
      live.add(u);
      return u;
    },
    revoke,
    revokeAll,
  };
}
