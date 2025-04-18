<script lang="ts">
	import { moment, Tasks } from "obsidian";
	import type TimeBlockPlugin from "src/main";
	import {
		getTasksFromFile,
		updateTaskInFile,
		serializeTask,
	} from "src/lib/taskUtilities";
	import TaskView from "./TimelineTask.svelte";
	import { pluginStore } from "src/stores/plugin";
	import { onMount } from "svelte";
	import {
		DndDragEvent,
		droppable,
		type DragPositionData,
		type DropEvent,
		type GhostRenderArgs,
		type GhostRenderFunction,
		type IntermediateGhostRenderFunction,
	} from "src/lib/dnd";
	import { taskStore } from "src/stores/tasks";

	let timeRange: { start: moment.Moment; end: moment.Moment } = {
		start: moment("06:00a", "hh:mma"),
		end: moment("10:00p", "hh:mma"),
	}; // 6AM - 10PM

	// These constants should match the ones in dnd.ts
	const BLOCK_SPAN: number = 60; // minutes
	const SNAP_INCREMENT: number = 30; // minutes
	let timelineGrid: HTMLElement;

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

	// TODO extract HTML utilities
	function currentEmToPx(unit: string, node?: HTMLElement) {
		const em = parseFloat(unit) || 0;
		const rootElement = unit.includes("rem")
			? document.documentElement
			: node || document.documentElement;
		const fontSize = parseFloat(getComputedStyle(rootElement).fontSize);
		return em * fontSize;
	}
	function getInnerRect(node: HTMLElement): DOMRect {
		const rect = node.getBoundingClientRect();
		const styles = getComputedStyle(node);

		// Parse paddings and borders
		const paddingTop = parseFloat(styles.paddingTop);
		const paddingRight = parseFloat(styles.paddingRight);
		const paddingBottom = parseFloat(styles.paddingBottom);
		const paddingLeft = parseFloat(styles.paddingLeft);

		const borderTop = parseFloat(styles.borderTopWidth);
		const borderRight = parseFloat(styles.borderRightWidth);
		const borderBottom = parseFloat(styles.borderBottomWidth);
		const borderLeft = parseFloat(styles.borderLeftWidth);

		const innerLeft = rect.left + borderLeft + paddingLeft;
		const innerTop = rect.top + borderTop + paddingTop;
		const innerRight = rect.right - borderRight - paddingRight;
		const innerBottom = rect.bottom - borderBottom - paddingBottom;
		const innerWidth = innerRight - innerLeft;
		const innerHeight = innerBottom - innerTop;

		return {
			x: innerLeft,
			y: innerTop,
			left: innerLeft,
			top: innerTop,
			right: innerRight,
			bottom: innerBottom,
			width: innerWidth,
			height: innerHeight,
			toJSON() {
				return {
					x: innerLeft,
					y: innerTop,
					left: innerLeft,
					top: innerTop,
					right: innerRight,
					bottom: innerBottom,
					width: innerWidth,
					height: innerHeight,
				};
			},
		} as DOMRect;
	}

	function calculateSnappedTime(clientY: number): {
		time: moment.Moment;
		snappedY: number; // Renamed from newY, now represents pixel coordinate
	} {
		// Ensure timelineGrid is available
		if (!timelineGrid) {
			console.error("timelineGrid element not bound yet.");
			// Return a default or throw an error, depending on desired behavior
			// For now, let's return the start time and top position
			return { time: timeRange.start.clone(), snappedY: 0 };
		}

		const gridRect = timelineGrid.getBoundingClientRect();

		// Calculate vertical position relative to the grid top (0.0 to 1.0)
		// Clamp clientY to be within the grid bounds before calculating percentage
		const clampedClientY = Math.max(
			gridRect.top,
			Math.min(clientY, gridRect.bottom),
		);
		const percentFromTop =
			gridRect.height > 0
				? (clampedClientY - gridRect.top) / gridRect.height
				: 0;

		// Calculate total minutes represented by the grid's duration
		const totalGridMinutes = timeRange.end.diff(timeRange.start, "minutes");

		// Calculate the minute offset from the grid start based on relative Y
		const minutesFromStart = percentFromTop * totalGridMinutes;

		// Snap the minutes to the nearest increment
		const snappedMinutes =
			Math.round(minutesFromStart / SNAP_INCREMENT) * SNAP_INCREMENT;

		// Calculate the final snapped time
		let snappedTime = timeRange.start
			.clone()
			.add(snappedMinutes, "minutes");

		// --- Boundary Checks for Time ---
		// Ensure snapped time is not before the start
		if (snappedTime.isBefore(timeRange.start)) {
			snappedTime = timeRange.start.clone();
		}
		// Ensure snapped time is not after the end
		if (snappedTime.isAfter(timeRange.end)) {
			snappedTime = timeRange.end.clone();
		}
		// --- End Boundary Checks ---

		// --- Calculate Snapped Pixel Y Coordinate ---
		// Recalculate the actual minutes from start for the *final* snappedTime
		const finalSnappedMinutesFromStart = snappedTime.diff(
			timeRange.start,
			"minutes",
		);

		// Calculate the proportional vertical position within the grid (0.0 to 1.0) based on the *snapped* time
		const snappedProportion =
			totalGridMinutes > 0
				? finalSnappedMinutesFromStart / totalGridMinutes
				: 0;

		// Calculate the snapped Y coordinate relative to the viewport
		// This is grid top + (proportion * grid height)
		const snappedY = gridRect.top + snappedProportion * gridRect.height;
		// --- End Calculate Snapped Pixel Y Coordinate ---

		// Return both the snapped time and the calculated pixel Y coordinate
		return { time: snappedTime, snappedY };
	}

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
		const { draggableType, data } = e.detail;
		if (draggableType.includes("resize")) {
			if (!data.metadata.scheduled)
				throw new Error(
					"Task resized before being scheduled. How the hell did you do that?",
				);
			// Task resize
			const direction = draggableType.split("resize/")[1];

			if (direction == "start") {
				scheduleTask(data, slot.time, data.metadata.scheduled?.end);
			} else if (direction == "end") {
				scheduleTask(data, data.metadata.scheduled?.start, slot.time);
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

	function handleGhostRender({
		ghost,
		posData,
		currentDroppableTarget: currTarg,
		setPosition,
	}: GhostRenderArgs<TaskData>) {
		if (!currTarg) return;

		const { clientY } = posData;
		const { snappedY, time } = calculateSnappedTime(clientY);

		let x: number = 0,
			y: number = 0;

		y = snappedY;
		// TODO This looks good, but drops are still registered by the cursor position, making the drop result unexpected
		y += posData.offsetY; // When simply moving the task, keep its position relative to the cursor

		const timelineBlock = currTarg.querySelector(
			".timeline-block",
		) as HTMLElement;
		if (timelineBlock) {
			const innerRect = getInnerRect(timelineBlock);
			x = innerRect.x;
			ghost.style.width = `${innerRect.width}px`;
		} else {
			console.error("Timeline block not found in the current target.");
			return;
		}

		setPosition({ x, y });
	}

	const taskResizeRenderer: IntermediateGhostRenderFunction<TaskData> = ({
		draggableType,
		data,
		node,
		ghost,
		posData,
		setPosition,
	}) => {
		if (!data?.metadata.scheduled) {
			console.error(
				"Task not scheduled yet. Cannot resize or move... How did you do that?",
			);
			return;
		}
		const { clientY } = posData;
		const { snappedY, time } = calculateSnappedTime(clientY);

		// TODO calculate x position based on timeline-grid, not the individual block...

		// Resize task
		const nodeRect = node.getBoundingClientRect();
		const direction = draggableType.split("resize/")[1];
		if (direction == "start") {
			// Set the y position and the new height so that the bottom of the element stays in the same location
			const originalEndY = calculateSnappedTime(
				data.metadata.scheduled.end,
			).snappedY;
			const newHeight = originalEndY - snappedY;
			ghost.style.height = `${newHeight}px`;
			// setPosition(x, snappedY);
		} else if (direction == "end") {
			// Simply set the new height to match the snapped time
			// Calculate the new height based on the snapped Y position
			const newHeight = snappedY - parseInt(node.style.top);
			ghost.style.height = `${newHeight}px`;
		}
		setPosition({ x: 0, y: nodeRect.top });

		return false; // Prevent further processing of the ghost render
	};
</script>

<div class="timeline">
	<h3>Schedule</h3>
	<div
		class="timeline-grid"
		bind:this={timelineGrid}
		style="--time-text-width: {TIME_COLUMN_WIDTH}"
	>
		{#each generateTimeSlots() as slot}
			<div
				use:droppable={{
					accepts: ["task", "task/resize/*"],
					onDrop: (e) => {
						handleTaskDrop(e, slot);
					},
					ghostRenderOverride: handleGhostRender,
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
					<TaskView
						{task}
						positionStyle={calcPositionParams(
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
		border-right: 2px solid var(--background-modifier-border);
		border-left: 2px solid var(--background-modifier-border);
		height: 2rem;
	}
</style>
