import { moment } from "obsidian";
import type { TimeBlockPlannerSettings } from "./settings";

/**
 * Format a date according to the daily note format settings
 */
export function getDailyNoteFormat(date: moment.Moment, settings: TimeBlockPlannerSettings): string {
    return date.format(settings.daily.format);
}

/**
 * Format a date according to the weekly note format settings
 */
export function getWeeklyNoteFormat(date: moment.Moment, settings: TimeBlockPlannerSettings): string {
    return date.format(settings.weekly.format);
}

/**
 * Parse a date string using the daily note format settings
 */
export function parseDailyNoteDate(dateString: string, settings: TimeBlockPlannerSettings): moment.Moment | null {
    const parsed = moment(dateString, settings.daily.format, true);
    return parsed.isValid() ? parsed : null;
}

/**
 * Parse a date string using the weekly note format settings
 */
export function parseWeeklyNoteDate(dateString: string, settings: TimeBlockPlannerSettings): moment.Moment | null {
    const parsed = moment(dateString, settings.weekly.format, true);
    return parsed.isValid() ? parsed : null;
}

/**
 * Replace date tokens in a path template
 */
export function formatDailyNotePath(template: string, date: moment.Moment, settings: TimeBlockPlannerSettings): string {
    const dateString = getDailyNoteFormat(date, settings);
    return template.replace(/\{\{date\}\}/g, dateString);
}

/**
 * Replace week tokens in a path template
 */
export function formatWeeklyNotePath(template: string, date: moment.Moment, settings: TimeBlockPlannerSettings): string {
    return template
        .replace(/\{\{ww\}\}/g, date.format('ww'))
        .replace(/\{\{YYYY\}\}/g, date.format('YYYY'));
}
