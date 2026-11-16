<script lang="ts">
  import Notice from '#lib/ui/Notice.svelte';
  import NumberField from '#lib/ui/NumberField.svelte';

  export interface CustomInput {
    width?: number;
    height?: number;
    headMin?: number;
    headMax?: number;
    background: string;
  }

  let { input = $bindable(), usable }: { input: CustomInput; usable: boolean } = $props();
</script>

<p class="tiny muted">
  Enter the requirements of your country. These numbers are yours and are not checked against an
  official source.
</p>
<div class="pair">
  <NumberField label="Width" bind:value={input.width} min={1} max={40} step={0.1} unit="cm" />
  <NumberField label="Height" bind:value={input.height} min={1} max={40} step={0.1} unit="cm" />
</div>
<div class="pair">
  <NumberField
    label="Head height, smallest"
    bind:value={input.headMin}
    min={0}
    max={40}
    step={0.1}
    unit="cm"
  />
  <NumberField
    label="Head height, largest"
    bind:value={input.headMax}
    min={0}
    max={40}
    step={0.1}
    unit="cm"
  />
</div>
<div class="text-field">
  <label for="custom-bg">Background color required</label>
  <input
    id="custom-bg"
    type="text"
    bind:value={input.background}
    maxlength="60"
    autocomplete="off"
  />
</div>
{#if !usable}
  <Notice kind="warn">
    <span role="alert">Enter a width and height between 1 and 40 cm.</span>
  </Notice>
{/if}

<style>
  p {
    margin: 0 0 12px;
  }
  .text-field {
    display: grid;
    gap: 4px;
    margin-bottom: 12px;
  }
  .text-field input {
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    width: 100%;
    max-width: 22rem;
  }
</style>
