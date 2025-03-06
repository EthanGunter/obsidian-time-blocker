<script lang="ts">
	import { onMount } from "svelte";
	
	export let settings: any;
	
	onMount(() => {
		console.log("TimeBlockView mounted with settings:", settings);
		// Here you'll later add code to load tasks based on settings
	});
</script>

<div class="timeblock-container">
	<h2>Time Block Planner</h2>
	
	{#if settings.daily?.enabled}
	<div class="timeblock-section">
		<h3>Daily Notes</h3>
		<div>Format: {settings.daily.format}</div>
		<div>Folder: {settings.daily.folder}</div>
	</div>
	{/if}
	
	{#if settings.weekly?.enabled}
	<div class="timeblock-section">
		<h3>Weekly Notes</h3>
		<div>Format: {settings.weekly.format}</div>
		<div>Folder: {settings.weekly.folder}</div>
	</div>
	{/if}
	
	{#if settings.monthly?.enabled}
	<div class="timeblock-section">
		<h3>Monthly Notes</h3>
		<div>Format: {settings.monthly.format}</div>
		<div>Folder: {settings.monthly.folder}</div>
	</div>
	{/if}
</div>

<style>
	.timeblock-container {
		padding: 18px;
		max-height: 70vh;
		overflow-y: auto;
	}

	h2 {
		margin-top: 0;
		color: var(--text-normal);
		margin-bottom: 20px;
	}
	
	.timeblock-section {
		margin-bottom: 1.5rem;
		padding: 1rem;
		border-radius: 4px;
		background-color: var(--background-secondary);
	}
	
	.timeblock-section h3 {
		margin-top: 0;
		margin-bottom: 0.5rem;
	}
</style>
