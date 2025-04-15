import { setContext, getContext } from "svelte";

// TODO  Add animation support for ghosts (spring back to original position on failed drop)
// TODO Add animation support for original node (spring to new position on successful drop)


const CONTROLS_DRAGGABLE_ATTR = "data-controls-draggable";
const DROPPABLE_ACCEPTS_ATTR = "data-droppable-accepts";
const DRAG_GROUP_ID_ATTR = "data-drag-group-id";

// --- Drag Group Implementation ---

let nextGroupId = 0;

// Context key generation function
const getGroupContextKey = (id: number) => `drag-group-${id}`;

// Information stored about each child in the group
interface ChildInfo {
  node: HTMLElement;
  originalPointerEvents: string | null; // Store original style
}

// API provided by the dragGroup action via context
interface GroupApi {
  register: (childNode: HTMLElement) => GroupContext;
  unregister: (childNode: HTMLElement) => void;
  notifyDragStart: (draggingChildNode: HTMLElement) => void;
  notifyDragEnd: (draggingChildNode: HTMLElement) => void;
}

// Context information returned to the child draggable
export interface GroupContext {
  groupNode: HTMLElement;
  getGroupMembers: () => HTMLElement[];
}

// Params for the dragGroup action (currently none needed)
interface DragGroupParams { }

// Map to store original pointer-events for group members during drag
const groupOriginalPointerEvents = new Map<HTMLElement, string | null>();

export function dragGroup(node: HTMLElement, params?: DragGroupParams) {
  const uniqueGroupId = nextGroupId++;
  node.dataset.dragGroupId = uniqueGroupId.toString();

  const childMap = new Map<HTMLElement, ChildInfo>();
  let currentlyDraggingNode: HTMLElement | null = null;

  const groupApi: GroupApi = {
    register: (childNode) => {
      childMap.set(childNode, {
        node: childNode,
        originalPointerEvents: childNode.style.pointerEvents || null,
      });
      // Return context for the child
      return {
        groupNode: node,
        getGroupMembers: () => Array.from(childMap.keys()),
      };
    },
    unregister: (childNode) => {
      childMap.delete(childNode);
      groupOriginalPointerEvents.delete(childNode); // Clean up stored style too
    },
    notifyDragStart: (draggingChildNode) => {
      currentlyDraggingNode = draggingChildNode;
      childMap.forEach((info, child) => {
        if (child !== draggingChildNode) {
          // Store original style before overriding
          groupOriginalPointerEvents.set(
            child,
            child.style.pointerEvents || null
          );
          child.style.pointerEvents = "none";
        }
      });
    },
    notifyDragEnd: (draggingChildNode) => {
      if (currentlyDraggingNode === draggingChildNode) {
        currentlyDraggingNode = null;
        childMap.forEach((info, child) => {
          if (child !== draggingChildNode) {
            // Restore original style
            const originalStyle = groupOriginalPointerEvents.get(child);
            if (originalStyle !== undefined) {
              if (originalStyle === null) {
                child.style.removeProperty("pointer-events");
              } else {
                child.style.pointerEvents = originalStyle;
              }
              groupOriginalPointerEvents.delete(child); // Clean up map entry
            } else {
              // Fallback if somehow original wasn't stored
              child.style.removeProperty("pointer-events");
            }
          }
        });
      }
    },
  };

  setContext(getGroupContextKey(uniqueGroupId), groupApi);

  return {
    destroy() {
      // Cleanup primarily driven by children calling unregister
      // Clear any remaining stored styles just in case
      groupOriginalPointerEvents.clear();
    },
  };
}

// --- Draggable Implementation ---

export const DefaultGhostPosition: GhostPositionFunction = ({ clientX, clientY, axis, startX, startY, offsetX, offsetY }) => {
  let x, y;

  // Position ghost dynamically
  if (axis !== "y") x = clientX + offsetX;
  else x = startX;

  if (axis !== "x") y = clientY + offsetY;
  else y = startY;

  return { x, y };
};

