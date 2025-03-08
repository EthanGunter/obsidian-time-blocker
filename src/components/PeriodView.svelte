<script lang="ts">
	import { moment } from "obsidian";
	import { parseTask } from "../lib/settingsUtilities";
	import type TimeBlockPlugin from "../../main";
	import Draggable from "./Draggable.svelte";
	import { pluginStore } from "src/stores/plugin";
	import { getTasksFrom, parseTasks } from "src/lib/taskUtilities";

	export let period: Period = "daily";

	let isLoading = false;
	let tasks: TaskData[] = [];
	let filepath: string = "";

	let plugin: TimeBlockPlugin;
	pluginStore.subscribe((value) => (plugin = value));

	async function loadTasks() {
		isLoading = true;
		const setting = plugin.getPeriodSetting(period);

		filepath = moment().format(setting.format) + ".md";

		tasks = await getTasksFrom(filepath);
		isLoading = false;
	}

	// Load tasks when component mounts or period changes
	loadTasks();
</script>

<div class="period-view">
	<h3>{period.charAt(0).toUpperCase() + period.slice(1)} Tasks</h3>

	{#if isLoading}
		<div class="loading">Loading tasks...</div>
	{:else if !plugin.getPeriodSetting(period)?.enabled}
		<div class="empty-state">This period is not enabled in settings</div>
	{:else if tasks.length === 0}
		<div class="empty-state">
			No tasks found in<br />
			<code>{filepath}</code>
		</div>
	{:else}
		<div class="task-list">
			{#each tasks as task}
				<Draggable data={task} type="task">
					<div class="task-item">
						{task.content}
					</div>
				</Draggable>
			{/each}
		</div>
	{/if}

	<div class="file-info">
		File: {filepath}<br />
	</div>
</div>

<style lang="scss">
	.period-view {
		border-right: 1px solid var(--background-modifier-border);
	}

	.task-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 1rem 0;
	}

	.task-item {
		width: 100%;
		background: var(--background-secondary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
	}

	.empty-state,
	.loading {
		color: var(--text-muted);
		padding: 1rem;
		text-align: center;
	}

	.file-info {
		margin-top: 1rem;
		font-size: 0.8em;
		color: var(--text-muted);
	}
</style>
