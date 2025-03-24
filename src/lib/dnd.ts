/* TODO
1. Add animation support for ghosts (spring back to original position on failed drop)
2. Add animation support for original node (spring to new position on successful drop)
*/

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
};

export function draggable<T>(
  node: HTMLElement,
  {
    type,
    data,
    onDragStart,
    onDragEnd,
    onGhostRender,
    onGhostPosition,
    axis = "both",
    devDelay,
    handle,
  }: DraggableParams<T>
) {
  node.setAttribute("draggable", "true");
  node.addClass("dnd-draggable");
  if (handle) handle.addClass("dnd-handle");

  let isDragging = false;
  let startX: number, startY: number, offsetX: number, offsetY: number;
  let ghost: HTMLElement;

  // Handle both mouse and touch start events
  function handleStart(event: MouseEvent | TouchEvent) {

    const isTouch = event.type === "touchstart";
    const clientX = isTouch ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = isTouch ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;

    if (handle && event.target !== handle) return;

    // Cancel the default event
    event.preventDefault();
    event.stopPropagation();

    isDragging = true;

    // Create ghost
    ghost = node.cloneNode(true) as HTMLElement;
    ghost.setAttribute("draggable", "false");
    ghost.removeClass("dnd-draggable");
    ghost.addClass("dnd-ghost");

    copyComputedSize(node, ghost);

    // Prevent pointer events on the original node while dragging
    const initialPointerEvents = node.style.pointerEvents;
    setTimeout(() => {
      node.style.pointerEvents = "none";
    }, 0);

    // Get initial cursor offset
    const rect = node.getBoundingClientRect();
    startX = rect.left;
    startY = rect.top;
    offsetX = rect.left - clientX;
    offsetY = rect.top - clientY;

    document.body.appendChild(ghost);

    // Dispatch custom dnd-dragstart event
    const dragStartEvent = new DragStartEvent({ type, data, node, ghost });
    node.dispatchEvent(dragStartEvent);

    let dropTarget: HTMLElement | null;
    let lastDropTarget: HTMLElement | null;
    function moveGhost(moveEvent: MouseEvent | TouchEvent) {
      if (!isDragging) return;

      const isTouchMove = moveEvent.type.includes("touch");
      const moveClientX = isTouchMove ? (moveEvent as TouchEvent).touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const moveClientY = isTouchMove ? (moveEvent as TouchEvent).touches[0].clientY : (moveEvent as MouseEvent).clientY;

      // Reset state-styling
      ghost.removeClass("valid-drop");
      ghost.removeClass("invalid-drop");
      const gotDroppable = getValidDroppableUnderMouse({ clientX: moveClientX, clientY: moveClientY } as DragEvent, type ?? "any");
      dropTarget = gotDroppable?.dropTarget;
      let dropTargetValid = gotDroppable?.isValid;

      const args = {
        node,
        ghost,
        axis,
        newX: moveClientX,
        newY: moveClientY,
        startX,
        startY,
        offsetX,
        offsetY,
      };

      const dragDetail = { type, data, node, ghost };

      // When target changes, dispatch leave/enter events  
      if (dropTarget !== lastDropTarget) {
        // Dispatch leave on previous target
        if (lastDropTarget) {
          const leaveEvent = new DragLeaveEvent(dragDetail);
          lastDropTarget.dispatchEvent(leaveEvent);
        }

        // Dispatch enter on new target
        if (dropTarget) {
          const enterEvent = new DragEnterEvent(dragDetail);
          dropTarget.dispatchEvent(enterEvent);
        }
      }

      if (dropTarget) {
        // Always dispatch dragover on current target (if exists)
        const overEvent = new DragOverEvent(dragDetail);
        dropTarget.dispatchEvent(overEvent);

        // Apply state-styling
        if (dropTargetValid) {
          ghost.addClass("valid-drop");
          dropTarget = dropTarget;
        } else {
          ghost.addClass("invalid-drop");
        }
      }

      // Update last target reference
      lastDropTarget = dropTarget;


      if (!dropTargetValid || !dropTarget?.getAttribute(CONTROLS_DRAGGABLE_ATTR)) {
        // Default ghost position to cursor
        let { x, y } = DefaultGhostPosition({ clientX: moveClientX, clientY: moveClientY } as DragEvent, args);

        args.newX = x ?? args.newX;
        args.newY = y ?? args.newY;

        if (onGhostPosition) {
          let pos: { x: number | null; y: number | null } = { x: args.newX, y: args.newY };
          pos = onGhostPosition({ clientX: moveClientX, clientY: moveClientY } as DragEvent, args);
          x = pos.x;
          y = pos.y;
        }

        ghost.style.left = `${x}px`;
        ghost.style.top = `${y}px`;
      } else {
        // Let the drop-target handle positioning
      }

      onGhostRender?.({ clientX: moveClientX, clientY: moveClientY } as DragEvent, ghost, args);
    }

    moveGhost(event);

    document.addEventListener("mousemove", moveGhost);
    document.addEventListener("touchmove", moveGhost, { passive: false });

    onDragStart?.(event as DragEvent, node);

    function cleanup() {
      isDragging = false;
      document.removeEventListener("mousemove", moveGhost);
      document.removeEventListener("touchmove", moveGhost);

      if (devDelay) {
        setTimeout(() => {
          ghost.remove();
          node.style.pointerEvents = initialPointerEvents;
        }, devDelay);
      } else {
        ghost.remove();
        node.style.pointerEvents = initialPointerEvents;
      }
    }

    function handleEnd(event: MouseEvent | TouchEvent) {
      const isTouchEnd = event.type.includes("touch");
      const clientX = isTouchEnd ? (event as TouchEvent).changedTouches[0].clientX : (event as MouseEvent).clientX;
      const clientY = isTouchEnd ? (event as TouchEvent).changedTouches[0].clientY : (event as MouseEvent).clientY;

      onDragEnd?.(event as DragEvent, node);

      if (dropTarget) {
        const custEvt = new DropEvent({
          type,
          node,
          ghost,
          data,
        });

        dropTarget.dispatchEvent(custEvt);
      }

      cleanup();
    }

    document.addEventListener("mouseup", handleEnd, { once: true });
    document.addEventListener("touchend", handleEnd, { once: true });
  }

  node.addEventListener("mousedown", handleStart);
  node.addEventListener("touchstart", handleStart, { passive: false });

  return {
    update(newProps: DraggableParams<any>) {
      axis = newProps.axis ?? axis;
      data = newProps.data ?? data;
      type = newProps.type;
    },
    destroy() {
      node.removeEventListener("mousedown", handleStart);
      node.removeEventListener("touchstart", handleStart);
    },
  };
}

