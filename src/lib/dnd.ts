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
    type,
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

    // Create ghost with unique drag ID
    let ghost = node.cloneNode(true) as HTMLElement;
    ghost.setAttribute("draggable", "false");
    ghost.removeClass("dnd-draggable");
    ghost.addClass("dnd-ghost");

    // Store axis information for droppables
    ghost.setAttribute("data-drag-axis", axis);

    copyComputedSize(node, ghost);

    document.body.appendChild(ghost);

    let validDroppable: HTMLElement | null;
    function moveGhost(moveEvent: DragEvent) {
      validDroppable = getValidDroppableUnderMouse(moveEvent, type ?? "any")
      const args = {
        node,
        ghost,
        axis,
        newX: moveEvent.clientX,
        newY: moveEvent.clientY,
        ...startData
      };

      if (validDroppable && validDroppable.getAttribute(CONTROLS_DRAGGABLE_ATTR)) {
        // let the droppable handle ghost positioning
      } else {
        let { x, y } = DefaultGhostPosition(moveEvent, args);

        args.newX = x ?? args.newX;
        args.newY = y ?? args.newY;

        if (onGhostPosition) {
          let pos: { x: number | null; y: number | null } = { x: args.newX, y: args.newY };
          pos = onGhostPosition(moveEvent, args);
          x = pos.x;
          y = pos.y;
        }

        ghost.style.left = `${x}px`;
        ghost.style.top = `${y}px`;
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

    function handleDrop(dropEvent: DragEvent) {
      dropEvent.stopPropagation();

      onDragEnd?.(dropEvent, node);
      if (dropEvent.defaultPrevented) return;

      if (validDroppable == null) return;

      const custEvt = new CustomEvent<DropEventDetail>(dropEventName, {
        detail: {
          type,
          node,
          ghost,
          data
        }
      });

      validDroppable.dispatchEvent(custEvt);

      // Clean up all ghosts for this drag operation
      const ghosts = document.querySelectorAll(`.dnd-ghost`);
      ghosts.forEach(ghost => ghost.remove());

      if (devDelay) setTimeout(() => {
        cleanup();
      }, devDelay);
      else
        cleanup();

    }
    node.addEventListener(
      "dragend",
      handleDrop,
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
      // Create positioning arguments similar to draggable's implementation
      const rect = ghost.getBoundingClientRect();
      const args: DragData = {
        node: overEvent.target as HTMLElement,
        ghost,
        newX: overEvent.clientX,
        newY: overEvent.clientY,
        startX: rect.left,
        startY: rect.top,
        offsetX: rect.left - overEvent.clientX,
        offsetY: rect.top - overEvent.clientY,
      };

      // Let droppable control positioning
      if (onGhostPosition) {
        const pos = onGhostPosition(overEvent, args);
        if (pos.x) ghost.style.left = `${pos.x}px`;
        if (pos.y) ghost.style.top = `${pos.y}px`;
      }

      onGhostRender?.(overEvent, ghost as HTMLElement, args);
    }
  }

  function handleDragLeave(leaveEvent: DragEvent) {
    leaveEvent.preventDefault();
    node.removeClass("drop-active");
  }

  function handleDrop(dropEvent: DropEvent) {
    if (!(dropEvent instanceof CustomEvent)) return

    dropEvent.preventDefault();
    node.removeClass("drop-active");

    if (accepts.includes(dropEvent.detail.type)) {
      onDrop?.(dropEvent);
    }
  }

  node.addEventListener("dragenter", handleDragEnter);
  node.addEventListener("dragover", handleDragOver);
  node.addEventListener("dragleave", handleDragLeave);
  node.addEventListener(dropEventName, handleDrop);

  return {
    destroy() {
      node.removeEventListener("dragenter", handleDragEnter);
      node.removeEventListener("dragover", handleDragOver);
      node.removeEventListener("dragleave", handleDragLeave);
      node.removeEventListener(dropEventName, handleDrop);
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
  ghost: HTMLElement,
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
  onDrop?: (event: DropEvent) => void;
  onGhostRender?: GhostRenderFunction;
  onGhostPosition?: GhostPositionFunction;
  onIndicatorRender?: (event: DragEvent, indicator: HTMLElement) => void;
}

export type GhostRenderFunction = (event: DragEvent, ghost: HTMLElement, args: DragData) => void;
export type GhostPositionFunction = (event: DragEvent, args: DragData) => { x: number | null, y: number | null };

export const dropEventName = "dnd-drop";
interface DropEventDetail { type: string, data: any, node: HTMLElement, ghost: HTMLElement }
export type DropEvent = CustomEvent<DropEventDetail>;
//#endregion
