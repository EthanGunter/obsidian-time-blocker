<script lang="ts">
	import { draggable } from "src/lib/dnd";
	import { moment } from "obsidian";

	export let task: TaskDataWithFile;

	let statusMarker = "";
	$: statusMarker =
		task.metadata.status === "completed"
			? (statusMarker = "✔ ")
			: task.metadata.status === "canceled"
				? (statusMarker = "❌ ")
				: task.metadata.scheduled
					? "🕑 "
					: "⌛ ";
</script>

<div
	class="modal-task"
	use:draggable={{
		type: "task",
		data: task,
		// devDelay: 60000,
	}}
>
	<div class="task-content">
		{statusMarker}{task.contentLite}
	</div>
</div>

<style lang="scss">
	.modal-task {
		// position: relative; Fucks with dnd styling (the ghost gets placed offscreen 😢)
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.25rem;
		background: var(--background-secondary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 0.2rem;
		transition: transform 0.1s ease;

		&:hover {
			z-index: 1;
			transform: scale(1.02);
			box-shadow: 0 2px 8px var(--background-modifier-box-shadow);

			.task-controls {
				opacity: 1;
			}
		}
	}

	.task-content {
		flex: 1;
		padding: 0 0.5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		// white-space: nowrap;
	}

	.task-controls {
		display: flex;
		gap: 0.25rem;
		opacity: 0.8;
		transition: opacity 0.2s ease;
		touch-action: pan-y; // Prevent scroll interference

		button {
			padding: 0 0.25rem;
			background: none;
			border: none;
			color: var(--text-muted);
			cursor: pointer;
			touch-action: manipulation; // Improve touch targeting

			&:hover {
				color: var(--text-normal);
			}
		}
	}

	.dnd-ghost {
		background-color: red;
	}
</style>
