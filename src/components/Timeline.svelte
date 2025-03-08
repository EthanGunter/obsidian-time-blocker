<script lang="ts">
	import { moment } from "obsidian";
	import DropTarget from "./DropTarget.svelte";
	import { updateTaskInFile, serializeTask } from "src/lib/taskUtilities";
	import type TimeBlockPlugin from "main";
	export let plugin: TimeBlockPlugin; // Receive plugin prop from parent

	export let timeRange: { start: number; end: number };
	export let increment: number;

	async function handleTaskDrop(event: CustomEvent) {
		const { data: task, context } = event.detail;
		const start = moment(context.date + "T" + context.time);
		const end = start.clone().add(context.increment, "minutes");

		// Create new scheduled task metadata
		const updatedTask = {
			raw: task.raw,
			content: task.content,
			metadata: {
				...task.metadata,
				scheduled: {
					start: start.toISOString(),
					end: end.toISOString(),
				},
			},
		};

		// Update original file
		const success = await updateTaskInFile(
			task.metadata.movedFrom || "", // Use original file path if available
			task.raw,
			serializeTask(updatedTask),
		);

		if (success && plugin.settings.behaviorSettings.deleteTasksWhenMoving) {
			// Archive original task
			const archivedTask = {
				...task,
				metadata: {
					...task.metadata,
					archived: new Date().toISOString(),
				},
			};
			await updateTaskInFile(
				task.metadata.movedFrom || "",
				task.raw,
				serializeTask(archivedTask),
			);
		}
	}
</script>

<div class="timeline">
	<h3>Schedule</h3>
	<div class="timeline-grid">
		{#each Array.from( { length: (timeRange.end - timeRange.start) * (60 / increment) }, ) as _, i}
			<DropTarget accepts={["task"]} on:drop={handleTaskDrop}>
				<div class="timeline-slot">
					{#if (i * increment) % 60 === 0}
						<div class="timeline-time">
							{moment()
								.startOf("day")
								.add(
									timeRange.start * 60 + i * increment,
									"minutes",
								)
								.format("h A")}
						</div>
					{:else}
						<div class="timeline-time"></div>
					{/if}
					<div class="timeline-block"></div>
				</div>
			</DropTarget>
		{/each}
	</div>
</div>

<style lang="scss">
	.timeline {
	}
	.timeline-grid {
		flex: 1;
		overflow-y: scroll;
		overflow-x: hidden;
		padding-right: 0.5rem;
		margin-bottom: 1rem;

		/* Scrollbar styling */
		&::-webkit-scrollbar {
			width: 8px;
		}
		&::-webkit-scrollbar-thumb {
			background-color: var(--background-modifier-border);
			border-radius: 4px;
		}
	}

	.timeline-slot {
		display: grid;
		grid-template-columns: 3em 1fr;
		align-items: flex-start;
		position: relative;
		margin: 0 4px;
		width: 100%;
	}

	.timeline-time {
		color: var(--text-muted);
		font-size: 0.8em;
		margin-top: calc(-1em / 2);
	}

	.timeline-block {
		border: 2px solid var(--background-modifier-border);
		height: 2rem;
	}
</style>
