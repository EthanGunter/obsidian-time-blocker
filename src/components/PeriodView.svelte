<script lang="ts">
	import { moment, Notice } from "obsidian";
	import type TimeBlockPlugin from "src/main";
	import { pluginStore } from "src/stores/plugin";
	import TaskModalView from "./TaskModalView.svelte";
	// import { getTasksFromFile } from "src/lib/taskUtilities";
	import { taskStore } from "src/stores/tasks";
	import { onMount } from "svelte";

	export let period: Period = "daily";

	
	let plugin: TimeBlockPlugin;
	let filepath: string = "";
	pluginStore.subscribe((value) => {
		plugin = value;
		filepath =
			moment().format(plugin.getPeriodSetting(period).format) + ".md";
	});

	const fileData = taskStore.getFileData(filepath);
	onMount(() => {
		taskStore.watchFile(filepath);
		return () => {
			taskStore.unwatchFile(filepath);
		};
	});
</script>

<div class="period-view">
	<h3 class="period-title">
		{period.charAt(0).toUpperCase() + period.slice(1)}
		Tasks
		<span class="file-info"> File: {filepath}</span>
	</h3>

	{#if !plugin.getPeriodSetting(period)?.enabled}
		<div class="empty-state">This period is not enabled in settings</div>
	{:else if $fileData}
		{#if $fileData.tasks.length === 0}
			<div class="empty-state">
				No tasks found in<br />
				<code>{filepath}</code>
			</div>
		{:else}
			<div class="tasks-container">
				{#each $fileData.tasks as task}
					<TaskModalView {task} />
				{/each}
			</div>
		{/if}
	{:else}
		<div class="loading">Loading tasks...</div>
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
