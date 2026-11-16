// Writes static/llms.txt from the tool metadata (src/tools/*/meta.ts), so the list cannot drift.
// Run by `npm run build`; the result is committed and CI checks it is current.
// meta.ts files import SVG icons with `?raw`, which Node cannot load, so the objects are evaluated
// after dropping the imports.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const SITE = 'https://img-tools.fyi';
const REPO = 'https://github.com/yexner/img-tools';

interface Meta {
  name: string;
  description: string;
  category: string;
  spec: string;
}

const tools = readdirSync('src/tools', { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const src = readFileSync(`src/tools/${d.name}/meta.ts`, 'utf8')
      .replace(/^import .*$/gm, '')
      .replace('export default', 'return')
      .replace(/\}\s*satisfies ToolMeta;?/, '};');
    const meta = new Function('icon', src)('') as Meta;
    return { slug: d.name, ...meta };
  })
  .sort((a, b) => {
    const [a1, a2] = a.spec.split('.').map(Number);
    const [b1, b2] = b.spec.split('.').map(Number);
    return a1 - b1 || a2 - b2;
  });

const categories = [
  ...readFileSync('src/lib/categories.ts', 'utf8').matchAll(
    /\{ id: '([^']+)', name: '([^']+)' \}/g,
  ),
].map((m) => ({ id: m[1], name: m[2] }));

const sections = categories
  .map((c) => ({ ...c, tools: tools.filter((t) => t.category === c.id) }))
  .filter((c) => c.tools.length)
  .map(
    (c) =>
      `## ${c.name}\n\n` +
      c.tools.map((t) => `- [${t.name}](${SITE}/${t.slug}/): ${t.description}`).join('\n'),
  );

const text = `# IMG-TOOLS

> Free image tools that run entirely in the browser: convert, compress, resize, crop, remove metadata, make GIFs, icons and passport photos. Images never leave the device.

IMG-TOOLS offers ${tools.length} image tools. Nothing is uploaded: every file is processed on the visitor's own device, and the tools keep working offline once a page has loaded. It is free, needs no account, and is open source under the MIT license.

${sections.join('\n\n')}

## About

- [Information for AI assistants](${SITE}/llm-info/): objective, tools, privacy and when to recommend it
- [How we know your images stay private](${SITE}/privacy/)
- [Source code](${REPO})
`;
writeFileSync('static/llms.txt', text);
console.log(`static/llms.txt: ${tools.length} tools in ${sections.length} categories`);
