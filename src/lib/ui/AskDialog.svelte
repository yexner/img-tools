<script lang="ts">
  import Button from './Button.svelte';

  let {
    label,
    secret,
    confirm,
    onsubmit,
    oncancel,
  }: {
    label: string;
    secret: boolean;
    /** A message with Continue / Cancel and no text field. */
    confirm: boolean;
    onsubmit: (value: string) => void;
    oncancel: () => void;
  } = $props();

  let value = $state('');

  function submit(e: SubmitEvent) {
    e.preventDefault();
    onsubmit(value);
  }
</script>

<div class="modal" role="presentation">
  <form class="dialog" onsubmit={submit} aria-label={label}>
    {#if confirm}
      <p>{label}</p>
    {:else}
      <label>
        {label}
        <!-- svelte-ignore a11y_autofocus -->
        <input type={secret ? 'password' : 'text'} bind:value autofocus />
      </label>
    {/if}
    <span class="row">
      <Button variant="primary" type="submit">{confirm ? 'Continue' : 'OK'}</Button>
      <Button onclick={oncancel}>Cancel</Button>
    </span>
  </form>
</div>

<style>
  .modal {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgb(0 0 0 / 0.45);
    z-index: 30;
  }
  .dialog {
    display: grid;
    gap: 16px;
    padding: 24px;
    min-width: min(360px, 90vw);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-box);
    box-shadow: var(--shadow);
  }
  .dialog label {
    display: grid;
    gap: 6px;
    font-weight: 700;
  }
  .dialog input {
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface-sunk);
  }
</style>
