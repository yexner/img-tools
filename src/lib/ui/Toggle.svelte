<script lang="ts">
  // A labeled on/off switch. It is a real checkbox, so keyboard and screen readers work as usual.
  let { label, checked = $bindable(false) }: { label: string; checked: boolean } = $props();
</script>

<label class="toggle">
  <input type="checkbox" bind:checked />
  <span>{label}</span>
</label>

<style>
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    cursor: pointer;
  }
  input {
    width: 20px;
    height: 20px;
    accent-color: var(--accent);
  }
</style>
