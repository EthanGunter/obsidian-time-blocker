<script lang="ts">
	import { moment } from "obsidian";
	import type TimeBlockPlugin from "src/main";
	import { updateTask } from "src/lib/taskUtilities";
	import TaskView from "./TimelineTask.svelte";
	import { pluginStore } from "src/stores/plugin";
	import { onMount } from "svelte";
	import {
		droppable,
		type DropEvent,
		type GhostRenderArgs,
	} from "src/lib/dnd";
	import { taskStore } from "src/stores/tasks";

	let timeRange = {
		start: moment("06:00a", "hh:mma"),
		end: moment("10:00p", "hh:mma"),
	};
	const BLOCK_SPAN = 60; // 1 hr
	const SNAP_INCREMENT = 30; // minutes
	const INC_PER_SLOT = BLOCK_SPAN / SNAP_INCREMENT;
	const SPAN_HOURS = timeRange.end.diff(timeRange.start, "minutes") / 60;
	const ROW_COUNT = SPAN_HOURS * INC_PER_SLOT;
	console.log(ROW_COUNT, SPAN_HOURS);

	const hourSlots = generateTimeSlots();

	let timelineGrid: HTMLElement;
	let timelineSlots: HTMLElement;

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
		taskStore.watchFile(filepath);
		return () => taskStore.unwatchFile(filepath);
	});

	// --- Time/Pixel Math Utilities ---
	function getGridRect() {
		return timelineGrid?.getBoundingClientRect();
	}
	function posToTime(y: number): moment.Moment {
		const gridRect = getGridRect();
		if (!gridRect) return timeRange.start.clone();
		const clampedY = Math.max(gridRect.top, Math.min(y, gridRect.bottom));
		const percent = (clampedY - gridRect.top) / gridRect.height;
		const totalMinutes = timeRange.end.diff(timeRange.start, "minutes");
		const minutesFromStart = percent * totalMinutes;
		const snappedMinutes =
			Math.round(minutesFromStart / SNAP_INCREMENT) * SNAP_INCREMENT;
		let snapped = timeRange.start.clone().add(snappedMinutes, "minutes");
		if (snapped.isBefore(timeRange.start))
			snapped = timeRange.start.clone();
		if (snapped.isAfter(timeRange.end)) snapped = timeRange.end.clone();
		return snapped;
	}
	function timeToPos(time: moment.Moment): number {
		const gridRect = getGridRect();
		if (!gridRect) return 0;
		const totalMinutes = timeRange.end.diff(timeRange.start, "minutes");
		const minutesFromStart = time.diff(timeRange.start, "minutes");
		const percent = minutesFromStart / totalMinutes;
		return gridRect.top + percent * gridRect.height;
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
		const slotCount = Math.ceil(totalMinutes / BLOCK_SPAN) + 1; //+1 allows final hour to display
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

	function handleTaskDrop(e: DropEvent) {
		const { draggableType, data, ghost, clientY } = e.detail;
		if (draggableType.includes("resize")) {
			const dropTime = posToTime(clientY);
			const direction = draggableType.split("resize/")[1];
			if (direction == "start") {
				scheduleTask(data, dropTime, data.metadata.scheduled?.end);
			} else if (direction == "end") {
				scheduleTask(data, data.metadata.scheduled?.start, dropTime);
			}
		} else {
			const dropTime = posToTime(ghost.getBoundingClientRect().top);
			if (data.metadata.scheduled) {
				const duration = data.metadata.scheduled.end.diff(
					data.metadata.scheduled.start,
				);
				scheduleTask(data, dropTime, dropTime.clone().add(duration));
			} else {
				scheduleTask(
					data,
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

		const slotRect = timelineSlots.getBoundingClientRect();
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

		const gridRect = timelineGrid?.getBoundingClientRect();
		if (!gridRect || !data?.metadata.scheduled) return;

		const slotRect = timelineSlots.getBoundingClientRect();
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
	<h3>Schedule</h3>
	<div
		class="timeline"
		bind:this={timelineGrid}
		use:droppable={{
			accepts: ["task", "task/resize/*"],
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
		<div class="time-slots" bind:this={timelineSlots}>
			<div class="time-slot-background">
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
								--grid-row={calcGridRow(
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
	.timeline-container {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.timeline {
		display: grid;
		grid-template-columns: 3rem auto;
		grid-template-rows: repeat(var(--slot-count), 2rem);

		padding: 1rem 0;
		overflow-y: scroll;
	}

	.time-markers,
	.time-slot-background,
	.scheduled-tasks {
		display: grid;
		grid-template-rows: repeat(var(--slot-count), 2rem);
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

	// Overlay grids
	.time-slots {
		position: relative;
	}
	.time-slot-background,
	.scheduled-tasks {
		position: absolute;
		top: 0;
		left: 0;
	}
	.time-slot-background {
		pointer-events: none;
	}
	.time-slot {
		grid-row-start: var(--start);
		width: 100%;
		box-sizing: border-box;
		border-top: 2px solid var(--background-modifier-border);
		height: 2rem;
	}
</style>
