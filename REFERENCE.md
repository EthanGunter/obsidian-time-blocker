# Time-Blocker Plugin Reference Document

## Core Purpose
**A manual priority refinement system** that helps users:
1. Curate tasks across time horizons 
2. Maintain intentional focus through active commitment
3. Preserve decision history without content duplication

## Review Rhythm
| Period   | Default Review Time       | Note Integration         |
|----------|---------------------------|--------------------------|
| Daily    | Morning/Evening choice    | Embedded in daily note   |
| Weekly   | Sunday 5:00 PM            | Dedicated weekly review  |
| Monthly  | Last Sunday 4:00 PM       | Monthly goal section     |
| Quarterly| Final Sunday 3:00 PM      | Quarterly roadmap        |
| Yearly   | December 30th 2:00 PM     | Annual planning document |

- All non-daily periods are optionally enabled
- The timing of the review period doesn't matter as much as the order they happen in, in the event of overlapping reiew periods

## Interface Requirements
1. **Task List Interface**
   - Vertical list of tasks from current + parent periods
   - Faded display for archived/descoped tasks
   - Per-task controls: ◀︎ ✕ ▶︎ 
      - **▶︎**: Move up in priority (Year→Quarter→Month→Week→Day)
        - Creates a copy of the task in the period actively being reviewed
      - **◀︎**: Move down in priority (Day→Week→Month→Quarter→Year)
        - Creates a copy in the next longest period if it isn't already there. Either marks the task in the current period as cancelled or deletes the task, depending on settings
      - **✕**: Marks the task as discarded.
    - Hovering a task highlights any tasks with the same pre-metadata text in parent periods

2. **Time-Blocking Canvas**
   - Vertical timeline (6:00 AM - 10:00 PM default)
   - Variable increments size with magnetic snapping
   - Drag-to-create blocks from unassigned tasks
   - Drag top/bottom of block to set start/end time

## Implementation Foundations
1. **Task Matching Rules**
   - Text match before first metadata marker
   - Exclude completed tasks (`[x]`)
   - Exclude tasks with cancelled markers

2. **Metadata Strategy**  
   Uses native Obsidian task syntax with extensions:
   
   - **Archive Marker**: Uses cancelled date emoji with timestamp  
     `❌ 2025-03-07`
   - **Time Blocking**: Scheduled date emoji with time range  
     `⏳ 2025-03-07 14:00-15:30`

3. **Configuration Interface with Defaults**
```ts
// Uses Obsidian's date format syntax
periodFileFormats: {
  daily: "[Journal/Daily/]YYYY-MM-DD",      // ISO Date
  weekly: "[Journal/Weekly/]YYYY-[W]WW",     // ISO Week 
  monthly: "[Journal/Monthly/]YYYY-MM",       // ISO Month
  quarterly: "[Journal/Quarterly/]YYYY-[Q]Q",   // ISO Quarter
  yearly: "[Journal/Yearly/]YYYY"            // Calendar Year
},
taskHeaderName: "tasks", // The section to pull tasks from
viewSettings: {
  increment: "30-min", // "15-min" | "30-min" | "hour"
},
behaviorSettings: {
  deleteTasksWhenMoving: false, // When moving tasks to a longer period, should the current task be deleted?
}
```

*Last Updated: 2025-03-07* 


# For AI agents
1. Variables cannot be used in svelte <style> blocks. CSS variables must be used instead with <div style="--my-var: 1"> & var(--my-var)
2. This plugin will be heavily used on mobile platforms as well as desktop, so design considerations should be made accordingly
3. Prefer less code wherever possible. Use best programming practices, decouple systems, and build reusable components when possible.

## Useful documentation pages
### Obsidian
- Workspace layout: https://docs.obsidian.md/Plugins/User+interface/Workspace
- Settings: https://docs.obsidian.md/Plugins/User+interface/Settings
- Accessing files: https://docs.obsidian.md/Plugins/Vault
- Hooking in to events: https://docs.obsidian.md/Plugins/Events
- Views: https://docs.obsidian.md/Plugins/User+interface/Views
- Modals: https://docs.obsidian.md/Plugins/User+interface/Modals
- Ribbon actions: https://docs.obsidian.md/Plugins/User+interface/Ribbon+actions
- Right-to-left accessibility: https://docs.obsidian.md/Plugins/User+interface/Right-to-left

#### Submission and requirements
- Overview: https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
- Requirements: https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins & https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelinesf