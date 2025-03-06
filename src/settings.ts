import { App, moment, PluginSettingTab, Setting } from "obsidian";
import TimeBlockPlugin from "../main";
import { hasDailyNotesPlugin, hasPeriodicNotesPlugin } from "./utilities";

export interface TimeBlockPlannerSettings {
    daily: {
        enabled: boolean;
        format: string;
        folder: string;
        template?: string;
    };
    weekly: {
        enabled: boolean;
        format: string;
        folder: string;
        template?: string;
    };
    monthly: {
        enabled: boolean;
        format: string;
        folder: string;
        template?: string;
    };
}

export const DEFAULT_SETTINGS: TimeBlockPlannerSettings = {
    daily: {
        enabled: true,
        format: 'YYYY-MM-DD',
        folder: 'Daily Notes',
        template: ''
    },
    weekly: {
        enabled: true,
        format: 'gggg-[W]ww',
        folder: 'Weekly Reviews',
        template: ''
    },
    monthly: {
        enabled: true,
        format: 'YYYY-MM',
        folder: 'Monthly Reviews',
        template: ''
    }
};

function validateMomentFormat(format: string): boolean {
    try {
        moment().format(format);
        return true;
    } catch {
        return false;
    }
}

export class TimeBlockSettingsTab extends PluginSettingTab {
    plugin: TimeBlockPlugin;

    constructor(app: App, plugin: TimeBlockPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        const hasPeriodic = hasPeriodicNotesPlugin();
        const hasDaily = hasDailyNotesPlugin();

        // Show integration banner if neither plugin is installed
        if (!hasPeriodic && !hasDaily) {
            containerEl.createDiv('settings-banner', banner => {
                banner.createEl('h3', { text: 'Recommended Integration' });
                banner.createEl('p', {
                    text: 'For best results, install either the ',
                    cls: 'setting-item-description'
                });
                banner.createEl('a', {
                    text: 'Periodic Notes',
                    href: 'https://obsidian.md/plugins?id=periodic-notes'
                });
                banner.createEl('span', { text: ' or ' });
                banner.createEl('a', {
                    text: 'Daily Notes', 
                    href: 'https://obsidian.md/plugins?id=daily-notes'
                });
                banner.createEl('span', { text: ' plugin.' });
            });
        }

        // Daily Notes Section
        if (!hasPeriodic && !hasDaily) {
            this.createPeriodSection('daily', 'Day');
        }

        // Weekly Notes Section
        if (!hasPeriodic) {
            this.createPeriodSection('weekly', 'Week');
        }

        // Monthly Notes Section  
        if (!hasPeriodic) {
            this.createPeriodSection('monthly', 'Month');
        }
    }

    private createPeriodSection(period: 'daily'|'weekly'|'monthly', displayName: string) {
        const section = this.containerEl.createDiv('timeblock-period-section');
        section.createEl('h3', { text: `${displayName} Settings` });

        new Setting(section)
            .setName(`Enable ${displayName} Notes`)
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings[period].enabled)
                .onChange(async value => {
                    this.plugin.settings[period].enabled = value;
                    await this.plugin.saveSettings();
                }));

        if (this.plugin.settings[period].enabled) {
            new Setting(section)
                .setName(`${displayName} Format`)
                .setDesc(`Moment.js format pattern (e.g. ${this.plugin.settings[period].format})`)
                .addText(text => text
                    .setValue(this.plugin.settings[period].format)
                    .onChange(async value => {
                        if (!validateMomentFormat(value)) {
                            alert("Invalid date format");
                            return;
                        }
                        this.plugin.settings[period].format = value;
                        await this.plugin.saveSettings();
                    }))
                .addExtraButton(btn =>
                    btn
                        .setIcon("info")
                        .setTooltip("Example: " + moment().format(this.plugin.settings[period].format))
                );

            new Setting(section)
                .setName(`${displayName} Folder`)
                .addText(text => text
                    .setValue(this.plugin.settings[period].folder)
                    .onChange(async value => {
                        this.plugin.settings[period].folder = value;
                        await this.plugin.saveSettings();
                    }));
                    
            new Setting(section)
                .setName(`Template file`)
                .setDesc(`Template for new ${displayName.toLowerCase()} notes`)
                .addText(text => text
                    .setPlaceholder("Templates/Periodic Notes.md")
                    .setValue(this.plugin.settings[period].template || "")
                    .onChange(async value => {
                        this.plugin.settings[period].template = value;
                        await this.plugin.saveSettings();
                    }));
        }
    }
}
