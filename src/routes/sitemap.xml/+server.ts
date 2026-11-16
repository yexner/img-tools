import { siteUrl } from '#lib/config';
import { tools } from '#lib/registry';

export const prerender = true;
// A file, not a folder: the build writes build/sitemap.xml (see scripts/check-build.ts).
export const trailingSlash = 'never';

const pages = [
  '/',
  ...tools.map((t) => `/${t.slug}/`),
  '/privacy/',
  '/datenschutz/',
  '/about/',
  '/llm-info/',
];

export const GET = () => {
  const day = new Date().toISOString().slice(0, 10);
  const body = pages
    .map((p) => `  <url><loc>${siteUrl}${p}</loc><lastmod>${day}</lastmod></url>`)
    .join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
