<script lang="ts">
	import { draggable } from "src/lib/dnd";
	import { createEventDispatcher } from "svelte";
	import { moment } from "obsidian";

	export let task: TaskData;

	export let positionStyle: {
		top?: string;
		left?: string;
		width?: string;
		height: string;
	} = {
		height: "2rem",
	};
	$: serializedStyle = Object.entries(positionStyle)
		.map(([k, v]) => `${k}: ${v}`)
		.join("; ");
</script>

<div
	class="timeline-task"
	use:draggable={{
		type: "task",
		data: task,
		// devDelay: 60000,
	}}
	style={serializedStyle}
>
	<span
		class="resize-handle top"
		use:draggable={{ type: "task/resize/start", data: task }}
	/>
	<div class="task-content">
		{task.content} - {task.metadata.scheduled
			? moment(task.metadata.scheduled.start).format("hh:mma")
			: "Unscheduled"}
	</div>
	<span
		class="resize-handle bottom"
		use:draggable={{ type: "task/resize/end", data: task }}
	/>
</div>

<style lang="scss">
	.timeline-task {
		position: absolute;
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
