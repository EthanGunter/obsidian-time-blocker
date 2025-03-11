import type { Action } from 'svelte/action';

// Constants for resizing calculations
const BLOCK_HEIGHT = 2; // rem
const BLOCK_SPAN = 60; // minutes
const SNAP_INCREMENT = 15; // minutes

interface DraggableParams<T> {
    data: T;
    type: string;
    effect?: 'move' | 'copy';
    dragClass?: string;
}

interface ResizableParams {
    direction: 'top' | 'bottom';
    onResize: (deltaMinutes: number) => void;
}

export const draggable: Action<HTMLElement, DraggableParams<unknown>> = (node, params) => {
    let data = params?.data;
    let type = params?.type;
    let isDragging = false;
    
    const handleDragStart = (e: DragEvent) => {
        // Prevent drag if we're clicking on a resize handle
        const target = e.target as HTMLElement;
        if (target.closest('.resize-handle')) {
            e.preventDefault();
            return;
        }
        
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = params?.effect || 'move';
            e.dataTransfer.setData('application/json', JSON.stringify({
                type,
                data
            }));
            
            node.classList.add(params?.dragClass || 'dragging');
        }
        
        isDragging = true;
        document.body.classList.add('no-select');
    };

    const handleDragEnd = () => {
        node.classList.remove(params?.dragClass || 'dragging');
        isDragging = false;
        document.body.classList.remove('no-select');
    };

    const handleTouchStart = () => {
        handleDragStart(new DragEvent('dragstart'));
    };

    const handleTouchEnd = () => {
        handleDragEnd();
    };

    node.draggable = true;
    node.style.cursor = 'grab';
    node.addEventListener('dragstart', handleDragStart);
    node.addEventListener('dragend', handleDragEnd);
    node.addEventListener('touchstart', handleTouchStart);
    node.addEventListener('touchend', handleTouchEnd);
    node.addEventListener('touchcancel', handleTouchEnd);

    return {
        update(newParams: DraggableParams<unknown>) {
            data = newParams.data;
            type = newParams.type;
        },
        destroy() {
            node.removeEventListener('dragstart', handleDragStart);
            node.removeEventListener('dragend', handleDragEnd);
            node.removeEventListener('touchstart', handleTouchStart);
            node.removeEventListener('touchend', handleTouchEnd);
            node.removeEventListener('touchcancel', handleTouchEnd);
        }
    };
};

interface DropzoneParams<T> {
    accept: string[];
    effect?: 'move' | 'copy';
    onDrop: (data: T, context: any) => void;
    hoverClass?: string;
    context?: any;
    enabled?: boolean;
}

export const resizable: Action<HTMLElement, ResizableParams> = (node, params) => {
    let isDragging = false;
    let startY = 0;

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
        e.stopPropagation();
        isDragging = true;
        startY = e instanceof TouchEvent ? e.touches[0].clientY : e.clientY;
        document.body.classList.add('no-select');
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('touchmove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchend', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        
        const clientY = e instanceof TouchEvent ? e.touches[0].clientY : e.clientY;
        const deltaY = clientY - startY;
        const deltaMinutes = Math.round((deltaY / (BLOCK_HEIGHT * 16)) * BLOCK_SPAN); // 16px = 1rem
        const snappedDelta = Math.round(deltaMinutes / SNAP_INCREMENT) * SNAP_INCREMENT;
        
        if (snappedDelta !== 0) {
            params.onResize(params.direction === 'top' ? -snappedDelta : snappedDelta);
            startY = clientY;
        }
    };

    const handleMouseUp = () => {
        isDragging = false;
        document.body.classList.remove('no-select');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchend', handleMouseUp);
    };

    node.addEventListener('mousedown', handleMouseDown);
    node.addEventListener('touchstart', handleMouseDown);

    return {
        update(newParams: ResizableParams) {
            params = newParams;
        },
        destroy() {
            node.removeEventListener('mousedown', handleMouseDown);
            node.removeEventListener('touchstart', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('touchmove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchend', handleMouseUp);
        }
    };
};

export const dropzone: Action<HTMLElement, DropzoneParams<any>> = (node, params) => {
    let isActive = false;
    
    const handleDragOver = (e: DragEvent) => {
        if (params?.enabled === false) return;
        e.preventDefault();
        if (!e.dataTransfer) return;
        e.dataTransfer.dropEffect = params?.effect || 'move';
    };

    const handleDragEnter = (e: DragEvent) => {
        if (params?.enabled === false) return;
        if (!(e.target instanceof HTMLElement)) return;
        node.classList.add(params?.hoverClass || 'drop-active');
        isActive = true;
        node.dispatchEvent(new CustomEvent('dragenter'));
    };

    const handleDragLeave = (e: DragEvent) => {
        if (params?.enabled === false) return;
        if (!(e.target instanceof HTMLElement)) return;
        node.classList.remove(params?.hoverClass || 'drop-active');
        isActive = false;
        node.dispatchEvent(new CustomEvent('dragleave'));
    };

    const handleDrop = (e: DragEvent) => {
        if (params?.enabled === false) return;
        e.preventDefault();
        if (!e.dataTransfer) return;
        
        node.classList.remove(params?.hoverClass || 'drop-active');
        isActive = false;
        
        try {
            const transferData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (params?.accept.includes(transferData.type)) {
                params.onDrop(transferData.data, params.context);
                node.dispatchEvent(new CustomEvent('drop', { 
                    detail: { data: transferData.data, context: params.context }
                }));
            }
        } catch (error) {
            console.error('Drop data parsing failed:', error);
            node.dispatchEvent(new CustomEvent('error', { detail: error }));
        }
    };

    node.addEventListener('dragover', handleDragOver);
    node.addEventListener('dragenter', handleDragEnter);
    node.addEventListener('dragleave', handleDragLeave);
    node.addEventListener('drop', handleDrop);

    return {
        update(newParams: DropzoneParams<unknown>) {
            params = newParams;
        },
        destroy() {
            node.removeEventListener('dragover', handleDragOver);
            node.removeEventListener('dragenter', handleDragEnter);
            node.removeEventListener('dragleave', handleDragLeave);
            node.removeEventListener('drop', handleDrop);
        }
    };
};
