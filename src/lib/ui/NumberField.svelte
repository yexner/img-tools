<script lang="ts">
  // A labeled number input with an optional unit. Empty means "not set".
  let {
    label,
    value = $bindable(),
    min,
    max,
    step = 1,
    unit,
    placeholder,
    oninput,
    onchange,
  }: {
    label: string;
    value: number | undefined;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    placeholder?: string;
    /** Called when the visitor types, not when the value is set from code. */
    oninput?: (() => void) | undefined;
    /** Called with the new value when the visitor finishes editing (Enter or leaving the field). */
    onchange?: (value: number | undefined) => void;
  } = $props();
  const id = $props.id();
</script>

<div class="field">
  <label for={id}>{label}</label>
  <span class="box">
    <input
      {id}
      class="mono"
      type="number"
      {min}
      {max}
      {step}
      {placeholder}
      bind:value
      {oninput}
      onchange={() => onchange?.(value)}
    />
    {#if unit}<span class="unit muted" aria-hidden="true">{unit}</span>{/if}
  </span>
</div>

<style>
  .field {
    display: grid;
    gap: 4px;
    margin-bottom: 12px;
  }
  .box {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  input {
    width: 9rem;
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
  }
</style>
