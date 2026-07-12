import React, { useEffect, useState } from "react";
import { getAllBundles, createBundle, saveBundle, deleteBundle } from "@contxtai/core";
import type { ContextBundle } from "@contxtai/core";
import iconUrl from "data-base64:~assets/icon.png";

export default function Options() {
  const [bundles, setBundles] = useState<ContextBundle[]>([]);
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    // Check if we were linked here with a specific tab intention
    const params = new URLSearchParams(window.location.search);
    const initialTab = params.get("tab");
    if (initialTab === "docs") {
      setSelectedBundleId("__docs__");
    }

    loadBundles();
  }, []);

  const loadBundles = async () => {
    try {
      const all = await getAllBundles();
      setBundles(all);
      setBundles((currentBundles) => {
        // Only auto-select first bundle if we haven't already selected docs
        setSelectedBundleId((currentSelected) => {
          if (!currentSelected && currentBundles.length > 0) return currentBundles[0].id;
          return currentSelected;
        });
        return currentBundles;
      });
    } catch (err) { console.error("Failed to load bundles", err); }
  };

  const handleCreateBundle = async () => {
    const newBundle = await createBundle({ name: "New Bundle", description: "", fields: [] });
    setBundles([...bundles, newBundle]);
    setSelectedBundleId(newBundle.id);
  };

  const handleDeleteBundle = async (id: string) => {
    if (!confirm("Delete this bundle permanently?")) return;
    await deleteBundle(id);
    if (selectedBundleId === id) setSelectedBundleId(null);
    await loadBundles();
  };

  const activeBundle = bundles.find(b => b.id === selectedBundleId);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', sans-serif", backgroundColor: "#1c1c1c", color: "#ededed" }}>
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          background-color: #181818;
        }
        *, *::before, *::after {
          box-sizing: border-box;
        }
      `}</style>
      {/* Sidebar */}
      <div style={{ width: "280px", backgroundColor: "#1c1c1c", borderRight: "1px solid #2e2e2e", padding: "24px 16px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "32px", padding: "0 8px", gap: "10px" }}>
          <img src={iconUrl} alt="ContxtAI Logo" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "500", color: "#ededed" }}>ContxtAI</h2>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "0 8px" }}>
          <h3 style={{ margin: 0, fontSize: "12px", color: "#a1a1aa", fontWeight: "500" }}>MENU</h3>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <div
            onClick={() => setSelectedBundleId("__docs__")}
            style={{
              padding: "8px", borderRadius: "6px", cursor: "pointer",
              backgroundColor: selectedBundleId === "__docs__" ? "#2a2a2a" : "transparent",
              color: selectedBundleId === "__docs__" ? "#3ecf8e" : "#a1a1aa",
              fontSize: "14px", fontWeight: selectedBundleId === "__docs__" ? "500" : "400",
              display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s"
            }}
            onMouseEnter={e => { if (selectedBundleId !== "__docs__") e.currentTarget.style.backgroundColor = "#232323" }}
            onMouseLeave={e => { if (selectedBundleId !== "__docs__") e.currentTarget.style.backgroundColor = "transparent" }}
          >
            <span>📚</span> Help & Docs
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "0 8px" }}>
          <h3 style={{ margin: 0, fontSize: "12px", color: "#a1a1aa", fontWeight: "500" }}>PROFILES</h3>
          <button onClick={handleCreateBundle} style={{ background: "transparent", border: "none", color: "#a1a1aa", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.color = "#ededed"} onMouseLeave={e => e.currentTarget.style.color = "#a1a1aa"}>+</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          {bundles.map(bundle => (
            <div key={bundle.id} onClick={() => setSelectedBundleId(bundle.id)}
              style={{
                padding: "8px", borderRadius: "6px", cursor: "pointer",
                backgroundColor: selectedBundleId === bundle.id ? "#2a2a2a" : "transparent",
                color: selectedBundleId === bundle.id ? "#ededed" : "#a1a1aa",
                fontSize: "14px", transition: "background-color 0.2s"
              }}
              onMouseEnter={e => { if (selectedBundleId !== bundle.id) e.currentTarget.style.backgroundColor = "#232323" }}
              onMouseLeave={e => { if (selectedBundleId !== bundle.id) e.currentTarget.style.backgroundColor = "transparent" }}
            >
              {bundle.name}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "48px", overflowY: "auto", display: "flex", justifyContent: "center", backgroundColor: "#181818" }}>
        <div style={{ width: "100%", maxWidth: "800px" }}>
          {selectedBundleId === "__docs__" ? (
            <HelpDocs />
          ) : activeBundle ? (
            <BundleEditor
              bundle={activeBundle}
              onSave={(updated) => {
                setBundles(bundles.map(b => b.id === updated.id ? updated : b));
              }}
              onDelete={() => handleDeleteBundle(activeBundle.id)}
            />
          ) : (
            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "#a1a1aa" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "500", color: "#ededed", marginBottom: "8px" }}>Select a Profile</h2>
              <p style={{ fontSize: "14px" }}>Choose a context bundle from the sidebar to manage.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HelpDocs() {
  return (
    <div style={{ color: "#ededed", lineHeight: "1.6" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "600", marginBottom: "12px", color: "#fff" }}>📚 Welcome to ContxtAI</h1>
      <p style={{ fontSize: "15px", color: "#a1a1aa", marginBottom: "32px" }}>
        Your personal memory layer for AI. ContxtAI helps you bring your coding styles, writing tones, and project details into any AI chat (like ChatGPT, Claude, and Gemini) instantly without having to repeat yourself every time.
      </p>

      <div style={{ backgroundColor: "#232323", padding: "24px", borderRadius: "8px", border: "1px solid #333", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "18px", color: "#3ecf8e", marginTop: 0, marginBottom: "20px" }}>🛠 Core Features & Use Cases</h2>

        {/* Feature 1: Active Profile */}
        <h3 style={{ fontSize: "15px", color: "#ededed", marginBottom: "8px" }}>1. Active Profile</h3>
        <p style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "16px", marginTop: 0 }}>
          This dropdown lets you quickly switch between different personas, projects, or roles. The active profile dictates which rules get injected into the AI.
        </p>

        {/* Mock UI: Active Profile */}
        <div style={{ backgroundColor: "#1c1c1c", padding: "20px", borderRadius: "8px", border: "1px solid #333", marginBottom: "32px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "340px", textAlign: "left" }}>
            <div style={{ fontSize: "12px", color: "#a1a1aa", fontWeight: "500", marginBottom: "8px", marginLeft: "4px" }}>Active Profile</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#232323", border: "1px solid #333", borderRadius: "6px", padding: "10px 14px", color: "#ededed", fontSize: "14px", fontWeight: "500" }}>
              <span>Campaign ideas</span>
              <span style={{ fontSize: "10px", color: "#a1a1aa" }}>▼</span>
            </div>
          </div>
        </div>

        {/* Feature 2: Manage Bundles (Profile Editor) */}
        <h3 style={{ fontSize: "15px", color: "#ededed", marginBottom: "8px" }}>2. Manage Bundles (Profile Editor)</h3>
        <p style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "16px", marginTop: 0 }}>
          The heart of ContxtAI. This is where you create profiles, define identity rules, and add specific knowledge fields (with tags) to be used by the AI.
        </p>

        {/* Mock UI: Profile Editor */}
        <div style={{ backgroundColor: "#1c1c1c", padding: "20px", borderRadius: "8px", border: "1px solid #333", marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, color: "#ededed", fontSize: "16px", fontWeight: "500" }}>Profile Editor</h3>
            <div style={{ fontSize: "11px", color: "#ff4d4f", backgroundColor: "#2a2a2a", padding: "6px 10px", borderRadius: "4px", border: "1px solid #333" }}>Delete Profile</div>
          </div>

          <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", color: "#a1a1aa", marginBottom: "6px" }}>Name</div>
              <div style={{ backgroundColor: "#232323", border: "1px solid #333", borderRadius: "4px", padding: "8px", color: "#ededed", fontSize: "12px", fontWeight: "500" }}>Campaign ideas</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", color: "#a1a1aa", marginBottom: "6px" }}>Description</div>
              <div style={{ backgroundColor: "#232323", border: "1px solid #333", borderRadius: "4px", padding: "8px", color: "#a1a1aa", fontSize: "12px" }}>Used for campaign ideas for a new product launch</div>
            </div>
          </div>


          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", color: "#ededed", fontWeight: "500" }}>Knowledge Fields</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ fontSize: "11px", color: "#3ecf8e", border: "1px solid #3ecf8e", padding: "6px 10px", borderRadius: "4px", fontWeight: "500" }}>Import Distilled JSON</div>
              <div style={{ fontSize: "11px", color: "#1c1c1c", backgroundColor: "#3ecf8e", padding: "6px 10px", borderRadius: "4px", fontWeight: "600" }}>Add Field</div>
            </div>
          </div>
          <div style={{ backgroundColor: "#232323", border: "1px solid #333", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", color: "#a1a1aa", marginBottom: "6px" }}>Label</div>
                <div style={{ backgroundColor: "#1c1c1c", border: "1px solid #333", borderRadius: "4px", padding: "8px", color: "#ededed", fontSize: "13px", fontWeight: "500" }}>Advertising and Campaign Philosophy</div>
              </div>
              <div style={{ width: "80px" }}>
                <div style={{ fontSize: "11px", color: "#a1a1aa", marginBottom: "6px" }}>Priority</div>
                <div style={{ backgroundColor: "#1c1c1c", border: "1px solid #333", borderRadius: "4px", padding: "8px", color: "#ededed", fontSize: "13px", fontWeight: "500" }}>10</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#a1a1aa", marginBottom: "6px" }}>Content</div>
              <div style={{ backgroundColor: "#1c1c1c", border: "1px solid #333", borderRadius: "4px", padding: "12px", color: "#ededed", fontSize: "13px", lineHeight: "1.5", position: "relative", paddingRight: "20px" }}>
                <strong>## Campaign Philosophy</strong><br />
                Advertising should communicate ideas through metaphors rather than explanations.<br /><br />
                The user strongly prefers campaigns where a physical object becomes a symbolic representation of
                <div style={{ position: "absolute", right: "4px", top: "4px", bottom: "4px", width: "6px", backgroundColor: "#444", borderRadius: "4px" }}></div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#a1a1aa", marginBottom: "8px" }}>Tags (Determines which AI sees this field)</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                <div style={{ fontSize: "10px", color: "#a1a1aa", border: "1px solid #333", padding: "4px 10px", borderRadius: "12px", letterSpacing: "0.5px" }}>GENERAL</div>
                <div style={{ fontSize: "10px", color: "#a1a1aa", border: "1px solid #333", padding: "4px 10px", borderRadius: "12px", letterSpacing: "0.5px" }}>CODING</div>
                <div style={{ fontSize: "10px", color: "#a1a1aa", border: "1px solid #333", padding: "4px 10px", borderRadius: "12px", letterSpacing: "0.5px" }}>TECHNICAL</div>
                <div style={{ fontSize: "10px", color: "#a1a1aa", border: "1px solid #333", padding: "4px 10px", borderRadius: "12px", letterSpacing: "0.5px" }}>WRITING</div>
                <div style={{ fontSize: "10px", color: "#1c1c1c", backgroundColor: "#3ecf8e", border: "1px solid #3ecf8e", padding: "4px 10px", borderRadius: "12px", letterSpacing: "0.5px", fontWeight: "600" }}>DESIGN</div>
                <div style={{ fontSize: "10px", color: "#1c1c1c", backgroundColor: "#3ecf8e", border: "1px solid #3ecf8e", padding: "4px 10px", borderRadius: "12px", letterSpacing: "0.5px", fontWeight: "600" }}>PROJECT</div>
                <div style={{ fontSize: "10px", color: "#a1a1aa", border: "1px solid #333", padding: "4px 10px", borderRadius: "12px", letterSpacing: "0.5px" }}>RESEARCH</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ fontSize: "12px", color: "#a1a1aa", border: "1px solid #333", padding: "6px 16px", borderRadius: "4px" }}>Delete</div>
            </div>
          </div>
        </div>

        {/* Feature 3: Seamless Injection */}
        <h3 style={{ fontSize: "15px", color: "#ededed", marginBottom: "8px" }}>3. Seamless Injection (The "Inject" Button)</h3>
        <p style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "16px", marginTop: 0 }}>
          Instead of manually copy-pasting your long list of rules every time you start a new AI chat, ContxtAI bridges directly into the text boxes of major AI chat interfaces.
        </p>

        {/* Mock UI: Inject Button */}
        <div style={{ backgroundColor: "#1c1c1c", padding: "16px", borderRadius: "8px", border: "1px solid #333", marginBottom: "16px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "300px", padding: "10px", backgroundColor: "#3ecf8e", color: "#1c1c1c", borderRadius: "6px", fontSize: "14px", fontWeight: "500", textAlign: "center", userSelect: "none" }}>
            Inject Selected Context
          </div>
        </div>

        <div style={{ backgroundColor: "#181818", padding: "12px 16px", borderRadius: "6px", marginBottom: "32px", border: "1px solid #2e2e2e" }}>
          <strong style={{ color: "#3ecf8e", fontSize: "13px", display: "block", marginBottom: "4px" }}>💡 Use Case:</strong>
          <span style={{ fontSize: "13px", color: "#a1a1aa" }}>You are starting a new ChatGPT session to write some code. Just click the ContxtAI extension icon and press <strong>"Inject Selected Context"</strong>. All your preferred tech stacks and coding rules will instantly drop right into the chat box!</span>
        </div>

        {/* Feature 4: Extract & Distill */}
        <h3 style={{ fontSize: "15px", color: "#ededed", marginBottom: "8px" }}>4. Extract Context From Chat (Auto-Distillation)</h3>
        <p style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "16px", marginTop: 0 }}>
          Sometimes you have a really good conversation with the AI where you laid out a lot of ground rules. Instead of manually copying them out, you can have the AI do the work for you.
        </p>

        {/* Mock UI: Extract Button & Save Box */}
        <div style={{ backgroundColor: "#1c1c1c", padding: "20px", borderRadius: "8px", border: "1px solid #333", marginBottom: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "100%", maxWidth: "340px", padding: "10px", backgroundColor: "transparent", color: "#3ecf8e", border: "1px solid #3ecf8e", borderRadius: "6px", fontSize: "14px", fontWeight: "500", textAlign: "center", userSelect: "none" }}>
            Extract Context From Chat
          </div>
          <div style={{ width: "100%", maxWidth: "340px", textAlign: "left", padding: "16px", backgroundColor: "#1c1c1c", border: "1px solid #333", borderRadius: "8px" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "500", color: "#3ecf8e" }}>Save Distilled Context</h3>
            <p style={{ fontSize: "12px", color: "#a1a1aa", marginBottom: "12px", marginTop: 0 }}>Review and edit the fields below before saving.</p>
            <div style={{ width: "100%", height: "60px", backgroundColor: "#232323", border: "1px solid #333333", borderRadius: "6px", color: "#a1a1aa", fontSize: "12px", padding: "10px", fontFamily: "monospace", display: "flex", alignItems: "center" }}>
              [ &#123; "label": "...", "content": "..." &#125; ]
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "16px", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#3ecf8e", border: "3px solid #1c1c1c", outline: "1px solid #3ecf8e" }}></div>
                <span style={{ fontSize: "12px", color: "#ededed" }}>Active Profile</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "transparent", border: "3px solid #1c1c1c", outline: "1px solid #a1a1aa" }}></div>
                <span style={{ fontSize: "12px", color: "#ededed" }}>New Profile</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <div style={{ flex: 1, padding: "10px", backgroundColor: "#3ecf8e", color: "#1c1c1c", borderRadius: "6px", fontSize: "13px", fontWeight: "600", textAlign: "center", userSelect: "none" }}>Save Context</div>
              <div style={{ padding: "10px 20px", backgroundColor: "transparent", color: "#a1a1aa", border: "1px solid #333", borderRadius: "6px", fontSize: "13px", textAlign: "center", userSelect: "none" }}>Cancel</div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: "#181818", padding: "12px 16px", borderRadius: "6px", marginBottom: "32px", border: "1px solid #2e2e2e" }}>
          <strong style={{ color: "#3ecf8e", fontSize: "13px", display: "block", marginBottom: "4px" }}>💡 Use Case:</strong>
          <span style={{ fontSize: "13px", color: "#a1a1aa" }}>You spent 20 minutes explaining your brand's writing tone to Claude. Click the <strong>"Extract Context From Chat"</strong> button in the popup, and ContxtAI will command the AI to grab all those style rules and convert them into organized fields you can save to your profile for next time!</span>
        </div>

        {/* Feature 5: Highlight to Save */}
        <h3 style={{ fontSize: "15px", color: "#ededed", marginBottom: "8px" }}>5. Highlight-to-Save (Micro-Capture)</h3>
        <p style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "16px", marginTop: 0 }}>
          As you read through AI responses or your own prompts, you might spot a brilliant architecture rule or a perfect phrase. When you highlight any text on a supported AI platform, a small "Save to ContxtAI" button will appear.
        </p>

        {/* Mock UI: Highlight to Save */}
        <div style={{ backgroundColor: "#1c1c1c", padding: "24px", borderRadius: "8px", border: "1px solid #333", marginBottom: "16px", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ position: "relative", padding: "16px", backgroundColor: "#232323", borderRadius: "6px", border: "1px solid #333", maxWidth: "340px", color: "#a1a1aa", fontSize: "13px", lineHeight: "1.6" }}>
            The recommended architecture is to <span style={{ backgroundColor: "rgba(62, 207, 142, 0.2)", color: "#ededed", padding: "2px 4px", borderRadius: "4px" }}>separate the domain logic from the UI components</span> for better testability.

            {/* Tooltip mockup */}
            <div style={{ position: "absolute", top: "-18px", left: "60px", backgroundColor: "#3ecf8e", color: "#1c1c1c", padding: "6px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
              Save to ContxtAI
              <div style={{ position: "absolute", bottom: "-5px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #3ecf8e" }}></div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: "#181818", padding: "12px 16px", borderRadius: "6px", marginBottom: "24px", border: "1px solid #2e2e2e" }}>
          <strong style={{ color: "#3ecf8e", fontSize: "13px", display: "block", marginBottom: "4px" }}>💡 Use Case:</strong>
          <span style={{ fontSize: "13px", color: "#a1a1aa" }}>The AI suggests a great React folder structure. You just highlight that text, click the little ContxtAI button that pops up, and it is permanently saved to your "React Dev" profile.</span>
        </div>

        {/* Feature 6: Context Thermometer */}
        <h3 style={{ fontSize: "15px", color: "#ededed", marginBottom: "8px" }}>6. Context Thermometer</h3>
        <p style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "16px", marginTop: 0 }}>
          You can't give an AI an infinite amount of instructions. Every AI model has a "budget" (e.g., ChatGPT acts best when your initial instructions are under 4,000 tokens). The Context Thermometer is a visual progress bar in the popup that tells you if your profile is getting too heavy.
        </p>

        {/* Mock UI: Context Thermometer */}
        <div style={{ backgroundColor: "#1c1c1c", padding: "16px", borderRadius: "8px", border: "1px solid #333", marginBottom: "16px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "340px", padding: "16px", borderRadius: "6px", backgroundColor: "#232323", border: "1px solid #333333" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px" }}>Context Thermometer</span>
              <span style={{ fontSize: "12px", fontWeight: "500", color: "#3ecf8e" }}>2,634 / 8,000 tokens</span>
            </div>
            <div style={{ width: "100%", height: "6px", backgroundColor: "#333", borderRadius: "3px", overflow: "hidden", marginBottom: "12px" }}>
              <div style={{ height: "100%", width: "33%", backgroundColor: "#3ecf8e" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "500" }}>
              <span style={{ color: "#3ecf8e" }}>Laser Focused</span>
              <span style={{ color: "#ededed" }}>17 <span style={{ color: "#a1a1aa", fontWeight: "400" }}>of 17 fields active</span></span>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: "#181818", padding: "12px 16px", borderRadius: "6px", marginBottom: "32px", border: "1px solid #2e2e2e" }}>
          <strong style={{ color: "#3ecf8e", fontSize: "13px", display: "block", marginBottom: "4px" }}>💡 Use Case:</strong>
          <span style={{ fontSize: "13px", color: "#a1a1aa" }}>You add an entire company handbook to your profile. The thermometer turns red and says "Context Trimmed (Over Budget)", warning you that the AI will likely ignore half of it. You can then trim down your profile's fields.</span>
        </div>

        {/* Feature 7: Context Fade Warning */}
        <h3 style={{ fontSize: "15px", color: "#ededed", marginBottom: "8px" }}>7. Context Fade Warning (The "🧠" Banner)</h3>
        <p style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "16px", marginTop: 0 }}>
          AIs suffer from "lost in the middle" syndrome. If a chat gets too long, the AI starts forgetting the rules you told it at the very beginning. ContxtAI automatically tracks chat length and displays a warning banner in the popup to remind you.
        </p>

        {/* Mock UI: Fade Warning Banner */}
        <div style={{ backgroundColor: "#1c1c1c", padding: "16px", borderRadius: "8px", border: "1px solid #333", marginBottom: "16px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "340px", padding: "16px", borderRadius: "6px", backgroundColor: "#232323", border: "1px solid #333333" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "8px", color: "#fbbf24", fontWeight: "600", fontSize: "13px" }}>
              <span style={{ marginRight: "6px" }}>🧠</span> Context Fade Warning
            </div>
            <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#a1a1aa", lineHeight: "1.5" }}>
              This conversation is getting long (12 messages). The AI might start forgetting your core guidelines due to the "lost in the middle" effect.
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <div style={{ padding: "6px 10px", backgroundColor: "#2a2a2a", color: "#ededed", border: "1px solid #333333", borderRadius: "4px", fontSize: "11px", userSelect: "none" }}>Re-inject "coding"</div>
              <div style={{ padding: "6px 10px", backgroundColor: "#3ecf8e", color: "#1c1c1c", border: "none", borderRadius: "4px", fontSize: "11px", fontWeight: "600", userSelect: "none" }}>Re-inject All</div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: "#181818", padding: "12px 16px", borderRadius: "6px", marginBottom: "32px", border: "1px solid #2e2e2e" }}>
          <strong style={{ color: "#3ecf8e", fontSize: "13px", display: "block", marginBottom: "4px" }}>💡 Use Case:</strong>
          <span style={{ fontSize: "13px", color: "#a1a1aa" }}>You've been debugging for 15 messages and the AI suddenly forgets to use TypeScript. You open the ContxtAI popup, see the Fade Warning, and click the <strong>"Re-inject coding"</strong> button to quickly refresh its memory of your coding rules without overwhelming it with your entire profile.</span>
        </div>

        {/* Feature 8: Local Privacy Scrubber & Detection */}
        <h3 style={{ fontSize: "15px", color: "#ededed", marginBottom: "8px" }}>8. Local Privacy Scrubber & Auto-Detection</h3>
        <p style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "16px", marginTop: 0 }}>
          Before any data is injected into an AI chat or saved to your profile, ContxtAI scans it locally on your computer to protect your privacy. It automatically detects sensitive data (like AWS keys, passwords, API tokens, and Credit Cards).
        </p>

        {/* Mock UI: Privacy Scrubber */}
        <div style={{ backgroundColor: "#1c1c1c", padding: "16px", borderRadius: "8px", border: "1px solid #333", marginBottom: "16px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "340px", padding: "16px", borderRadius: "6px", backgroundColor: "#232323", border: "1px solid #333333" }}>
            <div style={{ color: "#fbbf24", fontSize: "13px", lineHeight: "1.5" }}>
              <strong style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ marginRight: "6px" }}>⚠️</span> Privacy Issues detected : 2
              </strong>
              <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px", color: "#fcd34d" }}>
                <li>2x OPENAI_KEY</li>
                <li>1x AWS_KEY</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Mock UI: Platform Detected */}
        <div style={{ backgroundColor: "#1c1c1c", padding: "16px", borderRadius: "8px", border: "1px solid #333", marginBottom: "16px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "340px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ color: "#3ecf8e", fontSize: "20px", fontWeight: "bold" }}>C</div>
              <div style={{ color: "#ededed", fontSize: "16px", fontWeight: "600" }}>ContxtAI</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10px", color: "#a1a1aa", fontWeight: "600", letterSpacing: "1px" }}>DETECTED</div>
              <div style={{ fontSize: "13px", color: "#3ecf8e", fontWeight: "500" }}>Chatgpt</div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: "#181818", padding: "12px 16px", borderRadius: "6px", marginBottom: "0", border: "1px solid #2e2e2e" }}>
          <strong style={{ color: "#3ecf8e", fontSize: "13px", display: "block", marginBottom: "4px" }}>💡 Use Case:</strong>
          <span style={{ fontSize: "13px", color: "#a1a1aa" }}>You accidentally highlight a block of code containing your database password and hit save. ContxtAI catches it instantly, warns you with a yellow alert in the popup, and masks the password as <code>[MASKED_PASSWORD]</code> so it never reaches the cloud.</span>
        </div>
      </div>
    </div>
  );
}

function BundleEditor({ bundle, onSave, onDelete }: any) {
  const [editingBundle, setEditingBundle] = useState<ContextBundle>(bundle);
  const [saveTimeout, setSaveTimeout] = useState<any>(null);

  useEffect(() => {
    setEditingBundle(bundle);
  }, [bundle.id]); // Only reset local state when the selected bundle ID changes

  const triggerSave = (updated: ContextBundle) => {
    onSave(updated);
    if (saveTimeout) clearTimeout(saveTimeout);
    setSaveTimeout(setTimeout(() => {
      saveBundle(updated).catch(err => console.error("Auto-save failed", err));
    }, 500));
  };

  const handleChange = (field: string, value: any) => {
    const updated = { ...editingBundle, [field]: value };
    setEditingBundle(updated);
    triggerSave(updated);
  };

  const handleUpdateIdentity = (field: string, value: string) => {
    const updated = {
      ...editingBundle,
      identity: { ...(editingBundle.identity || {}), [field]: value }
    };
    setEditingBundle(updated);
    triggerSave(updated);
  };

  const handleUpdateField = (id: string, updates: any) => {
    const updated = { ...editingBundle, fields: editingBundle.fields.map((f: any) => f.id === id ? { ...f, ...updates } : f) };
    setEditingBundle(updated);
    triggerSave(updated);
  };

  const toggleTag = (fieldId: string, tag: string) => {
    const field = editingBundle.fields.find((f: any) => f.id === fieldId);
    if (!field) return;
    const tags = field.tags || [];
    const newTags = tags.includes(tag) ? tags.filter((t: any) => t !== tag) : [...tags, tag];
    handleUpdateField(fieldId, { tags: newTags });
  };

  const handleAddField = () => {
    const newField = { id: crypto.randomUUID(), label: "New Field", content: "", weight: 5, tags: ["general"] };
    const updated = { ...editingBundle, fields: [...editingBundle.fields, newField] };
    setEditingBundle(updated);
    triggerSave(updated);
  };

  const handleDeleteField = (id: string) => {
    const updated = { ...editingBundle, fields: editingBundle.fields.filter((f: any) => f.id !== id) };
    setEditingBundle(updated);
    triggerSave(updated);
  };

  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: "6px", border: "1px solid #333333", backgroundColor: "#232323", color: "#ededed", fontSize: "14px", fontFamily: "inherit", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box" as any };

  const AVAILABLE_TAGS = ["general", "coding", "technical", "writing", "design", "project", "research"];

  const handleImportJSON = () => {
    const jsonStr = prompt("Paste the distilled JSON array here:");
    if (!jsonStr) return;
    try {
      // Strip markdown code blocks if the user copied them
      const cleanStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanStr);
      if (!Array.isArray(parsed)) throw new Error("Expected an array");

      const newFields = parsed.map((item: any) => ({
        id: crypto.randomUUID(),
        label: item.label || "Imported Field",
        content: item.content || "",
        weight: item.weight || 5,
        tags: item.tags || ["general"]
      }));

      const updated = { ...editingBundle, fields: [...editingBundle.fields, ...newFields] };
      setEditingBundle(updated);
      triggerSave(updated);
      alert(`Successfully imported ${newFields.length} context fields!`);
    } catch (err) {
      alert("Failed to parse JSON. Make sure it matches the expected schema.");
      console.error(err);
    }
  };

  return (
    <div>
      <style>{`
        input:focus, textarea:focus { border-color: #3ecf8e !important; }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <h1 style={{ margin: "0", fontSize: "24px", fontWeight: "500", color: "#ededed" }}>Profile Editor</h1>
        <button
          onClick={onDelete}
          style={{ padding: "8px 16px", backgroundColor: "#2a2a2a", color: "#ff4d4f", border: "1px solid #333333", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500", transition: "all 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "#333333"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "#2a2a2a"}
        >
          Delete Profile
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "8px", color: "#a1a1aa", fontSize: "13px", fontWeight: "500" }}>Name</label>
          <input style={inputStyle} value={editingBundle.name} onChange={e => handleChange("name", e.target.value)} placeholder="e.g. Developer Starter" />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "8px", color: "#a1a1aa", fontSize: "13px", fontWeight: "500" }}>Description</label>
          <input style={inputStyle} value={editingBundle.description || ""} onChange={e => handleChange("description", e.target.value)} placeholder="What is this profile used for?" />
        </div>
      </div>

      <div style={{ padding: "20px", backgroundColor: "#232323", border: "1px solid #333333", borderRadius: "8px", marginBottom: "48px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "500", color: "#ededed" }}>Identity (Optional)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#a1a1aa", fontSize: "12px", fontWeight: "500" }}>Your Name</label>
            <input style={inputStyle} value={editingBundle.identity?.name || ""} onChange={e => handleUpdateIdentity("name", e.target.value)} placeholder="e.g. Alice" />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#a1a1aa", fontSize: "12px", fontWeight: "500" }}>Your Role</label>
            <input style={inputStyle} value={editingBundle.identity?.role || ""} onChange={e => handleUpdateIdentity("role", e.target.value)} placeholder="e.g. Designer" />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#a1a1aa", fontSize: "12px", fontWeight: "500" }}>Company/Project</label>
            <input style={inputStyle} value={editingBundle.identity?.company || ""} onChange={e => handleUpdateIdentity("company", e.target.value)} placeholder="e.g. Acme Corp" />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "500" }}>Knowledge Fields</h2>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleImportJSON}
            style={{ padding: "8px 16px", backgroundColor: "transparent", color: "#3ecf8e", border: "1px solid #3ecf8e", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(62, 207, 142, 0.1)"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
          >
            Import Distilled JSON
          </button>
          <button
            onClick={handleAddField}
            style={{ padding: "8px 16px", backgroundColor: "#3ecf8e", color: "#1c1c1c", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#46e39d"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "#3ecf8e"}
          >
            Add Field
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {editingBundle.fields.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", border: "1px dashed #333", borderRadius: "8px", backgroundColor: "#232323" }}>
            <p style={{ margin: 0, color: "#a1a1aa", fontSize: "14px" }}>No fields added yet.</p>
          </div>
        )}

        {editingBundle.fields.map(field => (
          <div key={field.id}
            style={{ backgroundColor: "#232323", border: "1px solid #333333", borderRadius: "8px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#a1a1aa", fontSize: "12px", fontWeight: "500" }}>Label</label>
                <input style={inputStyle} value={field.label} onChange={e => handleUpdateField(field.id, { label: e.target.value })} placeholder="e.g. Coding Preferences" />
              </div>
              <div style={{ width: "100px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#a1a1aa", fontSize: "12px", fontWeight: "500" }}>Priority</label>
                <input type="number" min="1" max="10" style={inputStyle} value={field.weight} onChange={e => handleUpdateField(field.id, { weight: parseInt(e.target.value) || 1 })} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#a1a1aa", fontSize: "12px", fontWeight: "500" }}>Content</label>
              <textarea style={{ ...inputStyle, minHeight: "100px", resize: "vertical", lineHeight: "1.5" }} value={field.content} onChange={e => handleUpdateField(field.id, { content: e.target.value })} placeholder="Content..." />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#a1a1aa", fontSize: "12px", fontWeight: "500" }}>Tags (Determines which AI sees this field)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {AVAILABLE_TAGS.map(tag => {
                  const isActive = field.tags?.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(field.id, tag)}
                      style={{
                        padding: "4px 10px",
                        backgroundColor: isActive ? "#3ecf8e" : "transparent",
                        color: isActive ? "#1c1c1c" : "#a1a1aa",
                        border: `1px solid ${isActive ? "#3ecf8e" : "#333"}`,
                        borderRadius: "16px",
                        fontSize: "11px",
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontWeight: "500",
                        transition: "all 0.15s"
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => handleDeleteField(field.id)}
                style={{ padding: "6px 12px", backgroundColor: "transparent", color: "#a1a1aa", border: "1px solid #333", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "500", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#ff4d4f"; e.currentTarget.style.borderColor = "#ff4d4f"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.borderColor = "#333"; }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
