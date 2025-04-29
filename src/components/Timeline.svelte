<script lang="ts">
	import { moment } from "obsidian";
	import type TimeBlockPlugin from "src/main";
	import {
		getTasksFromFile,
		updateTask,
		serializeTask,
	} from "src/lib/taskUtilities";
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
	const BLOCK_SPAN = 60; // minutes
	const SNAP_INCREMENT = 30; // minutes
	const TIME_COLUMN_WIDTH = "3rem";
	let timelineGrid: HTMLElement;

	let filepath = "";
	let plugin: TimeBlockPlugin;
	pluginStore.subscribe((value) => {
		plugin = value;
		filepath =
			moment().format(plugin.getPeriodSetting("daily").filepathFormat) + ".md";
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
	function getBlockRect(): DOMRect | null {
		if (!timelineGrid) return null;
		const block = timelineGrid.querySelector(".timeline-block");
		return block ? block.getBoundingClientRect() : null;
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

	function calcPositionParams(start: moment.Moment, end: moment.Moment) {
		const gridRect = getGridRect();
		const blockRect = getBlockRect();
		if (!gridRect || !blockRect) return {};
		const top = timeToPos(start) - gridRect.top;
		const bottom = timeToPos(end) - gridRect.top;
		const height = bottom - top;
		return {
			top: `${top}px`,
			height: `${height}px`,
			width: `${blockRect.width}px`,
			left: `${blockRect.left - gridRect.left}px`,
		};
	}

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
		await updateTask(
			task,
			{metadata:{ ...task.metadata, scheduled: { start, end } }}
		);
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
		const blockRect = getBlockRect();
		if (!blockRect) return;
		if (draggableType.includes("resize")) return; // Let draggable override handle resize

		const x = blockRect.left;
		const snappedTime = posToTime(posData.clientY + posData.offsetY);
		const snappedY = timeToPos(snappedTime);

		setPosition({ x, y: snappedY });
		ghost.style.width = `${blockRect.width}px`;
	}

	const taskResizeRenderer = ({
		draggableType,
		data,
		node,
		ghost,
		posData,
		setPosition,
	}: GhostRenderArgs<TaskData>) => {
		const gridRect = timelineGrid?.getBoundingClientRect();
		if (!gridRect || !data?.metadata.scheduled) return;
		if (!draggableType.includes("resize")) return;

		const blockRect = getBlockRect();
		if (!blockRect) return;
		const x = blockRect.left;
		const width = blockRect.width;

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

<div class="timeline">
	<h3>Schedule</h3>
	<div
		class="timeline-grid"
		bind:this={timelineGrid}
		use:droppable={{
			accepts: ["task", "task/resize/*"],
			onDrop: handleTaskDrop,
			ghostRenderOverride: handleGhostRender,
		}}
		style="--time-text-width: {TIME_COLUMN_WIDTH}"
	>
		{#each generateTimeSlots() as slot}
			<div class="timeline-slot">
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
		margin-bottom: 1rem;
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
