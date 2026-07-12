import type { PlasmoCSConfig } from "plasmo";
import { scrubAndReport } from "@contxtai/core";
import { chatgptBridge } from "./bridges/chatgpt";
import { claudeBridge } from "./bridges/claude";
import { geminiBridge } from "./bridges/gemini";

export const config: PlasmoCSConfig = {
  matches: [
    "*://chatgpt.com/*",
    "*://*.chatgpt.com/*",
    "*://claude.ai/*",
    "*://*.claude.ai/*",
    "*://gemini.google.com/*",
    "*://*.gemini.google.com/*"
  ]
};

const bridges = [chatgptBridge, claudeBridge, geminiBridge];

function getActiveBridge() {
  return bridges.find(bridge => bridge.detect());
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "INJECT_CONTEXT") {
    const bridge = getActiveBridge();
    if (bridge) {
      bridge.inject(message.context)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.toString() }));
      return true; // keep channel open for async response
    } else {
      sendResponse({ success: false, error: "No bridge found for this site." });
    }
  }

  if (message.action === "GET_CHAT_LENGTH") {
    const bridge = getActiveBridge();
    if (bridge && bridge.getChatLength) {
      sendResponse({ length: bridge.getChatLength() });
    } else {
      sendResponse({ length: 0 });
    }
  }
});

// --- Micro-Capture (Highlight to Save) Logic ---

let tooltipInstance: HTMLButtonElement | null = null;

function removeTooltip() {
  if (tooltipInstance) {
    tooltipInstance.remove();
    tooltipInstance = null;
  }
}

function createTooltip(text: string, x: number, y: number) {
  removeTooltip();

  const btn = document.createElement("button");
  btn.innerText = "Save to ContxtAI";
  btn.style.position = "absolute";
  btn.style.left = `${x}px`;
  btn.style.top = `${y - 40}px`;
  btn.style.zIndex = "999999";
  btn.style.padding = "6px 12px";
  btn.style.backgroundColor = "#3ecf8e";
  btn.style.color = "#1c1c1c";
  btn.style.border = "none";
  btn.style.borderRadius = "6px";
  btn.style.fontSize = "12px";
  btn.style.fontWeight = "600";
  btn.style.cursor = "pointer";
  btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  btn.style.fontFamily = "sans-serif";
  btn.style.transition = "all 0.15s ease";

  btn.onmouseenter = () => btn.style.transform = "scale(1.05)";
  btn.onmouseleave = () => btn.style.transform = "scale(1)";

  btn.onmousedown = (e) => {
    e.preventDefault(); // keep selection active
    
    // Proactively scan the text being saved for secrets
    const scrubResult = scrubAndReport(text);
    if (scrubResult.detections.length > 0) {
      showSecurityAlert(scrubResult.detections);
    }

    btn.innerText = "Saving...";

    chrome.runtime.sendMessage({ action: "SAVE_FIELD", text }, (res) => {
      if (chrome.runtime.lastError || (res && !res.success)) {
        btn.innerText = "Failed";
        btn.style.backgroundColor = "#ff4d4f";
        if (res?.error) console.error("ContxtAI Save Error:", res.error);
      } else {
        btn.innerText = "Saved!";
        btn.style.backgroundColor = "#24b47e";
      }
      setTimeout(removeTooltip, 1500);
    });
  };

  document.body.appendChild(btn);
  tooltipInstance = btn;
}

function showSecurityAlert(detections: string[]) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.65)";
  overlay.style.backdropFilter = "blur(4px)";
  overlay.style.zIndex = "2147483647"; // Max z-index
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontFamily = "system-ui, -apple-system, sans-serif";

  const modal = document.createElement("div");
  modal.style.backgroundColor = "#1c1c1c";
  modal.style.border = "1px solid #333";
  modal.style.borderRadius = "12px";
  modal.style.padding = "24px";
  modal.style.width = "400px";
  modal.style.maxWidth = "90%";
  modal.style.boxShadow = "0 20px 40px rgba(0,0,0,0.5)";
  modal.style.color = "#ededed";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.marginBottom = "16px";
  header.style.gap = "12px";

  const icon = document.createElement("div");
  icon.innerText = "⚠️";
  icon.style.fontSize = "24px";

  const title = document.createElement("h2");
  title.innerText = "ContxtAI says";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.style.fontWeight = "600";
  title.style.color = "#f8f8f8";

  header.appendChild(icon);
  header.appendChild(title);

  const body = document.createElement("p");
  body.innerText = "Security Warning: You are saving sensitive data to your profile.";
  body.style.margin = "0 0 16px 0";
  body.style.fontSize = "14px";
  body.style.color = "#a1a1aa";
  body.style.lineHeight = "1.5";

  const listContainer = document.createElement("div");
  listContainer.style.backgroundColor = "#2a2a2a";
  listContainer.style.padding = "12px";
  listContainer.style.borderRadius = "8px";
  listContainer.style.marginBottom = "20px";

  const listTitle = document.createElement("div");
  listTitle.innerText = "Issues detected:";
  listTitle.style.fontWeight = "600";
  listTitle.style.fontSize = "13px";
  listTitle.style.marginBottom = "8px";
  listTitle.style.color = "#fbbf24";

  const ul = document.createElement("ul");
  ul.style.margin = "0";
  ul.style.padding = "0 0 0 20px";
  ul.style.fontSize = "13px";
  ul.style.color = "#fcd34d";

  detections.forEach(det => {
    const li = document.createElement("li");
    li.innerText = det;
    li.style.marginBottom = "4px";
    ul.appendChild(li);
  });

  listContainer.appendChild(listTitle);
  listContainer.appendChild(ul);

  const footer = document.createElement("p");
  footer.innerText = "This will be saved to your profile, but ContxtAI will actively mask it if you attempt to inject it into an AI platform.";
  footer.style.margin = "0 0 24px 0";
  footer.style.fontSize = "13px";
  footer.style.color = "#888";
  footer.style.lineHeight = "1.5";

  const btnContainer = document.createElement("div");
  btnContainer.style.display = "flex";
  btnContainer.style.justifyContent = "flex-end";

  const okBtn = document.createElement("button");
  okBtn.innerText = "OK";
  okBtn.style.backgroundColor = "#3ecf8e";
  okBtn.style.color = "#1c1c1c";
  okBtn.style.border = "none";
  okBtn.style.padding = "8px 24px";
  okBtn.style.borderRadius = "6px";
  okBtn.style.fontSize = "14px";
  okBtn.style.fontWeight = "600";
  okBtn.style.cursor = "pointer";
  okBtn.style.transition = "transform 0.1s";

  okBtn.onmouseenter = () => okBtn.style.transform = "scale(1.05)";
  okBtn.onmouseleave = () => okBtn.style.transform = "scale(1)";
  
  okBtn.onclick = () => {
    document.body.removeChild(overlay);
  };

  btnContainer.appendChild(okBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(listContainer);
  modal.appendChild(footer);
  modal.appendChild(btnContainer);
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

document.addEventListener("mouseup", (e) => {
  // Only activate micro-capture on known AI bridges
  if (!getActiveBridge()) return;

  const selection = window.getSelection();
  const text = selection?.toString().trim();

  if (text && text.length > 10) {
    // If clicking on our own tooltip, ignore
    if (e.target === tooltipInstance) return;

    const range = selection!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    createTooltip(text, rect.left + window.scrollX + (rect.width / 2) - 60, rect.top + window.scrollY);
  } else {
    removeTooltip();
  }
});

document.addEventListener("mousedown", (e) => {
  if (tooltipInstance && e.target !== tooltipInstance) {
    removeTooltip();
  }
});