export function draggable<T>(
  node: HTMLElement,
  {
    type: draggableType,
    data,
    onDragStart,
    onDragEnd,
    onGhostRender,
    onGhostPosition,
    axis = "both",
    devDelay,
  }: DraggableParams<T> // Removed 'handle'
) {
  node.setAttribute("draggable", "true");
  node.classList.add("dnd-draggable"); // Use classList for modern browsers

  let isDragging = false;
  let startX: number, startY: number, offsetX: number, offsetY: number;
  let ghost: HTMLElement;

  // --- Group Integration ---
  let groupApi: GroupApi | null = null;
  let groupContext: GroupContext | null = null;

  const groupElement = node.closest<HTMLElement>(`[${DRAG_GROUP_ID_ATTR}]`);
  if (groupElement && groupElement.dataset.dragGroupId) {
    try {
      const groupId = parseInt(groupElement.dataset.dragGroupId, 10);
      const contextKey = getGroupContextKey(groupId);
      const retrievedApi = getContext<GroupApi | undefined>(contextKey);

      if (retrievedApi) {
        groupApi = retrievedApi;
        // Register with the group and store the returned context
        groupContext = groupApi.register(node);
      }
    } catch (e) {
      console.error("Failed to get drag group context:", e);
    }
  }
  // --- End Group Integration ---

  // Handle both mouse and touch start events
  function handleStart(event: MouseEvent | TouchEvent) {
    // Removed handle check: if (handle && event.target !== handle) return;

    const isTouch = event.type === "touchstart";
    const clientX = isTouch
      ? (event as TouchEvent).touches[0].clientX
      : (event as MouseEvent).clientX;
    const clientY = isTouch
      ? (event as TouchEvent).touches[0].clientY
      : (event as MouseEvent).clientY;

    // Cancel the default event
    // Only prevent default for mouse events to allow touch scrolling etc.
    // if (!isTouch) {
    //   event.preventDefault();
    // }
    // Let's prevent default always for now to ensure drag starts reliably
    event.preventDefault();
    event.stopPropagation();

    isDragging = true;

    // --- Group Notification ---
    if (groupApi) {
      groupApi.notifyDragStart(node);
    }
    // --- End Group Notification ---

    // Create ghost
    ghost = node.cloneNode(true) as HTMLElement;
    ghost.setAttribute("draggable", "false");
    ghost.classList.remove("dnd-draggable");
    ghost.classList.add("dnd-ghost");

    copyComputedSize(node, ghost);

    // Prevent pointer events on the original node while dragging
    const initialPointerEvents = node.style.pointerEvents;
    // Use timeout 0 to ensure this runs after other start logic
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
    const dragStartEvent = new DragStartEvent({ draggableType, data, node, ghost, clientX, clientY });
    node.dispatchEvent(dragStartEvent);

    let dropTarget: DroppableElement | null;
    let lastDropTarget: DroppableElement | null;
    function moveGhost(moveEvent: MouseEvent | TouchEvent) {
      if (!isDragging) return;

      const isTouchMove = moveEvent.type.includes("touch");
      // TODO?  Prevent scrolling on touch devices during drag
      if (isTouchMove) moveEvent.preventDefault();

      const clientX = isTouchMove
        ? (moveEvent as TouchEvent).touches[0].clientX
        : (moveEvent as MouseEvent).clientX;
      const clientY = isTouchMove
        ? (moveEvent as TouchEvent).touches[0].clientY
        : (moveEvent as MouseEvent).clientY;

      // Reset state-styling
      ghost.classList.remove("valid-drop");
      ghost.classList.remove("invalid-drop");
      const gotDroppable = getValidDroppableUnderMouse(
        { clientX: clientX, clientY: clientY } as DragEvent,
        draggableType ?? "any"
      );
      dropTarget = gotDroppable?.dropTarget;
      let dropTargetValid = gotDroppable?.isValid;

      const args: DragPositionData = {
        node,
        ghost,
        axis,
        clientX,
        clientY,
        newX: clientX,
        newY: clientY,
        startX,
        startY,
        offsetX,
        offsetY,
        overElement: dropTarget,
        groupContext, // Include group context
      };

      const dragDetail: DndEventDetail = { draggableType, data, node, ghost, clientX, clientY };

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
          ghost.classList.add("valid-drop");
          // dropTarget = dropTarget; // This line seems redundant
        } else {
          ghost.classList.add("invalid-drop");
        }
      }

      // Update last target reference
      lastDropTarget = dropTarget;

      if (dropTarget?.getAttribute(CONTROLS_DRAGGABLE_ATTR) && dropTarget._dnd_onGhostPosition) {
        // Let the drop-target handle positioning

        const { x, y } = dropTarget._dnd_onGhostPosition(args);
        args.newX = x ?? args.newX;
        args.newY = y ?? args.newY;
      }
      else if (dropTargetValid) {
        // Default ghost position to cursor
        let { x, y } = DefaultGhostPosition(
          args
        );

        args.newX = x ?? args.newX;
        args.newY = y ?? args.newY;

        if (onGhostPosition) {
          let pos: { x: number | null; y: number | null } = {
            x: args.newX,
            y: args.newY,
          };
          // Pass groupContext to onGhostPosition
          pos = onGhostPosition(args);
          x = pos.x;
          y = pos.y;
        }

      } else {
        const { x, y } = DefaultGhostPosition(args);
        args.newX = x ?? args.newX;
        args.newY = y ?? args.newY;
      }

      ghost.style.left = args.newX !== null ? `${args.newX}px` : "";
      ghost.style.top = args.newY !== null ? `${args.newY}px` : "";
      // Pass groupContext to onGhostRender
      onGhostRender?.(ghost, args);
    }

    moveGhost(event); // Initial positioning

    document.addEventListener("mousemove", moveGhost);
    document.addEventListener("touchmove", moveGhost, { passive: false }); // Need passive: false to preventDefault

    onDragStart?.(event as DragEvent, node);

    function cleanup() {
      isDragging = false;
      document.removeEventListener("mousemove", moveGhost);
      document.removeEventListener("touchmove", moveGhost);

      // --- Group Notification ---
      if (groupApi) {
        groupApi.notifyDragEnd(node);
      }
      // --- End Group Notification ---

      if (devDelay) {
        setTimeout(() => {
          ghost?.remove(); // Add null check for safety
          node.style.pointerEvents = initialPointerEvents || ""; // Restore original or remove
        }, devDelay);
      } else {
        ghost?.remove(); // Add null check for safety
        node.style.pointerEvents = initialPointerEvents || ""; // Restore original or remove
      }
    }

    function handleEnd(event: MouseEvent | TouchEvent) {
      if (!isDragging) return; // Prevent cleanup if drag never really started

      const isTouchEnd = event.type.includes("touch");
      // Use changedTouches for touchend
      const clientX = isTouchEnd
        ? (event as TouchEvent).changedTouches[0].clientX
        : (event as MouseEvent).clientX;
      const clientY = isTouchEnd
        ? (event as TouchEvent).changedTouches[0].clientY
        : (event as MouseEvent).clientY;

      // Recalculate drop target one last time for accuracy at drop point
      const finalDropInfo = getValidDroppableUnderMouse(
        { clientX, clientY } as DragEvent,
        draggableType ?? "any"
      );
      const finalDropTarget = finalDropInfo?.dropTarget;
      const finalDropValid = finalDropInfo?.isValid;

      onDragEnd?.(event as DragEvent, node);

      if (finalDropTarget && finalDropValid) {
        const custEvt = new DropEvent({
          draggableType: draggableType,
          node,
          ghost, // Ghost might be needed for drop animation/info
          data,
          clientX,
          clientY
        });
        finalDropTarget.dispatchEvent(custEvt);
      } else {
        // Handle failed drop (e.g., animate ghost back) - TODO
      }

      cleanup(); // Perform cleanup regardless of drop success

      // Remove event listeners added in handleStart
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchend", handleEnd);
    }

    // Use { once: true } for cleanup listeners
    document.addEventListener("mouseup", handleEnd, { once: true });
    document.addEventListener("touchend", handleEnd, { once: true });
  }

  node.addEventListener("mousedown", handleStart);
  node.addEventListener("touchstart", handleStart, { passive: false }); // passive: false needed for preventDefault

  return {
    update(newProps: DraggableParams<any>) {
      axis = newProps.axis ?? axis;
      data = newProps.data ?? data;
      draggableType = newProps.type;
      // Note: Cannot update group association dynamically this way easily
    },
    destroy() {
      node.removeEventListener("mousedown", handleStart);
      node.removeEventListener("touchstart", handleStart);
      // --- Group Unregistration ---
      if (groupApi) {
        groupApi.unregister(node);
      }
      // --- End Group Unregistration ---
      node.classList.remove("dnd-draggable");
      node.removeAttribute("draggable");
    },
  };
}

