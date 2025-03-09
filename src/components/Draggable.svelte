<script lang="ts">
  import { draggable } from "../lib/dnd";

  export let data: unknown;
  export let type: string = "generic";
  export let effect: 'move' | 'copy' = 'move';
  export let dragClass = 'dragging';
  
  let isDragging = false;
  
  function handleDragStart() {
    isDragging = true;
    document.body.classList.add('no-select');
  }

  function handleDragEnd() {
    isDragging = false;
    document.body.classList.remove('no-select');
  }
</script>

<div
  class="draggable"
  use:draggable={{ data, type, effect, dragClass }}
  on:dragstart={handleDragStart}
  on:dragend={handleDragEnd}
  on:touchstart={handleDragStart}
  on:touchend={handleDragEnd}
  on:touchcancel={handleDragEnd}
>
  <slot {isDragging} />
</div>

<style>
  .draggable {
    cursor: grab;
    user-select: none;
  }
  
  :global(.dragging) {
    cursor: grabbing;
    opacity: 0.7;
  }
  
  :global(.no-select) {
    user-select: none !important;
  }
</style>
