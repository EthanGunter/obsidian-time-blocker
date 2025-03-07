import { App, Modal } from "obsidian";
import type TimeBlockPlugin from "../../main";
import TimeBlockView from "../components/ModalView.svelte";

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
    const modalEl = document.querySelector(".modal") as HTMLElement | null;
    if (modalEl) {
      modalEl.style.setProperty("width", "100%");
      // modalEl.style.setProperty("overflow", "hidden");
    }
  }

  onClose() {
    if (this.component) {
      this.component.$destroy();
      this.component = null;
    }
  }
}
