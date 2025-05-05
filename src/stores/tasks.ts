// stores/tasks.ts
import { writable, derived, get } from 'svelte/store';
import { type Vault, TFile, type EventRef } from 'obsidian';
import { getTasksFromFile } from 'src/lib/taskUtilities';
import { error } from 'src/lib/logger';

export type FileData =
    | { status: "pending" }
    | { status: "loaded", tasks: TaskDataWithFile[], content: string }

interface TaskStoreState {
    vault: Vault | null;
    files: Map<string, FileData>;
    watchers: Map<string, EventRef[]>;
    watcherCount: Map<string, number>;
}

function createTaskStore() {
    const { subscribe, set, update } = writable<TaskStoreState>({
        vault: null,
        files: new Map(),
        watchers: new Map(),
        watcherCount: new Map(),
    });

    let initialized = false;

    async function initialize(vault: Vault) {
        if (initialized) return;

        set({
            vault,
            files: new Map(),
            watchers: new Map(),
            watcherCount: new Map(),
        });
        initialized = true;
    }

    async function loadFileContent(filepath: string) {
        const state = get(store);
        if (!state.vault) return;

        const file = state.vault.getAbstractFileByPath(filepath);
        if (!file) {
            update(store => {
                store.files.set(filepath, { status: "pending" })
                return { ...store, files: store.files } // TODO I'm not sure this will trigger an update
            })
        } else if (file instanceof TFile) {
            try {
                const content = await state.vault.read(file);
                const sections = await getTasksFromFile(filepath);

                update(store => {
                    const newFiles = new Map(store.files);
                    newFiles.set(filepath, { status: "loaded", content, tasks: sections.flatMap(sec => sec.tasks) });
                    return { ...store, files: newFiles };
                });
            } catch (error) {
                console.error('Error reading file:', error);
            }
        }
    }

    function watchFile(filepath: string) {
        const state = get(store);
        if (!state.vault) return;

        const origCount = state.watcherCount.get(filepath) || 0;
        state.watcherCount.set(filepath, origCount + 1);

        if (origCount > 0) {
            return;
        }
        const addWatcher = state.vault.on('create', (changedFile) => {
            if (changedFile.path === filepath) {
                loadFileContent(filepath);
            }
        });
        const modifyWatcher = state.vault.on('modify', (changedFile) => {
            if (changedFile.path === filepath) {
                loadFileContent(filepath);
            }
        });
        const deleteWatcher = state.vault.on('delete', (changedFile) => {
            if (changedFile.path === filepath) {
                loadFileContent(filepath);
            }
        });

        update(store => {
            const newWatchers = new Map(store.watchers);
            newWatchers.set(filepath, [addWatcher, modifyWatcher, deleteWatcher]);
            return { ...store, watchers: newWatchers };
        });

        loadFileContent(filepath);
    }

    function unwatchFile(filepath: string) {
        update(store => {
            const count = store.watcherCount.get(filepath) || 0;
            const watchers = store.watchers.get(filepath);
            if (count > 0) {
                store.watcherCount.set(filepath, count - 1);
            }
            else if (watchers && store.vault) {
                for (const watcher of watchers) {
                    store.vault.offref(watcher);
                }

                store.watchers.delete(filepath);
                const newWatchers = new Map(store.watchers);

                store.watchers.delete(filepath);
                const newFiles = new Map(store.files);

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