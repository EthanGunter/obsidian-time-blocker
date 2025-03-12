<script lang="ts">
	import { moment, Notice } from "obsidian";
	import type TimeBlockPlugin from "src/main";
	import { pluginStore } from "src/stores/plugin";
	import { getTasksFrom } from "src/lib/taskUtilities";
	import TaskView from "./TaskModalView.svelte";

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
		const file = plugin.app.metadataCache.getFirstLinkpathDest(
			filepath,
			"",
		);

		if (!file) {
			new Notice(`Could not find ${filepath}`);
			tasks = [];
			return;
		}

		try {
			tasks = await getTasksFrom(filepath);
		} catch (e) {
			new Notice("Failed to load tasks. Check console for details.");
			console.error("[TimeBlock] Task load error:", e);
			tasks = [];
		}
		isLoading = false;
	}

	// Load tasks when component mounts or period changes
	loadTasks();
</script>

<div class="period-view">
	<h3 class="period-title">
		{period.charAt(0).toUpperCase() + period.slice(1)}
		Tasks
		<span class="file-info"> File: {filepath}</span>
	</h3>

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
				<TaskView {task} />
			{/each}
		</div>
	{/if}
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

	.period-title {
		display: flex;
		.file-info {
			font-size: 0.6em;
			color: var(--text-muted);
		}
	}
</style>
