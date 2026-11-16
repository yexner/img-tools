import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * pdf.js reads its character maps, standard fonts, color profiles and WASM decoders from a folder by
 * file name, so they are copied under fixed names (`pdfjs/<folder>/<file>`) instead of being hashed.
 */
function pdfjsData(): Plugin {
  const root = 'node_modules/pdfjs-dist';
  return {
    name: 'pdfjs-data',
    apply: 'build',
    generateBundle() {
      for (const dir of ['cmaps', 'standard_fonts', 'iccs', 'wasm']) {
        for (const file of readdirSync(`${root}/${dir}`)) {
          if (/^licen[sc]e/i.test(file)) continue; // listed in third-party-notices.txt instead
          if (file.startsWith('quickjs')) continue; // runs PDF scripts, which we never enable
          this.emitFile({
            type: 'asset',
            fileName: `pdfjs/${dir}/${file}`,
            source: readFileSync(`${root}/${dir}/${file}`),
          });
        }
      }
    },
  };
}

// Build-time configuration. Everything is optional; with no variables the site has
// no analytics at all and makes no third-party requests.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const id = env.PUBLIC_UMAMI_WEBSITE_ID ?? '';
  const host = (env.PUBLIC_UMAMI_HOST_URL ?? '').replace(/\/+$/, '');
  const domains = env.PUBLIC_UMAMI_DOMAINS ?? '';
  const consent = env.PUBLIC_ANALYTICS_CONSENT === 'opt-in' ? 'opt-in' : 'opt-out';
  const analyticsOn = Boolean(id && host);
  const umamiOrigin = analyticsOn ? new URL(host).origin : '';

  let commit = 'dev';
  try {
    commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    // no git history yet
  }
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string;

  return {
    define: {
      __UMAMI_ID__: JSON.stringify(analyticsOn ? id : ''),
      __UMAMI_HOST__: JSON.stringify(analyticsOn ? host : ''),
      __UMAMI_DOMAINS__: JSON.stringify(domains),
      __CONSENT_MODE__: JSON.stringify(consent),
      __APP_VERSION__: JSON.stringify(version),
      __COMMIT__: JSON.stringify(commit),
    },
    // Module workers: the image worker loads codecs with dynamic imports.
    worker: { format: 'es' },
    // gifenc is CommonJS for Node; `vite dev` rendering pages on the server needs its module build.
    resolve: {
      alias: {
        gifenc: fileURLToPath(new URL('node_modules/gifenc/dist/gifenc.esm.js', import.meta.url)),
      },
    },
    plugins: [
      pdfjsData(),
      sveltekit({
        adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
        // Relative paths: one build works at "/" and in any sub-folder.
        paths: { relative: true },
        csp: {
          mode: 'hash',
          directives: {
            'default-src': ['self'],
            'script-src': [
              'self',
              'wasm-unsafe-eval',
              ...(umamiOrigin ? ([umamiOrigin] as unknown as ['https:']) : []),
            ],
            'worker-src': ['self'],
            'style-src': ['self', 'unsafe-inline'],
            'img-src': ['self', 'data:', 'blob:'],
            'media-src': ['self', 'blob:'],
            'font-src': ['self'],
            'connect-src': [
              'self',
              'blob:',
              'data:',
              ...(umamiOrigin ? ([umamiOrigin] as unknown as ['https:']) : []),
              // Umami Cloud's script posts to https://gateway.umami.is/api/send (read from its source, 29 Oct 2026).
              ...(umamiOrigin === 'https://cloud.umami.is'
                ? (['https://gateway.umami.is'] as unknown as ['https:'])
                : []),
            ],
            'object-src': ['none'],
            'base-uri': ['self'],
            'form-action': ['none'],
            'frame-src': ['none'],
          },
        },
      }),
    ],
    test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'], environment: 'node' },
  };
});
