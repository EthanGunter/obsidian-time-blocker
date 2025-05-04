import { moment, Notice, Tasks, TFile, TFolder, Vault } from "obsidian";
import { pluginStore } from "src/stores/plugin";
import { get } from "svelte/store";
import { error, log } from "./logger";
import { escapeRegex } from "./util";

// Metadata patterns
const SCHEDULE_TIME_REGEX = /@(\d{1,2}:\d{2}[ap]?m?-\d{1,2}:\d{2}[ap]?m?)/gi;
const SCHEDULE_DATE_REGEX = /⏳ (\d{4}-\d{1,2}-\d{1,2})/gi;
const ARCHIVE_REGEX = /❌ (\d{4}-\d{2}-\d{2})/gi;
const TIME_FORMAT = "hh:mma";

export async function getTasksFromFile(filepath: string): Promise<{ header: string, tasks: TaskDataWithFile[] }[]> {
    const plugin = get(pluginStore);
    const file = plugin.app.vault.getAbstractFileByPath(filepath);
    if (!file) {
        error([`File not found: ${filepath}`]);
        return [];
    }

    if (file instanceof TFile) {
        const content = await plugin.app.vault.read(file);

        const taskSections = getTaskSections(content);

        taskSections.forEach(section => section.tasks = section.tasks.map(task => ({ ...task, filepath })));

        return taskSections as { header: string, tasks: TaskDataWithFile[] }[]
    } else return [];
}

export async function deleteTask(task: TaskDataWithFile): Promise<boolean> {
    const plugin = get(pluginStore);
    const file = plugin.app.vault.getAbstractFileByPath(task.filepath);
    if (!file) {
        error([`File not found: ${task.filepath}`]);
        return false;
    }

    if (file instanceof TFile) {
        try {
            const content = await plugin.app.vault.read(file);
            const updatedContent = content.split('\n')
                .filter(line => line.trim() !== task.raw.trim())
                .join('\n');

            await plugin.app.vault.modify(file, updatedContent);
            return true;
        } catch (error) {
            error('Failed to update task:', error);
            return false;
        }
    } else return false; // TODO elaborate failure
}
export async function updateTask(oldTask: TaskDataWithFile, update: Partial<TaskData>): Promise<boolean> {
    const plugin = get(pluginStore);
    const file = plugin.app.vault.getAbstractFileByPath(oldTask.filepath);
    if (!file) {
        error([`File not found: ${oldTask.filepath}`]);
        return false;
    }

    if (file instanceof TFile) {
        try {
            const newTask = { ...oldTask, ...update };
            const content = await plugin.app.vault.read(file);

            const updatedContent = content.replace(oldTask.raw, serializeTask(newTask));

            await plugin.app.vault.modify(file, updatedContent);
            return true;
        } catch (error) {
            error('Failed to update task:', error);
            return false;
        }
    } else return false; // TODO elaborate failure
}
export async function moveTask(task: TaskDataWithFile, targetFilepath: string, period: Period): Promise<boolean> {
    if (task.filepath === targetFilepath) return true;
    const plugin = get(pluginStore);
    const { vault } = plugin.app;

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

            const headerRegex = new
                RegExp(`^(#{1,6}).*${escapeRegex(plugin.settings.taskHeaderTag)}.*$`, "gmi");

            if (headerRegex.test(content)) {
                // Reset regex state after test
                headerRegex.lastIndex = 0;

                // Insert after last matched header to handle multiple sections
                content = content.replace(headerRegex, (match, hashes) => {
                    return `${match}\n${taskString}`;
                });
            } else {
                let header = plugin.settings.newTaskSectionHeaderName + " " + plugin.settings.taskHeaderTag;
                if (header[0] !== '#') header = '# ' + header;

                // Insert before first YAML frontmatter if exists  
                const yamlEnd = content.match(/^---\s*\n/);
                if (yamlEnd) {
                    content = content.replace(/^---\s*\n/, `$&\n${header}\n${taskString}\n`);
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

async function createFile(vault: Vault, period: Period, filepath: string): Promise<TFile | null> {
    // Get/Create target file
    let targetFile = vault.getAbstractFileByPath(filepath);
    if (targetFile instanceof TFile) return targetFile;
    else {
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

        const file = await vault.create(filepath, templateContent);
        await plugin.app.workspace.getLeaf().openFile(file);
        return file;
    }
}



//#region UTILITY

function getTaskSections(content: string): { header: string, tasks: TaskData[] }[] {
    const sections: { header: string, tasks: TaskData[] }[] = [];
    const plugin = get(pluginStore);
    const header = plugin.settings.taskHeaderTag;
    if (!header) throw new Error("Failed to fetch task header setting");

    const lines = content.split('\n');
    let currentSection: { header: string, tasks: TaskData[] } = { header: "", tasks: [] };

    const headerMatcher = new RegExp(`^#{1,6}.*${escapeRegex(plugin.settings.taskHeaderTag)}.*`, 'i')
    const taskMatcher = new RegExp(`^- \\[[ -\/xX?]].*[A-z]+`);

    for (const line of lines) {
        // Check for the task header tag
        let headerMatch, taskMatch;
        if (headerMatch = line.match(headerMatcher)) {
            // console.log("HEADER:", headerMatch[0]);

            // Push the last collected section and prepare the next
            if (currentSection.header !== "") {
                sections.push(currentSection);
                // console.log("Section complete", currentSection);
            }
            currentSection = { header: headerMatch[0], tasks: [] }
        }
        else if (taskMatch = line.match(taskMatcher)) {
            currentSection?.tasks.push(deserializeTask(taskMatch[0]))
            // console.log("TASK:", taskMatch[0], "| Current section:", currentSection?.tasks.map((x: any) => x.content));
        }
    }
    sections.push(currentSection);

    return sections;
}

function serializeTask(task: TaskData): string {
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

function deserializeTask(task: string): TaskData {
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

function removeMetadata(text: string): string {
    return text
        .replace(SCHEDULE_TIME_REGEX, "")
        .replace(SCHEDULE_DATE_REGEX, "")
        .replace(ARCHIVE_REGEX, "");
}

function removeMarkdown(text: string): string {
    return text
        .replace(/^- \[[ -\/xX?]\] /, "") // Remove "- [ ] " at the beginning of tasks
        .replace(/^[\s-*]*\[\s?[xX]?\s?\]\s*/, "") // Remove checkbox and leading bullet
        .replace(/(\*\*|__)(.*?)\1/g, "$2") // Remove bold
        .replace(/(\*|_)(.*?)\1/g, "$2") // Remove italics
        .replace(/~~(.*?)~~/g, "$1") // Remove strikethrough
        .replace(/!?\[\[([^\]|]+)(\|.*?)?\]\]/g, (_, link) => link.trim())
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
        .trim();
}

//#endregion