import { ItemView, WorkspaceLeaf } from "obsidian";
import CalendarDay from "../components/Timeline.svelte";
import type TimeBlockPlugin from "src/main";

export const VIEW_TYPE_TIMEBLOCK = "timeblock-view";

export class TimeBlockSidebarView extends ItemView {
    component: CalendarDay;
    plugin: TimeBlockPlugin;
    private styleEl: HTMLElement | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: TimeBlockPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_TIMEBLOCK;
    }

    getDisplayText(): string {
        return "Time Block Planner";
    }

    getIcon(): string {
        return "clock";
    }

    async onOpen() {
        this.component = new CalendarDay({
            target: this.containerEl.children[1]
        });
    }

    async onClose() {
        if (this.component) {
            this.component.$destroy();
        }
        if (this.styleEl) {
            this.styleEl.remove();
            this.styleEl = null;
        }
    }
}
