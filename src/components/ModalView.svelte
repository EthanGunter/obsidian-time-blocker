<script lang="ts">
	import type TimeBlockPlugin from "main";
	import Timeline from "./Timeline.svelte";
	import PeriodView from "./PeriodView.svelte";
	import { moment } from "obsidian";
	import type { Period } from "src/utilities";

	// TEMP SETTINGS STAND-INS
	const TIME_RANGE = { start: 6, end: 22 }; // 6AM - 10PM
	const INCREMENT = 30; // Minutes

	export let plugin: TimeBlockPlugin; // Receives settings from parent component
</script>

<div class="timeblock-container">
	<PeriodView {plugin} period="daily" />
	<Timeline timeRange={TIME_RANGE} increment={INCREMENT} />
</div>

<style lang="scss">
	.timeblock-container {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		max-height: 100%;
		padding: 1rem;
	}
</style>
