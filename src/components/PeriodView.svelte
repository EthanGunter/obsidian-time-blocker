<script lang="ts">
	import { moment } from "obsidian";
	import { cleanLinks, cleanSyntax, type Period } from "../utilities";
	import type TimeBlockPlugin from "../../main";

	export let plugin: TimeBlockPlugin;
	export let period: Period = "daily";
	export let taskHeader: string = "plans for the day";

	let isLoading = false;
	let tasks: string[] = [];
	let fileInfo: {
		exists: boolean;
		path: string;
		lastModified: string;
	} | null = null;

	function parseTasks(text: string, header: string): string[] {
		const sectionRegex =
			/(^#{1,6} Plans for the day\n)([.\n\s\S]*)(\n#)/gim;
		const taskRegex = /^(\s*)[-*]\s+\[([ xX])\](.+)$/gm;

		const taskSection = text.match(sectionRegex)?.[0];
		if (!taskSection) throw new Error("No tasks section found");

		const tasks = Array.from(taskSection.matchAll(taskRegex)).map(
			(x) => x[0],
		);

		console.log(tasks);

		return tasks.map((task) => {
			return cleanSyntax(cleanLinks(task));
		});
	}

	async function loadTasks() {
		isLoading = true;
		const setting = plugin.getSetting(period);

		if (!setting?.enabled) {
			isLoading = false;
			return;
		}

		const filePath = moment().format(setting.format) + ".md";
		const file = window.app.vault.getAbstractFileByPath(filePath);

		fileInfo = {
			exists: !!file,
			path: filePath,
			lastModified: file ? moment(file.stat.mtime).fromNow() : "Never",
		};

		if (file) {
			const content = await window.app.vault.read(file);
			tasks = parseTasks(content, taskHeader);
		} else {
			tasks = [];
		}

		isLoading = false;
	}

	// Load tasks when component mounts or period changes
	$: if (period) loadTasks();
</script>

<div class="period-view">
	<h3>{period.charAt(0).toUpperCase() + period.slice(1)} Tasks</h3>

	{#if isLoading}
		<div class="loading">Loading tasks...</div>
	{:else if !plugin.getSetting(period)?.enabled}
		<div class="empty-state">This period is not enabled in settings</div>
	{:else if tasks.length === 0}
		<div class="empty-state">
			No tasks found in<br />
			<code>{fileInfo?.path}</code>
		</div>
	{:else}
		<div class="task-list">
			{#each tasks as task}
				<div class="task-item">
					{task}
				</div>
			{/each}
		</div>
	{/if}

	<div class="file-info">
		File: {fileInfo?.path}<br />
		Last modified: {fileInfo?.lastModified}
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