// --- Droppable Implementation ---

export function droppable(
  node: DroppableElement,
  {
    accepts,
    onDrop,
    onGhostPosition, // Keep these for potential droppable-controlled ghost behavior
    onGhostRender,
  }: DroppableParams = { accepts: ["*"] }
) {
  node.setAttribute(DROPPABLE_ACCEPTS_ATTR, accepts.join(","));

  node._dnd_onGhostPosition = onGhostPosition;
  if (onGhostPosition) node.setAttribute(CONTROLS_DRAGGABLE_ATTR, "true");

  node.setAttribute("droppable", "true");
  node.classList.add("dnd-droppable");

  function handleDragEnter(event: DragEnterEvent) {
    // event.preventDefault(); // Not needed for custom events unless bubbling is an issue

    const { draggableType: type } = event.detail;

    // Apply state-styling
    if (matchesDndType(type, accepts)) {
      node.classList.add("valid-drop");
    } else {
      node.classList.add("invalid-drop");
    }
  }

  function handleDragOver(event: DragOverEvent) {
    // event.preventDefault(); // Not needed for custom events

    const { draggableType: type } = event.detail;

    // Apply state-styling (redundant with enter, but safe)
    if (matchesDndType(type, accepts)) {
      node.classList.add("valid-drop");
    } else {
      node.classList.add("invalid-drop");
    }
  }

  function handleDragLeave(event: DragLeaveEvent) {
    // event.preventDefault(); // Not needed for custom events

    // Reset state-styling
    node.classList.remove("valid-drop");
    node.classList.remove("invalid-drop");
  }

  function handleDrop(event: DropEvent) {
    // event.preventDefault(); // Not needed for custom events

    // Reset state-styling
    node.classList.remove("valid-drop");
    node.classList.remove("invalid-drop");

    const { draggableType: type } = event.detail;

    // Check if the drop is valid
    if (matchesDndType(type, accepts)) {
      onDrop?.(event);
    }
  }

  node.addEventListener(dragenterEventName, handleDragEnter as EventListener);
  node.addEventListener(dragoverEventName, handleDragOver as EventListener);
  node.addEventListener(dragleaveEventName, handleDragLeave as EventListener);
  node.addEventListener(dropEventName, handleDrop as EventListener);

  return {
    update(newParams: DroppableParams) {
      accepts = newParams.accepts ?? accepts;
      onDrop = newParams.onDrop ?? onDrop;
      onGhostPosition = newParams.onGhostPosition ?? onGhostPosition;
      onGhostRender = newParams.onGhostRender ?? onGhostRender;

      node.setAttribute(DROPPABLE_ACCEPTS_ATTR, accepts.join(","));
      node._dnd_onGhostPosition = undefined;
      if (onGhostPosition) {
        node.setAttribute(CONTROLS_DRAGGABLE_ATTR, "true");
      } else {
        node.removeAttribute(CONTROLS_DRAGGABLE_ATTR);
      }
    },
    destroy() {
      node.removeEventListener(
        dragenterEventName,
        handleDragEnter as EventListener
      );
      node.removeEventListener(
        dragoverEventName,
        handleDragOver as EventListener
      );
      node.removeEventListener(
        dragleaveEventName,
        handleDragLeave as EventListener
      );
      node.removeEventListener(dropEventName, handleDrop as EventListener);
      node.classList.remove("dnd-droppable");
      node.classList.remove("valid-drop");
      node.classList.remove("invalid-drop");
      node.removeAttribute("droppable");
      node.removeAttribute(DROPPABLE_ACCEPTS_ATTR);
      node.removeAttribute(CONTROLS_DRAGGABLE_ATTR);
      delete node._dnd_onGhostPosition;
    },
  };
}

