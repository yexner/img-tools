/** Download and compile a WASM file (inside a worker). */
export async function compileWasm(url: string): Promise<WebAssembly.Module> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`);
  return WebAssembly.compile(await response.arrayBuffer());
}
