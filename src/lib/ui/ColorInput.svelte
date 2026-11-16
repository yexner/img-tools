<script lang="ts">
  // A color as a picker plus a hex field, so it can be typed or pasted as well as picked.
  let {
    label,
    value = $bindable('#ffffff'),
    valid = $bindable(true),
  }: {
    label: string;
    value: string;
    /** False while the typed text is not a full #rrggbb color. */ valid?: boolean;
  } = $props();
  const id = $props.id();

  const HEX = /^#[0-9a-f]{6}$/i;
  let text = $state(value);
  $effect(() => {
    text = value;
  });

  function typed(e: Event) {
    let v = (e.currentTarget as HTMLInputElement).value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    text = v;
    valid = HEX.test(v);
    if (valid) value = v.toLowerCase();
  }
</script>

<div class="field">
  <label for="{id}-hex">{label}</label>
  <span class="row">
    <input class="swatch" type="color" bind:value aria-label="{label} picker" />
    <input
      id="{id}-hex"
      class="mono"
      type="text"
      value={text}
      oninput={typed}
      maxlength="7"
      spellcheck="false"
      autocomplete="off"
      aria-invalid={!HEX.test(text)}
    />
  </span>
</div>

<style>
  .field {
    display: grid;
    gap: 4px;
    margin-bottom: 12px;
  }
  .row {
    display: inline-flex;
    gap: 8px;
    align-items: center;
  }
  .swatch {
    width: 44px;
    height: 44px;
    padding: 2px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
  }
  input[type='text'] {
    width: 8rem;
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
  }
  input[aria-invalid='true'] {
    border-color: var(--danger);
  }
</style>
