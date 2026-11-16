<script lang="ts">
  // The hidden file input behind the "Add files" button and the drop zone.
  let {
    accept,
    multiple,
    onfiles,
  }: { accept: string; multiple: boolean; onfiles: (files: File[]) => void } = $props();

  let input: HTMLInputElement;
  export function open() {
    input.click();
  }
</script>

<input
  bind:this={input}
  class="sr-only"
  type="file"
  {accept}
  {multiple}
  onchange={(e) => {
    const el = e.currentTarget as HTMLInputElement;
    const files = [...(el.files ?? [])];
    el.value = '';
    onfiles(files);
  }}
  tabindex="-1"
  aria-hidden="true"
/>
