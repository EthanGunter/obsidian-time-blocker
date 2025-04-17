import { setContext, getContext } from "svelte"; // Keep getContext for potential future use? Or remove? Let's remove for now.

// TODO: Add animation support for ghosts (spring back on failed drop) - Requires animation library integration
// TODO: Add animation support for original node (spring to new position on successful drop) - Requires animation library integration

const CONTROLS_DRAGGABLE_ATTR = "data-controls-draggable"; // Used by droppable to indicate it influences ghost position
const DROPPABLE_ACCEPTS_ATTR = "data-droppable-accepts";
const DRAG_GROUP_ID_ATTR = "data-drag-group-id"; // Marker for group boundaries

let nextGroupId = 0;
// Module-level store for Group APIs, replacing Svelte context for runtime access
const groupApis = new Map<number, GroupApi>();

// --- Drag Group Implementation ---

export function dragGroup(node: HTMLElement, params?: DragGroupParams) {
  const uniqueGroupId = nextGroupId++;
  node.dataset.dragGroupId = uniqueGroupId.toString();
  node.classList.add("dnd-group"); // Add class for potential styling/querying

  console.log("Initialized dragGroup:", uniqueGroupId, node);
  let currentlyDraggingNode: HTMLElement | null = null;
  let nodeOrigPointerEvents = node.style.pointerEvents;
  const members: HTMLElement[] = [];

  const notifyMemberDragStart = (draggingNode: HTMLElement) => {
    if (currentlyDraggingNode) {
      console.warn(
        `Group ${uniqueGroupId}: Received drag start for`,
        draggingNode,
        "while already tracking",
        currentlyDraggingNode
      );
      // TODO Optionally force-end the previous drag's state? Or ignore?
      // For now, let's assume this is expected behavior.
    }
    currentlyDraggingNode = draggingNode;
    console.log(`Group ${uniqueGroupId}: Drag started by`, draggingNode);

    // Query potential draggable elements within this group node
    const potentialMembers = node.querySelectorAll<HTMLElement>('[draggable="true"]');
    potentialMembers.forEach((member) => {
      // Check if *this* group node is the *closest* group ancestor
      const closestGroup = member.closest<HTMLElement>(
        `[${DRAG_GROUP_ID_ATTR}]`
      );
      if (closestGroup === node) {
        members.push(member);
      }
    });

    nodeOrigPointerEvents = node.style.pointerEvents;

    // Define the default behavior
    const defaultPointerEventLogic = () => {
      console.log(
        `Group ${uniqueGroupId}: Running default pointer event logic`
      );
      node.style.pointerEvents = "none"; // Disable the group's pointer handling
    };

    // Check for and call the user override stored in the API object
    const userOverride = groupApi._internal_onMemberDragStart; // Access stored override
    if (userOverride) {
      console.log(`Group ${uniqueGroupId}: Calling onMemberDragStart override`);
      userOverride(
        { draggingNode, groupNode: node, groupMembers: members },
        defaultPointerEventLogic);
    } else {
      // No override, run default logic
      defaultPointerEventLogic();
    }
  };

  const notifyMemberDragEnd = (draggingNode: HTMLElement) => {
    if (currentlyDraggingNode !== draggingNode) {
      console.warn(
        `Group ${uniqueGroupId}: Received drag end for`,
        draggingNode,
        "but was tracking",
        currentlyDraggingNode
      );
      // Don't clean up if it's not the node we were tracking
      return;
    }
    console.log(`Group ${uniqueGroupId}: Drag ended by`, draggingNode);

    // Define default cleanup behavior
    const defaultCleanupLogic = () => {
      console.log(
        `Group ${uniqueGroupId}: Running default pointer event cleanup`
      );
      node.style.pointerEvents = nodeOrigPointerEvents; // Restore pointer handling 
    };

    // Check for and call the user override stored in the API object
    const userOverride = groupApi._internal_onMemberDragEnd; // Access stored override
    if (userOverride) {
      console.log(`Group ${uniqueGroupId}: Calling onMemberDragEnd override`);
      userOverride(
        { draggingNode, groupNode: node, groupMembers: members },
        defaultCleanupLogic);
    } else {
      // No override, run default cleanup
      defaultCleanupLogic();
    }

    // Reset tracking state
    currentlyDraggingNode = null;
  };

  const groupApi: GroupApi = {
    groupNode: node,
    groupId: uniqueGroupId,
    notifyMemberDragStart, // Expose the handler
    notifyMemberDragEnd, // Expose the handler
    // Store overrides internally for the handlers to access
    _internal_onMemberDragStart: params?.onMemberDragStart,
    _internal_onMemberDragEnd: params?.onMemberDragEnd,
  };

  // Register the API in the module-level map
  groupApis.set(uniqueGroupId, groupApi);

  return {
    update(newParams?: DragGroupParams) {
      const currentApi = groupApis.get(uniqueGroupId);
      if (currentApi) {
        // Update the stored internal overrides
        currentApi._internal_onMemberDragStart = newParams?.onMemberDragStart;
        currentApi._internal_onMemberDragEnd = newParams?.onMemberDragEnd;
      }
    },
    destroy() {
      console.log("Destroying dragGroup:", uniqueGroupId, node);
      // If a drag is somehow ongoing when destroyed, try to clean up pointer events
      if (currentlyDraggingNode) {
        node.style.pointerEvents = nodeOrigPointerEvents
      }
      groupApis.delete(uniqueGroupId);
      node.removeAttribute(DRAG_GROUP_ID_ATTR);
      node.classList.remove("dnd-group");
    },
  };
}

