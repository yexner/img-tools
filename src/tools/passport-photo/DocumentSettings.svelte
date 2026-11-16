<script lang="ts">
  import { passportDocuments } from '#lib/data/passport-documents';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Slider from '#lib/ui/Slider.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import CustomFields, { type CustomInput } from './CustomFields.svelte';
  import DocFacts from './DocFacts.svelte';
  import type { Doc } from './logic';

  let {
    docId = $bindable(),
    customInput = $bindable(),
    showGuides = $bindable(),
    crown = $bindable(),
    doc,
    px,
    dpi,
    usable,
  }: {
    docId: string;
    customInput: CustomInput;
    showGuides: boolean;
    crown: number;
    doc: Doc | null;
    px: { width: number; height: number };
    dpi: number;
    usable: boolean;
  } = $props();
</script>

<Segmented
  label="Document"
  bind:value={docId}
  options={[
    ...passportDocuments.map((d) => ({ value: d.id, label: d.label })),
    { value: 'custom', label: 'Custom' },
  ]}
/>
{#if docId === 'custom'}
  <CustomFields bind:input={customInput} {usable} />
{/if}
{#if doc}
  <DocFacts {doc} {px} {dpi} />
  {#if doc.head}
    <Toggle label="Show guide lines for the head" bind:checked={showGuides} />
    {#if showGuides}
      <Slider label="Top of head line" bind:value={crown} min={0} max={30} unit="%" />
    {/if}
  {/if}
{/if}
