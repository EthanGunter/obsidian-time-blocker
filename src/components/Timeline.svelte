<script lang="ts">
	import { moment } from "obsidian";
	import type TimeBlockPlugin from "src/main";
	import { moveTask, updateTask } from "src/lib/taskUtilities";
	import TaskView from "./TimelineTask.svelte";
	import { pluginStore } from "src/stores/plugin";
	import { onMount } from "svelte";
	import {
		droppable,
		type DropEvent,
		type GhostRenderArgs,
	} from "src/lib/dnd";
	import { taskStore } from "src/stores/tasks";
	import { getInnerClientRect } from "src/lib/util";

	let timeRange = {
		start: moment("06:00a", "hh:mma"),
		end: moment("10:00p", "hh:mma"),
	};
	const BLOCK_SPAN = 60; // 1 hr
	const SNAP_INCREMENT = 30; // minutes
	const INC_PER_SLOT = BLOCK_SPAN / SNAP_INCREMENT;
	const SPAN_HOURS = timeRange.end.diff(timeRange.start, "minutes") / 60;
	const ROW_COUNT = SPAN_HOURS * INC_PER_SLOT;

	const hourSlots = generateTimeSlots();

	let timeline: HTMLElement;
	let timelineGrid: HTMLElement;
	$: currentTime = moment(0);

	let filepath = "";
	let plugin: TimeBlockPlugin;
	pluginStore.subscribe((value) => {
		plugin = value;
		filepath =
			moment().format(plugin.getPeriodSetting("daily").filepathFormat) +
			".md";
	});

	const fileData = taskStore.getFileData(filepath);
	onMount(() => {
		// Setup current time indicator line
		currentTime = moment();
		const lineInterval = setInterval(() => {
			// Update the time once a minute
			currentTime = moment();
		}, 1000);

		taskStore.watchFile(filepath);
		return () => {
			clearInterval(lineInterval);
			taskStore.unwatchFile(filepath);
		};
	});

	// --- Time/Pixel Math Utilities ---
	function posToTime(y: number): moment.Moment {
		const gridInnerRect = getInnerClientRect(timelineGrid);
		// Return start time if grid isn't rendered yet
		if (!gridInnerRect || gridInnerRect.height === 0)
			return timeRange.start.clone();

		// Calculate y relative to the grid's top edge
		const relativeY = Math.max(
			0,
			Math.min(y - gridInnerRect.top, gridInnerRect.height),
		);

		// Calculate proportion of height
		const proportion = relativeY / gridInnerRect.height;

		// Calculate total duration in minutes
		const totalMinutes = timeRange.end.diff(timeRange.start, "minutes");

		// Calculate minutes from start based on proportion
		const minutesFromStart = proportion * totalMinutes;

		// Snap to the nearest increment
		const snappedMinutes =
			Math.round(minutesFromStart / SNAP_INCREMENT) * SNAP_INCREMENT;

		return timeRange.start.clone().add(snappedMinutes, "minutes");
	}

	function timeToPos(time: moment.Moment, relative: boolean = false): number {
		const gridRect = getInnerClientRect(timelineGrid);
		// Return 0 if grid isn't rendered yet
		if (!gridRect || gridRect.height === 0) return 0;

		// Calculate total duration in minutes
		const totalMinutes = timeRange.end.diff(timeRange.start, "minutes");

		// Calculate minutes from start for the given time, clamped to the range
		const minutesFromStart = Math.max(
			0,
			Math.min(time.diff(timeRange.start, "minutes"), totalMinutes),
		);

		// Calculate proportion of total duration
		const proportion = minutesFromStart / totalMinutes;

		// Calculate relative y position
		const relativeY = proportion * gridRect.height;

		// Return absolute y position relative to viewport
		if (relative) {
			return relativeY;
		} else {
			return relativeY + gridRect.top;
		}
	}

	function timeToRow(time: moment.Moment): number {
		const minutesFromStart = time.diff(timeRange.start, "minutes");
		const slotNum =
			Math.ceil((minutesFromStart / BLOCK_SPAN) * INC_PER_SLOT) + 1;

		return slotNum;
	}

	function calcGridRow(start: moment.Moment, end: moment.Moment) {
		const startRow = timeToRow(start);
		const endRow = timeToRow(end);
		return `${startRow} / ${endRow}`;
	}

	function generateTimeSlots() {
		const gridStart = moment(timeRange.start);
		const gridEnd = moment(timeRange.end);
		const totalMinutes = gridEnd.diff(gridStart, "minutes");
		const slotCount = Math.ceil(totalMinutes / BLOCK_SPAN); //+1 allows final hour to display
		return Array.from({ length: slotCount }, (_, i) => {
			const slotTime = gridStart.clone().add(i * BLOCK_SPAN, "minutes");
			return {
				time: slotTime,
				rowStart: i * INC_PER_SLOT + 1, // Grid uses 1-based index
			};
		});
	}

	async function scheduleTask(
		task: TaskDataWithFile,
		start: moment.Moment,
		end: moment.Moment,
	) {
		await updateTask(task, {
			metadata: { ...task.metadata, scheduled: { start, end } },
		});
	}

	async function handleTaskDrop(e: DropEvent) {
		const { draggableType, ghost, clientY } = e.detail;
		let taskData: TaskDataWithFile = e.detail.data;
		if (draggableType.includes("resize")) {
			const dropTime = posToTime(clientY);
			const direction = draggableType.split("resize/")[1];
			if (direction == "start") {
				scheduleTask(
					taskData,
					dropTime,
					taskData.metadata.scheduled?.end,
				);
			} else if (direction == "end") {
				scheduleTask(
					taskData,
					taskData.metadata.scheduled?.start,
					dropTime,
				);
			}
		} else {
			const dropTime = posToTime(ghost.getBoundingClientRect().top);

			const moveSuccess = await moveTask(taskData, filepath, "daily");
			if (moveSuccess) {
				taskData.filepath = filepath;
			}

			if (taskData.metadata.scheduled) {
				const duration = taskData.metadata.scheduled.end.diff(
					taskData.metadata.scheduled.start,
				);
				scheduleTask(
					taskData,
					dropTime,
					dropTime.clone().add(duration),
				);
			} else {
				scheduleTask(
					taskData,
					dropTime,
					dropTime.clone().add(BLOCK_SPAN, "minutes"),
				);
			}
		}
	}

	function handleGhostRender({
		draggableType,
		ghost,
		posData,
		setPosition,
	}: GhostRenderArgs<TaskData>) {
		if (draggableType.includes("resize")) return; // Let draggable override handle resize

		const slotRect = timelineGrid.getBoundingClientRect();
		if (!slotRect) return;

		const x = slotRect.left;
		const snappedTime = posToTime(posData.clientY + posData.offsetY);
		const snappedY = timeToPos(snappedTime);

		setPosition({ x, y: snappedY });
		ghost.style.width = `${slotRect.width}px`;
	}

	const taskResizeRenderer = ({
		draggableType,
		data,
		node,
		ghost,
		posData,
		setPosition,
	}: GhostRenderArgs<TaskData>) => {
		if (!draggableType.includes("resize")) return;

		const gridRect = timeline?.getBoundingClientRect();
		if (!gridRect || !data?.metadata.scheduled) return;

		const slotRect = timelineGrid.getBoundingClientRect();
		if (!slotRect) return;

		const x = slotRect.left;
		const width = slotRect.width;

		const snappedTime = posToTime(posData.clientY);
		const snappedY = timeToPos(snappedTime);

		const origRect = node
			.closest(".timeline-task")
			?.getBoundingClientRect();
		if (!origRect) return;

		const direction = draggableType.split("resize/")[1];
		let newTop = origRect.top;
		let newHeight = origRect.height;

		if (direction === "start") {
			newTop = snappedY;
			newHeight = origRect.bottom - newTop;
		} else if (direction === "end") {
			newTop = origRect.top;
			newHeight = snappedY - newTop;
		}
		setPosition({ x, y: newTop });
		ghost.style.height = `${newHeight}px`;
		ghost.style.width = `${width}px`;
		return false; // Prevent droppable override
	};
