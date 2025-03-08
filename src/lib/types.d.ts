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


interface TaskData {
    raw: string;
    content: string;
    metadata: {
        scheduled?: { start: string; end: string };
        archived?: string;
        completed: boolean
        // fromFile: string
    }
}

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
