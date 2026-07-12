import { ContextField, RankConfig } from "../types";
import { countTokens } from "./tokenCount";

/**
 * Filters and ranks context fields based on the given configuration.
 * It first filters out fields that are platform-incompatible or lack matching tags.
 * Then it sorts the fields by weight (descending) and trims the list to fit within the token budget.
 *
 * @param fields - The array of context fields to process.
 * @param config - The ranking configuration including platform, token budget, and active tags.
 * @returns The filtered and trimmed array of context fields.
 */
export function rankContext(
  fields: ContextField[],
  config: RankConfig
): ContextField[] {
  // 1. Filter out fields explicitly restricted from the target platform
  let filtered = fields.filter(f => {
    if (f.conditional?.platform && !f.conditional.platform.includes(config.platform)) {
      return false;
    }
    return true;
  });

  // 2. Filter by active semantic tags (if the platform config restricts tags)
  if (config.activeTags && config.activeTags.length > 0) {
    filtered = filtered.filter(f => {
      // If a field has no tags, it's considered universal and passes through
      if (!f.tags || f.tags.length === 0) return true;
      // Otherwise, it must have at least one tag that matches the platform's active tags
      return f.tags.some(tag => config.activeTags!.includes(tag));
    });
  }

  // 3. Sort by priority weight (descending: highest weight first)
  filtered.sort((a, b) => b.weight - a.weight);

  // 4. Enforce token budget by aggressively trimming lower-weight fields
  const trimmed: ContextField[] = [];
  let currentTokens = 0;

  for (const field of filtered) {
    const fieldTokens = countTokens(field.label + ": " + field.content);
    if (currentTokens + fieldTokens <= config.tokenBudget) {
      trimmed.push(field);
      currentTokens += fieldTokens;
    }
  }

  return trimmed;
}
