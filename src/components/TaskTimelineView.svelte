<script lang="ts">
	import {
		DefaultGhostRenderer,
		draggable,
		type DragArgs,
		type GhostRenderFunction,
	} from "src/lib/dnd";
	import { createEventDispatcher } from "svelte";

	export let task: TaskData;

	export let positionStyle: {
		top?: string;
		left?: string;
		width?: string;
		height: string;
	} = {
		height: "2rem",
	};

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
	const onGhostRender: GhostRenderFunction = (evt, ghost, args) => {
		DefaultGhostRenderer(evt, ghost, args);
		const increment = pxPerRem * 2;
		// ghost.style.top = args.posData.y + "px"; //`${Math.round(parseInt(ghost.style.top) / increment) * increment}px`;
		// ghost.style.left = args.posData.x + "px";
	};
</script>

<div
	class="timeline-task"
	{...$$props}
	use:draggable={{ /*  axis: "y", */ onGhostRender, devDelay: 30000 }}
	style={Object.entries(positionStyle)
		.map(([k, v]) => `${k}: ${v}`)
		.join("; ")}
>
	<span class="resize-handle top" />
	<div class="task-content">{task.content}</div>
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
