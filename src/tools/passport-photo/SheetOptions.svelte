<script lang="ts">
  import Notice from '#lib/ui/Notice.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';
  import Segmented from '#lib/ui/Segmented.svelte';
  import Toggle from '#lib/ui/Toggle.svelte';
  import { SHEETS, type sheetPlan } from './sheet';

  let {
    sheetId = $bindable(),
    sheetDpi = $bindable(),
    gap = $bindable(),
    cutLines = $bindable(),
    plan,
    gapMm,
  }: {
    sheetId: string;
    sheetDpi: number;
    gap: number | undefined;
    cutLines: boolean;
    plan: ReturnType<typeof sheetPlan>;
    gapMm: number;
  } = $props();
  const sheet = $derived(SHEETS.find((s) => s.id === sheetId)!);
  const { ok, grid, cost, px: sheetPx, tooBig } = $derived(plan);
</script>

<Segmented
  label="Sheet"
  bind:value={sheetId}
  options={SHEETS.map((s) => ({ value: s.id, label: s.label }))}
/>
<Segmented
  label="Print resolution"
  bind:value={sheetDpi}
  options={[
    { value: 300, label: '300 DPI' },
    { value: 600, label: '600 DPI' },
  ]}
/>
<NumberField label="Gap between copies" bind:value={gap} min={0} max={50} step={0.5} unit="mm" />
<Toggle label="Cut lines" bind:checked={cutLines} />
{#if !ok}
  <Notice kind="warn">
    <span role="alert">Enter a photo size between 10 and 400 mm and a gap between 0 and 50 mm.</span
    >
  </Notice>
{:else if grid && sheetPx}
  <p class="summary">
    {#if grid.count}
      <strong>{grid.count} {grid.count === 1 ? 'copy' : 'copies'}</strong>:
      {grid.columns} across × {grid.rows} down on a {grid.turned ? 'landscape' : 'portrait'}
      sheet ({sheet.label}), {sheetPx.w} × {sheetPx.h} px at {sheetDpi} DPI.
    {:else}
      <strong>No copy fits</strong> on this sheet ({sheet.label}) at this size.
    {/if}
  </p>
  {#if cost && cost.lost > 0}
    <Notice kind="warn">
      A gap of {gapMm} mm fits {cost.actual}
      {cost.actual === 1 ? 'copy' : 'copies'}; with no gap
      {cost.free} would fit. Make the gap smaller to get {cost.lost} more.
    </Notice>
  {/if}
  {#if tooBig}
    <Notice kind="warn">
      <span role="alert">
        This sheet would be over 40 million pixels. Choose 300 DPI or a smaller sheet.
      </span>
    </Notice>
  {/if}
{/if}

<style>
  p {
    margin: 0 0 12px;
  }
</style>
