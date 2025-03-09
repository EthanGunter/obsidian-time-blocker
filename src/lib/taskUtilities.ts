import { moment } from "obsidian";
import { pluginStore } from "src/stores/plugin";
import { get } from "svelte/store";

export async function getTasksFrom(filepath: string): Promise<TaskData[]> {
    const file = window.app.vault.getAbstractFileByPath(filepath);
    if (!file) throw new Error(`Failed to open ${filepath}`);

    const content = await window.app.vault.read(file);
    const taskStrings = parseTasks(content);

    return taskStrings.map(task => deserializeTask(task));
}

export async function updateTaskInFile(filePath: string, originalRaw: string, updatedTask: string): Promise<boolean> {
    const file = window.app.vault.getAbstractFileByPath(filePath);
    if (!file) return false;

    try {
        const content = await window.app.vault.read(file);
        const updatedContent = content.replace(originalRaw, updatedTask);
        await window.app.vault.modify(file, updatedContent);
        return true;
    } catch (error) {
        console.error('Failed to update task:', error);
        return false;
    }
}

export function removeMarkdown(text: string): string {
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

export function serializeTask(task: TaskData): string {
    let output = task.content;

    if (task.metadata.scheduled) {
        output += ` ⏳ ${moment(task.metadata.scheduled.start).format('YYYY-MM-DD HH:mm')}-${moment(task.metadata.scheduled.end).format('HH:mm')}`;
    }

    if (task.metadata.archived) {
        output += ` ❌ ${moment(task.metadata.archived).format('YYYY-MM-DD')}`;
    }

    return output;
}


// Metadata patterns
const SCHEDULE_REGEX = /@(\d{1,2}:\d{2}[ap]?-\d{1,2}:\d{2}[ap]?)/;
const ARCHIVE_REGEX = /❌ (\d{4}-\d{2}-\d{2})/;

export function deserializeTask(task: string): TaskData {
    const archivedMatch = task.match(ARCHIVE_REGEX);
    const archived = archivedMatch && {
        archived: moment(archivedMatch[1]).toISOString()
    };

    const scheduleMatch = task.match(SCHEDULE_REGEX);

    const scheduled = scheduleMatch && {
        scheduled: {
            start: moment(scheduleMatch[1].split('-')[0], "HH:mma"),
            end: moment(scheduleMatch[1].split('-')[1], "HH:mma")
        }
    };

    const completed = task.charAt(3) != ' ';

    const data: TaskData = {
        raw: task,
        content: removeMarkdown(task),
        metadata: {
            ...archived,
            ...scheduled,
            completed
        }
    }
    return data;
}