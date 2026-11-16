<script lang="ts">
  // Click the important part of a picture. The point is kept as fractions of the picture, and can also
  // be moved with the arrow keys (1 percent, or 10 with Shift).
  let {
    src,
    value = $bindable({ x: 0.5, y: 0.5 }),
    label = 'Focal point',
  }: { src: string; value: { x: number; y: number }; label?: string } = $props();

  let frame: HTMLElement | undefined = $state();

  function set(e: PointerEvent) {
    if (!frame) return;
    const box = frame.getBoundingClientRect();
    value = {
      x: Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
    };
  }

  function key(e: KeyboardEvent) {
    const step = e.shiftKey ? 0.1 : 0.01;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    value = {
      x: Math.min(1, Math.max(0, value.x + m[0])),
      y: Math.min(1, Math.max(0, value.y + m[1])),
    };
  }
</script>

<div class="frame" bind:this={frame}>
  <img {src} alt="" draggable="false" />
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="hit"
    onpointerdown={(e) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      set(e);
    }}
    onpointermove={(e) => e.buttons === 1 && set(e)}
  ></div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div
    class="dot"
    role="group"
    tabindex="0"
    aria-label="{label}: {Math.round(value.x * 100)} percent from the left, {Math.round(
      value.y * 100,
    )} percent from the top. Arrow keys move it."
    style:left="{value.x * 100}%"
    style:top="{value.y * 100}%"
    onkeydown={key}
  ></div>
</div>

<style>
  .frame {
    position: relative;
    line-height: 0;
    border-radius: var(--radius);
    overflow: hidden;
    touch-action: none;
    cursor: crosshair;
  }
  img {
    display: block;
    width: 100%;
    height: auto;
    user-select: none;
  }
  .hit {
    position: absolute;
    inset: 0;
  }
  .dot {
    position: absolute;
    width: 28px;
    height: 28px;
    margin: -14px 0 0 -14px;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow:
      0 0 0 2px var(--accent),
      0 0 0 4px rgb(0 0 0 / 0.35);
    background: rgb(255 255 255 / 0.25);
    pointer-events: none;
  }
  .dot:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 4px;
  }
</style>
