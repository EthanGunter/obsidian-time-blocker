import { App, Modal } from "obsidian";
import type TimeBlockPlugin from "src/main";
import TimeBlockView from "../components/ModalView.svelte";

export class TimeBlockModal extends Modal {
  component: any = null;
  private styleEl: HTMLElement | null = null;

  constructor(app: App, private plugin: TimeBlockPlugin) {
    super(app);
  }

  async onOpen() {
    this.component = new TimeBlockView({ target: this.contentEl });
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
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
  }
}
