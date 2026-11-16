<script lang="ts" generics="T extends string | number">
  // A short list of mutually exclusive choices, shown as chips (a radio group).
  let {
    label,
    value = $bindable(),
    options,
    onchange,
  }: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    /** Called when the visitor picks an option. */
    onchange?: (value: T) => void;
  } = $props();
  const id = $props.id();
</script>

<fieldset>
  <legend>{label}</legend>
  <div class="chips">
    {#each options as o (o.value)}
      <label class:on={value === o.value}>
        <input
          type="radio"
          name="{id}-seg"
          value={o.value}
          bind:group={value}
          onchange={() => onchange?.(o.value)}
        />
        <span class="mono">{o.label}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  fieldset {
    border: 0;
    padding: 0;
    margin: 0 0 16px;
  }
  legend {
    font-weight: 700;
    margin-bottom: 6px;
    padding: 0;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  label {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    cursor: pointer;
  }
  label.on {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
  input {
    position: absolute;
    opacity: 0;
    inset: 0;
    cursor: pointer;
  }
  label:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
