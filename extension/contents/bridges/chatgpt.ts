import type { ContextBridge } from "@contxtai/core";

export const chatgptBridge: ContextBridge = {
  platform: "chatgpt",

  detect(): boolean {
    return window.location.hostname.includes("chatgpt.com");
  },

  getInjectionPoint(): Element | null {
    return document.getElementById("prompt-textarea");
  },

  async inject(context: string): Promise<void> {
    const el = this.getInjectionPoint() as HTMLElement;
    if (!el) return;

    if (el.tagName.toLowerCase() === "textarea") {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype, "value"
      )?.set;
      nativeSetter?.call(el, context);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      el.focus();
      const success = document.execCommand("insertText", false, context);
      if (!success) {
        el.innerText = context;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  },

  canReadConversation(): boolean {
    return false;
  },

  getChatLength(): number {
    // Count user and assistant message nodes in the DOM
    return document.querySelectorAll('[data-message-author-role]').length;
  }
};