// --- Draggable Implementation ---

export const DefaultGhostPosition: GhostPositionFunction = ({
  clientX,
  clientY,
  axis,
  startX,
  startY,
  offsetX,
  offsetY,
}) => {
  let x, y;

  // Position ghost dynamically based on axis constraint
  if (axis !== "y") x = clientX + offsetX;
  else x = startX; // Lock x

  if (axis !== "x") y = clientY + offsetY;
  else y = startY; // Lock y

  return { x, y };
};

export function draggable<T>(
  node: HTMLElement,
  {
    type: draggableType,
    data,
    onDragStart, // User callback for native event
    onDragEnd, // User callback for native event
    onGhostRender, // Consolidated callback for ghost appearance AND position
    axis = "both",
    devDelay,
  }: DraggableParams<T>
) {
  node.setAttribute("draggable", "true"); // Necessary for HTML drag API, though we override behavior
  node.classList.add("dnd-draggable");

  let isDragging = false;
  let startX: number, startY: number, offsetX: number, offsetY: number;
  let ghost: HTMLElement;

  // Handle both mouse and touch start events
  function handleStart(event: MouseEvent | TouchEvent) {
    const isTouch = event.type === "touchstart";
    const clientX = isTouch
      ? (event as TouchEvent).touches[0].clientX
      : (event as MouseEvent).clientX;
    const clientY = isTouch
      ? (event as TouchEvent).touches[0].clientY
      : (event as MouseEvent).clientY;

    // Prevent default actions like text selection or native drag
    event.preventDefault();
    event.stopPropagation();

    isDragging = true;

    // --- Group Logic: Just-in-Time Detection ---
    const groupElement = node.closest<HTMLElement>(`[${DRAG_GROUP_ID_ATTR}]`);
    let groupApi: GroupApi | undefined;

    if (groupElement && groupElement.dataset.dragGroupId) {
      const groupId = parseInt(groupElement.dataset.dragGroupId, 10);
      groupApi = groupApis.get(groupId);
      if (groupApi) {
        console.log("Draggable notifying group", groupId, "of drag start");
        // *** Notify the group that this node started dragging ***
        groupApi.notifyMemberDragStart(node);
      }
    }

    // Create ghost element
    ghost = node.cloneNode(true) as HTMLElement;
    ghost.setAttribute("draggable", "false"); // Prevent nested dragging
    ghost.classList.remove("dnd-draggable");
    ghost.classList.add("dnd-ghost");
    copyComputedSize(node, ghost); // Ensure ghost has same dimensions

    // Prevent pointer events on the original node while dragging its ghost
    const initialPointerEvents = node.style.pointerEvents;
    // Use timeout 0 to ensure this runs after other start logic potentially setting pointerEvents
    setTimeout(() => {
      node.style.pointerEvents = "none";
    }, 0);

    // Calculate initial cursor offset relative to the node's top-left corner
    const rect = node.getBoundingClientRect();
    startX = rect.left;
    startY = rect.top;
    offsetX = rect.left - clientX;
    offsetY = rect.top - clientY;

    document.body.appendChild(ghost); // Add ghost to the body

    // Dispatch custom dnd-dragstart event
    const dragStartEvent = new DragStartEvent({
      draggableType: draggableType ?? "unknown", // Provide a default type
      data,
      node,
      ghost,
      clientX,
      clientY,
    });
    node.dispatchEvent(dragStartEvent);

    // Call user's native drag start callback
    onDragStart?.(event as DragEvent, node); // Cast might be needed

    let dropTarget: DroppableElement | null = null;
    let lastDropTarget: DroppableElement | null = null;

    function moveGhost(moveEvent: MouseEvent | TouchEvent) {
      if (!isDragging) return;

      const isTouchMove = moveEvent.type.includes("touch");
      // Prevent scrolling on touch devices during drag
      if (isTouchMove) moveEvent.preventDefault();

      const clientX = isTouchMove
        ? (moveEvent as TouchEvent).touches[0].clientX
        : (moveEvent as MouseEvent).clientX;
      const clientY = isTouchMove
        ? (moveEvent as TouchEvent).touches[0].clientY
        : (moveEvent as MouseEvent).clientY;

      // Determine the potential drop target under the cursor
      ghost.classList.remove("valid-drop", "invalid-drop"); // Reset visual state
      const dropInfo = getValidDroppableUnderMouse(
        { clientX, clientY } as DragEvent, // Cast needed for elementFromPoint
        draggableType ?? "any"
      );
      dropTarget = dropInfo?.dropTarget ?? null;
      let dropTargetValid = dropInfo?.isValid;

      // Prepare data for positioning and rendering callbacks
      const posData: DragPositionData = {
        node,
        ghost,
        axis,
        clientX,
        clientY,
        newX: null, // Will be calculated
        newY: null, // Will be calculated
        startX,
        startY,
        offsetX,
        offsetY,
        overElement: dropTarget,
        groupApi: groupApi, // Pass group API if available
      };

      // --- Event Dispatching for Droppables ---
      const dragDetail: DndEventDetail = {
        draggableType: draggableType ?? "unknown",
        data,
        node,
        ghost,
        clientX,
        clientY,
      };

      if (dropTarget !== lastDropTarget) {
        if (lastDropTarget) {
          lastDropTarget.dispatchEvent(new DragLeaveEvent(dragDetail));
        }
        if (dropTarget) {
          dropTarget.dispatchEvent(new DragEnterEvent(dragDetail));
        }
      }
      if (dropTarget) {
        dropTarget.dispatchEvent(new DragOverEvent(dragDetail));
        // Apply visual state to ghost based on drop target validity
        ghost.classList.add(dropTargetValid ? "valid-drop" : "invalid-drop");
      }
      lastDropTarget = dropTarget;
      // --- End Event Dispatching ---


      // --- Ghost Positioning and Rendering ---
      let finalX: number | null = null;
      let finalY: number | null = null;

      // 1. Check if Droppable wants to control position
      if (dropTarget?.getAttribute(CONTROLS_DRAGGABLE_ATTR) && dropTarget._dnd_onGhostPosition) {
        const controlledPos = dropTarget._dnd_onGhostPosition(posData);
        finalX = controlledPos.x;
        finalY = controlledPos.y;
      } else {
        // 2. Default position calculation if droppable doesn't control
        const defaultPos = DefaultGhostPosition(posData);
        finalX = defaultPos.x;
        finalY = defaultPos.y;
      }

      // Update posData with the calculated position before passing to render callback
      posData.newX = finalX;
      posData.newY = finalY;

      // 3. Define the function to apply position (used by default or override)
      const setPosition = (x: number | null, y: number | null) => {
        ghost.style.left = x !== null ? `${x}px` : "";
        ghost.style.top = y !== null ? `${y}px` : "";
      };

      // 4. Call user's onGhostRender override (if provided)
      if (onGhostRender) {
        const renderDetail = {
          ghost,
          node,
          posData,
          setPosition,
        };
        onGhostRender(renderDetail);
        // User's override is responsible for calling setPosition if they want positioning
      } else {
        // 5. Default behavior: Apply the calculated position
        setPosition(finalX, finalY);
      }
      // --- End Ghost Positioning and Rendering ---
    }

    moveGhost(event); // Initial positioning

    // Add move listeners
    document.addEventListener("mousemove", moveGhost);
    document.addEventListener("touchmove", moveGhost, { passive: false }); // Need passive: false to preventDefault

    // --- Cleanup function ---
    function cleanup() {
      if (!isDragging) return; // Avoid cleanup if drag didn't properly start
      isDragging = false;

      document.removeEventListener("mousemove", moveGhost);
      document.removeEventListener("touchmove", moveGhost);

      if (groupApi) {
        console.log("Draggable notifying group", groupApi.groupId, "of drag end");
        groupApi.notifyMemberDragEnd(node);
      }

      // Remove ghost (with optional delay for debugging)
      if (devDelay) {
        setTimeout(() => ghost?.remove(), devDelay);
      } else {
        ghost?.remove();
      }

      // Restore original node's pointer events
      node.style.pointerEvents = initialPointerEvents || ""; // Restore original or remove

      // Remove end listeners (added below) - crucial to prevent leaks
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchend", handleEnd);
    }

    // --- End event handler ---
    function handleEnd(event: MouseEvent | TouchEvent) {
      if (!isDragging) return;

      const isTouchEnd = event.type.includes("touch");
      const clientX = isTouchEnd
        ? (event as TouchEvent).changedTouches[0].clientX
        : (event as MouseEvent).clientX;
      const clientY = isTouchEnd
        ? (event as TouchEvent).changedTouches[0].clientY
        : (event as MouseEvent).clientY;

      // Final check for drop target at the exact drop point
      const finalDropInfo = getValidDroppableUnderMouse(
        { clientX, clientY } as DragEvent,
        draggableType ?? "any"
      );
      const finalDropTarget = finalDropInfo?.dropTarget;
      const finalDropValid = finalDropInfo?.isValid;

      // Call user's native drag end callback
      onDragEnd?.(event as DragEvent, node);

      // Dispatch custom drop event if dropped on a valid target
      if (finalDropTarget && finalDropValid) {
        const dropEvent = new DropEvent({
          draggableType: draggableType ?? "unknown",
          node,
          ghost, // Pass ghost in case drop handler needs info from it
          data,
          clientX,
          clientY,
        });
        finalDropTarget.dispatchEvent(dropEvent);
      } else {
        // TODO Handle failed drop (e.g., trigger ghost return animation)
        console.log("Drop failed or occurred outside a valid target.");
      }

      // Perform cleanup regardless of drop success
      cleanup();
    }

    // Add end listeners to the document (capture phase might be better but usually not needed)
    // Using once: true might seem appealing but cleanup needs to remove these specifically
    // in case the drag ends unexpectedly (e.g., focus loss). The cleanup function handles removal.
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchend", handleEnd);
  } // End handleStart

  // Attach start listeners to the node
  node.addEventListener("mousedown", handleStart);
  node.addEventListener("touchstart", handleStart, { passive: false }); // passive: false needed for preventDefault

  return {
    update(newProps: DraggableParams<any>) {
      // Update configurable properties
      axis = newProps.axis ?? axis;
      data = newProps.data ?? data;
      draggableType = newProps.type;
      onDragStart = newProps.onDragStart;
      onDragEnd = newProps.onDragEnd;
      onGhostRender = newProps.onGhostRender;
      devDelay = newProps.devDelay;
      // Note: Group association is determined at drag start, cannot be updated dynamically this way.
    },
    destroy() {
      // Remove event listeners
      node.removeEventListener("mousedown", handleStart);
      node.removeEventListener("touchstart", handleStart);
      // No group unregister needed as API is looked up dynamically
      node.classList.remove("dnd-draggable");
      node.removeAttribute("draggable");
    },
  };
}

