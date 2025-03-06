import { App, moment, PluginSettingTab, Setting } from "obsidian";
import TimeBlockPlugin from "../main";
import { DAILY_NOTES, DEFAULT_SETTINGS, getDailyNoteSettings, getPeriodicNoteSettings, PERIODIC_NOTES, pluginExists, type Period } from "./utilities";


export class TimeBlockSettingsTab extends PluginSettingTab {
    plugin: TimeBlockPlugin;

    constructor(app: App, plugin: TimeBlockPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Show integration banner if neither plugin is installed
        if (!pluginExists(PERIODIC_NOTES) && !pluginExists(DAILY_NOTES)) {
            containerEl.createDiv('settings-banner', banner => {
                banner.createEl('h3', { text: 'Recommended Integration' });
                banner.createEl('p', {
                    text: 'For best results, activate either ',
                    cls: 'setting-item-description'
                });
                banner.createEl('a', {
                    text: 'Periodic Notes',
                    href: 'obsidian://show-plugin?id=periodic-notes'
                });
                banner.createEl('span', { text: ' or the built in ' });
                banner.createEl('a', {
                    text: 'Daily Notes',
                    href: 'https://obsidian.md/plugins?id=daily-notes'
                });
                banner.createEl('span', { text: ' plugin.' });
            });
        }

        // Always create sections but let them show managed state
        this.createPeriodSection('daily');
        this.createPeriodSection('weekly');
    }

    private createPeriodSection(period: Period) {
        const section = this.containerEl.createDiv('timeblock-period-section');
        const pluginSettings = this.getSettings(period);

        const managedBy = pluginSettings.plugin

        let format = "";
        if (managedBy) {
            if (pluginSettings.folder)
                format += "[" + pluginSettings.folder + '/]'
            format += pluginSettings.format
        }
        else {
            format = this.plugin.settings[period].format;
        }

        // Add managed state class to section
        if (managedBy) {
            section.addClass('is-managed');
        }

        // Content area
        if (!this.plugin.settings[period].enabled) {
            const headerSetting = new Setting(section)
                .setName(`${period} Tasks`)
                .setHeading();
            headerSetting.addToggle(toggle => toggle
                .setValue(this.plugin.settings[period].enabled)
                .onChange(async value => {
                    this.plugin.settings[period].enabled = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide content
                }));
        } else {
            const headerSetting = new Setting(section)
                .setName(`${period} Tasks`)
                .setHeading()
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings[period].enabled)
                    .onChange(async value => {
                        this.plugin.settings[period].enabled = value;
                        await this.plugin.saveSettings();
                        this.display(); // Refresh to show/hide content
                    }));

            new Setting(section)
                .setName(`Date format`)
                .setDesc(managedBy ? `Managed by ${managedBy}` : `Result: ${moment().format(format)}`)
                .addText(text => text
                    .setValue(format)
                    .setDisabled(!!managedBy)
                .then(setting => {
                    const updateDesc = () => {
                        if (!managedBy) {
                            setting.setDesc(`Result: ${moment().format(setting.components[0].inputEl.value)}`);
                        }
                    };
                    updateDesc(); // Initial update
                    
                    setting.components[0].inputEl.oninput = updateDesc;
                    setting.components[0].onChange(async value => {
                        if (!validateMomentFormat(value)) {
                            alert("Invalid date format");
                            return;
                        }
                        this.plugin.settings[period].format = value;
                        await this.plugin.saveSettings();
                    }))
        }
    }

    private getSettings(period: Period): { enabled: boolean; format: string; folder?: string; plugin?: string; } {
        // Daily notes could come from either plugin
        if (pluginExists(PERIODIC_NOTES)) {
            // All other periods come from Periodic Notes
            return getPeriodicNoteSettings(period);
        }
        else if (period === 'daily' && pluginExists(DAILY_NOTES)) {
            return getDailyNoteSettings();
        } else {
            if (!this.plugin.settings[period]) {
                this.plugin.settings[period] = DEFAULT_SETTINGS[period];
            }
            return this.plugin.settings[period];
        }
    }
}


//#region Utilities

function validateMomentFormat(format: string): boolean {
    try {
        moment().format(format);
        return true;
    } catch {
        return false;
    }
}

//#endregion