export function droppable(node: HTMLElement, { accepts, onDrop, onGhostPosition, onGhostRender }: DroppableParams = { accepts: [] }) {
  node.setAttribute(DROPPABLE_ACCEPTS_ATTR, accepts.join(","));
  if (onGhostPosition) node.setAttribute(CONTROLS_DRAGGABLE_ATTR, "true");

  node.setAttribute("droppable", "true");
  node.addClass("dnd-droppable");

  function handleDragEnter(event: DragEnterEvent) {
    event.preventDefault();

    const { type } = event.detail;

    // Apply state-styling
    if (accepts.includes(type)) {
      node.addClass("valid-drop");
    } else {
      node.addClass("invalid-drop");
    }
  }

  function handleDragOver(event: DragOverEvent) {
    event.preventDefault();

    const { type } = event.detail;

    // Apply state-styling
    if (accepts.includes(type)) {
      node.addClass("valid-drop");
    } else {
      node.addClass("invalid-drop");
    }
  }

  function handleDragLeave(event: DragLeaveEvent) {
    event.preventDefault();

    // Reset state-styling
    node.removeClass("valid-drop");
    node.removeClass("invalid-drop");
  }

  function handleDrop(event: DropEvent) {
    event.preventDefault();

    // Reset state-styling
    node.removeClass("valid-drop");
    node.removeClass("invalid-drop");

    const { type } = event.detail;

    // Check if the drop is valid
    if (accepts.includes(type)) {
      onDrop?.(event);
    }
  }

  node.addEventListener(dragenterEventName, handleDragEnter);
  node.addEventListener(dragoverEventName, handleDragOver);
  node.addEventListener(dragleaveEventName, handleDragLeave);
  node.addEventListener(dropEventName, handleDrop);

  return {
    destroy() {
      node.removeEventListener(dragenterEventName, handleDragEnter);
      node.removeEventListener(dragoverEventName, handleDragOver);
      node.removeEventListener(dragleaveEventName, handleDragLeave);
      node.removeEventListener(dropEventName, handleDrop);
    },
  };
}

