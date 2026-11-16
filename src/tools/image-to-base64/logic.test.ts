import { describe, expect, it } from 'vitest';
import { cssUrl, dataUri, growth, imgTag, toBase64 } from './logic';

describe('image-to-base64', () => {
  it('encodes bytes the standard way', () => {
    expect(toBase64(new Uint8Array([]))).toBe('');
    expect(toBase64(new TextEncoder().encode('M'))).toBe('TQ==');
    expect(toBase64(new TextEncoder().encode('Ma'))).toBe('TWE=');
    expect(toBase64(new TextEncoder().encode('Man'))).toBe('TWFu');
  });

  it('handles data larger than one chunk', () => {
    const bytes = new Uint8Array(100_000).map((_, i) => i % 256);
    const decoded = Uint8Array.from(atob(toBase64(bytes)), (c) => c.charCodeAt(0));
    expect(decoded).toEqual(bytes);
  });

  it('builds the three snippets', () => {
    const uri = dataUri('image/png', 'AAAA');
    expect(uri).toBe('data:image/png;base64,AAAA');
    expect(imgTag(uri)).toBe('<img src="data:image/png;base64,AAAA" alt="">');
    expect(cssUrl(uri)).toBe('url("data:image/png;base64,AAAA")');
  });

  it('reports the growth', () => {
    expect(growth(300, 400)).toBe('+33%');
    expect(growth(0, 10)).toBe('');
  });
});
