<script lang="ts">
	import PeriodView from "./PeriodView.svelte";
	import type TimeBlockPlugin from "src/main";
	import { pluginStore } from "src/stores/plugin";
	
	let plugin: TimeBlockPlugin;
	pluginStore.subscribe((value) => (plugin = value));

	$: enabledPeriods = plugin?.getEnabledPeriods() || [];
</script>

<div class="periods-container">
	{#each enabledPeriods as period}
		<PeriodView {period} {plugin} />
	{/each}
</div>

<style lang="scss">
	.periods-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		// padding: 0 1rem;
	}
</style>
