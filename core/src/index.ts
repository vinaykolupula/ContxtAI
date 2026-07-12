import { ContextBundle } from "./types";
import { loadBundle, saveBundle, setActiveBundleId } from "./store/indexeddb";

export * from "./types";
export { 
  loadBundle, saveBundle, getAllBundles, deleteBundle, 
  createBundle, updateField, getActiveBundleId, setActiveBundleId 
} from "./store/indexeddb";
export * from "./engine/tokenCount";
export * from "./engine/rank";
export * from "./engine/compose";
export * from "./engine/scrubber";
export * from "./templates";
export * from "./config";

export async function exportBundle(id: string): Promise<string> {
  const bundle = await loadBundle(id);
  return JSON.stringify(bundle, null, 2);
}

export async function importBundle(json: string): Promise<ContextBundle> {
  const bundle: ContextBundle = JSON.parse(json);
  
  if (!bundle.id || !bundle.version || !bundle.fields) {
    throw new Error("Invalid bundle format");
  }

  try {
    await loadBundle(bundle.id);
    bundle.id = crypto.randomUUID();
  } catch (e) {
    // ID does not exist, safe to keep original ID
  }

  await saveBundle(bundle);
  return bundle;
}

export async function activateBundle(id: string): Promise<void> {
  return setActiveBundleId(id);
}
