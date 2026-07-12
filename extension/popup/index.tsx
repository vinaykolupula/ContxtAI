import React, { useEffect, useState } from "react";
import {
  getAllBundles, loadBundle, saveBundle, composeContext, getTemplate, createBundle, getActiveBundleId, setActiveBundleId, PLATFORM_CONFIGS, scrubText, scrubAndReport
} from "@contxtai/core";
import type { ContextBundle } from "@contxtai/core";
import iconUrl from "data-base64:~assets/icon.png";

export default function Popup() {
  const [bundles, setBundles] = useState<ContextBundle[]>([]);
  const [activeBundleId, setLocalActiveBundleId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [securityAlerts, setSecurityAlerts] = useState<string[]>([]);
  const [chatLength, setChatLength] = useState<number>(0);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    // Detect active platform from the current browser tab
    if (chrome && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url;
        if (url) {
          try {
            const hostname = new URL(url).hostname;
            if (hostname.includes("claude.ai")) setDetectedPlatform("claude");
            else if (hostname.includes("gemini.google.com")) setDetectedPlatform("gemini");
            else if (hostname.includes("chatgpt.com") || hostname.includes("openai.com")) setDetectedPlatform("chatgpt");
            else setDetectedPlatform(null);
          } catch (e) { }

          // Fetch chat length to determine if context is fading
          chrome.tabs.sendMessage(tabs[0].id, { action: "GET_CHAT_LENGTH" }, (res) => {
            if (chrome.runtime.lastError) return;
            if (res && res.length !== undefined) {
              setChatLength(res.length);
            }
          });
        }
      });
    }

    async function loadData() {
      try {
        const activeId = await getActiveBundleId();
        if (activeId) setLocalActiveBundleId(activeId);

        let all = await getAllBundles();
        if (all.length === 0) {
          const starterBundle = await createBundle({
            name: "Developer Starter", description: "Default developer context",
            identity: { name: "Developer", role: "Software Engineer" },
            fields: [{ id: "1", label: "Preferences", content: "Prefer functional programming and strict TypeScript.", weight: 10, tags: ["coding"] }]
          });
          all = [starterBundle];
        }
        setBundles(all);
      } catch (err) { console.error("Error loading data", err); }
    }
    loadData();
  }, []);

  const handleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setLocalActiveBundleId(id);
    await setActiveBundleId(id);
  };

  const [importJson, setImportJson] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importTarget, setImportTarget] = useState<"existing" | "new">("existing");
  const [newProfileName, setNewProfileName] = useState("");
  const [canScroll, setCanScroll] = useState(false);
  const [tokenStats, setTokenStats] = useState<{ estimatedTokens: number, maxTokens: number, fieldsCount: number, totalFields: number } | null>(null);

  // Proactively compose context to calculate token stats for the visualizer
  useEffect(() => {
    async function calculateStats() {
      if (!activeBundleId) {
        setTokenStats(null);
        return;
      }
      try {
        const bundle = await loadBundle(activeBundleId);
        const targetPlatform = (detectedPlatform || "chatgpt") as any;
        const config = PLATFORM_CONFIGS[targetPlatform];
        if (!config) return;
        
        const composed = await composeContext(activeBundleId, {
          platform: targetPlatform,
          tokenBudget: config.defaultBudget,
          activeTags: config.activeTags
        });
        
        setTokenStats({
          estimatedTokens: composed.estimatedTokens,
          maxTokens: config.defaultBudget,
          fieldsCount: composed.fields.length,
          totalFields: bundle.fields.length
        });
      } catch (err) {
        console.error("Token calculation failed", err);
      }
    }
    calculateStats();
  }, [activeBundleId, detectedPlatform, bundles]);

  // Monitor the popup DOM to show a scroll indicator if content overflows
  useEffect(() => {
    const checkScroll = () => {
      const isScrollable = document.documentElement.scrollHeight > document.documentElement.clientHeight;
      const isScrolledToBottom = Math.ceil(document.documentElement.scrollTop + document.documentElement.clientHeight) >= document.documentElement.scrollHeight - 5;
      setCanScroll(isScrollable && !isScrolledToBottom);
    };

    checkScroll();
    window.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    const observer = new MutationObserver(checkScroll);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, []);

  // Proactively scan the active bundle for privacy issues so the UI is always up to date
  useEffect(() => {
    async function scanActiveBundle() {
      if (!activeBundleId) {
        setSecurityAlerts([]);
        return;
      }
      try {
        const bundle = await loadBundle(activeBundleId);
        const allText = bundle.fields.map(f => f.content).join("\n") + "\n" + JSON.stringify(bundle.identity || {});
        const scrubResult = scrubAndReport(allText);
        setSecurityAlerts(scrubResult.detections);
      } catch (err) {
        console.error("Proactive scan failed", err);
      }
    }
    scanActiveBundle();
  }, [activeBundleId]);

  const handleActivate = async () => {
    if (!activeBundleId) return;
    try {
      const targetPlatform = (detectedPlatform || "chatgpt") as any;
      const config = PLATFORM_CONFIGS[targetPlatform];
      const composed = await composeContext(activeBundleId, {
        platform: targetPlatform,
        tokenBudget: config.defaultBudget,
        activeTags: config.activeTags
      });
      const template = getTemplate(targetPlatform);
      if (!template) throw new Error("Template not found");
      let formatted = template.format(composed);

      // --- Privacy Scrubber ---
      // Intercept and mask sensitive patterns before data leaves the extension
      const scrubResult = scrubAndReport(formatted);
      formatted = scrubResult.scrubbedText;
      
      if (scrubResult.detections.length > 0) {
        setSecurityAlerts(scrubResult.detections);
      }

      if (!formatted.trim()) {
        alert(`This profile is completely empty for ${targetPlatform}!\n\nThis happens if you haven't added any fields yet, or if none of your fields have tags that match this specific AI platform (e.g., trying to inject 'coding' tags into an AI configured only for 'research').\n\nCheck the Manage Context Bundles page to add tags!`);
        return;
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(formatted);

      // Auto-inject if on a known platform
      if (detectedPlatform && chrome && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "INJECT_CONTEXT", context: formatted });
          }
        });
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error("Failed to copy", err); }
  };

  const handleInjectTag = async (tag: string) => {
    if (!activeBundleId) return;
    try {
      const targetPlatform = (detectedPlatform || "chatgpt") as any;
      const config = PLATFORM_CONFIGS[targetPlatform];
      const composed = await composeContext(activeBundleId, {
        platform: targetPlatform,
        tokenBudget: config.defaultBudget,
        activeTags: [tag] // Only inject this specific tag to refresh context
      });
      const template = getTemplate(targetPlatform);
      if (!template) throw new Error("Template not found");
      let formatted = template.format(composed);

      const scrubResult = scrubAndReport(formatted);
      formatted = scrubResult.scrubbedText;

      if (!formatted.trim()) {
         alert(`No fields found with the tag '${tag}' to inject.`);
         return;
      }

      if (detectedPlatform && chrome && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "INJECT_CONTEXT", context: formatted });
          }
        });
      }
    } catch (err) {
      console.error("Failed to inject specific tag", err);
    }
  };

  const [distilling, setDistilling] = useState(false);

  const handleExtract = async () => {
    const prompt = `Analyze this entire conversation thoroughly. I want to extract the most important context to save into my permanent ContxtAI profile.
Please perform a deep extraction of all implicit and explicit knowledge, preferences, constraints, and project details mentioned or demonstrated.

Extract the information into distinct, highly-detailed fields. For the "content" of each field, write a comprehensive, multi-sentence markdown description that provides deep context for a future AI model. DO NOT use single-liners.

Topics to capture (if present):
- Personal/Role Details (who I am, what my role is, domain knowledge)
- Writing & Communication Style (tone, vocabulary, structural preferences)
- Core Coding Preferences (stack, architecture, formatting, conventions)
- Project Constraints & Goals (business logic, feature requirements)
- Design & UI/UX Preferences (color palettes, aesthetics, components)


Format the output STRICTLY as a JSON array matching this schema exactly:
[
  {
    "label": "Short Descriptive Title (e.g., 'React Architecture Rules')",
    "content": "Comprehensive markdown explanation. Must be highly detailed. Use bullet points or code blocks if helpful.",
    "weight": 8,
    "tags": ["coding", "technical"] // Choose 1-3 appropriate tags from: general, coding, technical, writing, design, project, research
  }
]

Output ONLY valid JSON inside a \`\`\`json block. Do not include any preamble, commentary, or other text.`;

    setDistilling(true);
    if (chrome && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "INJECT_CONTEXT", context: prompt }, (res) => {
            setTimeout(() => {
              setDistilling(false);
              setShowImport(true); // Open the inline import window
            }, 1000);
          });
        }
      });
    }
  };

  const handleSaveImport = async () => {
    if (!importJson.trim()) return;
    try {
      const cleanStr = importJson.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanStr);
      if (!Array.isArray(parsed)) throw new Error("Expected JSON array");

      const targetBundle = bundles.find(b => b.id === activeBundleId);
      if (!targetBundle) throw new Error("No active profile");

      const newFields = parsed.map((item: any) => ({
        id: crypto.randomUUID(),
        label: item.label || "Distilled Field",
        content: item.content || "",
        weight: item.weight || 5,
        tags: item.tags || ["general"]
      }));

      const updated = { ...targetBundle, fields: [...targetBundle.fields, ...newFields] };
      await saveBundle(updated);
      
      // Update local state to reflect the new fields
      setBundles(bundles.map(b => b.id === updated.id ? updated : b));
      alert("JSON context successfully imported and saved!");
    } catch (err) {
      alert("Failed to parse or save JSON. Please check the format.");
    }
  };

  return (
    <div style={{
      width: "360px", minHeight: "480px", padding: "24px",
      fontFamily: "'Inter', sans-serif",
      backgroundColor: "#1c1c1c", color: "#ededed",
      display: "flex", flexDirection: "column", justifyContent: "space-between"
    }}>
      <style>{`
        *, *::before, *::after {
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
          width: 360px;
          min-height: 480px;
          background-color: #1c1c1c;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
      `}</style>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src={iconUrl} alt="ContxtAI Logo" style={{
              width: "28px", height: "28px", objectFit: "contain"
            }} />
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#f8f8f8", letterSpacing: "-0.5px" }}>ContxtAI</h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600", display: "block", marginBottom: "2px" }}>Detected</span>
            <span style={{ color: detectedPlatform ? "#3ecf8e" : "#a1a1aa", fontSize: "14px", fontWeight: "600", textTransform: "capitalize" }}>{detectedPlatform || "None"}</span>
          </div>
        </div>

        {showImport ? (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "500", color: "#3ecf8e" }}>Save Distilled Context</h3>
            <p style={{ fontSize: "12px", color: "#a1a1aa", marginBottom: "12px" }}>Review and edit the fields below before saving.</p>
            <textarea
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              placeholder='[ { "label": "...", "content": "..." } ]'
              style={{
                width: "100%", height: "90px", padding: "10px",
                backgroundColor: "#232323", border: "1px solid #333333",
                borderRadius: "6px", color: "#ededed", fontSize: "12px",
                fontFamily: "monospace", resize: "none", marginBottom: "12px"
              }}
            />

            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", color: "#ededed", display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input type="radio" name="importTarget" value="existing" checked={importTarget === "existing"} onChange={() => setImportTarget("existing")} style={{ marginRight: "6px" }} />
                Active Profile
              </label>
              <label style={{ fontSize: "12px", color: "#ededed", display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input type="radio" name="importTarget" value="new" checked={importTarget === "new"} onChange={() => setImportTarget("new")} style={{ marginRight: "6px" }} />
                New Profile
              </label>
            </div>

            {importTarget === "new" && (
              <input
                type="text"
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                placeholder="Name your new profile..."
                style={{
                  width: "100%", padding: "10px", backgroundColor: "#232323",
                  border: "1px solid #333333", borderRadius: "6px", color: "#ededed",
                  fontSize: "13px", marginBottom: "12px"
                }}
              />
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={async () => {
                  if (!importJson.trim()) return;
                  try {
                    const cleanStr = importJson.replace(/```json/g, "").replace(/```/g, "").trim();
                    const parsed = JSON.parse(cleanStr);
                    if (!Array.isArray(parsed)) throw new Error("Expected array");

                    let targetId = activeBundleId;
                    if (importTarget === "new") {
                      if (!newProfileName.trim()) {
                        alert("Please enter a name for the new profile.");
                        return;
                      }
                      const newBundle = await createBundle({
                        name: newProfileName,
                        description: "Distilled from chat",
                        fields: []
                      });
                      targetId = newBundle.id;
                      await setActiveBundleId(newBundle.id);
                    }

                    if (!targetId) {
                      alert("Failed to find active bundle.");
                      return;
                    }
                    
                    const bundle = await loadBundle(targetId);
                    if (!bundle) {
                      alert("Target profile not found.");
                      return;
                    }
                    
                    bundle.fields = [...bundle.fields, ...parsed];
                    await saveBundle(bundle);

                    setShowImport(false);
                    setImportJson("");
                    setNewProfileName("");
                    setImportTarget("existing");
                    // Optionally trigger a reload of data
                    window.location.reload();
                  } catch (e) {
                    alert("Failed to parse and save JSON: " + (e instanceof Error ? e.message : String(e)));
                  }
                }}
                style={{
                  flex: 1, padding: "10px", backgroundColor: "#3ecf8e", color: "#1c1c1c",
                  border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer"
                }}
              >
                Save Context
              </button>
              <button
                onClick={() => setShowImport(false)}
                style={{
                  padding: "10px", backgroundColor: "transparent", color: "#a1a1aa",
                  border: "1px solid #333333", borderRadius: "6px", fontSize: "13px", cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "8px", fontWeight: "500" }}>
                Active Profile
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={activeBundleId || ""}
                  onChange={handleSelect}
                  style={{
                    width: "100%", padding: "10px 14px",
                    backgroundColor: "#232323",
                    border: "1px solid #333333",
                    borderRadius: "6px", color: "#ededed",
                    fontSize: "14px", fontWeight: "400",
                    appearance: "none", outline: "none", cursor: "pointer",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#3ecf8e"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#333333"}
                >
                  <option value="" disabled>Select a bundle</option>
                  {bundles.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <div style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#a1a1aa", fontSize: "10px" }}>
                  ▼
                </div>
              </div>
            </div>

            {tokenStats && (
              <div style={{
                padding: "16px", borderRadius: "6px",
                backgroundColor: "#232323", border: "1px solid #333333",
                marginBottom: "12px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px" }}>Context Thermometer</span>
                  <span style={{ fontSize: "12px", fontWeight: "500", color: tokenStats.estimatedTokens >= tokenStats.maxTokens ? "#ff4d4f" : (tokenStats.estimatedTokens / tokenStats.maxTokens > 0.7 ? "#fbbf24" : "#3ecf8e") }}>
                    {tokenStats.estimatedTokens.toLocaleString()} / {tokenStats.maxTokens.toLocaleString()} tokens
                  </span>
                </div>
                
                {/* The Progress Bar */}
                <div style={{ width: "100%", height: "6px", backgroundColor: "#333", borderRadius: "3px", overflow: "hidden", marginBottom: "12px" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(100, (tokenStats.estimatedTokens / tokenStats.maxTokens) * 100)}%`,
                    backgroundColor: tokenStats.estimatedTokens >= tokenStats.maxTokens ? "#ff4d4f" : (tokenStats.estimatedTokens / tokenStats.maxTokens > 0.7 ? "#fbbf24" : "#3ecf8e"),
                    transition: "width 0.3s ease, background-color 0.3s ease"
                  }} />
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "500" }}>
                  <span style={{ color: tokenStats.estimatedTokens >= tokenStats.maxTokens ? "#ff4d4f" : (tokenStats.estimatedTokens / tokenStats.maxTokens > 0.7 ? "#fbbf24" : "#3ecf8e") }}>
                    {tokenStats.estimatedTokens >= tokenStats.maxTokens ? "Context Trimmed (Over Budget)" : (tokenStats.estimatedTokens / tokenStats.maxTokens > 0.7 ? "Heavy Context" : "Laser Focused")}
                  </span>
                  <span style={{ color: "#e4e4e7" }}>
                    {tokenStats.fieldsCount} <span style={{ color: "#a1a1aa", fontWeight: "400" }}>of {tokenStats.totalFields} fields active</span>
                  </span>
                </div>
              </div>
            )}
            
            <div style={{
              padding: "16px", borderRadius: "6px",
              backgroundColor: "#232323", border: "1px solid #333333",
              marginBottom: "12px"
            }}>
              <div style={{ color: securityAlerts.length > 0 ? "#fbbf24" : "#a1a1aa", fontSize: "13px", lineHeight: "1.5" }}>
                <strong style={{ display: "flex", alignItems: "center", marginBottom: securityAlerts.length > 0 ? "4px" : "0" }}>
                  <span style={{ marginRight: "6px" }}>{securityAlerts.length > 0 ? "⚠️" : "🛡️"}</span> Privacy issues detected : {securityAlerts.length}
                </strong>
                {securityAlerts.length > 0 && (
                  <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px", color: "#fcd34d" }}>
                    {securityAlerts.map((alert, i) => <li key={i}>{alert}</li>)}
                  </ul>
                )}
              </div>
            </div>

            {/* Context Fade Warning */}
            {chatLength > 8 && (
              <div style={{
                padding: "16px", borderRadius: "6px",
                backgroundColor: "#232323", border: "1px solid #333333",
                marginBottom: "12px"
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "8px", color: "#fbbf24", fontWeight: "600", fontSize: "13px" }}>
                  <span style={{ marginRight: "6px" }}>🧠</span> Context Fade Warning
                </div>
                <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#a1a1aa", lineHeight: "1.5" }}>
                  This conversation is getting long ({chatLength} messages). The AI might start forgetting your core guidelines due to the "lost in the middle" effect.
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button 
                    onClick={() => handleInjectTag('coding')}
                    style={{ padding: "6px 10px", backgroundColor: "#2a2a2a", color: "#ededed", border: "1px solid #333333", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                  >
                    Re-inject "coding"
                  </button>
                  <button 
                    onClick={() => handleInjectTag('writing')}
                    style={{ padding: "6px 10px", backgroundColor: "#2a2a2a", color: "#ededed", border: "1px solid #333333", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                  >
                    Re-inject "writing"
                  </button>
                  <button 
                    onClick={handleActivate}
                    style={{ padding: "6px 10px", backgroundColor: "#3ecf8e", color: "#1c1c1c", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}
                  >
                    Re-inject All
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!showImport && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={handleActivate}
            disabled={!activeBundleId}
            style={{
              width: "100%", padding: "10px",
              backgroundColor: activeBundleId ? (copied ? "#24b47e" : "#3ecf8e") : "#2a2a2a",
              color: activeBundleId ? "#1c1c1c" : "#666",
              border: "none", borderRadius: "6px",
              fontSize: "14px", fontWeight: "500",
              cursor: activeBundleId ? "pointer" : "default",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { if (activeBundleId && !copied) e.currentTarget.style.backgroundColor = "#46e39d" }}
            onMouseLeave={(e) => { if (activeBundleId && !copied) e.currentTarget.style.backgroundColor = "#3ecf8e" }}
          >
            {copied ? (detectedPlatform ? "Injected!" : "Copied!") : "Inject Selected Context"}
          </button>

          {detectedPlatform && (
            <button
              onClick={handleExtract}
              disabled={distilling}
              style={{
                width: "100%", padding: "10px",
                backgroundColor: distilling ? "rgba(62, 207, 142, 0.1)" : "transparent",
                color: "#3ecf8e",
                border: "1px solid #3ecf8e", borderRadius: "6px",
                fontSize: "14px", fontWeight: "500",
                cursor: distilling ? "default" : "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { if (!distilling) e.currentTarget.style.backgroundColor = "rgba(62, 207, 142, 0.1)" }}
              onMouseLeave={(e) => { if (!distilling) e.currentTarget.style.backgroundColor = "transparent" }}
            >
              {distilling ? "Prompt Injected!" : "Extract Context From Chat"}
            </button>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                try { chrome.runtime.openOptionsPage(); }
                catch (e) { window.open(chrome.runtime.getURL("options.html")); }
              }}
              style={{
                flex: 1, padding: "10px",
                backgroundColor: "#2a2a2a", color: "#ededed",
                border: "1px solid #333333", borderRadius: "6px",
                fontSize: "13px", fontWeight: "500", cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#333333" }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#2a2a2a" }}
            >
              Manage Bundles
            </button>
            <button
              onClick={() => {
                window.open(chrome.runtime.getURL("options.html?tab=docs"));
              }}
              style={{
                flex: 1, padding: "10px",
                backgroundColor: "transparent", color: "#3ecf8e",
                border: "1px solid #3ecf8e", borderRadius: "6px",
                fontSize: "13px", fontWeight: "500", cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(62, 207, 142, 0.1)" }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
            >
              📚 Help & Docs
            </button>
          </div>
        </div>
      )}

      {/* Floating Scroll Indicator */}
      {canScroll && (
        <div 
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "36px",
            height: "36px",
            backgroundColor: "#3ecf8e",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            cursor: "pointer",
            animation: "bounce 2s infinite",
            zIndex: 1000
          }}
        >
          <span style={{ color: "#1c1c1c", fontSize: "18px", fontWeight: "bold", transform: "translateY(-1px)" }}>↓</span>
        </div>
      )}
    </div>
  );
}
