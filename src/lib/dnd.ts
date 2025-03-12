const CONTROLS_DRAGGABLE_ATTR = "data-controls-draggable";
const DROPPABLE_ACCEPTS_ATTR = "data-droppable-accepts";



export const DefaultGhostPosition: GhostPositionFunction = (event, args) => {
  const { axis, startX, startY, offsetX, offsetY } = args;
  let x, y;

  // Position ghost dynamically
  if (axis !== "y") x = event.clientX + offsetX;
  else x = startX;

  if (axis !== "x") y = event.clientY + offsetY;
  else y = startY;

  return { x, y };
}

export function draggable<T>(
  node: HTMLElement,
  {
    type: draggableType,
    data,
    onDragStart,
    onDragEnd,
    onGhostRender,
    onGhostPosition,
    axis = "both", // "both" | "x" | "y",
    devDelay: devDelay
  }: DraggableParams<T>
) {
  node.setAttribute("draggable", "true");
  node.addClass("dnd-draggable");

  function handleDragStart(startEvent: DragEvent) {
    if (!startEvent.dataTransfer) return;
    startEvent.dataTransfer.effectAllowed = "move";

    const initialPointerEvents = node.style.pointerEvents;
    setTimeout(() => {
      node.style.pointerEvents = "none";
    }, 0);

    // Store drag type and data
    if (draggableType) {
      startEvent.dataTransfer.setData("text/type", draggableType);
      const nodeData = node.dataset.dndData || "{}";
      startEvent.dataTransfer.setData("text/data", nodeData);
    }

    // Prevent native drag ghost
    startEvent.dataTransfer.setDragImage(new Image(), 0, 0);

    // Get initial cursor offset
    const rect = node.getBoundingClientRect();
    const startData = {
      startX: rect.left,
      startY: rect.top,
      offsetX: rect.left - startEvent.clientX,
      offsetY: rect.top - startEvent.clientY,
    }

    // Create unique drag ID for this operation
    const dragId = crypto.randomUUID();
    startEvent.dataTransfer.setData("text/drag-id", dragId);

    // Create ghost with unique drag ID
    let ghost = node.cloneNode(true) as HTMLElement;
    ghost.setAttribute("draggable", "false");
    ghost.removeClass("dnd-draggable");
    ghost.addClass("dnd-ghost");
    ghost.dataset.dragId = dragId;

    // Store drag type and data on the ghost element for droppables to access
    if (draggableType) {
      ghost.setAttribute("data-draggable-type", draggableType);
      ghost.setAttribute("data-draggable-data", node.dataset.dndData || "{}");
    }

    // Store axis information for droppables
    ghost.setAttribute("data-drag-axis", axis);

    copyComputedSize(node, ghost);

    document.body.appendChild(ghost);

    function moveGhost(moveEvent: DragEvent) {
      const { x, y } = DefaultGhostPosition(moveEvent, { node, axis, newX: moveEvent.clientX, newY: moveEvent.clientY, ...startData });
      const args: DragData = { axis, node, newX: x, newY: y, ...startData };


      let pos: { x: number | null; y: number | null } = { x, y };
      const droppable = getValidDroppableUnderMouse(moveEvent, draggableType ?? "any")
      if (droppable && droppable.getAttribute(CONTROLS_DRAGGABLE_ATTR)) {
        // let the droppable handle ghost positioning
      } else {
        if (onGhostPosition) pos = onGhostPosition(moveEvent, args);
        if (pos.y) ghost.style.top = `${pos.y}px`;
        if (pos.x) ghost.style.left = `${pos.x}px`;
      }

      onGhostRender?.(moveEvent, ghost, args);
    }

    moveGhost(startEvent);

    document.addEventListener("dragover", moveGhost);

    onDragStart?.(startEvent, node);

    function cleanup() {
      ghost.remove();

      node.style.pointerEvents = initialPointerEvents;
      document.removeEventListener("dragover", moveGhost);
    }

    node.addEventListener(
      "dragend",
      (e) => {
        onDragEnd?.(e, node);
        // Clean up all ghosts for this drag operation
        const ghosts = document.querySelectorAll(`.dnd-ghost[data-drag-id="${dragId}"]`);
        ghosts.forEach(ghost => ghost.remove());

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

export function droppable(node: HTMLElement, { accepts, onDrop, onGhostPosition, onGhostRender }: DroppableParams = { accepts: [] }) {
  node.setAttribute(DROPPABLE_ACCEPTS_ATTR, accepts.join(","));
  if (onGhostPosition) node.setAttribute(CONTROLS_DRAGGABLE_ATTR, "true");

  function handleDragEnter(enterEvent: DragEvent) {
    enterEvent.preventDefault();
    node.addClass("drop-active");
  }

  function handleDragOver(overEvent: DragEvent) {
    overEvent.preventDefault();

    // Find the specific ghost for this drag operation
    const ghost = document.querySelector(`.dnd-ghost`) as HTMLElement;
    if (!ghost) return;

    if (onGhostPosition || onGhostRender) {
      // Get critical positioning data from the ghost
      const dragType = ghost.getAttribute("data-draggable-type");
      const dragAxis = ghost.getAttribute("data-drag-axis") || "both";

      // Create positioning arguments similar to draggable's implementation
      const rect = ghost.getBoundingClientRect();
      const args: DragData = {
        node: ghost as HTMLElement,
        newX: overEvent.clientX,
        newY: overEvent.clientY,
        startX: rect.left,
        startY: rect.top,
        offsetX: rect.left - overEvent.clientX,
        offsetY: rect.top - overEvent.clientY,
        axis: dragAxis as "both" | "x" | "y"
      };

      // Let droppable control positioning
      if (onGhostPosition) {

        const pos = onGhostPosition(overEvent, args);
        ghost.style.left = `${pos.x}px`;
        ghost.style.top = `${pos.y}px`;
      }

      onGhostRender?.(overEvent, ghost as HTMLElement, args);
    }
  }

  function handleDragLeave(leaveEvent: DragEvent) {
    leaveEvent.preventDefault();
    node.removeClass("drop-active");
  }

  function handleDrop(dropEvent: DragEvent) {
    dropEvent.preventDefault();
    node.removeClass("drop-active");

    const dataTransfer = dropEvent.dataTransfer;
    if (!dataTransfer) return;

    // Extract data from the draggable element
    const dragType = dataTransfer.getData("text/type");
    const dragData = dataTransfer.getData("text/data");

    if (dragType && accepts.includes(dragType)) {
      onDrop?.(dropEvent, node, {
        type: dragType,
        data: dragData ? JSON.parse(dragData) : null,
        context: node.dataset.context ? JSON.parse(node.dataset.context) : null
      });
    }
  }

  node.addEventListener("dragenter", handleDragEnter);
  node.addEventListener("dragover", handleDragOver);
  node.addEventListener("dragleave", handleDragLeave);
  node.addEventListener("drop", handleDrop);

  return {
    destroy() {
      node.removeEventListener("dragenter", handleDragEnter);
      node.removeEventListener("dragover", handleDragOver);
      node.removeEventListener("dragleave", handleDragLeave);
      node.removeEventListener("drop", handleDrop);
    }
  }
}

function copyComputedSize(source: HTMLElement, target: HTMLElement) {
  const computedStyle = window.getComputedStyle(source);
  target.style.width = computedStyle.width;
  target.style.height = computedStyle.height;
}

function getValidDroppableUnderMouse(event: DragEvent, type: string): HTMLElement | null {
  const elemUnderCursor = document.elementFromPoint(event.clientX, event.clientY);
  if (!elemUnderCursor) return null;

  const dropZone = elemUnderCursor.closest(`[${DROPPABLE_ACCEPTS_ATTR}]`) as HTMLElement | null;
  if (!dropZone) {
    return null;
  }

  // Extract accepted types from data attribute
  const acceptedTypes = dropZone.dataset.droppableAccepts?.split(",").map(type => type.trim()) || [];

  // Check if dropzone accepts this type
  if (acceptedTypes.includes("*") || acceptedTypes.includes(type)) {
    return dropZone;
  }

  return null;
}


//#region TYPES

type DragOptions = { axis?: "both" | "x" | "y"; };
export type DragData = {
  node: HTMLElement,
  newX: number | null,
  newY: number | null,
  startX: number,
  startY: number,
  offsetX: number,
  offsetY: number
} & DragOptions
type DraggableParams<T> = {
  type: string,
  data?: T;
  onDragStart?: (event: DragEvent, node: HTMLElement) => void;
  onDragEnd?: (event: DragEvent, node: HTMLElement) => void;
  onGhostRender?: GhostRenderFunction;
  onGhostPosition?: GhostPositionFunction;
  devDelay?: number;
} & DragOptions

type DroppableParams = {
  accepts: string[];
  onDrop?: (event: DragEvent, node: HTMLElement, data: any) => void;
  onGhostRender?: GhostRenderFunction;
  onGhostPosition?: GhostPositionFunction;
  onIndicatorRender?: (event: DragEvent, indicator: HTMLElement) => void;
}

export type GhostRenderFunction = (event: DragEvent, ghost: HTMLElement, args: DragData) => void;
export type GhostPositionFunction = (event: DragEvent, args: DragData) => { x: number | null, y: number | null };

//#endregion
