// Pure string work for Image to Base64, kept apart from the page so it can be unit-tested.

/** Standard Base64 of some bytes. */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  // Chunked, because spreading a large array into one call overflows the call stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export const dataUri = (mime: string, base64: string) => `data:${mime};base64,${base64}`;

export const imgTag = (uri: string) => `<img src="${uri}" alt="">`;

export const cssUrl = (uri: string) => `url("${uri}")`;

/** Base64 turns every 3 bytes into 4 characters, so the text is about a third longer. */
export function growth(originalBytes: number, textBytes: number): string {
  if (!originalBytes) return '';
  const pct = Math.round(((textBytes - originalBytes) / originalBytes) * 100);
  return `+${pct}%`;
}
