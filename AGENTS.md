# AGENTS.md

Instructions for coding agents (Claude Code, Codex and others) and human contributors. See also `CONTRIBUTING.md`.

- Commands: `npm run check`, `npm test`, `npm run build`, `npm run e2e` (see CONTRIBUTING.md).
- SvelteKit 3: no `svelte.config.js` (config is in `vite.config.ts`); use `#lib/...` imports (not `$lib`); use `resolve()` via `#lib/paths` for links.
- Node 26 runs the scripts in `scripts/` directly as `.ts`.
- Ask the maintainer first before adding a dependency, changing a license, adding a tool or adding preset data (passport, social, icon sizes). Never invent data; list gaps as `MISSING:` comments.
- Text is US English (color, optimizer, license); `src/lib/registry.test.ts` guards the UI files.
- Every tool page follows Files, Settings (with preview), Result; all downloads live in the Result box.
- Generated files must be committed: `THIRD_PARTY_NOTICES.md` and `static/llms.txt` (run `npm run build`); CI fails when they are stale.
- Production site: https://img-tools.fyi (GitHub Pages), repo https://github.com/yexner/img-tools. Umami events are listed by `node scripts/umami-events.ts` (writes the git-ignored `umami.md`).

## Known issues

- Firefox: the gif-to-mp4 bitrate is ignored.
- Safari, iOS and Android are not tested on real devices yet.
- Open for the maintainer: Schengen/EU passport source, the svgo/sax license override, and the preset data gaps marked `MISSING:` in `src/lib/data/`.
