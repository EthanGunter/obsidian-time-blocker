<script lang="ts">
	import { moment, Tasks } from "obsidian";
	import type TimeBlockPlugin from "src/main";
	import {
		getTasksFromFile,
		updateTaskInFile,
		serializeTask,
	} from "src/lib/taskUtilities";
	import TaskTimelineView from "./TaskTimelineView.svelte";
	import { pluginStore } from "src/stores/plugin";
	import { onMount } from "svelte";
	import { droppable, type DragData, type DropEvent } from "src/lib/dnd";
	import { taskStore } from "src/stores/tasks";

	let timeRange: { start: moment.Moment; end: moment.Moment } = {
		start: moment("06:00a", "hh:mma"),
		end: moment("10:00p", "hh:mma"),
	}; // 6AM - 10PM

	// These constants should match the ones in dnd.ts
	const BLOCK_SPAN: number = 60; // minutes
	const SNAP_INCREMENT: number = 15; // minutes

	let filepath = "";
	let plugin: TimeBlockPlugin;
	pluginStore.subscribe((value) => {
		plugin = value;
		filepath =
			moment().format(plugin.getPeriodSetting("daily").format) + ".md";
	});

	const fileData = taskStore.getFileData(filepath);
	onMount(() => {
		taskStore.watchFile(filepath);
		return () => {
			taskStore.unwatchFile(filepath);
		};
	});

	const BLOCK_HEIGHT = 2; //rem
	const TIME_COLUMN_WIDTH = "3rem";

	function calcPositionParams(
		startTime: moment.Moment,
		endTime: moment.Moment,
	) {
		// const gridStart = moment(timeRange.start);

		// Convert string times to moment objects
		// const startMoment = moment(startTime);
		// const endMoment = moment(endTime);

		// Calculate positions relative to grid start
		const startOffset = startTime.diff(timeRange.start, "minutes");
		const duration = endTime.diff(startTime, "minutes");

		// Convert to grid units
		const unitsFromTop = startOffset / BLOCK_SPAN;
		const durationUnits = duration / BLOCK_SPAN;

		return {
			top: `${unitsFromTop * BLOCK_HEIGHT}rem`,
			height: `${durationUnits * BLOCK_HEIGHT}rem`,
			width: `calc(100% - ${TIME_COLUMN_WIDTH} - 4px)`,
			left: `calc(${TIME_COLUMN_WIDTH} + 6px)`,
		};
	}

	// Generate time slots for the timeline grid
	function generateTimeSlots() {
		const gridStart = moment(timeRange.start);
		const gridEnd = moment(timeRange.end);

		const totalMinutes = gridEnd.diff(gridStart, "minutes");
		const slotCount = Math.ceil(totalMinutes / BLOCK_SPAN);

		return Array.from({ length: slotCount }, (_, i) => {
			const slotTime = gridStart.clone().add(i * BLOCK_SPAN, "minutes");
			return {
				time: slotTime,
				isHourMark: slotTime.minutes() === 0,
				index: i,
			};
		});
	}

	async function scheduleTask(
		task: TaskData,
		start: moment.Moment,
		end: moment.Moment,
	) {
		console.log("Scheduling task for:", start.toString(), end.toString());

		// Create updated task with new schedule
		const updatedTask: TaskData = {
			...task,
			metadata: {
				...task.metadata,
				scheduled: { start, end },
			},
		};

		// Get current daily note path
		const dailyFormat = plugin.getPeriodSetting("daily").format;
		const filepath = moment().format(dailyFormat) + ".md";

		// Update in vault
		const success = await updateTaskInFile(
			filepath,
			task.raw,
			`${serializeTask(updatedTask)}`,
		);

		// if (success) {
		// 	// Refresh displayed tasks
		// 	await loadScheduledTasks();
		// }
	}

	function handleTaskDrop(
		e: DropEvent,
		slot: {
			time: moment.Moment;
			isHourMark: boolean;
			index: number;
		},
	) {
		const { type, data } = e.detail as { type: string; data: TaskData };
		if (type.includes("resize")) {
			if (!data.metadata.scheduled)
				throw new Error(
					"Task resized before being scheduled. How the hell did you do that?",
				);
			// Task resize
			const direction = type.split("resize/")[1];

			if (direction == "start") {
				scheduleTask(data, slot.time, data.metadata.scheduled?.end);
			} else if (direction == "end") {
				scheduleTask(
					data,
					data.metadata.scheduled?.start,
					slot.time.clone().add(BLOCK_SPAN, "minutes"),
				);
			} else {
				throw new Error(`Unimplemented resize handler: ${direction}`);
			}
		} else {
			// Task move
			if (data.metadata.scheduled) {
				scheduleTask(
					data,
					slot.time,
					slot.time
						.clone()
						.add(
							data.metadata.scheduled.end
								.clone()
								.diff(data.metadata.scheduled.start),
						),
				);
			} else {
				scheduleTask(
					data,
					slot.time,
					slot.time.clone().add(BLOCK_SPAN, "minutes"),
				);
			}
		}
	}

	function handleGhostPosition(
		event: DragEvent,
		args: DragData,
		slot: {
			time: moment.Moment;
			isHourMark: boolean;
			index: number;
		},
	) {
		const curTarg = event.currentTarget as HTMLElement;

		const y = curTarg.getBoundingClientRect().top;
		const x =
			curTarg.querySelector(".timeline-block")?.getBoundingClientRect()
				.left ?? 0;

		return { x, y };
	}
</script>

<div class="timeline">
	<h3>Schedule</h3>
	<div class="timeline-grid" style="--time-text-width: {TIME_COLUMN_WIDTH}">
		{#each generateTimeSlots() as slot}
			<div
				use:droppable={{
					accepts: ["task", "task/resize/*"],
					onDrop: (e) => {
						handleTaskDrop(e, slot);
					},
					onGhostPosition: (evt, args) => {
						return handleGhostPosition(evt, args, slot);
					},
				}}
				class="timeline-slot"
				data-context={JSON.stringify(slot.time)}
			>
				<div class="timeline-time">
					{#if slot.isHourMark}
						{slot.time.format("h A")}
					{/if}
				</div>
				<div class="timeline-block"></div>
			</div>
		{/each}

		{#if $fileData}
			{#each $fileData.tasks as task}
				{#if task.metadata.scheduled}
					<TaskTimelineView
						{task}
						positionStyle={calcPositionParams(
							task.metadata.scheduled.start,
							task.metadata.scheduled.end,
						)}
					/>
				{/if}
			{/each}
		{/if}
	</div>
</div>

<style lang="scss">
	.timeline-grid {
		position: relative;
		// overflow-y: scroll;
		// overflow-x: hidden;
		margin-bottom: 1rem;

		/* Scrollbar styling */
		&::-webkit-scrollbar {
			width: 8px;
		}
		&::-webkit-scrollbar-thumb {
			background-color: var(--background-modifier-border);
			border-radius: 4px;
		}
	}

	.timeline-slot {
		display: grid;
		grid-template-columns: var(--time-text-width) 1fr;
		margin: 0 4px;
		width: 100%;
	}

	.timeline-time {
		color: var(--text-muted);
		font-size: 0.8em;
		margin-top: calc(-1em / 1.75);
	}

	.timeline-block {
		box-sizing: border-box;
		border-top: 1px solid var(--background-modifier-border);
		border-bottom: 1px solid var(--background-modifier-border);
		border-inline-end: 2px solid var(--background-modifier-border);
		border-inline-start: 2px solid var(--background-modifier-border);
		height: 2rem;
	}
</style>