//#region Utilities

function copyComputedSize(source: HTMLElement, target: HTMLElement) {
  const computedStyle = window.getComputedStyle(source);
  target.style.width = computedStyle.width;
  target.style.height = computedStyle.height;
}

const skip = ["position", "pointer-events", "z-index", "cursor"];
function copyComputedStyle(source: HTMLElement, target: HTMLElement) {
  const computedStyle = window.getComputedStyle(source);
  for (const key in computedStyle) {
    if (key in skip) continue;
    if (Object.prototype.hasOwnProperty.call(computedStyle, key)) {
      target.style[key] = computedStyle[key];
    }
  }
}

function getValidDroppableUnderMouse(event: DragEvent, type: string): { isValid: boolean; dropTarget: HTMLElement | null } {
  const elemUnderCursor = document.elementFromPoint(event.clientX, event.clientY);
  if (!elemUnderCursor) return { isValid: false, dropTarget: null };

  const dropZone = elemUnderCursor.closest(`[${DROPPABLE_ACCEPTS_ATTR}]`) as HTMLElement | null;
  if (!dropZone) {
    return { isValid: false, dropTarget: null };
  }

  // Extract accepted types from data attribute
  const acceptedTypes = dropZone.dataset.droppableAccepts?.split(",").map((type) => type.trim()) || [];

  // Check if dropzone accepts this type
  if (acceptedTypes.includes("*") || acceptedTypes.includes(type)) {
    return { isValid: true, dropTarget: dropZone };
  } else {
    return { isValid: false, dropTarget: dropZone };
  }
}

//#endregion

//#region Types

const dragstartEventName = "dnd-dragstart"
const dragenterEventName = "dnd-dragenter"
const dragoverEventName = "dnd-dragover"
const dragleaveEventName = "dnd-dragleave"
const dropEventName = "dnd-drop"

interface DragEventDetail<T = any> {
  type: string;
  data?: T;
  node: HTMLElement;
  ghost: HTMLElement;
}

export class DragStartEvent<T = any> extends CustomEvent<DragEventDetail<T>> {
  constructor(detail: DragEventDetail<T>) {
    super("dnd-dragstart", { detail });
  }
}

export class DragEnterEvent<T = any> extends CustomEvent<DragEventDetail<T>> {
  constructor(detail: DragEventDetail<T>) {
    super("dnd-dragenter", { detail });
  }
}

export class DragOverEvent<T = any> extends CustomEvent<DragEventDetail<T>> {
  constructor(detail: DragEventDetail<T>) {
    super("dnd-dragover", { detail });
  }
}

export class DragLeaveEvent<T = any> extends CustomEvent<DragEventDetail<T>> {
  constructor(detail: DragEventDetail<T>) {
    super("dnd-dragleave", { detail });
  }
}

export class DropEvent<T = any> extends CustomEvent<DragEventDetail<T>> {
  constructor(detail: DragEventDetail<T>) {
    super("dnd-drop", { detail });
  }
}

type DragOptions = { axis?: "both" | "x" | "y" };
export type DragData = {
  node: HTMLElement;
  ghost: HTMLElement;
  newX: number | null;
  newY: number | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
} & DragOptions;

type DraggableParams<T> = {
  type: string;
  data?: T;
  onDragStart?: (event: DragEvent, node: HTMLElement) => void;
  onDragEnd?: (event: DragEvent, node: HTMLElement) => void;
  onGhostRender?: GhostRenderFunction;
  onGhostPosition?: GhostPositionFunction;
  devDelay?: number;
  handle?: HTMLElement;
} & DragOptions;

type DroppableParams = {
  accepts: string[];
  onDrop?: (event: DropEvent) => void;
  onGhostRender?: GhostRenderFunction;
  onGhostPosition?: GhostPositionFunction;
  onIndicatorRender?: (event: DragEvent, indicator: HTMLElement) => void;
};

export type GhostRenderFunction = (event: DragEvent, ghost: HTMLElement, args: DragData) => void;
export type GhostPositionFunction = (event: DragEvent, args: DragData) => { x: number | null; y: number | null };

interface DropEventDetail {
  type: string;
  data: any;
  node: HTMLElement;
  ghost: HTMLElement;
}

//#endregion