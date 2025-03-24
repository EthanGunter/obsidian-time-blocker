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
    devDelay: devDelay,
    handle
  }: DraggableParams<T>
) {
  node.setAttribute("draggable", "true");
  node.addClass("dnd-draggable");
  if (handle) handle.addClass("dnd-handle");

  function handleDragStart(startEvent: DragEvent) {
    if (handle && startEvent.target != handle) return;
    if (!startEvent.dataTransfer) return;
    startEvent.dataTransfer.effectAllowed = "move";

    // Create ghost 
    // TODO with unique drag ID
    let ghost = node.cloneNode(true) as HTMLElement;
    ghost.setAttribute("draggable", "false");
    ghost.removeClass("dnd-draggable");
    ghost.addClass("dnd-ghost");

    // TODO: Fetch styles from .dnd-ghost defintion
    copyComputedSize(node, ghost);

    // Prevent pointer events on the original node while dragging
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

      validDroppable ? ghost.addClass('valid-drop') : ghost.removeClass('valid-drop');

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

    async function cleanup() {
      if (devDelay) await new Promise(res => setTimeout(res, devDelay))

      ghost.remove();

      node.style.pointerEvents = initialPointerEvents;
      document.removeEventListener("dragover", moveGhost);
    }

    function handleDrop(dropEvent: DragEvent) {
      dropEvent.stopPropagation();

      onDragEnd?.(dropEvent, node);
      if (dropEvent.defaultPrevented || validDroppable == null) {
        cleanup();
        return;
      }

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
    update(newProps: DraggableParams<any>) {
      axis = newProps.axis ?? axis;
      data = newProps.data ?? data;
      type = newProps.type;
    },
    destroy() {
      node.removeEventListener("dragstart", handleDragStart);
    }
  };
}

export function droppable(node: HTMLElement, { accepts, onDrop, onGhostPosition, onGhostRender }: DroppableParams = { accepts: [] }) {
  node.setAttribute(DROPPABLE_ACCEPTS_ATTR, accepts.join(","));
  if (onGhostPosition) node.setAttribute(CONTROLS_DRAGGABLE_ATTR, "true");

  node.setAttribute("droppable", "true");
  node.addClass("dnd-droppable");

  function handleDragEnter(enterEvent: DragEvent) {
    enterEvent.preventDefault();
    console.log(enterEvent.detail);

    // if (accepts.includes(enterEvent.detail.type)) node.addClass("valid-drop");
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
    node.removeClass("valid-drop");
    node.removeClass("invalid-drop");
  }

  function handleDrop(dropEvent: DropEvent) {
    console.log("Handling drop");
    if (!(dropEvent instanceof CustomEvent)) return

    dropEvent.preventDefault();
    node.removeClass("valid-drop");
    node.removeClass("invalid-drop");
    console.log("Removed [in]valid-drop classes");

    if (accepts.includes(dropEvent.detail.type)) {
      onDrop?.(dropEvent);
    }
  }

  node.addEventListener(enterEventName, handleDragEnter);
  node.addEventListener(overEventName, handleDragOver);
  node.addEventListener(leaveEventName, handleDragLeave);
  node.addEventListener(dropEventName, handleDrop);

  return {
    destroy() {
      node.removeEventListener(enterEventName, handleDragEnter);
      node.removeEventListener(overEventName, handleDragOver);
      node.removeEventListener(leaveEventName, handleDragLeave);
      node.removeEventListener(dropEventName, handleDrop);
    }
  }
}


//#region Utilites

function copyComputedSize(source: HTMLElement, target: HTMLElement) {
  const computedStyle = window.getComputedStyle(source);
  target.style.width = computedStyle.width;
  target.style.height = computedStyle.height;
}

const skip = ["position", "pointer-events", "z-index", "cursor"]
function copyComputedStyle(source: HTMLElement, target: HTMLElement) {
  const computedStyle = window.getComputedStyle(source);
  for (const key in computedStyle) {
    if (key in skip) continue;
    if (Object.prototype.hasOwnProperty.call(computedStyle, key)) {
      target.style[key] = computedStyle[key];
    }
  }
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

//#endregion


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
  handle?: HTMLElement
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

export const enterEventName = "dragenter"; // Use the standard API for now
export const overEventName = "dragover"; // Use the standard API for now
export const leaveEventName = "dragleave"; // Use the standard API for now
export const dropEventName = "dnd-drop";
interface DropEventDetail { type: string, data: any, node: HTMLElement, ghost: HTMLElement }
export type DropEvent = CustomEvent<DropEventDetail>;

//#endregion
