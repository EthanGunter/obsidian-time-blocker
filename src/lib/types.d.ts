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
        taskHeaderName: string, // The section to pull tasks from
        viewSettings: {
            increment: "15-min" | "30-min" | "hour"
        },
        behaviorSettings: {
            deleteTasksWhenMoving: boolean, // When moving tasks to a longer period, should the current task be deleted?
        }
    }
    interface PlannerSetting {
        enabled: boolean;
        format: string;
    }

    type TaskStatus = "active" | "in-progress" | "completed" | "canceled";
    interface TaskData {
        raw: string;
        content: string;
        metadata: {
            scheduled?: { start: Moment; end: Moment };
            archived?: Moment;
            status: TaskStatus;
        }
    }

    type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}