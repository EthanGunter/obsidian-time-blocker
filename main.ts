import { Plugin } from "obsidian";
import { TimeBlockModal } from "./src/ui/TimeBlockModal";
import { TimeBlockSettingsTab, DEFAULT_SETTINGS, type TimeBlockPlannerSettings } from "./src/settings";
import { hasDailyNotesPlugin, hasPeriodicNotesPlugin, getDailyNoteSettings, getPeriodicNoteSettings } from "./src/utilities";

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
        if (hasPeriodicNotesPlugin()) {
            const dailySettings = getPeriodicNoteSettings('daily');
            if (dailySettings.format) {
                this.settings.daily.format = dailySettings.format;
                this.settings.daily.folder = dailySettings.folder;
            }
            
            const weeklySettings = getPeriodicNoteSettings('weekly');
            if (weeklySettings.format) {
                this.settings.weekly.format = weeklySettings.format;
                this.settings.weekly.folder = weeklySettings.folder;
            }
            
            const monthlySettings = getPeriodicNoteSettings('monthly');
            if (monthlySettings.format) {
                this.settings.monthly.format = monthlySettings.format;
                this.settings.monthly.folder = monthlySettings.folder;
            }
        } 
        // Fall back to Daily Notes plugin
        else if (hasDailyNotesPlugin()) {
            const dailySettings = getDailyNoteSettings();
            if (dailySettings.format) {
                this.settings.daily.format = dailySettings.format;
                this.settings.daily.folder = dailySettings.folder;
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
