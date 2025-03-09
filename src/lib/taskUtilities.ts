import { moment, Notice, TFile, TFolder } from "obsidian";
import { pluginStore } from "src/stores/plugin";
import { get } from "svelte/store";
import { type TaskData, type TaskStatus } from "./types";

// Metadata patterns
const SCHEDULE_TIME_REGEX = /@(\d{1,2}:\d{2}[ap]?m?-\d{1,2}:\d{2}[ap]?m?)/gi;
const SCHEDULE_DATE_REGEX = /⏳ (\d{4}-\d{1,2}-\d{1,2})/gi;
const ARCHIVE_REGEX = /❌ (\d{4}-\d{2}-\d{2})/gi;
const TIME_FORMAT = "hh:mma";

export async function getTasksFrom(filepath: string): Promise<TaskData[]> {
    const file = get(pluginStore).app.vault.getAbstractFileByPath(filepath);
    if (!file) {
        new Notice(`FILE NOT FOUND: ${filepath}`);
        return [];
    }

    if (file instanceof TFile) {
        const content = await get(pluginStore).app.vault.read(file);
        const taskStrings = parseTasks(content);

        return taskStrings.map(task => deserializeTask(task));
    } else return [];
}

export function serializeTask(task: TaskData): string {
    let output = "- [ ] " + task.content;

    if (task.metadata.scheduled) {
        // Format time as HH:mma without dates
        const start = task.metadata.scheduled.start.format(TIME_FORMAT);
        const end = task.metadata.scheduled.end.format(TIME_FORMAT);

        output += ` @${start}-${end}`;
    }

    if (task.metadata.archived) {
        output += ` ❌ ${moment(task.metadata.archived).format('YYYY-MM-DD')}`;
    }

    return output;
}

export function deserializeTask(task: string): TaskData {
    const archivedMatch = task.match(ARCHIVE_REGEX);
    const archived = archivedMatch && {
        archived: moment(archivedMatch[1]).toISOString()
    };

    // -- Extract scheduled time from task --
    const timeMatches = task.matchAll(SCHEDULE_TIME_REGEX);

    const firstTime = timeMatches.next().value;
    const scheduled = firstTime && {
        scheduled: {
            start: moment(firstTime[1].split('-')[0], TIME_FORMAT),
            end: moment(firstTime[1].split('-')[1], TIME_FORMAT)
        }
    };

    // Remove any extras
    for (const time of timeMatches) {
        task.replace(time[0], "");
    }


    let status: TaskStatus = "active";
    switch (task.charAt(3)) {
        case ' ': status = "active"; break;
        case 'x':
        case 'X': status = "completed"; break;
        case '-': status = "canceled"; break;
        case '/': status = "in-progress"; break;
        default: status = "completed"; break;
    }

    const data: TaskData = {
        raw: task,
        content: removeMetadata(removeMarkdown(task)).trim(),
        metadata: {
            ...archived,
            ...scheduled,
            status
        }
    }

    return data;
}

export async function updateTaskInFile(filePath: string, originalRaw: string, updatedTask: string): Promise<boolean> {
    const file = get(pluginStore).app.vault.getAbstractFileByPath(filePath);
    if (!file) return false;

    if (file instanceof TFile) {
        try {
            const content = await get(pluginStore).app.vault.read(file);
            const updatedContent = content.replace(originalRaw, updatedTask);
            await get(pluginStore).app.vault.modify(file, updatedContent);
            return true;
        } catch (error) {
            console.error('Failed to update task:', error);
            return false;
        }
    } else return false; // TODO elaborate failure
}



export function parseTasks(text: string): string[] {
    const header = get(pluginStore)?.settings.taskHeaderName;
    if (!header) throw new Error("Failed to fetch task header setting");

    const sectionStartRegex = new RegExp(`(^#{1,6} ${header}\\s*\\n)`, "gmi");
    const sectionEndRegex = new RegExp(`(^#{1,6} .*?\\n)([\\s\\S]*)(^#{1,6} )`, "gmi");

    // Extract tasks from the given headers
    let match, taskString = "";
    while ((match = sectionStartRegex.exec(text)) != null) {
        text = text.substring(sectionStartRegex.lastIndex);
        match = sectionEndRegex.exec(text)
        taskString += text.substring(0, match?.index);
    }

    return taskString.split('\n').filter(task => task.startsWith('- [ ]'));
}

function removeMetadata(text: string): string {
    return text
        .replace(SCHEDULE_TIME_REGEX, "")
        .replace(SCHEDULE_DATE_REGEX, "")
        .replace(ARCHIVE_REGEX, "");
}

function removeMarkdown(text: string): string {
    return text
        .replace(/^- \[\s+\] /, "") // Remove "- [ ] " at the beginning of tasks
        .replace(/^[\s-*]*\[\s?[xX]?\s?\]\s*/, "") // Remove checkbox and leading bullet
        .replace(/(\*\*|__)(.*?)\1/g, "$2") // Remove bold
        .replace(/(\*|_)(.*?)\1/g, "$2") // Remove italics
        .replace(/~~(.*?)~~/g, "$1") // Remove strikethrough
        .replace(/!?\[\[([^\]|]+)(\|.*?)?\]\]/g, (_, link) => link.trim())
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
        .trim();
}
