import { CompositionConfig, ComposedContext } from "../types";
import { loadBundle } from "../store/indexeddb";
import { rankContext } from "./rank";
import { countTokens } from "./tokenCount";

/**
 * Composes a finalized context object by loading the requested bundle, 
 * ranking and filtering its fields according to the platform constraints, 
 * and estimating the total token count used.
 *
 * @param bundleId - The UUID of the context bundle to compose.
 * @param config - The composition configuration (platform, token budget, tags).
 * @returns A promise resolving to the ComposedContext ready for formatting.
 */
export async function composeContext(
  bundleId: string,
  config: CompositionConfig
): Promise<ComposedContext> {
  // Load the raw bundle from the local IndexedDB store
  const bundle = await loadBundle(bundleId);

  // Calculate tokens used by identity so we can reserve space for it in the budget
  const identityStr = bundle.identity ? JSON.stringify(bundle.identity) : "";
  const identityTokens = countTokens(identityStr);
  const remainingBudget = Math.max(0, config.tokenBudget - identityTokens);

  // Filter and sort the fields based on platform compatibility, tags, and weight
  const rankedFields = rankContext(bundle.fields, {
    platform: config.platform,
    tokenBudget: remainingBudget,
    activeTags: config.activeTags,
    query: config.query
  });

  // Calculate the approximate token count of the composed fields + identity
  const estimatedTokens = identityTokens + rankedFields.reduce(
    (acc, field) => acc + countTokens(field.label + ": " + field.content),
    0
  );

  return {
    bundleId: bundle.id,
    identity: bundle.identity || {},
    fields: rankedFields,
    estimatedTokens
  };
}
