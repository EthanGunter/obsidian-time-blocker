import { moment, Notice, TFile, TFolder, Vault } from "obsidian";
import { pluginStore } from "src/stores/plugin";
import { get } from "svelte/store";
import { error, log } from "./logger";

// Metadata patterns
const SCHEDULE_TIME_REGEX = /@(\d{1,2}:\d{2}[ap]?m?-\d{1,2}:\d{2}[ap]?m?)/gi;
const SCHEDULE_DATE_REGEX = /⏳ (\d{4}-\d{1,2}-\d{1,2})/gi;
const ARCHIVE_REGEX = /❌ (\d{4}-\d{2}-\d{2})/gi;
const TIME_FORMAT = "hh:mma";

export async function getTasksFromFile(filepath: string): Promise<TaskData[]> {
    const file = get(pluginStore).app.vault.getAbstractFileByPath(filepath);
    if (!file) {
        error([`File not found: ${filepath}`]);
        return [];
    }

    if (file instanceof TFile) {
        const content = await get(pluginStore).app.vault.read(file);

        const taskStrings = parseTasks(content);

        return taskStrings.map(task => deserializeTask(task, filepath));
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

export function deserializeTask(task: string, filepath: string): TaskData {
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
        },
        filepath
    }

    return data;
}

export async function deleteTask(task: TaskData): Promise<boolean> {
    const file = get(pluginStore).app.vault.getAbstractFileByPath(task.filepath);
    if (!file) {
        error([`File not found: ${task.filepath}`]);
        return false;
    }

    if (file instanceof TFile) {
        try {
            const content = await get(pluginStore).app.vault.read(file);
            const updatedContent = content.split('\n')
                .filter(line => line.trim() !== task.raw.trim())
                .join('\n');

            await get(pluginStore).app.vault.modify(file, updatedContent);
            return true;
        } catch (error) {
            error('Failed to update task:', error);
            return false;
        }
    } else return false; // TODO elaborate failure
}
export async function updateTask(oldTask: TaskData, update: Partial<TaskData>): Promise<boolean> {
    const file = get(pluginStore).app.vault.getAbstractFileByPath(oldTask.filepath);
    if (!file) {
        error([`File not found: ${oldTask.filepath}`]);
        return false;
    }

    if (file instanceof TFile) {
        try {
            const newTask = { ...oldTask, ...update };
            const content = await get(pluginStore).app.vault.read(file);

            const updatedContent = content.replace(oldTask.raw, serializeTask(newTask));

            await get(pluginStore).app.vault.modify(file, updatedContent);
            return true;
        } catch (error) {
            error('Failed to update task:', error);
            return false;
        }
    } else return false; // TODO elaborate failure
}
export async function moveTask(task: TaskData, targetFilepath: string, period: Period): Promise<boolean> {
    if (task.filepath === targetFilepath) return true;
    const { vault } = get(pluginStore).app;

    const deletionSuccess = await deleteTask(task);
    if (!deletionSuccess) return false;

    // Remove scheduling metadata
    const modifiedTask = {
        ...task,
        metadata: {
            ...task.metadata,
            scheduled: undefined
        }
    };
    const taskString = serializeTask(modifiedTask);

    const targetFile = await createFile(vault, period, targetFilepath);

    // Insert at top of task section
    if (targetFile instanceof TFile) {
        try {
            let content = await vault.read(targetFile);
            const header = get(pluginStore)?.settings.taskHeaderName;
            const headerRegex = new
                RegExp(`^(#{1,6})\\s*${header}\\s*$`, "gmi");

            if (headerRegex.test(content)) {
                // Reset regex state after test
                headerRegex.lastIndex = 0;

                // Insert after last matched header to handle multiple sections
                content = content.replace(headerRegex, (match, hashes) => {
                    return `${match}\n${taskString}`;
                });
            } else {
                // Insert before first YAML frontmatter if exists       
                const yamlEnd = content.match(/^---\s*\n/);
                if (yamlEnd) {
                    content = content.replace(/^---\s*\n/, `$&\n# ${header}\n${taskString}\n`);
                } else {
                    // Insert at top but after any leading comments / empty lines
                    content = `# ${header}\n${taskString}\n\n${content}`;
                }
            }

            await vault.modify(targetFile, content);
            return true;
        } catch (err) {
            error(['Failed to update target file:', err]);
            return false;
        }
    }
    return false;
}
export async function createFile(vault: Vault, period: Period, filepath: string): Promise<TFile> {
    await this.app.vault.create("TestTemplater.md", "<% tp.file.cursor() %>");

    // Get/Create target file
    let targetFile = vault.getAbstractFileByPath(filepath);
    if (!targetFile) {
        // Use periodic/daily note templates if available
        const plugin = get(pluginStore);
        const periodSettings = plugin.getPeriodSetting(period);

        let templateContent = '';

        if (periodSettings?.templatePath) {
            const templateFile = vault.getAbstractFileByPath(periodSettings.templatePath);
            if (templateFile instanceof TFile) {
                try {
                    templateContent = await vault.read(templateFile);
                } catch (err) {
                    error("Failed to read template file:", err);
                }
            }
        }

        const pathSegments = filepath.split('/');
        let currentPath = '';

        for (const segment of pathSegments) {
            currentPath += segment; // Build the path segment by segment

            if (!currentPath.includes(".md")) {
                // Check if the path refers to an existing file or folder
                const existingFile = this.app.vault.getAbstractFileByPath(currentPath);

                // If it doesn't exist, or if it exists but is a file (not a folder), try to create the folder
                if (!existingFile) {
                    try {
                        await this.app.vault.createFolder(currentPath);
                        console.log(`Created folder: ${currentPath}`);
                    } catch (error) {
                        // Ignore the error if the folder already exists
                        // You might want to log other errors though
                        console.log(`Folder already exists or other error: ${currentPath}`, error);
                    }
                }
                currentPath += '/'; // Add the separator back for the next iteration
            }
        }

        return await vault.create(filepath, templateContent);
    } else throw new Error(`${filepath} already exists. Should not be trying to create`);
}


export function parseTasks(text: string): string[] {
    const header = get(pluginStore)?.settings.taskHeaderName;
    if (!header) throw new Error("Failed to fetch task header setting");

    const lines = text.split('\n');
    let tasksContent = '';
    let inTaskSection = false;

    for (const line of lines) {
        // Check for the task header (case-insensitive and ignoring leading/trailing spaces)
        const headerMatch = line.match(/^#{1,6}\s*(.*?)\s*$/);
        if (headerMatch && headerMatch[1].toLowerCase() === header.toLowerCase()) {
            inTaskSection = true;
            continue; // Skip the header line itself
        }

        // If we encounter another header while in the task section, stop
        if (inTaskSection && headerMatch) {
            inTaskSection = false;
            break;
        }

        // If we are in the task section, add the line to tasksContent
        if (inTaskSection) {
            tasksContent += line + '\n';
        }
    }

    // Split the extracted content by line and filter for task lines
    return tasksContent.split('\n').filter(line => line.trim().startsWith('- [ ]'));
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
