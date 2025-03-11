export function draggable(
    node: HTMLElement,
    { onDragStart, onDragEnd }: { onDragStart?: (event: DragEvent, node: HTMLElement) => void; onDragEnd?: (event: DragEvent, node: HTMLElement) => void } = {}
  ) {
    node.setAttribute("draggable", "true");
    node.addClass("draggable");
  
    function handleDragStart(event: DragEvent) {
      if (!event.dataTransfer) return;
      event.dataTransfer.effectAllowed = "move";
  
      // Clone the element to use as the drag image
      const ghost = node.cloneNode(true) as HTMLElement;
      ghost.addClass("drag-ghost");
      document.body.appendChild(ghost);
  
      // Position ghost at cursor
      function moveGhost(e: MouseEvent) {
        ghost.style.left = `${e.clientX}px`;
        ghost.style.top = `${e.clientY}px`;
      }
      moveGhost(event);
  
      document.addEventListener("dragover", moveGhost);
      event.dataTransfer.setDragImage(ghost, 0, 0);
  
      onDragStart?.(event, node);
  
      function cleanup() {
        ghost.remove();
        document.removeEventListener("dragover", moveGhost);
      }
  
      node.addEventListener(
        "dragend",
        (e) => {
          onDragEnd?.(e, node);
          cleanup();
        },
        { once: true }
      );
    }
  
    node.addEventListener("dragstart", handleDragStart);
  
    return {
      destroy() {
        node.removeEventListener("dragstart", handleDragStart);
      }
    };
  }
  