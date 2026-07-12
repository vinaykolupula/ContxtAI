import type { ContextBridge } from "@contxtai/core";

export const geminiBridge: ContextBridge = {
  platform: "gemini",

  detect(): boolean {
    return window.location.hostname.includes("gemini.google.com");
  },

  getInjectionPoint(): Element | null {
    // Gemini also uses a contenteditable div typically
    return document.querySelector('rich-textarea div[contenteditable="true"], div[contenteditable="true"]');
  },

  async inject(context: string): Promise<void> {
    const el = this.getInjectionPoint() as HTMLElement;
    if (!el) return;

    el.focus();
    const success = document.execCommand("insertText", false, context);
    if (!success) {
      el.innerText = context;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  },

  canReadConversation(): boolean {
    return false;
  },

  getChatLength(): number {
    // Gemini uses message-content elements
    return document.querySelectorAll('message-content').length;
  }
};
