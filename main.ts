import { Plugin } from "obsidian";
import { TimeBlockModal } from "./src/ui/TimeBlockModal";
import { TimeBlockSettingsTab } from "./src/settings";
import { DAILY_NOTES, DEFAULT_SETTINGS, getDailyNoteSettings, getPeriodicNoteSettings, PERIODIC_NOTES, pluginExists, type Period, type TimeBlockPlannerSettings } from "./src/utilities";

export default class TimeBlockPlugin extends Plugin {
    settings: TimeBlockPlannerSettings;

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon("calendar-days", "Time Block Planner", () => {
            new TimeBlockModal(this.app, this).open();
        });

        this.addSettingTab(new TimeBlockSettingsTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        // Ensure all settings properties exist
        if (!this.settings.daily) {
            this.settings.daily = DEFAULT_SETTINGS.daily;
        }
        if (!this.settings.weekly) {
            this.settings.weekly = DEFAULT_SETTINGS.weekly;
        }
        if (!this.settings.monthly) {
            this.settings.monthly = DEFAULT_SETTINGS.monthly;
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    public getSetting(period: Period): { enabled: boolean; format: string; folder?: string; plugin?: string; } {
        // Daily notes could come from either plugin
        if (pluginExists(PERIODIC_NOTES)) {
            // All other periods come from Periodic Notes
            return getPeriodicNoteSettings(period);
        }
        else if (period === 'daily' && pluginExists(DAILY_NOTES)) {
            return getDailyNoteSettings();
        } else {
            if (!this.settings[period]) {
                this.settings[period] = DEFAULT_SETTINGS[period];
            }
            return this.settings[period];
        }
    }

    onunload() {
        // Cleanup any resources if needed
    }
}

declare global {
    interface Window {
        app?: any;
    }
}