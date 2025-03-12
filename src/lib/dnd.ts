type DragOptions = { axis?: "both" | "x" | "y"; devDelay?: number; };
export type DragArgs = {
  node: HTMLElement,
  posData: {
    x: number,
    y: number
  }
  startData: {
    nodeX: number,
    nodeY: number,
    offsetX: number,
    offsetY: number
  }
} & DragOptions
export type GhostRenderFunction = (event: DragEvent, ghost: HTMLElement, args: DragArgs) => void;

export const DefaultGhostRenderer: GhostRenderFunction = (event, ghost, args) => {
  const { axis, posData, startData: pDat } = args;

  // Position ghost dynamically
  if (axis !== "y") ghost.style.left = `${event.clientX + pDat.offsetX}px`;
  else ghost.style.left = `${pDat.nodeX}px`;

  if (axis !== "x") ghost.style.top = `${event.clientY + pDat.offsetY}px`;
  else ghost.style.top = `${pDat.nodeY}px`;
}

export function draggable(
  node: HTMLElement,
  {
    onDragStart,
    onDragEnd,
    onGhostRender: renderGhost,
    axis = "both", // "both" | "x" | "y",
    devDelay: devDelay
  }: {
    onDragStart?: (event: DragEvent, node: HTMLElement) => void;
    onDragEnd?: (event: DragEvent, node: HTMLElement) => void;
    onGhostRender?: GhostRenderFunction;
  } & DragOptions = {}
) {
  node.setAttribute("draggable", "true");
  node.addClass("dnd-draggable");

  function handleDragStart(event: DragEvent) {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = "move";

    // Prevent native drag ghost
    event.dataTransfer.setDragImage(new Image(), 0, 0);

    // Get initial cursor offset
    const rect = node.getBoundingClientRect();
    const startData = {
      nodeX: rect.left,
      nodeY: rect.top,
      offsetX: rect.left - event.clientX,
      offsetY: rect.top - event.clientY,
    }

    // Create ghost
    let ghost = node.cloneNode(true) as HTMLElement;
    ghost.setAttribute("draggable", "false");
    ghost.removeClass("dnd-draggable");
    ghost.addClass("dnd-ghost");

    document.body.appendChild(ghost);

    // Capture the initial computed properties
    // copyComputedStyles(node, ghost);
    copyComputedSize(node, ghost);

    // Allow custom ghost rendering
    function moveGhost(e: DragEvent) {
      let x, y;
      if (axis !== "y") x = event.clientX + startData.offsetX;
      else x = startData.nodeX;

      if (axis !== "x") y = event.clientY + startData.offsetY;
      else y = startData.nodeY;

      const posData = {
        x, y
      }
      if (renderGhost) {
        renderGhost(e, ghost, { axis, posData, startData, node });
      } else {
        DefaultGhostRenderer(e, ghost, { axis, posData, startData, node });
      }
    }

    moveGhost(event);

    document.addEventListener("dragover", moveGhost);

    onDragStart?.(event, node);

    function cleanup() {
      ghost.remove();
      document.removeEventListener("dragover", moveGhost);
    }

    node.addEventListener(
      "dragend",
      (e) => {
        onDragEnd?.(e, node);
        if (devDelay) setTimeout(() => {
          cleanup();
        }, devDelay);
        else
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

function copyComputedSize(source: HTMLElement, target: HTMLElement) {
  const computedStyle = window.getComputedStyle(source);
  target.style.width = computedStyle.width;
  target.style.height = computedStyle.height;
}

function copyComputedStyles(source: HTMLElement, target: HTMLElement) {
  const computedStyle = window.getComputedStyle(source);
  for (let [prop, value] of Object.entries(computedStyle)) {
    target.style.setProperty(prop, value /* computedStyle.getPropertyValue(prop) */);
  }
}
