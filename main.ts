import { Plugin } from "obsidian";
import { TimeBlockModal } from "./src/ui/TimeBlockModal";
import { TimeBlockSettingsTab } from "./src/settings";
import { DAILY_NOTES, DEFAULT_SETTINGS, getDailyNoteSettings, getPeriodicNoteSettings, PERIODIC_NOTES, pluginExists, type TimeBlockPlannerSettings } from "./src/utilities";

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

        // Import settings from Daily Notes or Periodic Notes if available
        this.importExistingSettings();
    }

    private importExistingSettings() {
        // Check for Periodic Notes plugin first
        if (pluginExists(PERIODIC_NOTES)) {
            const dailySettings = getPeriodicNoteSettings('daily');
            if (dailySettings.format) {
                this.settings.daily.format = dailySettings.folder + '/' + dailySettings.format;
            }

            const weeklySettings = getPeriodicNoteSettings('weekly');
            if (weeklySettings.format) {
                this.settings.weekly.format = weeklySettings.folder + '/' + weeklySettings.format;
            }

            const monthlySettings = getPeriodicNoteSettings('monthly');
            if (monthlySettings.format) {
                this.settings.monthly.format = monthlySettings.folder + '/' + monthlySettings.format;
            }
        }
        // Fall back to Daily Notes plugin
        else if (pluginExists(DAILY_NOTES)) {
            const dailySettings = getDailyNoteSettings();
            if (dailySettings.format) {
                this.settings.daily.format = dailySettings.folder + '/' + dailySettings.format;
            }
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
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