// --- Droppable Implementation ---

export function droppable(
  node: DroppableElement,
  {
    accepts = ["*"], // Default to accepting anything
    onDrop,
    onGhostPosition, // Keep for droppable-controlled ghost positioning
  }: DroppableParams
) {
  node.setAttribute(DROPPABLE_ACCEPTS_ATTR, accepts.join(","));
  node.classList.add("dnd-droppable");

  // Store the callback directly on the node (prefixed to avoid collisions)
  node._dnd_onGhostPosition = onGhostPosition;
  if (onGhostPosition) {
    // Add attribute to signal that this droppable controls ghost position
    node.setAttribute(CONTROLS_DRAGGABLE_ATTR, "true");
  } else {
    node.removeAttribute(CONTROLS_DRAGGABLE_ATTR);
  }

  // --- Custom Event Handlers ---
  function handleDragEnter(event: DragEnterEvent) {
    const { draggableType: type } = event.detail;
    // Apply visual feedback based on type match
    node.classList.toggle("valid-drop", matchesDndType(type, accepts));
    node.classList.toggle("invalid-drop", !matchesDndType(type, accepts));
  }

  function handleDragOver(event: DragOverEvent) {
    // Usually needed to continuously signal drop acceptance in native D&D,
    // but less critical with custom events. Still useful for styling.
    const { draggableType: type } = event.detail;
    node.classList.toggle("valid-drop", matchesDndType(type, accepts));
    node.classList.toggle("invalid-drop", !matchesDndType(type, accepts));
  }

  function handleDragLeave(event: DragLeaveEvent) {
    // Remove visual feedback when dragging leaves
    node.classList.remove("valid-drop", "invalid-drop");
  }

  function handleDrop(event: DropEvent) {
    // Remove visual feedback on drop
    node.classList.remove("valid-drop", "invalid-drop");
    const { draggableType: type } = event.detail;
    // Check type match one last time and call user's onDrop callback
    if (matchesDndType(type, accepts)) {
      onDrop?.(event);
    }
  }

  // Add listeners for custom DND events
  node.addEventListener(dragenterEventName, handleDragEnter as EventListener);
  node.addEventListener(dragoverEventName, handleDragOver as EventListener);
  node.addEventListener(dragleaveEventName, handleDragLeave as EventListener);
  node.addEventListener(dropEventName, handleDrop as EventListener);

  return {
    update(newParams: DroppableParams) {
      accepts = newParams.accepts ?? accepts;
      onDrop = newParams.onDrop ?? onDrop;
      onGhostPosition = newParams.onGhostPosition; // Update stored callback

      node.setAttribute(DROPPABLE_ACCEPTS_ATTR, accepts.join(","));
      node._dnd_onGhostPosition = onGhostPosition;
      if (onGhostPosition) {
        node.setAttribute(CONTROLS_DRAGGABLE_ATTR, "true");
      } else {
        node.removeAttribute(CONTROLS_DRAGGABLE_ATTR);
      }
    },
    destroy() {
      // Remove listeners and cleanup attributes/properties
      node.removeEventListener(dragenterEventName, handleDragEnter as EventListener);
      node.removeEventListener(dragoverEventName, handleDragOver as EventListener);
      node.removeEventListener(dragleaveEventName, handleDragLeave as EventListener);
      node.removeEventListener(dropEventName, handleDrop as EventListener);
      node.classList.remove("dnd-droppable", "valid-drop", "invalid-drop");
      node.removeAttribute("droppable"); // Remove if previously set
      node.removeAttribute(DROPPABLE_ACCEPTS_ATTR);
      node.removeAttribute(CONTROLS_DRAGGABLE_ATTR);
      delete node._dnd_onGhostPosition; // Clean up property
    },
  };
}

