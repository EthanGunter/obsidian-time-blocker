<script lang="ts">
	import PeriodView from "./PeriodView.svelte";
	import type TimeBlockPlugin from "src/main";
	import { pluginStore } from "src/stores/plugin";

	let plugin: TimeBlockPlugin;
	pluginStore.subscribe((value) => (plugin = value));

	$: enabledPeriods = plugin?.getEnabledPeriods() || [];
</script>

<div
	class="periods-container"
	style={`--data-periodcount: ${enabledPeriods.length - 1}`}
>
	{#each enabledPeriods as period}
		<PeriodView {period} {plugin} />
	{/each}
</div>

<style lang="scss">
	.periods-container {
		display: grid;
		grid-template-rows: auto repeat(var(--data-periodcount), min-content); /* Daily + 4 periods */
		gap: 1rem;
		height: 100%;
	}
</style>
