import { writable } from "svelte/store";
import type TimeBlockPlugin from "main";

export const pluginStore = writable<TimeBlockPlugin>({} as TimeBlockPlugin);
