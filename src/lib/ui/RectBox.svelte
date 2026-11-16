<script lang="ts">
  // One draggable, resizable box on top of a picture. It does not know about the picture itself: the parent
  // gives the picture size and how many picture pixels one screen pixel covers, and receives the new box.
  // Keyboard: arrow keys move it (Shift = 10 px), Ctrl, Alt or ⌘ with the arrows resizes it.
  import { moveRect, resizeRect, type Bounds, type Handle, type Rect } from '#lib/core/rect';

  let {
    rect,
    bounds,
    scale,
    aspect = null,
    shape = 'rect',
    label,
    active = true,
    thirds = false,
    onchange,
    onselect,
    onremove,
  }: {
    rect: Rect;
    bounds: Bounds;
    /** Picture pixels per screen pixel. A function, because it changes when the page is resized. */
    scale: () => number;
    aspect?: number | null;
    shape?: 'rect' | 'ellipse';
    label: string;
    /** The selected box shows its handles. */
    active?: boolean;
    /** Show rule-of-thirds guide lines (for crops). */
    thirds?: boolean;
    /** The visitor moved or resized the box. */
    onchange: (rect: Rect) => void;
    onselect?: () => void;
    /** The visitor pressed Delete or Backspace on the box. */
    onremove?: () => void;
  } = $props();

  const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  let drag: { handle: Handle | 'move'; start: Rect; x: number; y: number } | null = null;
  let announce = $state('');

  function down(e: PointerEvent, handle: Handle | 'move') {
    if (e.button > 0) return;
    e.preventDefault();
    e.stopPropagation();
    onselect?.();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag = { handle, start: rect, x: e.clientX, y: e.clientY };
    if (handle === 'move') (e.currentTarget as HTMLElement).focus();
  }

  function move(e: PointerEvent) {
    if (!drag) return;
    const dx = (e.clientX - drag.x) * scale();
    const dy = (e.clientY - drag.y) * scale();
    onchange(
      drag.handle === 'move'
        ? moveRect(drag.start, dx, dy, bounds)
        : resizeRect(drag.start, drag.handle, dx, dy, bounds, aspect),
    );
  }

  const up = () => (drag = null);

  function key(e: KeyboardEvent) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && onremove) {
      e.preventDefault();
      onremove();
      return;
    }
    const step = e.shiftKey ? 10 : 1;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    const next =
      e.ctrlKey || e.altKey || e.metaKey
        ? resizeRect(rect, 'se', d[0], d[1], bounds, aspect)
        : moveRect(rect, d[0], d[1], bounds);
    onchange(next);
    announce = `Left ${Math.round(next.x)}, top ${Math.round(next.y)}, ${Math.round(next.w)} by ${Math.round(next.h)}`;
  }

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
  class="box"
  class:ellipse={shape === 'ellipse'}
  class:active
  role="group"
  tabindex="0"
  aria-label="{label}: left {Math.round(rect.x)}, top {Math.round(rect.y)}, {Math.round(
    rect.w,
  )} by {Math.round(rect.h)} pixels. Arrow keys move it, Control with arrow keys resizes it{onremove
    ? ', Delete removes it'
    : ''}."
  style:left={pct(rect.x, bounds.w)}
  style:top={pct(rect.y, bounds.h)}
  style:width={pct(rect.w, bounds.w)}
  style:height={pct(rect.h, bounds.h)}
  onpointerdown={(e) => down(e, 'move')}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  onkeydown={key}
  onfocus={() => onselect?.()}
>
  {#if thirds}<span class="thirds" aria-hidden="true"></span>{/if}
  {#if active}
    {#each HANDLES as h (h)}
      <span
        class="handle {h}"
        role="presentation"
        onpointerdown={(e) => down(e, h)}
        onpointermove={move}
        onpointerup={up}
        onpointercancel={up}
      ></span>
    {/each}
  {/if}
  <span class="sr-only" aria-live="polite">{announce}</span>
</div>

<style>
  .box {
    position: absolute;
    box-sizing: border-box;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.5);
    cursor: move;
    outline: none;
  }
  .box:not(.active) {
    border-color: rgb(255 255 255 / 0.7);
    border-style: dashed;
  }
  .box.ellipse {
    border-radius: 50%;
  }
  .box:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }
  .thirds {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        to right,
        transparent 33.2%,
        rgb(255 255 255 / 0.6) 33.3%,
        transparent 33.5%,
        transparent 66.5%,
        rgb(255 255 255 / 0.6) 66.6%,
        transparent 66.8%
      ),
      linear-gradient(
        to bottom,
        transparent 33.2%,
        rgb(255 255 255 / 0.6) 33.3%,
        transparent 33.5%,
        transparent 66.5%,
        rgb(255 255 255 / 0.6) 66.6%,
        transparent 66.8%
      );
  }
  .handle {
    position: absolute;
    width: 14px;
    height: 14px;
    margin: -7px 0 0 -7px;
    border: 2px solid var(--accent);
    border-radius: 3px;
    background: #fff;
  }
  /* A bigger invisible target, so a finger can hit it. */
  .handle::before {
    content: '';
    position: absolute;
    inset: -16px;
  }
  .nw {
    left: 0;
    top: 0;
    cursor: nwse-resize;
  }
  .n {
    left: 50%;
    top: 0;
    cursor: ns-resize;
  }
  .ne {
    left: 100%;
    top: 0;
    cursor: nesw-resize;
  }
  .e {
    left: 100%;
    top: 50%;
    cursor: ew-resize;
  }
  .se {
    left: 100%;
    top: 100%;
    cursor: nwse-resize;
  }
  .s {
    left: 50%;
    top: 100%;
    cursor: ns-resize;
  }
  .sw {
    left: 0;
    top: 100%;
    cursor: nesw-resize;
  }
  .w {
    left: 0;
    top: 50%;
    cursor: ew-resize;
  }
</style>
