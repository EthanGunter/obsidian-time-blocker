<script>
	import { draggable } from "src/lib/dnd";

	export let type = "test";
</script>

<div
	use:draggable={{
		type,
		data: `${type}-data`,
		// devDelay: 60000,
	}}
>
	<slot />
</div>

<style lang="scss">
	.dnd-draggable {
		height: 3rem;
		min-width: 5rem;

		border: 1px solid red;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.dnd-ghost {
		// border: 1px solid green;
		border-radius: 0.5rem;
		padding: 1rem;
	}
</style>