//#region Utilities

export function matchesDndType(
  type: string | undefined,
  pattern: string | string[]
): boolean {
  if (!type) return false; // Cannot match an undefined type

  let patterns: string[];
  if (Array.isArray(pattern)) patterns = pattern;
  else patterns = pattern.split(",").map((p) => p.trim()); // Trim whitespace

  for (const p of patterns) {
    if (p === type) return true; // Exact match
    if (p === "*") return true; // Wildcard match all

    // Basic wildcard matching (e.g., "group/*" matches "group/item")
    if (p.endsWith("/*")) {
      const basePattern = p.slice(0, -2);
      if (type.startsWith(basePattern + "/")) {
        return true;
      }
    }
    // Add more complex pattern matching if needed (like **)
  }
  return false;
}

function copyComputedSize(source: HTMLElement, target: HTMLElement) {
  const computedStyle = window.getComputedStyle(source);
  target.style.width = computedStyle.width;
  target.style.height = computedStyle.height;
  // Optionally copy box-sizing to ensure width/height are interpreted correctly
  target.style.boxSizing = computedStyle.boxSizing;
}

// copyComputedStyle is generally not recommended for ghosts as it's heavy
// and can copy unwanted styles. Specific styles are usually better.
// function copyComputedStyle(source: HTMLElement, target: HTMLElement) { ... }

