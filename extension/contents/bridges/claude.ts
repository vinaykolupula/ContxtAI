import type { ContextBridge } from "@contxtai/core";

export const claudeBridge: ContextBridge = {
  platform: "claude",

  detect(): boolean {
    return window.location.hostname.includes("claude.ai");
  },

  getInjectionPoint(): Element | null {
    // Claude usually uses contenteditable div with generic classes, 
    // but looking for [contenteditable="true"] works for MVP testing
    return document.querySelector('[contenteditable="true"]');
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
    // Claude uses .font-claude-message for its message blocks
    return document.querySelectorAll('.font-claude-message').length;
  }
};
