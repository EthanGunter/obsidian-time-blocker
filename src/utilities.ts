
type PlannerSetting = {
    plugin?: string;
    enabled: boolean;
    format: string;
}
export interface TimeBlockPlannerSettings {
    daily: PlannerSetting;
    weekly: PlannerSetting;
    monthly: PlannerSetting;
    quarterly: PlannerSetting;
    yearly: PlannerSetting;
}
export const DEFAULT_SETTINGS: TimeBlockPlannerSettings = {
    daily: {
        enabled: true,
        format: 'Journal/Daily/YYYY-MM-DD',
    },
    weekly: {
        enabled: true,
        format: 'Journal/Weekly/gggg-[W]ww',
    },
    monthly: {
        enabled: false,
        format: 'Journal/Monthly/YYYY-MM',
    },
    quarterly: {
        enabled: false,
        format: 'Journal/Monthly/YYYY-MM',
    },
    yearly: {
        enabled: false,
        format: 'Journal/Yearly/YYYY',
    }
};

interface NoteSettings {
    plugin: string;
    enabled: boolean;
    format: string;
    folder: string;
}
export const PERIODIC_NOTES = "periodic-notes";
const PeriodicDefaults = {
    daily: { format: "YYYY-MM-DD" },
    weekly: { format: "gggg-[W]ww" },
    monthly: { format: "YYYY-MM" },
    quarterly: { format: "YYYY-[Q]Q" },
    yearly: { format: "YYYY" },
}
export const DAILY_NOTES = "daily-notes";

export type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export function pluginExists(pluginId: string): boolean {
    console.log(pluginId, "exists:", getPluginInstance(pluginId) != null);

    return getPluginInstance(pluginId) != null;
}

/** Get format and folder settings for a specific period from Periodic Notes */
export function getPeriodicNoteSettings(period: Period): NoteSettings {
    const plugin = getPluginInstance(PERIODIC_NOTES);
    const settings = plugin?.settings?.[period];
    if (settings) {
        if (!settings.format) settings.format = PeriodicDefaults[period].format
        settings.plugin = PERIODIC_NOTES;
    }

    return settings;
}

/** Get daily note settings from Daily Notes plugin if available */
export function getDailyNoteSettings(): NoteSettings {
    const plugin = getPluginInstance(DAILY_NOTES);
    const settings = plugin?.settings;
    if (settings)
        settings.plugin = DAILY_NOTES;

    return settings;
}


//#region Internal Helpers

/** Get plugin instance by ID from Obsidian's plugin registry */
function getPluginInstance(pluginId: string): any | null {
    // Extend Window type to include Obsidian's app property
    const app = window.app as Record<string, any>;
    return app?.plugins?.getPlugin(pluginId) || null;
}

//#endregion