function getValidDroppableUnderMouse(
  event: DragEvent,
  type: string
): { isValid: boolean; dropTarget: DroppableElement | null } {
  // Temporarily hide the ghost to check what's underneath
  const ghost = document.querySelector(".dnd-ghost") as HTMLElement | null; // Assuming only one ghost
  let originalDisplay = "";
  if (ghost) {
    originalDisplay = ghost.style.display;
    ghost.style.display = "none";
  }

  const elemUnderCursor = document.elementFromPoint(
    event.clientX,
    event.clientY
  );

  // Restore ghost visibility
  if (ghost) {
    ghost.style.display = originalDisplay;
  }

  if (!elemUnderCursor) return { isValid: false, dropTarget: null };

  const dropZone = elemUnderCursor.closest<HTMLElement>(
    `[${DROPPABLE_ACCEPTS_ATTR}]`
  );
  if (!dropZone) {
    return { isValid: false, dropTarget: null };
  }

  // Check if dropzone accepts this type
  const accepts = dropZone.dataset.droppableAccepts || "";
  if (matchesDndType(type, accepts)) {
    return { isValid: true, dropTarget: dropZone };
  } else {
    return { isValid: false, dropTarget: dropZone }; // Return dropzone even if invalid type
  }
}

//#endregion

//#region Types

// --- Event Name Constants ---
const dragstartEventName = "dnd-dragstart";
const dragenterEventName = "dnd-dragenter";
const dragoverEventName = "dnd-dragover";
const dragleaveEventName = "dnd-dragleave";
const dropEventName = "dnd-drop";

// --- Core Detail Interface ---
// This defines the common structure for the event's detail payload
interface DndEventDetail<T = any> {
  draggableType: string; // The original draggable type identifier
  data?: T; // The data payload associated with the draggable
  node: HTMLElement; // The original draggable node
  ghost: HTMLElement; // The cloned ghost element being dragged
  clientX: number; // mouse x coordinate
  clientY: number; // mouse y coordinate
}

