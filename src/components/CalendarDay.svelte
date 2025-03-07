<script lang="ts">
	import { moment } from "obsidian";

	export let timeRange: { start: number; end: number };
	export let increment: number;
	export let timeHeight: number = 80; // Default height per hour
</script>

<div class="timeline-panel" style="--time-height: {timeHeight}; --increment: {increment}">
	<h3>Schedule</h3>
	<div class="timeline-grid">
		{#each Array.from( { length: (timeRange.end - timeRange.start) * (60 / increment) }, ) as _, i}
			<div class="timeline-slot">
				{#if (i * increment) % 60 === 0}
					<div class="timeline-time">
						{moment()
							.startOf("day")
							.add(
								timeRange.start * 60 + i * increment,
								"minutes",
							)
							.format("h A")}
					</div>
				{:else}
					<div class="timeline-time"></div>
				{/if}
				<div class="timeline-block"></div>
			</div>
		{/each}
	</div>
</div>

<style lang="scss">
	.timeline-panel {
		max-width: 400px;
		overflow-y: auto;
		padding-right: 0.5rem;
	}

	.timeline-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2px;
		margin-top: 1rem;
	}

	.timeline-slot {
		display: flex;
		align-items: flex-start;
		height: calc(var(--time-height) * (var(--increment) / 60) * 1px);
		position: relative;
		margin: 0 4px;
	}

	.timeline-time {
		width: 60px;
		color: var(--text-muted);
		font-size: 0.8em;
	}

	.timeline-block {
		flex: 1;
		outline: 1px solid var(--background-modifier-border);
		height: 100%;
	}
</style>
