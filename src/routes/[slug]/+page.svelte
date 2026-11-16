<script lang="ts">
  import Seo from '#lib/shell/Seo.svelte';
  import { siteUrl } from '#lib/config';
  import { onMount } from 'svelte';
  import { warmCodecs } from '#lib/codecs';
  import { setTool } from '#lib/context';
  import { warmPool } from '#lib/core';
  import { warmFonts } from '#lib/fonts';
  import { ui } from '#lib/ui.svelte';
  import Box from '#lib/ui/Box.svelte';
  import Button from '#lib/ui/Button.svelte';
  import { pin, pinned } from '#lib/ui/icons';

  let { data } = $props();
  // The tool is fixed for the lifetime of this component: the page is re-created on navigation.
  // svelte-ignore state_referenced_locally
  setTool({ ...data.meta });
  const Tool = $derived(data.Tool);

  // Warm on open: workers and the codecs the default settings need are ready before any file is added.
  onMount(() => {
    warmPool();
    void Promise.all([warmCodecs(data.meta.needs), warmFonts()]).finally(
      () => (document.body.dataset.ready = '1'),
    );
    return () => delete document.body.dataset.ready;
  });
  const isPinned = $derived(ui.isPinned(data.meta.slug));

  // `backticks` in help text render as code; nothing else is interpreted.
  const parts = (s: string) => s.split(/`([^`]+)`/g);

  const plain = (s: string) => s.replaceAll('`', '');
  const pageUrl = $derived(`${siteUrl}/${data.meta.slug}/`);
  const jsonLd = $derived([
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: data.meta.name,
      url: pageUrl,
      description: data.meta.seoDescription ?? data.meta.description,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript and a modern browser',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
      inLanguage: 'en',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: data.help.faq.map((f) => ({
        '@type': 'Question',
        name: plain(f.q),
        acceptedAnswer: { '@type': 'Answer', text: plain(f.a) },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'IMG-TOOLS', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: data.meta.name, item: pageUrl },
      ],
    },
  ]);
</script>

<Seo
  title={data.meta.seoTitle ?? `${data.meta.name} · IMG-TOOLS`}
  description={data.meta.seoDescription ?? data.meta.description}
  path="/{data.meta.slug}/"
  {jsonLd}
/>

<div class="page">
  <header>
    <div>
      <h1>{data.meta.name}</h1>
      <p class="muted">{data.meta.description}</p>
      {#if data.meta.intro}<p class="muted intro">{data.meta.intro}</p>{/if}
    </div>
    <Button
      icon={isPinned ? pinned : pin}
      aria-pressed={isPinned}
      onclick={() => ui.togglePin(data.meta.slug)}
    >
      {isPinned ? 'Pinned' : 'Pin'}
    </Button>
  </header>

  {#key data.meta.slug}<Tool />{/key}

  <div class="help">
    <Box title="How it works" collapsible open={false}>
      <ol>
        {#each data.help.steps as s (s)}<li>{s}</li>{/each}
      </ol>
    </Box>
    <Box title="FAQ" collapsible open={!!data.meta.intro}>
      <dl>
        {#each data.help.faq as f (f.q)}
          <dt>{f.q}</dt>
          <dd>
            {#each parts(f.a) as p, i (i)}{#if i % 2}<code class="mono">{p}</code
                >{:else}{p}{/if}{/each}
          </dd>
        {/each}
      </dl>
    </Box>
  </div>
</div>

<style>
  .page {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    gap: 16px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }
  header p {
    margin: 4px 0 0;
  }
  .intro {
    max-width: 70ch;
  }
  .help {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    align-items: start;
  }
  ol {
    margin: 0;
    padding-left: 1.25rem;
  }
  dt {
    font-weight: 700;
    margin-top: 12px;
  }
  dt:first-child {
    margin-top: 0;
  }
  dd {
    margin: 4px 0 0;
    color: var(--ink-2);
  }
</style>