//#region Utilities

export function matchesDndType(
  type: string | undefined,
  pattern: string | string[]
): boolean {
  if (!type) return false;

  const patterns = Array.isArray(pattern)
    ? pattern
    : pattern.split(",").map((p) => p.trim());

  for (const p of patterns) {
    if (p === type || p === "*") return true;
    if (p.endsWith("/*") && type.startsWith(p.slice(0, -2) + "/")) {
      return true;
    }
  }
  return false;
}

function copyComputedSize(source: HTMLElement, target: HTMLElement) {
  const computedStyle = window.getComputedStyle(source);
  target.style.width = computedStyle.width;
  target.style.height = computedStyle.height;
  target.style.boxSizing = computedStyle.boxSizing;
  // Add margin copy? Might be needed for accurate positioning in some layouts
  // target.style.margin = computedStyle.margin;
  // Position absolute is crucial for ghost positioning
  target.style.position = "absolute";
  target.style.zIndex = "9999"; // Ensure ghost is on top
  target.style.pointerEvents = "none"; // Ghost should not interfere with elementFromPoint
}

function getValidDroppableUnderMouse(
  event: { clientX: number; clientY: number }, // Simplified interface
  type: string
): { isValid: boolean; dropTarget: DroppableElement | null } | null {
  // Temporarily hide the ghost
  const ghost = document.querySelector(".dnd-ghost") as HTMLElement | null;
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

  if (!elemUnderCursor) return null;

  // Find the nearest droppable ancestor
  const dropZone = elemUnderCursor.closest<DroppableElement>(
    `[${DROPPABLE_ACCEPTS_ATTR}]`
  );

  if (!dropZone) return null;

  // Check if the found dropzone accepts the draggable type
  const accepts = dropZone.dataset.droppableAccepts || "";
  const isValid = matchesDndType(type, accepts);

  return { isValid, dropTarget: dropZone };
}

