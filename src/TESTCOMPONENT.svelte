<script lang="ts">
	import { draggable, droppable } from "./lib/dnd";
</script>

<h1>TEST</h1>
<div class="container">
	<div class="draggable-container">
		<div
			use:draggable={{
				type: "test",
				data: "test-data",
				// devDelay: 60000,
			}}
		>
			Test
		</div>
		<div
			use:draggable={{
				type: "lie",
				data: "lie-data",
				// devDelay: 60000,
			}}
		>
			Cake
		</div>
	</div>
	<div class="drop-container">
		<div
			class="drop-target"
			use:droppable={{
				accepts: ["test"],
				onDrop: (e) => {
					console.log("Accepting:", e.detail.data);
				},
			}}
		>
			Tests
		</div>
		<div
			class="drop-target"
			use:droppable={{
				accepts: ["lie"],
				onDrop: (e) => {
					console.log("Accepting:", e.detail.data);
				},
			}}
		>
			Lies
		</div>
	</div>
</div>

<style lang="scss">
	.container {
		display: grid;
		grid-template-rows: 1fr 1fr;

		height: 75vh;
		width: 75vw;

		border: 1px solid var(--background-modifier-border);
	}

	.draggable-container {
		display: flex;
		flex-wrap: wrap;
	}

	.drop-container {
		// width: 100%;
		display: flex;
		flex-direction: row;
	}

	.drop-target {
		flex-grow: 1;
		border: 1px solid white;
		// height: 50%;
	}

	:global .dnd-draggable {
		height: 3rem;
		min-width: 5rem;

		border: 1px solid red;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	:global .dnd-ghost {
		// border: 1px solid green;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	// :global .dnd-ghost.valid-drop {
	//     background-color: green;
	// 	border: 3px solid white;
	// }

	// :global .dnd-droppable.valid-drop{
	//     background-color: greenyellow;
	// }
</style>