</script>

<div class="timeline-container" style={`--slot-count: ${ROW_COUNT}`}>
	<h3>Today's Schedule</h3>
	<div
		class="timeline"
		bind:this={timeline}
		use:droppable={{
			accepts: ["task", "task/timeline", "task/resize/*"],
			onDrop: handleTaskDrop,
			ghostRenderOverride: handleGhostRender,
		}}
	>
		<div class="time-markers">
			{#each hourSlots as slot}
				<div class="time-mark" style={`--start: ${slot.rowStart}`}>
					{slot.time.format("h A")}
				</div>
			{/each}
		</div>
		<div class="time-slots">
			<div class="time-slot-background" bind:this={timelineGrid}>
				<div
					class="time-indicator"
					style={`--now: ${timeToPos(currentTime, true)}px`}
				/>
				{#each hourSlots as slot}
					<div
						class="time-slot"
						style={`--start: ${slot.rowStart}`}
					/>
				{/each}
			</div>
			<div class="scheduled-tasks">
				{#if $fileData?.status === "loaded"}
					{#each $fileData.tasks as task}
						{#if task.metadata.scheduled}
							<TaskView
								{task}
								gridRow={calcGridRow(
									task.metadata.scheduled.start,
									task.metadata.scheduled.end,
								)}
								resizeRenderer={taskResizeRenderer}
							/>
						{/if}
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.accent {
		color: var(--color-accent);
	}
	.timeline-container {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		--template-rows: repeat(var(--slot-count), 2rem);
	}

	.timeline {
		display: grid;
		grid-template-columns: 3rem auto;
		grid-template-rows: var(--template-rows);

		padding: 1rem 0;
		overflow-x: hidden;
		overflow-y: scroll;
	}

	.time-markers,
	.time-slot-background,
	.scheduled-tasks {
		display: grid;
		grid-template-rows: var(--template-rows);
		width: 100%;
	}

	.time-markers {
		width: 3rem;
		.time-mark {
			grid-row-start: var(--start);
			color: var(--text-muted);
			font-size: 0.8em;
			margin-top: calc(-1em / 1.75);
		}
	}

	.scheduled-tasks {
		z-index: 2;
	}

	// Overlay grids
	.time-slots {
		position: relative;
		z-index: 1;
	}
	.time-slot-background,
	.scheduled-tasks {
		position: absolute;
	}
	.time-slot-background {
		pointer-events: none;
		--divider-line: 2px solid var(--background-modifier-border);
		border-bottom: var(--divider-line);
	}
	.time-slot {
		grid-row-start: var(--start);
		width: 100%;
		box-sizing: border-box;
		border-top: var(--divider-line);
		height: 2rem;
	}
	.time-indicator {
		position: absolute;
		display: flex;
		top: var(--now);
		height: 1px;
		width: 100%;
		background-color: var(--color-accent-1);
		&::before {
			content: "";
			position: absolute;
			height: 10px;
			bottom: 0;
			width: 100%;
			background: linear-gradient(transparent, var(--color-accent));
		}
	}
</style>