// --- Base Custom Event Class ---
// All specific DND events will extend this base class
export class DndDragEvent<
  TData = any,
  TDetail extends DndEventDetail<TData> = DndEventDetail<TData>,
> extends CustomEvent<TDetail> {
  constructor(
    eventName: string,
    detail: TDetail,
    eventInitDict?: CustomEventInit<TDetail>,
  ) {
    // Default bubbles and composed to true if not provided
    super(eventName, {
      detail,
      bubbles: true,
      composed: true,
      ...eventInitDict, // Allow overriding defaults if necessary
    });
  }
}

// --- Specific Event Classes Extending the Base ---

export class DragStartEvent<T = any> extends DndDragEvent<
  T,
  DndEventDetail<T>
> {
  constructor(detail: DndEventDetail<T>) {
    super(dragstartEventName, detail);
  }
}

export class DragEnterEvent<T = any> extends DndDragEvent<
  T,
  DndEventDetail<T>
> {
  constructor(detail: DndEventDetail<T>) {
    super(dragenterEventName, detail);
  }
}

export class DragOverEvent<T = any> extends DndDragEvent<
  T,
  DndEventDetail<T>
> {
  constructor(detail: DndEventDetail<T>) {
    super(dragoverEventName, detail);
  }
}

export class DragLeaveEvent<T = any> extends DndDragEvent<
  T,
  DndEventDetail<T>
> {
  constructor(detail: DndEventDetail<T>) {
    super(dragleaveEventName, detail);
  }
}

// DropEvent might have slightly different detail in the future,
// but for now, it uses the same base detail structure.
// If it diverges, you can create a specific DropEventDetail interface
// extending DndEventDetail and update the generic parameters here.
export class DropEvent<T = any> extends DndDragEvent<T, DndEventDetail<T>> {
  constructor(detail: DndEventDetail<T>) {
    super(dropEventName, detail);
  }
}

// --- Supporting Interfaces and Types (Mostly Unchanged) ---

interface DroppableElement extends HTMLElement {
  _dnd_onGhostPosition?: GhostPositionFunction; // Use a unique prefix
}

// Type for options passed to the draggable action
type DragOptions = {
  axis?: "both" | "x" | "y";
};

// Data passed to callback functions like onGhostRender/Position
// Renamed DragEventDetail to DndEventDetail above
export type DragPositionData = {
  node: HTMLElement;
  ghost: HTMLElement;
  clientX: number;
  clientY: number;
  newX: number | null;
  newY: number | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  overElement: HTMLElement | null;
  groupContext: GroupContext | null; // Added group context
} & DragOptions;


// Combined parameters for the draggable action
// Note: onDragStart/End still use native DragEvent. You might want to
// change these to use your custom events if appropriate for your logic.
type DraggableParams<T> = {
  type: string; // Identifier for the type of draggable item
  data?: T; // Optional data payload associated with the draggable
  onDragStart?: (event: DragEvent, node: HTMLElement) => void; // Native event
  onDragEnd?: (event: DragEvent, node: HTMLElement) => void; // Native event
  onGhostRender?: GhostRenderFunction; // Callback to customize ghost appearance
  onGhostPosition?: GhostPositionFunction; // Callback to customize ghost position
  devDelay?: number; // Optional delay for removing ghost (debugging)
} & DragOptions;

// Parameters for the droppable action
// onDrop now correctly uses the custom DropEvent type
type DroppableParams = {
  accepts: string[]; // Array of types this droppable accepts
  onDrop?: (event: DropEvent) => void; // Callback when a valid item is dropped
  onGhostRender?: GhostRenderFunction;
  onGhostPosition?: GhostPositionFunction;
};

// Signature for ghost rendering callback
// Still uses native DragEvent, adjust if needed
export type GhostRenderFunction = (
  ghost: HTMLElement, // The ghost element
  posData: DragPositionData, // Additional drag state data
) => void;

// Signature for ghost positioning callback
export type GhostPositionFunction = (args: DragPositionData) => { x: number | null; y: number | null }; // Return new coordinates

//#endregion

