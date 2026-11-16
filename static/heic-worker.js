// Classic worker that runs the unmodified libheif build (LGPL-3.0; keep it unmodified and separate).
// It is a separate file on purpose: the library stays replaceable and is never merged into our bundle.
let lib;

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.cmd === 'init') {
      importScripts(m.script);
      lib = self.libheif({ locateFile: () => m.wasm });
      // Wait until the WASM is ready; the factory result must not be awaited directly.
      while (!lib.HeifDecoder) await new Promise((r) => setTimeout(r, 10));
      self.postMessage({ id: m.id, ok: true });
    } else if (m.cmd === 'decode') {
      const images = new lib.HeifDecoder().decode(new Uint8Array(m.buffer));
      if (!images.length) throw new Error('No image found in this file.');
      const image = images[0];
      const width = image.get_width();
      const height = image.get_height();
      const target = { data: new Uint8ClampedArray(width * height * 4), width, height };
      const out = await new Promise((resolve, reject) =>
        image.display(target, (d) => (d ? resolve(d) : reject(new Error('Decoding failed.')))),
      );
      self.postMessage({ id: m.id, ok: true, width, height, buffer: out.data.buffer }, [
        out.data.buffer,
      ]);
    }
  } catch (err) {
    self.postMessage({
      id: m.id,
      ok: false,
      message: String(err && err.message ? err.message : err),
    });
  }
};
