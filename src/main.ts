import { Plugin, WorkspaceLeaf } from "obsidian";
import { TimeBlockModal } from "./ui/TimeBlockModal";
import { TimeBlockSidebarView, VIEW_TYPE_TIMEBLOCK } from "./ui/TimeBlockSidebarView";
import { TimeBlockSettingsTab } from "./ui/settings";
import { DAILY_NOTES, DEFAULT_SETTINGS, getDailyNoteSettings, getPeriodicNoteSettings, PERIODIC_NOTES, pluginExists } from "./lib/settingsUtilities";
import { pluginStore } from "src/stores/plugin";
import { TESTMODAL } from "./TESTS/TESTVIEW";
import { taskStore } from "./stores/tasks";

export const PLUGIN_NAME = "Time Blocker";
export default class TimeBlockPlugin extends Plugin {
    settings: TimeBlockPlannerSettings;

    async onload() {
        // TODO remove after testing:
        this.app.workspace.onLayoutReady(() => {
            // new TESTMODAL(this.app, this).open();
            new TimeBlockModal(this.app, this).open();
        })

        await this.loadSettings();

        // Register views
        this.registerView(
            VIEW_TYPE_TIMEBLOCK,
            (leaf) => new TimeBlockSidebarView(leaf, this)
        );

        // Add ribbon icon for modal using Lucide icons
        this.addRibbonIcon("cuboid", "Time Block Planner", () => {
            new TimeBlockModal(this.app, this).open();
        });

        this.addRibbonIcon("flask-conical", "TEST", () => {
            new TESTMODAL(this.app, this).open();
        });

        // Add command for sidebar view
        this.addCommand({
            id: 'show-timeblock-sidebar',
            name: 'Show Time Block Sidebar',
            callback: () => this.activateSidebarView()
        });

        this.addSettingTab(new TimeBlockSettingsTab(this.app, this));

        pluginStore.set(this);
        taskStore.initialize(this.app.vault);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    public getPeriodSetting(period: Period): { enabled: boolean; format: string; folder?: string; plugin?: string; } {
        // Daily notes could come from either plugin
        if (pluginExists(PERIODIC_NOTES)) {
            // All other periods come from Periodic Notes
            return getPeriodicNoteSettings(period);
        }
        else if (period === 'daily' && pluginExists(DAILY_NOTES)) {
            return getDailyNoteSettings();
        } else {
            if (!this.settings.periodFileFormats[period]) {
                this.settings.periodFileFormats[period] = DEFAULT_SETTINGS.periodFileFormats[period];
            }
            return this.settings.periodFileFormats[period];
        }
    }

    public getEnabledPeriods(): Period[] {
        const enabledPeriods: Period[] = [];
        const periodOrder: Period[] = ['daily', 'weekly', 'monthly',
            'quarterly', 'yearly'];

        for (const period of periodOrder) {
            if (!this.settings.periodFileFormats[period].enabled) continue;
            const setting = this.getPeriodSetting(period);

            if (!setting.enabled) continue;

            // For periods with plugin dependencies, verify the plugin exists
            if (setting.plugin) {
                if (pluginExists(setting.plugin)) {
                    enabledPeriods.push(period);
                }
            } else {
                // For periods without plugin dependencies (using our own settings)
                enabledPeriods.push(period);
            }
        }

        return enabledPeriods;
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_TIMEBLOCK);
    }

    async activateSidebarView() {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_TIMEBLOCK);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            if (!leaf) return;
            await leaf.setViewState({ type: VIEW_TYPE_TIMEBLOCK, active: true });
        }

        workspace.revealLeaf(leaf);
    }
}


declare global {
    interface HTMLElementEventMap {
        'itemdropped': CustomEvent<{ type: string; data: unknown }>;
    }
    interface Window {
        app?: any;
    }
}
