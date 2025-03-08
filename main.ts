import { Plugin, WorkspaceLeaf } from "obsidian";
import { TimeBlockModal } from "./src/ui/TimeBlockModal";
import { TimeBlockSidebarView, VIEW_TYPE_TIMEBLOCK } from "./src/ui/TimeBlockSidebarView";
import { TimeBlockSettingsTab } from "./src/ui/settings";
import { DAILY_NOTES, DEFAULT_SETTINGS, getDailyNoteSettings, getPeriodicNoteSettings, PERIODIC_NOTES, pluginExists } from "./src/lib/settingsUtilities";
import { pluginStore } from "src/stores/plugin";

export const PLUGIN_NAME = "Time Blocker";
export default class TimeBlockPlugin extends Plugin {
    public settings: TimeBlockPlannerSettings;

    async onload() {
        await this.loadSettings();

        // Register views
        this.registerView(
            VIEW_TYPE_TIMEBLOCK,
            (leaf) => new TimeBlockSidebarView(leaf, this)
        );

        // Add ribbon icon for modal
        this.addRibbonIcon("cuboid", "Time Block Planner", () => {
            new TimeBlockModal(this.app, this).open();
        });

        // Add command for sidebar view
        this.addCommand({
            id: 'show-timeblock-sidebar',
            name: 'Show Time Block Sidebar',
            callback: () => this.activateSidebarView()
        });

        this.addSettingTab(new TimeBlockSettingsTab(this.app, this));

        pluginStore.set(this);
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