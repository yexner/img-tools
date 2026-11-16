<script lang="ts">
  // Nine places on a picture, as a 3 x 3 grid of radio buttons.
  import type { Position } from '#lib/core/watermark';

  let { label, value = $bindable('br') }: { label: string; value: Position } = $props();

  const cells: { id: Position; name: string }[] = [
    { id: 'tl', name: 'Top left' },
    { id: 't', name: 'Top center' },
    { id: 'tr', name: 'Top right' },
    { id: 'l', name: 'Middle left' },
    { id: 'c', name: 'Center' },
    { id: 'r', name: 'Middle right' },
    { id: 'bl', name: 'Bottom left' },
    { id: 'b', name: 'Bottom center' },
    { id: 'br', name: 'Bottom right' },
  ];
  const id = $props.id();
</script>

<fieldset>
  <legend>{label}</legend>
  <div class="grid">
    {#each cells as c (c.id)}
      <label class:on={value === c.id} title={c.name}>
        <input type="radio" name="{id}-pos" value={c.id} bind:group={value} aria-label={c.name} />
        <span aria-hidden="true"></span>
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
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 44px);
    gap: 6px;
  }
  label {
    position: relative;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    cursor: pointer;
  }
  label.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--muted);
  }
  label.on span {
    background: var(--accent);
    transform: scale(1.3);
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
