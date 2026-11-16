import type { Handle } from '@sveltejs/kit/hooks';

/** The German privacy notice declares its language in the document, not only on its container. */
export const handle: Handle = ({ event, resolve }) =>
  resolve(event, {
    transformPageChunk: ({ html }) =>
      event.url.pathname.startsWith('/datenschutz')
        ? html.replace('lang="en-US"', 'lang="de"')
        : html,
  });
