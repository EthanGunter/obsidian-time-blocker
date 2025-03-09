<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { dropzone } from "../lib/dnd";

	export let accepts: string[] = ["generic"];
	export let effect: "move" | "copy" = "move";
	export let hoverClass = "drop-active";
	export let context: unknown;

	const dispatch = createEventDispatcher<{
		drop: { data: unknown; context: unknown };
		error: Error;
	}>();

	let isActive = false;

	function handleDrop(data: unknown, event: DragEvent) {
		isActive = false;
		dispatch("drop", { data, context });
	}

	function handleDragEnter() {
		isActive = true;
	}

	function handleDragLeave() {
		isActive = false;
	}
</script>

<div
	{...$$props}
	class={`drop-target ${isActive ? "active" : ""} ${$$props.class}`}
	use:dropzone={{
		accept: accepts,
		effect,
		onDrop: handleDrop,
		hoverClass,
	}}
	on:dragenter={handleDragEnter}
	on:dragleave={handleDragLeave}
>
	<slot {isActive} />
</div>

<style>
	.drop-target {
		transition: background-color 0.2s ease;
		width: 100%;
		height: 100%;
	}

	.drop-target.active {
		background-color: var(--color-accent-alpha);
	}

	:global(.drop-active) {
		background-color: var(--background-modifier-hover);
	}
</style>
