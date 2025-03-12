import { writable } from "svelte/store";
import type TimeBlockPlugin from "src/main";

export const pluginStore = writable<TimeBlockPlugin>({} as TimeBlockPlugin);
