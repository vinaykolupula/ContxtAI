import { getActiveBundleId, loadBundle, saveBundle, getAllBundles } from "@contxtai/core";
import type { ContextBundle } from "@contxtai/core";

/**
 * Background Service Worker
 * Listens for messages from the content scripts and popup UI.
 * Handles database operations safely since content scripts on foreign domains 
 * cannot directly access the extension's IndexedDB.
 */
/**
 * Helper to prevent async hangs in the Service Worker.
 */
function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
  ]);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle Micro-Capture: When a user highlights text on an AI page and clicks "Save to Profile"
  if (message.action === "SAVE_FIELD") {
    (async () => {
      try {
        const activeId = await withTimeout(getActiveBundleId());
        let bundleToUpdate: ContextBundle | undefined;

        // Try to update the active bundle, or fallback to the first available bundle
        if (activeId) {
          bundleToUpdate = await withTimeout(loadBundle(activeId));
        } else {
          const all = await withTimeout(getAllBundles());
          if (all.length > 0) bundleToUpdate = all[0];
        }

        if (!bundleToUpdate) {
          return sendResponse({ success: false, error: "No active profile found. Open the extension to create one." });
        }

        // Create a new context field from the highlighted text
        const newField = {
          id: crypto.randomUUID(),
          label: "Pinned Highlight",
          content: message.text,
          weight: 7,
          tags: ["general"]
        };

        bundleToUpdate.fields.push(newField);
        await withTimeout(saveBundle(bundleToUpdate));
        sendResponse({ success: true });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        sendResponse({ success: false, error: errorMsg });
      }
    })();
    return true; // Keep the message channel open for the async response
  
  // Handle Macro-Capture: When the user pastes distilled JSON into the popup UI
  } else if (message.action === "SAVE_JSON_FIELDS") {
    (async () => {
      try {
        // Target a specific bundle passed from the UI, or fallback to the active bundle
        const activeId = message.bundleId || await withTimeout(getActiveBundleId());
        if (!activeId) return sendResponse({ success: false, error: "No active bundle." });
        const bundle = await withTimeout(loadBundle(activeId));
        if (!bundle) return sendResponse({ success: false, error: "Bundle not found." });
        
        // Append the array of newly distilled fields to the bundle
        bundle.fields = [...bundle.fields, ...message.fields];
        await withTimeout(saveBundle(bundle));
        sendResponse({ success: true });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        sendResponse({ success: false, error: errorMsg });
      }
    })();
    return true; // Keep the message channel open for the async response
  }
});
