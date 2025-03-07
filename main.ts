import { Plugin, WorkspaceLeaf } from "obsidian";
import { TimeBlockModal } from "./src/ui/TimeBlockModal";
import { TimeBlockSidebarView, VIEW_TYPE_TIMEBLOCK } from "./src/ui/TimeBlockSidebarView";
import { TimeBlockSettingsTab } from "./src/ui/settings";
import { DAILY_NOTES, DEFAULT_SETTINGS, getDailyNoteSettings, getPeriodicNoteSettings, PERIODIC_NOTES, pluginExists, type Period, type TimeBlockPlannerSettings } from "./src/utilities";

export default class TimeBlockPlugin extends Plugin {
    settings: TimeBlockPlannerSettings;

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
    interface Window {
        app?: any;
    }
}