// Context key generation function (No longer used for runtime lookup)
// const getGroupContextKey = (id: number) => `drag-group-${id}`;

//#endregion

//#region Types

// --- Event Name Constants ---
const dragstartEventName = "dnd-dragstart";
const dragenterEventName = "dnd-dragenter";
const dragoverEventName = "dnd-dragover";
const dragleaveEventName = "dnd-dragleave";
const dropEventName = "dnd-drop";

// --- Core Detail Interface ---
interface DndEventDetail<T = any> {
  draggableType: string;
  data?: T;
  node: HTMLElement; // Original draggable node
  ghost: HTMLElement; // Ghost element
  clientX: number;
  clientY: number;
}

// --- Base Custom Event Class ---
export class DndDragEvent<
  TData = any,
  TDetail extends DndEventDetail<TData> = DndEventDetail<TData>,
> extends CustomEvent<TDetail> {
  constructor(
    eventName: string,
    detail: TDetail,
    eventInitDict?: CustomEventInit<TDetail>
  ) {
    super(eventName, {
      detail,
      bubbles: true, // Default to bubble
      composed: true, // Default to cross shadow DOM boundaries
      ...eventInitDict,
    });
  }
}

// --- Specific Event Classes ---
export class DragStartEvent<T = any> extends DndDragEvent<T> {
  constructor(detail: DndEventDetail<T>) {
    super(dragstartEventName, detail);
  }
}
export class DragEnterEvent<T = any> extends DndDragEvent<T> {
  constructor(detail: DndEventDetail<T>) {
    super(dragenterEventName, detail);
  }
}
export class DragOverEvent<T = any> extends DndDragEvent<T> {
  constructor(detail: DndEventDetail<T>) {
    super(dragoverEventName, detail);
  }
}
export class DragLeaveEvent<T = any> extends DndDragEvent<T> {
  constructor(detail: DndEventDetail<T>) {
    super(dragleaveEventName, detail);
  }
}
export class DropEvent<T = any> extends DndDragEvent<T> {
  constructor(detail: DndEventDetail<T>) {
    super(dropEventName, detail);
  }
}

