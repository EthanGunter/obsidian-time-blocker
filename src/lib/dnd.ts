import type { Action } from 'svelte/action';

interface DraggableParams<T> {
    data: T;
    type: string;
    effect?: 'move' | 'copy';
    dragClass?: string;
}

export const draggable: Action<HTMLElement, DraggableParams<unknown>> = (node, params) => {
    let data = params?.data;
    let type = params?.type;
    
    const handleDragStart = (e: DragEvent) => {
        if (!e.dataTransfer) return;
        
        e.dataTransfer.effectAllowed = params?.effect || 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({
            type,
            data
        }));
        
        node.classList.add(params?.dragClass || 'dragging');
    };

    const handleDragEnd = () => {
        node.classList.remove(params?.dragClass || 'dragging');
    };

    node.draggable = true;
    node.style.cursor = 'grab';
    node.addEventListener('dragstart', handleDragStart);
    node.addEventListener('dragend', handleDragEnd);

    return {
        update(newParams: DraggableParams<unknown>) {
            data = newParams.data;
            type = newParams.type;
        },
        destroy() {
            node.removeEventListener('dragstart', handleDragStart);
            node.removeEventListener('dragend', handleDragEnd);
        }
    };
};

interface DropzoneParams<T> {
    accept: string[];
    effect?: 'move' | 'copy';
    onDrop: (data: T, event: DragEvent) => void;
    hoverClass?: string;
}

export const dropzone: Action<HTMLElement, DropzoneParams<unknown>> = (node, params) => {
    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (!e.dataTransfer) return;
        e.dataTransfer.dropEffect = params?.effect || 'move';
    };

    const handleDragEnter = (e: DragEvent) => {
        if (!(e.target instanceof HTMLElement)) return;
        node.classList.add(params?.hoverClass || 'drop-active');
    };

    const handleDragLeave = (e: DragEvent) => {
        if (!(e.target instanceof HTMLElement)) return;
        node.classList.remove(params?.hoverClass || 'drop-active');
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        if (!e.dataTransfer) return;
        
        node.classList.remove(params?.hoverClass || 'drop-active');
        
        try {
            const transferData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (params?.accept.includes(transferData.type)) {
                params.onDrop(transferData.data, e);
            }
        } catch (error) {
            console.error('Drop data parsing failed:', error);
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
