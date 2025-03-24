<script lang="ts">
	import Timeline from "./Timeline.svelte";
	import PeriodView from "./PeriodView.svelte";
</script>

<div class="timeblock-container">
	<PeriodView period="daily" />
	<div class="divider" />
	<Timeline />
</div>

<style lang="scss">
	.timeblock-container {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 1px 1fr;
		gap: 2rem;
		max-height: 100%;
		padding: 1rem;
	}
	.divider {
		background-color: var(--background-modifier-border);
	}
</style>
