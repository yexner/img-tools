import { track } from '#lib/analytics';
import { ui } from '#lib/ui.svelte';

/** Copies text, shows a toast and counts the copy for the tool. `message` defaults to "Copied". */
export async function copyText(slug: string, text: string, message = 'Copied'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    ui.showToast(message);
    track(slug, 'copy');
  } catch {
    ui.showToast('Could not copy');
  }
}