// --- Supporting Interfaces and Types ---

interface DroppableElement extends HTMLElement {
  // Callback for droppable-controlled ghost positioning
  _dnd_onGhostPosition?: GhostPositionFunction;
}

type DragAxis = "both" | "x" | "y";

// Data passed to positioning/rendering callbacks
export type DragPositionData = {
  node: HTMLElement;
  ghost: HTMLElement;
  axis: DragAxis;
  clientX: number;
  clientY: number;
  newX: number | null; // Calculated target X
  newY: number | null; // Calculated target Y
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  overElement: DroppableElement | null; // The droppable currently under the ghost
  groupApi?: GroupApi; // API of the group the draggable belongs to (if any)
};

// Signature for the consolidated ghost rendering/positioning callback
export type GhostRenderFunction = (detail: {
  ghost: HTMLElement; // The ghost element
  node: HTMLElement; // The original draggable node
  posData: DragPositionData; // Current drag state and calculated position
  setPosition: (x: number | null, y: number | null) => void; // Function to apply position
}) => void;

// Signature for droppable-controlled ghost positioning callback
export type GhostPositionFunction = (
  args: DragPositionData
) => { x: number | null; y: number | null }; // Return new coordinates

// Parameters for the draggable action
type DraggableParams<T> = {
  type: string; // Type identifier
  data?: T; // Associated data payload
  onDragStart?: (event: DragEvent, node: HTMLElement) => void; // Native event hook
  onDragEnd?: (event: DragEvent, node: HTMLElement) => void; // Native event hook
  onGhostRender?: GhostRenderFunction; // Consolidated ghost callback
  axis?: DragAxis;
  devDelay?: number; // Debugging delay for ghost removal
};

