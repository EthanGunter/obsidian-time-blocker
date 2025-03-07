<script lang="ts">
	import type TimeBlockPlugin from "main";
	import { moment } from "obsidian";
	import type { Period } from "src/utilities";

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
	<h2>Time Block Planner</h2>
	{#await periodTasks then tasks}
		{#each tasks as taskList}
			<div class="timeblock-period">
				<h3>
					{taskList.period.charAt(0).toUpperCase() +
						taskList.period.slice(1)} Tasks
				</h3>
				<div class="timeblock-file-info">
					<code>{taskList.filePath}</code>
					{#if !taskList.exists}
						<span class="timeblock-file-status"
							>(File not found)</span
						>
					{/if}
				</div>

				{#if taskList.tasks.length > 0}
					<ul class="timeblock-task-list">
						{#each taskList.tasks as task}
							<li class="timeblock-task">{@html task}</li>
						{/each}
					</ul>
				{:else}
					<div class="timeblock-no-tasks">
						No tasks found in this note
					</div>
				{/if}
			</div>
		{/each}
	{/await}
</div>

<style>
	.timeblock-container {
		padding: 20px;
	}

	.timeblock-period {
		margin: 15px 0;
		padding: 10px;
		border-bottom: 1px solid var(--background-modifier-border);
	}

	h3 {
		margin: 10px 0;
	}

	.timeblock-file-info {
		margin: 8px 0;
		font-size: 0.9em;
		color: var(--text-muted);
	}

	.timeblock-file-status {
		margin-left: 8px;
		opacity: 0.8;
	}

	.timeblock-task-list {
		margin: 10px 0;
		padding-left: 20px;
	}

	.timeblock-task {
		margin: 4px 0;
		list-style-type: none;
		position: relative;
	}

	.timeblock-task::before {
		content: "☐";
		position: absolute;
		left: -20px;
		color: var(--text-muted);
	}

	.timeblock-task[data-checked]::before {
		content: "☑";
		color: var(--text-accent);
	}

	.timeblock-no-tasks {
		color: var(--text-faint);
		font-style: italic;
		margin: 8px 0;
	}
</style>
