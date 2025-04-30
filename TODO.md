- [ ] Add a horizontal line that shows the current time on the timeline
- [x] Add task droppable behavior to PeriodView root
    - [x] Use periodic templates to create new notes that don't exist
        - [x] Figure out why templater doesn't run when a new file is created...
    - [x] Files that are created don't get "watched" so they don't update the modal UI when the file starts existing
- [ ] If a task is dropped on the timeline from any period other than today, move it to today
- [ ] Closing the modal unpopulates the scheduled tasks in the sidebar...
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