<script lang="ts">
	import { moment, Notice } from "obsidian";
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
	$: numTasks = $fileData?.tasks?.length || 0;

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

	function onTaskDrop(event: DropEvent<TaskData>) {
		if (event.detail.data) {
			log(`Moving task ${event.detail.data.content} to ${filepath}`);
			moveTask(event.detail.data, filepath, period);
		}
	}
</script>

<div
	class="period-view"
	use:droppable={{ accepts: ["task"], onDrop: onTaskDrop }}
>
	<header
		class="period-header"
		role="button"
		tabindex="0"
		on:click={() => (isExpanded = !isExpanded)}
		on:keydown={(e) =>
			(e.key === "Enter" || e.key === " ") && (isExpanded = !isExpanded)}
	>
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
		{#if isExpanded}
			<h3 class:no-task={numTasks === 0}>
				{getPeriodTitle(period)}
			</h3>
		{:else}
			<h3 class:no-task={numTasks === 0}>
				{getPeriodTitle(period)}
				{#if numTasks > 0}({numTasks}){/if}
			</h3>
		{/if}
		<span class="file-info">
			{filepath}
		</span>
	</header>

	{#if isExpanded}
		<div class="tasks-container">
			{#if numTasks}
				{#if $fileData && $fileData.tasks}
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
		// border-radius: 8px;
		// border: 1px solid var(--background-modifier-border);
		overflow: hidden;
		position: relative;
		contain: content;
	}

	.period-header {
		cursor: pointer;
		display: flex;
		align-items: center;
		position: relative;
		z-index: 1;

		background: var(--background-primary);

		transition: background 0.2s ease;

		&:hover {
			background: var(--background-secondary);
		}

		&::after {
			content: "";
			position: absolute;
			bottom: 0;
			left: 0;
			right: 0;
			height: 1px;
			background: var(--background-modifier-border);
		}

		.chevron-down {
			transition: transform 0.2s ease;
			width: 1.2rem;
			height: 1.2rem;

			&.rotated {
				transform: rotate(-90deg);
			}
		}
		h3 {
			padding-left: 1rem;
			&.no-task {
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

	.file-info {
		margin-left: auto;
		font-size: 0.8em;
		opacity: 0.7;
	}
</style>
