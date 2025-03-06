export function hasDailyNotesPlugin(): boolean {
    return (window as any).app.plugins.getPlugin('daily-notes') !== undefined;
}

export function hasPeriodicNotesPlugin(): boolean {
    return (window as any).app.plugins.getPlugin('periodic-notes') !== undefined;
}

export function getPeriodicNoteSettings(period: 'daily'|'weekly'|'monthly'): {format: string, folder: string} {
    const periodicNotes = (window as any).app.plugins.getPlugin('periodic-notes');
    return periodicNotes?.settings[period] || {format: '', folder: ''};
}

export function getDailyNoteSettings(): {format: string, folder: string} {
    const dailyNotes = (window as any).app.plugins.getPlugin('daily-notes');
    return dailyNotes?.settings || {format: '', folder: ''};
}
