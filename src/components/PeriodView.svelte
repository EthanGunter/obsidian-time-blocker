<script lang="ts">
	import { moment, normalizePath, Notice, TFile } from "obsidian";
	import { taskStore } from "src/stores/tasks";
	import { onMount } from "svelte";
	import TaskView from "./ModalTask.svelte";
	import type TimeBlockPlugin from "src/main";
	import { DropEvent, droppable } from "src/lib/dnd";
	import { deleteTask, moveTask } from "src/lib/taskUtilities";
	import { log } from "src/lib/logger";

	export let period: Period;
	export let plugin: TimeBlockPlugin;

	const getPeriodTitle = (period: Period) => {
		const today = moment();
		switch (period) {
			case "daily":
				return "Today's Tasks";
			case "weekly":
				return `Week ${today.format("w")}`;
			case "monthly":
				return today.format("MMMM");
			case "quarterly":
				return `Q${Math.ceil((today.month() + 1) / 3)}`;
			case "yearly":
				return today.format("YYYY");
		}
	};

	let isExpanded = period === "daily";
	let filepath = "";
	let fileData = taskStore.getFileData(filepath);

	$: numTasks = $fileData?.status === "loaded" ? $fileData.tasks.length : 0;
	$: fileExists = $fileData?.status === "loaded";

	$: {
		if (plugin) {
			filepath =
				moment().format(
					plugin.getPeriodSetting(period).filepathFormat,
				) + ".md";
			fileData = taskStore.getFileData(filepath);
		}
	}

	$: currentFile = filepath;

	onMount(() => {
		taskStore.watchFile(currentFile);
		return () => taskStore.unwatchFile(currentFile);
	});

	async function onTaskDrop(event: DropEvent<TaskDataWithFile>) {
		if (event.detail.data) {
			log(`Moving task ${event.detail.data.content} to ${filepath}`);
			const success = await moveTask(event.detail.data, filepath, period);

			if (success) {
				// Refresh file existence check and watcher
				taskStore.watchFile(filepath);
			}
		}
	}

	async function openFile() {
		if (!plugin || !filepath) return;
		const normalizedFilepath = normalizePath(filepath);
		const file = plugin.app.vault.getAbstractFileByPath(normalizedFilepath);

		if (file instanceof TFile) {
			// Open file and close modal
			await plugin.app.workspace.getLeaf().openFile(file);
			plugin.modal?.close();
		}
	}
</script>

<div
	class="period-view"
	class:non-daily={period !== "daily"}
	class:collapsed={!isExpanded}
	use:droppable={{ accepts: ["task"], onDrop: onTaskDrop }}
>
	<header
		class="period-header"
		role={period !== "daily" ? "button" : undefined}
		tabindex={period !== "daily" ? 0 : undefined}
		on:click={period !== "daily"
			? () => (isExpanded = !isExpanded)
			: undefined}
		on:keydown={period !== "daily"
			? (e) =>
					(e.key === "Enter" || e.key === " ") &&
					(isExpanded = !isExpanded)
			: undefined}
	>
		{#if period !== "daily"}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="chevron-down"
				class:rotated={!isExpanded}
			>
				<path d="m6 9 6 6 6-6" />
			</svg>
		{/if}
		<h3 class:no-file={!fileExists}>
			{getPeriodTitle(period)}
		</h3>
		<span class="count-indicator">{numTasks}</span>
		{#if fileExists}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="link-icon"
				on:click|stopPropagation={openFile}
			>
				<path
					d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
				/>
				<path
					d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
				/>
			</svg>
		{/if}
	</header>

	{#if isExpanded}
		<div class="tasks-container">
			{#if numTasks}
				{#if $fileData && $fileData.status === "loaded"}
					{#each $fileData.tasks as task}
						<TaskView {task} />
					{/each}
				{/if}
			{:else}
				<span class="empty-state"> No tasks </span>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	.period-view {
		background: var(--background-primary);
		overflow: hidden;
		position: relative;
		contain: content;

		&.non-daily {
			grid-row: auto;
			margin-top: auto;
			transition: opacity 0.3s ease;

			.period-header {
				cursor: pointer;
				&:hover {
					background: var(--background-secondary);
				}
			}

			.chevron-down {
				transition: transform 0.2s ease;
				width: 1.2rem;
				height: 1.2rem;

				&.rotated {
					transform: rotate(-90deg);
				}
			}
		}
	}

	.period-header {
		gap: 0.5rem;
		display: flex;
		align-items: center;
		position: relative;
		z-index: 1;
		border-radius: .5rem;
		padding: 0 1rem;

		background: var(--background-primary);

		transition: background 0.2s ease;

		&::after {
			content: "";
			position: absolute;
			bottom: 0;
			left: 0;
			right: 0;
			height: 1px;
			background: var(--background-modifier-border);
		}

		// > * {
		// 	pointer-events: auto;
		// }
		h3 {
			padding-left: 1rem;
			&.no-file {
				color: var(--text-faint);
			}
		}
	}

	.tasks-container {
		display: flex;
		flex-direction: column;
		position: relative;
		z-index: 0;

		min-height: 3rem;
		max-height: 50vh;
		overflow-y: auto;

		gap: 0.7rem;
		padding: 1rem 0.5rem;

		border-radius: 0 0 8px 8px;
		border-bottom: 3px solid var(--background-modifier-border);
		// border-top: none;
		background: var(--background-primary);
	}

	.empty-state {
		color: var(--text-muted);
		text-align: center;
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-height: 20px;
	}
	.count-indicator {
		color: var(--text-faint);
		margin-left: 1rem;
		// font-size: .8em;
	}
	.file-info {
		margin-left: auto;
		font-size: 0.8em;
		opacity: 0.7;
	}

	.link-icon {
		cursor: pointer;
		margin-left: auto;
		opacity: 0.7;
		transition: opacity 0.2s ease;

		&:hover {
			opacity: 1;
		}
	}
</style>
