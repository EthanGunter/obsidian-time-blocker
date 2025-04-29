import { Notice } from "obsidian";

interface options {
    notice?: boolean, writeToFile?: boolean, level?: "log" | "error"
}
export function log(...args: any[]) {
    message(args, { level: "log", notice: false, writeToFile: true });
}
export function error(...args: any[]) {
    message(args, { level: "error", notice: true, writeToFile: true });
}

function message(msg: any[], opt: options) {
    if (opt.notice) {
        new Notice(msg.join(", "));
    }

    if (opt.writeToFile) {
        console.error("Error file writing Not Implemented");
    }

    switch (opt.level) {
        case "log": console.log(...msg); break;
        case "error": console.error(...msg); break;
    }
}