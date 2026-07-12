import { AIPlatform } from "./types";

export interface PlatformConfig {
  defaultBudget: number;
  activeTags: string[];
}

export const PLATFORM_CONFIGS: Record<AIPlatform, PlatformConfig> = {
  chatgpt: {
    defaultBudget: 4000,
    activeTags: ["general", "coding", "technical", "writing", "project"]
  },
  claude: {
    defaultBudget: 8000,
    activeTags: ["general", "coding", "writing", "design", "project"]
  },
  gemini: {
    defaultBudget: 10000,
    activeTags: ["general", "project", "research"]
  },
  cursor: {
    defaultBudget: 4000,
    activeTags: ["general", "coding", "technical"]
  },
  midjourney: {
    defaultBudget: 300,
    activeTags: ["general", "design"]
  },
  perplexity: {
    defaultBudget: 4000,
    activeTags: ["general", "research"]
  },
  ollama: {
    defaultBudget: 4000,
    activeTags: ["general", "coding", "technical", "writing"]
  }
};
