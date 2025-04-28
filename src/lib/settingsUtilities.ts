import { get } from "svelte/store";
import { moment } from "obsidian";
import { pluginStore } from "src/stores/plugin";


export const DEFAULT_SETTINGS: TimeBlockPlannerSettings = {
    periodFileFormats: {
        daily: {
            enabled: true,
            format: '[Journal/Daily/]YYYY-MM-DD',
        },
        weekly: {
            enabled: true,
            format: '[Journal/Weekly/]gggg-[W]ww',
        },
        monthly: {
            enabled: false,
            format: '[Journal/Monthly/]YYYY-MM',
        },
        quarterly: {
            enabled: false,
            format: '[Journal/Monthly/]YYYY-MM',
        },
        yearly: {
            enabled: false,
            format: '[Journal/Yearly/]YYYY',
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
const PeriodicDefaults = {
    daily: { format: "YYYY-MM-DD" },
    weekly: { format: "gggg-[W]ww" },
    monthly: { format: "YYYY-MM" },
    quarterly: { format: "YYYY-[Q]Q" },
    yearly: { format: "YYYY" },
}
export const DAILY_NOTES = "daily-notes";


export function pluginExists(pluginId: string): boolean {
    return getPluginInstance(pluginId) != null;
}

/** Get format and folder settings for a specific period from Periodic Notes */
export function getPeriodicNoteSettings(period: Period): PlannerSetting {
    const plugin = getPluginInstance(PERIODIC_NOTES);
    const settings = plugin?.settings?.[period];

    let format, pluginName;
    if (settings) {
        if (!settings.format) format = PeriodicDefaults[period].format
        else if (settings.folder) format = `[${settings.folder}/]${settings.format}`;
        pluginName = PERIODIC_NOTES;
    }

    return { ...settings, format, plugin: pluginName };
}

/** Get daily note settings from Daily Notes plugin if available */
export function getDailyNoteSettings(): PlannerSetting {
    const plugin = getPluginInstance(DAILY_NOTES);
    const settings = plugin?.settings;
    let pluginName;
    if (settings) {
        pluginName = DAILY_NOTES;
    }

    return { ...settings, plugin: pluginName };
}

//#region Internal Helpers

/** Get plugin instance by ID from Obsidian's plugin registry */
function getPluginInstance(pluginId: string): any | null {
    // Extend Window type to include Obsidian's app property
    const app = get(pluginStore).app as Record<string, any>;
    return app?.plugins?.getPlugin(pluginId) || null;
}

//#endregion
