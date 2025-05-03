import { App, Modal } from "obsidian";
import type TimeBlockPlugin from "src/main";
import ModalView from "../components/ModalView.svelte";

export class TimeBlockModal extends Modal {
  component: any = null;
  private styleEl: HTMLElement | null = null;

  constructor(app: App, private plugin: TimeBlockPlugin) {
    super(app);
  }

  async onOpen() {
    const modalEl = document.querySelector(".modal") as HTMLElement | null;

    if (modalEl) {
      modalEl.style.setProperty("width", "100%");
      modalEl.style.setProperty("height", "100%");
      // modalEl.style.setProperty("overflow", "hidden");
    }

    this.component = new ModalView({ target: this.contentEl });
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
