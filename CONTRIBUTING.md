# Contributing to IMG-TOOLS

Thank you for helping. Bug reports, device tests, sourced data and new tools are all welcome. If you are unsure where to start, open an issue and ask.

## Ways to help

- **Report a bug.** Name the tool, your browser and its version, the file type, and what you expected. Attach the file only if it is not private.
- **Test on real devices.** Safari on macOS, iOS and Android have not been checked on real hardware yet. A short report of what works and what does not is a real help.
- **Fill a data gap.** Passport, social and icon sizes marked `MISSING:` in `src/lib/data/` need an official source: add the link and the date you checked it. Never guess a value.
- **Propose a tool.** Open an issue first; new tools need the maintainer's approval.

Found a security problem? Report it privately with **Report a vulnerability** on the repository's Security tab, not in a public issue.

## Setup

Node 26, then:

```sh
npm ci
npx playwright install chromium   # once, for the e2e tests
npm run dev       # development server
npm run check     # Prettier, types, Svelte warnings and the source scan
npm test          # unit tests (Vitest)
npm run build     # license check, production build and size budgets
npm run e2e       # Playwright tests against the build
```

- `npm run e2e` tests the output of `npm run build`, so build first. `BROWSERS=all npm run e2e` adds Firefox and WebKit.
- A few e2e tests compare results with ffmpeg, qpdf and exiftool. They are skipped when those tools are missing; CI installs them.
- `tests/dev-server.spec.ts` opens every tool on `vite dev`; its header says how to run it.

## Project layout

| Path                | What is there                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `src/tools/<slug>/` | One folder per tool (see below)                                                               |
| `src/lib/core/`     | Worker pool, image pipeline and file formats (JPEG, PNG, GIF, TIFF, PDF, ICO)                 |
| `src/lib/codecs/`   | Codec loaders (HEIC, AVIF, WebP, PNG, TIFF) and pdf.js                                        |
| `src/lib/ui/`       | Shared components and the tool shells (`BatchTool`, `ComposeTool`, `DrawTool`)                |
| `src/lib/families/` | Pages shared by similar tools (convert, compress, crop, watermark, GIF, blur and redact)      |
| `src/lib/shell/`    | Site frame: sidebar, search, theme switch, SEO tags                                           |
| `src/lib/data/`     | Preset data: passport documents, social and icon sizes                                        |
| `src/routes/`       | Home page, the tool page `[slug]`, about, privacy, the German privacy notice, sitemap         |
| `scripts/`          | Build checks (licenses, source scan, budgets) and generators (`llms.txt`, social image)       |
| `tests/`            | Playwright tests; `tests/fixtures/README.md` records how each test file was made              |

## Rules in brief

- Files never leave the browser, and the site makes no other network requests. A check fails the build if source code uses `fetch`, `XMLHttpRequest`, `WebSocket`, `eval`, `innerHTML` or `{@html}` outside the few allowed files. The scan is a safety net, not a sandbox: it matches patterns, and on GitHub Pages a page's CSP does not reach workers. Changes to workers, codecs, `scripts/` and the CSP therefore get a careful human review, and the e2e tests fail on any request to another origin.
- Add a dependency only after asking. Licenses must be on the allow-list in `scripts/licenses.ts`, which fails the build otherwise: permissive licenses (MIT, ISC, BSD, Apache-2.0, zlib, 0BSD), SIL OFL for fonts, MPL-2.0 only unmodified, and LGPL only for the HEIC decoder, which must stay an unmodified separate file (checked in `scripts/check-build.ts`). GPL and AGPL are never allowed.
- Clean-room UI and copy: do not copy code or text from IT-Tools or other image-tool websites.
- User interface text is US English, plain and short, with no exclamation marks and no emoji. `src/lib/registry.test.ts` catches common British spellings.
- Text built from user input or file names (snippets, CSS, JSON, file names) must be escaped or sanitized.

## Adding a tool

A tool is one folder in `src/tools/<slug>/`; the sidebar, the routes, the sitemap and `llms.txt` are generated from it.

- `meta.ts`: name, short `description` (90 characters at most), `category`, `spec` (sort order as `group.number`), `icon` (a Tabler SVG imported with `?raw`), `accepts`, `batch`, `keywords`, and optionally `seoTitle`, `seoDescription` and `intro`. `src/lib/registry.test.ts` checks the rules.
- `help.ts`: 3–5 steps and 3–6 FAQ entries, in your own words.
- `Tool.svelte`: the page. Most tools use a shared shell (`BatchTool`, `ComposeTool`, `DrawTool`) or a family from `src/lib/families/`, so many are a few lines long. Every tool follows the same three steps: Files, Settings (with a preview), then a Result box that holds every download.
- Put logic that can be tested without a browser in `logic.ts` with a `logic.test.ts` beside it, and add an end-to-end test under `tests/` for what only a browser can show.
- Run `npm run check`, `npm test`, `npm run build` and `npm run e2e`. The build regenerates `THIRD_PARTY_NOTICES.md` and `static/llms.txt`; commit both.

## Commits and pull requests

- One tool or one fix per pull request.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): summary`, for example `fix(resize-image): keep the aspect ratio of rotated photos`. Types in use: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- CI runs the same checks as above; a pull request is ready when it is green.

By submitting a contribution, you agree that it is licensed under the MIT License of this project.
