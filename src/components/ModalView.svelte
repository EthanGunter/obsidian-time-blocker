<script lang="ts">
	import Timeline from "./Timeline.svelte";
	import PeriodView from "./PeriodView.svelte";
	import PeriodsTaskList from "./PeriodsTaskList.svelte";
</script>

<div class="timeblock-container">
	<PeriodsTaskList />
	<div class="divider" />
	<!-- <div class="right">
	</div> -->
	<Timeline />
</div>

<style lang="scss">
	.timeblock-container {
		gap: 1.5rem;
		padding: 0 1rem;

		display: grid;
		grid-template-columns: 1fr 1px 1fr;

		height: calc(var(--dialog-max-height) - 3rem);
		// width: calc(var(--dialog-max-width) - 3rem);
	}
	.left {
		display: flex;
		flex: 1;
		overflow-y: auto;
		min-height: 0; /* Optional: border */
	}
	.right {
		display: flex;
		flex: 1;
		overflow-y: auto;
		min-height: 0;
	}
	.divider {
		background-color: var(--background-modifier-border);
	}
</style>
