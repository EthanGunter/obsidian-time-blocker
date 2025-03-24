<script lang="ts">
	import { draggable } from "src/lib/dnd";
	import { moment } from "obsidian";

	export let task: TaskData;

	function handleMove(direction: "up" | "down" | "discard") {
		// TODO: Implement period movement logic
		console.log(`Moving task ${direction}`);
	}
</script>

<div
	class="modal-task"
	use:draggable={{
		type: "task",
		data: task,
		// devDelay: 60000,
	}}
>
	<!-- <button
		class="move-down"
		on:click={() => handleMove("down")}
		title="Move to longer period"
	>
		◀︎
	</button>
	<button
		class="discard"
		on:click={() => handleMove("discard")}
		title="Discard task"
	>
		✕
	</button> -->
	<div class="task-content">
		{task.content} - {moment(task.metadata.scheduled?.start).format(
			"hh:mma",
		)}
	</div>
	<!-- <button
		class="move-up"
		on:click={() => handleMove("up")}
		title="Move to shorter period"
	>
		▶︎
	</button> -->
</div>

<style lang="scss">
	.modal-task {
		// position: relative;
		// display: flex;
		// align-items: center;
		// gap: 0.5rem;
		// width: 100%;
		// padding: 0.25rem;
		// background: var(--background-secondary);
		// border: 1px solid var(--background-modifier-border);
		// border-radius: 0.2rem;
		// transition: transform 0.1s ease;

		// &:hover {
		// 	z-index: 1;
		// 	transform: scale(1.02);
		// 	box-shadow: 0 2px 8px var(--background-modifier-box-shadow);

		// 	.task-controls {
		// 		opacity: 1;
		// 	}
		// }
	}

	.task-content {
		flex: 1;
		padding: 0 0.5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
