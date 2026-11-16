<script lang="ts">
  // Before/after comparison: a draggable split with zoom (−, Fit, +). The slider below the picture
  // makes the split usable by keyboard and screen reader.
  import Button from './Button.svelte';

  let {
    before,
    after,
    beforeLabel = 'Before',
    afterLabel = 'After',
  }: { before: string; after: string; beforeLabel?: string; afterLabel?: string } = $props();

  const ZOOMS = [1, 2, 4, 8];
  let position = $state(50);
  let zoom = $state(1);
  let stage: HTMLElement | undefined = $state();

  function drag(e: PointerEvent) {
    if (!stage || e.buttons !== 1) return;
    const box = stage.getBoundingClientRect();
    position = Math.min(100, Math.max(0, ((e.clientX - box.left) / box.width) * 100));
  }
  const step = (by: 1 | -1) => {
    const i = ZOOMS.indexOf(zoom) + by;
    zoom = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, i))];
  };
  const id = $props.id();
</script>

<div class="compare">
  <div class="viewport">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="stage"
      bind:this={stage}
      style:width="{zoom * 100}%"
      onpointerdown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag(e);
      }}
      onpointermove={drag}
    >
      <img src={before} alt="{beforeLabel} version" draggable="false" />
      <img
        class="top"
        src={after}
        alt="{afterLabel} version"
        draggable="false"
        style:clip-path="inset(0 0 0 {position}%)"
      />
      <span class="line" style:left="{position}%" aria-hidden="true"></span>
      <span class="tag left">{beforeLabel}</span>
      <span class="tag right">{afterLabel}</span>
    </div>
  </div>
  <div class="controls">
    <label for="{id}-split" class="tiny muted">Comparison position</label>
    <input id="{id}-split" type="range" min="0" max="100" bind:value={position} />
    <span class="zoom">
      <Button aria-label="Zoom out" disabled={zoom === 1} onclick={() => step(-1)}>−</Button>
      <Button disabled={zoom === 1} onclick={() => (zoom = 1)}>Fit</Button>
      <Button aria-label="Zoom in" disabled={zoom === ZOOMS.at(-1)} onclick={() => step(1)}
        >+</Button
      >
    </span>
  </div>
</div>

<style>
  .compare {
    display: grid;
    gap: 8px;
  }
  .viewport {
    overflow: auto;
    max-height: 70vh;
    border-radius: var(--radius);
    background: conic-gradient(
        var(--surface-sunk) 25%,
        var(--surface) 0 50%,
        var(--surface-sunk) 0 75%,
        var(--surface) 0
      )
      0 0 / 16px 16px;
  }
  .stage {
    position: relative;
    touch-action: pan-y pinch-zoom;
    cursor: ew-resize;
    user-select: none;
  }
  img {
    display: block;
    width: 100%;
    height: auto;
  }
  .top {
    position: absolute;
    inset: 0;
  }
  .line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: var(--accent);
    box-shadow: 0 0 0 1px var(--surface);
  }
  .tag {
    position: absolute;
    top: 8px;
    padding: 2px 8px;
    border-radius: 99px;
    background: var(--surface);
    color: var(--text);
    font-size: 0.8125rem;
    border: 1px solid var(--line);
  }
  .left {
    left: 8px;
  }
  .right {
    right: 8px;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  .controls input[type='range'] {
    flex: 1 1 160px;
    min-width: 120px;
  }
  .zoom {
    display: inline-flex;
    gap: 4px;
  }
</style>
