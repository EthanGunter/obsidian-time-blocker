// stores/tasks.ts
import { writable, derived, get } from 'svelte/store';
import { type Vault, TFile, type EventRef } from 'obsidian';
import { getTasksFromFile, parseTasks } from 'src/lib/taskUtilities';

interface FileData {
    content: string;
    tasks: TaskData[]; // Your parsed task type
}

interface TaskStoreState {
    vault: Vault | null;
    files: Map<string, FileData>;
    watchers: Map<string, EventRef>;
}

function createTaskStore() {
    const { subscribe, set, update } = writable<TaskStoreState>({
        vault: null,
        files: new Map(),
        watchers: new Map(),
    });

    let initialized = false;

    async function initialize(vault: Vault) {
        if (initialized) return;

        set({
            vault,
            files: new Map(),
            watchers: new Map(),
        });
        initialized = true;
    }

    async function loadFileContent(filepath: string) {
        const state = get(store);
        if (!state.vault) return;

        const file = state.vault.getAbstractFileByPath(filepath);
        if (!(file instanceof TFile)) return;

        try {
            const content = await state.vault.read(file);
            const tasks = await getTasksFromFile(filepath);

            update(store => {
                const newFiles = new Map(store.files);
                newFiles.set(filepath, { content, tasks });
                return { ...store, files: newFiles };
            });
        } catch (error) {
            console.error('Error reading file:', error);
        }
    }

    function watchFile(filepath: string) {
        const state = get(store);
        if (!state.vault || state.watchers.has(filepath)) return;

        const file = state.vault.getAbstractFileByPath(filepath);
        if (!(file instanceof TFile)) return;

        const watcher = state.vault.on('modify', (changedFile) => {
            if (changedFile.path === filepath) {
                loadFileContent(filepath);
            }
        });

        update(store => {
            const newWatchers = new Map(store.watchers);
            newWatchers.set(filepath, watcher);
            return { ...store, watchers: newWatchers };
        });

        loadFileContent(filepath);
    }

    function unwatchFile(filepath: string) {
        update(store => {
            const watcher = store.watchers.get(filepath);
            if (watcher && store.vault) {
                store.vault.offref(watcher);
                const newWatchers = new Map(store.watchers);
                newWatchers.delete(filepath);

                const newFiles = new Map(store.files);
                newFiles.delete(filepath);

                return { ...store, watchers: newWatchers, files: newFiles };
            }
            return store;
        });
    }

    function getFileData(filepath: string) {
        return derived({ subscribe }, ($store) => {
            return $store.files.get(filepath) || null;
        });
    }

    const store = {
        subscribe,
        initialize,
        watchFile,
        unwatchFile,
        getFileData,
    };

    return store;
}

export const taskStore = createTaskStore();