import { AIPlatform, PlatformTemplate } from "../types";
import { chatgptTemplate } from "./chatgpt";
import { claudeTemplate } from "./claude";
import { geminiTemplate } from "./gemini";

const templates: Record<string, PlatformTemplate> = {
  chatgpt: chatgptTemplate,
  claude: claudeTemplate,
  gemini: geminiTemplate,
};

export function getTemplate(platform: AIPlatform): PlatformTemplate {
  const template = templates[platform];
  if (!template) {
    throw new Error(`Template for platform ${platform} not found.`);
  }
  return template;
}

export * from "./chatgpt";
export * from "./claude";
export * from "./gemini";
