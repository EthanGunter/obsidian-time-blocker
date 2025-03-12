<script lang="ts">
	import {
		DefaultGhostPosition,
		draggable,
		type DragData,
		type GhostRenderFunction,
	} from "src/lib/dnd";
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

	const dispatch = createEventDispatcher<{
		resize: { deltaMinutes: number; direction: "top" | "bottom" };
	}>();

	function handleResize(direction: "top" | "bottom") {
		return (deltaMinutes: number) => {
			dispatch("resize", { deltaMinutes, direction });
		};
	}
	const pxPerRem = parseFloat(
		getComputedStyle(document.documentElement).fontSize,
	);
</script>

<div
	class="timeline-task"
	{...$$props}
	use:draggable={{
		type: "task",
		data: task,
		onGhostPosition: () => ({ x: null, y: null }),
	}}
	style={serializedStyle}
>
	<span class="resize-handle top" />
	<div class="task-content">
		{task.content} - {moment(task.metadata.scheduled?.start).format(
			"hh:mma",
		)}
	</div>
	<span class="resize-handle bottom" />
</div>

<style lang="scss">
	.timeline-task {
		position: absolute;
		display: flex;
		flex-direction: column;
		background: var(--background-modifier-border);
		background-color: color-mix(
			in srgb,
			var(--background-modifier-border),
			transparent 70%
		);
		cursor: move;

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

	.dnd-ghost {
		background-color: green;
	}
</style>
