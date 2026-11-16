<script lang="ts">
  import { siteUrl } from '#lib/config';

  let {
    title,
    description,
    path,
    image = '/og-default.png',
    imageAlt = 'IMG-TOOLS: image tools that run in your browser',
    type = 'website',
    jsonLd = [],
  }: {
    title: string;
    description: string;
    /** Route path with the trailing slash, for example `/convert-image/`. */
    path: string;
    image?: string;
    imageAlt?: string;
    type?: string;
    jsonLd?: object[];
  } = $props();

  const pageUrl = $derived(`${siteUrl}${path}`);
  const imageUrl = $derived(`${siteUrl}${image}`);
  // `<` is escaped so the data cannot close the script tag. The block is data, never executed.
  const ld = $derived(
    jsonLd.length
      ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}<\/script>`
      : '',
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={pageUrl} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:type" content={type} />
  <meta property="og:site_name" content="IMG-TOOLS" />
  <meta property="og:image" content={imageUrl} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={imageAlt} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={imageUrl} />
  <meta name="twitter:image:alt" content={imageAlt} />
  {#if ld}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html ld}
  {/if}
</svelte:head>
