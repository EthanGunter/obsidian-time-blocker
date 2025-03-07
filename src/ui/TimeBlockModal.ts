import { App, Modal } from "obsidian";
import type TimeBlockPlugin from "../../main";
import TimeBlockView from "../components/TimeBlockView.svelte";

export class TimeBlockModal extends Modal {
  component: any = null;

  constructor(app: App, private plugin: TimeBlockPlugin) {
    super(app);
  }

  onOpen() {
    this.component = new TimeBlockView({
      target: this.contentEl,
      props: {
        plugin: this.plugin
      }
    });
  }

  onClose() {
    if (this.component) {
      this.component.$destroy();
      this.component = null;
    }
  }
}
