<script lang="ts">
	import {
		draggable,
		dragGroup,
		type GhostRenderFunction,
	} from "src/lib/dnd";
	import { moment } from "obsidian";

	export let task: TaskDataWithFile;
	export let gridRow: string;
	export let resizeRenderer: GhostRenderFunction;
</script>

<div
	class="timeline-task"
	style={`grid-row: ${gridRow}`}
	use:dragGroup
	use:draggable={{
		type: "task",
		data: task,
		// devDelay: 60000,
	}}
>
	<span
		class="resize-handle top"
		use:draggable={{
			type: "task/resize/start",
			data: task,
			ghostRenderOverride: resizeRenderer,
		}}
	/>
	<div class="task-content">
		{task.content} - {task.metadata.scheduled
			? moment(task.metadata.scheduled.start).format("hh:mma")
			: "Unscheduled"}
	</div>
	<span
		class="resize-handle bottom"
		use:draggable={{
			type: "task/resize/end",
			data: task,
			ghostRenderOverride: resizeRenderer,
		}}
	/>
</div>

<style lang="scss">
	.timeline-task {
		// position: absolute;
		grid-row: var(--grid-row);
		display: flex;
		flex-direction: column;
		background-color: color-mix(
			in srgb,
			var(--background-modifier-border),
			transparent 70%
		);

		border-radius: 0.2rem;
		&:hover {
			outline: 1px solid var(--color-accent);
		}
	}

	.task-content {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;

		padding: 0 0.4em;
		font-size: 0.9em;
	}

	.resize-handle {
		height: 0.5rem;

		cursor: ns-resize;

		&:hover {
			border-color: var(--color-accent);
			border-style: solid;
		}
		&.top:hover {
			border-width: 3px 0 0 0;
		}
		&.bottom {
			margin-top: auto;
		}
		&.bottom:hover {
			border-width: 0 0 3px 0;
		}
	}
</style>
