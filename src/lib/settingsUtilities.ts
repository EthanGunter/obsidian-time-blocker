import { get } from "svelte/store";
import { moment } from "obsidian";
import { pluginStore } from "src/stores/plugin";
import { error } from "./logger";


export const DEFAULT_SETTINGS: TimeBlockPlannerSettings = {
    periodFileFormats: {
        daily: {
            enabled: true,
            filepathFormat: '[Journal/Daily/]YYYY-MM-DD',
        },
        weekly: {
            enabled: true,
            filepathFormat: '[Journal/Weekly/]gggg-[W]ww',
        },
        monthly: {
            enabled: false,
            filepathFormat: '[Journal/Monthly/]YYYY-MM',
        },
        quarterly: {
            enabled: false,
            filepathFormat: '[Journal/Monthly/]YYYY-MM',
        },
        yearly: {
            enabled: false,
            filepathFormat: '[Journal/Yearly/]YYYY',
        }
    },
    taskHeaderName: "tasks",
    viewSettings: {
        increment: "15-min"
    },
    behaviorSettings: {
        deleteTasksWhenMoving: false
    }
};

export const PERIODIC_NOTES = "periodic-notes";
export interface PeriodicNotesSettings {
    enabled: boolean;
    folder: string;
    format: string;
    plugin: string;
    template: string;
}
export const DAILY_NOTES = "daily-notes";


export function pluginExists(pluginId: string): boolean {
    return getPluginInstance(pluginId) != null;
}

/** Get format and folder settings for a specific period from Periodic Notes */
export function getPeriodicNoteSettings(period: Period): PlannerSetting {
    const plugin = getPluginInstance(PERIODIC_NOTES);
    const periodicSettings: PeriodicNotesSettings = plugin?.settings?.[period];

    let filepathFormat;
    if (periodicSettings) {
        if (periodicSettings.format) {
            filepathFormat = `[${periodicSettings.folder}/]${periodicSettings.format}`;
        } else {
            filepathFormat = DEFAULT_SETTINGS.periodFileFormats[period].filepathFormat;
        }
        return { ...periodicSettings, templatePath: periodicSettings.template, enabled: periodicSettings.enabled, filepathFormat, plugin: PERIODIC_NOTES };
    }
    throw new Error('Periodic notes plugin not found or settings not available');
    error('Periodic notes plugin not found or settings not available');
}

/** Get daily note settings from Daily Notes plugin if available */
/* export function getDailyNoteSettings(): PlannerSetting {
    error(`Daily notes plugin support not implemented due to inaccessible settings api`);
    throw new Error("Daily notes plugin support not implemented due to inaccessible settings api");
    const plugin = getPluginInstance(DAILY_NOTES);
    const settings = plugin?.settings;

    let pluginName;
    if (settings) {
        pluginName = DAILY_NOTES;
    }

    return { ...settings, plugin: pluginName };
} */

//#region Internal Helpers

/** Get plugin instance by ID from Obsidian's plugin registry */
function getPluginInstance(pluginId: string): any | null {
    // Extend Window type to include Obsidian's app property
    const app = get(pluginStore).app as Record<string, any>;
    return app?.plugins?.getPlugin(pluginId) || null;
}

//#endregion
