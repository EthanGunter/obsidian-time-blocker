import { ItemView, WorkspaceLeaf } from "obsidian";
import CalendarDay from "../components/CalendarDay.svelte";
import type TimeBlockPlugin from "../../main";

export const VIEW_TYPE_TIMEBLOCK = "timeblock-view";

export class TimeBlockSidebarView extends ItemView {
    component: CalendarDay;
    plugin: TimeBlockPlugin;

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
        // TEMP SETTINGS STAND-INS
        const TIME_RANGE = { start: 6, end: 22 };
        const INCREMENT = 30;
        const TIME_HEIGHT = 80;

        this.component = new CalendarDay({
            target: this.containerEl.children[1],
            props: {
                timeRange: TIME_RANGE,
                increment: INCREMENT,
                timeHeight: TIME_HEIGHT
            }
        });
    }

    async onClose() {
        if (this.component) {
            this.component.$destroy();
        }
    }
}
