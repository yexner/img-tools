<script lang="ts">
  let {
    label,
    value = $bindable(),
    min = 1,
    max = 100,
    step = 1,
    unit = '',
    onchange,
  }: {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    /** Called with the new value whenever the visitor changes it. */
    onchange?: (value: number) => void;
  } = $props();
  const id = $props.id();
  function clamp(e: Event) {
    const n = Number((e.currentTarget as HTMLInputElement).value);
    if (Number.isFinite(n)) {
      value = Math.min(max, Math.max(min, Math.round(n / step) * step));
      onchange?.(value);
    }
  }
</script>

<div class="field">
  <label for="{id}-range">{label}</label>
  <div class="control">
    <input
      id="{id}-range"
      type="range"
      {min}
      {max}
      {step}
      bind:value
      oninput={() => onchange?.(value)}
    />
    <span class="num"
      ><input
        class="mono"
        type="number"
        aria-label="{label} value"
        {min}
        {max}
        {step}
        {value}
        onchange={clamp}
      />{unit}</span
    >
  </div>
</div>

<style>
  .field {
    display: grid;
    gap: 6px;
    margin-bottom: 16px;
  }
  label {
    font-weight: 700;
  }
  .control {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  input[type='range'] {
    flex: 1;
    accent-color: var(--accent);
    min-height: 44px;
  }
  .num {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  input[type='number'] {
    width: 4.5rem;
    min-height: 40px;
    padding: 0 8px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface-sunk);
    text-align: right;
  }
</style>
