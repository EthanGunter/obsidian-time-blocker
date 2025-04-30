import type { Tasks } from "obsidian"

declare global { // TODO maybe don't do this...
    interface TimeBlockPlannerSettings {
        periodFileFormats: {
            daily: PlannerSetting
            weekly: PlannerSetting
            monthly: PlannerSetting
            quarterly: PlannerSetting
            yearly: PlannerSetting
        },
        taskHeaderTag: string, // The section to pull tasks from
        newTaskSectionHeaderName: string, // Header name when adding to a file that doesn't have a tasks section
        viewSettings: {
            increment: "15-min" | "30-min" | "hour"
        },
        behaviorSettings: {
            deleteTasksWhenMoving: boolean, // When moving tasks to a longer period, should the current task be deleted?
        }
    }
    interface PlannerSetting {
        enabled: boolean;
        filepathFormat: string;
        plugin?: string;
        templatePath?: string;
    }

    type TaskStatus = "active" | "in-progress" | "completed" | "canceled";
    interface TaskData {
        raw: string;
        content: string;
        metadata: {
            scheduled?: { start: Moment; end: Moment };
            archived?: Moment;
            status: TaskStatus;
        };
    }
    interface TaskDataWithFile extends TaskData {
        filepath: string;
    }

    type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

/* declare global {
    interface HTMLElementEventMap {
        myCustomEvent: CustomEvent<{ message: string; timestamp: number }>;
    }
} */