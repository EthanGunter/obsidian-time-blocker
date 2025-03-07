<script lang="ts">
	import type TimeBlockPlugin from "main";
	import CalendarDay from "./CalendarDay.svelte";
	import { moment } from "obsidian";
	import type { Period } from "src/utilities";

	// TEMP SETTINGS STAND-INS
	const TIME_RANGE = { start: 6, end: 22 }; // 6AM - 10PM
	const INCREMENT = 30; // Minutes
	const TIME_HEIGHT = 80; // px per hour

	export let plugin: TimeBlockPlugin; // Receives settings from parent component

	// Reactive array to store tasks for each period
	$: periodTasks = loadPeriodTasks(plugin);

	async function loadPeriodTasks(plugin: TimeBlockPlugin) {
		const tasks = [];
		const periods: Period[] = [
			"daily",
			"weekly",
			"monthly",
			"quarterly",
			"yearly",
		];

		for (const period of periods) {
			if (plugin.getSetting(period)?.enabled) {
				console.log(period, plugin.getSetting(period).format);

				const filePath =
					moment().format(plugin.getSetting(period).format) + ".md";
				const file = window.app.vault.getAbstractFileByPath(filePath);

				let content = "";
				let exists = false;
				let lastModified = "";

				if (file) {
					exists = true;
					lastModified = moment(file.stat.mtime).fromNow();
					content = await window.app.vault.read(file);
				}

				// Extract tasks using Markdown task syntax regex
				const tasksList =
					content.match(/^[\s]*[-*] \[( |x)\].*$/gm) || [];

				tasks.push({
					period,
					format: plugin.getSetting(period).format,
					filePath,
					exists,
					lastModified,
					tasks: tasksList.map((t) => t.replace(/^[\s-*]*/, "")), // Clean up task items
				});
			}
		}
		return tasks;
	}
</script>

<div class="timeblock-container">
	<!-- <div class="timeblock-column tasks-panel">
		<h3>Today's Tasks</h3>
		{#await periodTasks then tasks}
			{#if tasks.find((p) => p.period === "daily")?.tasks}
				<div class="tasks-list">
					{#each tasks.find((p) => p.period === "daily")?.tasks ?? [] as task}
						<div class="setting-item task-item">
							<div class="setting-item-info">
								<div class="setting-item-name">{task}</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-state">No tasks found for today</div>
			{/if}
		{/await}
	</div> -->

	<CalendarDay timeRange={TIME_RANGE} increment={INCREMENT} />
</div>

<style lang="scss">
	.timeblock-container {
		display: flex;
		gap: 2rem;
		height: 100%;
		padding: 1rem;
	}

	.timeblock-column {
		flex: 1;
		min-width: 0;
		height: 100%;
	}

	.tasks-panel {
		max-width: 400px;
	}

	.tasks-list {
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
		padding: 0.5rem;
		margin-top: 1rem;
	}

	.task-item {
		padding: 0.5rem;
		border-radius: 4px;
		margin: 2px 0;
	}

	.task-item:hover {
		background-color: var(--background-modifier-hover);
	}

	.empty-state {
		color: var(--text-muted);
		padding: 1rem;
		text-align: center;
	}
</style>