// Parameters for the droppable action
type DroppableParams = {
  accepts?: string[]; // Types this droppable accepts
  onDrop?: (event: DropEvent) => void; // Callback on successful drop
  onGhostPosition?: GhostPositionFunction; // Callback for droppable-controlled positioning
};

// --- Drag-Group API ---

// API provided by the dragGroup action via the module map
// Renamed from GroupContextApi back to GroupApi for simplicity
export interface GroupApi {
  groupNode: HTMLElement;
  groupId: number;

  // Methods called by draggable
  notifyMemberDragStart: (draggingNode: HTMLElement) => void;
  notifyMemberDragEnd: (draggingNode: HTMLElement) => void;

  // Internal storage for user overrides
  _internal_onMemberDragStart?: DragGroupParams["onMemberDragStart"];
  _internal_onMemberDragEnd?: DragGroupParams["onMemberDragEnd"];
}

// Params for the dragGroup action, containing optional overrides
interface DragGroupParams {
  onMemberDragStart?: (
    detail: {
      draggingNode: HTMLElement;
      groupNode: HTMLElement;
      groupMembers: HTMLElement[];
    },
    defaultFn: () => void
  ) => void;
  onMemberDragEnd?: (
    detail: {
      draggingNode: HTMLElement;
      groupNode: HTMLElement;
      groupMembers: HTMLElement[];
    },
    defaultFn: () => void
  ) => void;
}

//#endregion
