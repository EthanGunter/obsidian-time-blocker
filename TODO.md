# Bugs
- [ ] Task extraction is failing quite spectacularly on the Yearly template
- [ ] Remove test modal
- [ ] Closing the modal unpopulates the scheduled tasks in the sidebar...

# Timeline tasks
- [ ] Add a horizontal line that shows the current time on the timeline
- [ ] If a task is dropped on the timeline from any period other than today, move it to today

# Big Picture
- [ ] Implement review periods
- [ ] Implement notification behavior
  - [ ] Without push notifications, this will have to function 100% in app...

# QoL
- [ ] Add a link to the timeline that opens today's note
  - [ ] Change the timeline header from "Schedule" to whatever the [todo] header is in today's note
- [ ] Add styling to timeline tasks to indicate completion status
  - [ ] And remove the scheduled time, it's redundant...
- [ ] Come up with a better solution for the timeline height
- [ ] Add styling to mute the scheduling data in-editor
- [ ] Handle dependency-settings update
    ```ts
    this.registerEvent(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (<any>this.app.workspace).on(
        "periodic-notes:settings-updated",
        this.onNoteSettingsUpdate
      )
    );
    ```

- [x] If a task is drag-scheduled at the same time as itself, it becomes uninteractable
- [x] Drop operation does not line up with the ghost position
- [x] Drop operations on the timeline result in a task scheduled 30 minutes after the drop position (I think)
- [x] Resize-end makes the task duration 0 minutes...
- [x] Drag ghost does not snap correctly to the timeline
- [x] Add task droppable behavior to PeriodView root
    - [x] Use periodic templates to create new notes that don't exist
        - [x] Figure out why templater doesn't run when a new file is created...
    - [x] Files that are created don't get "watched" so they don't update the modal UI when the file starts existing