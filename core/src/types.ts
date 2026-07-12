export type AIPlatform = "chatgpt" | "claude" | "cursor" | "gemini" | "midjourney" | "perplexity" | "ollama";

export interface CompositionConfig {
  platform: AIPlatform;
  tokenBudget: number;
  activeTags?: string[];
  query?: string;
}

export interface ComposedContext {
  bundleId: string;
  identity: ContextBundle["identity"];
  fields: ContextField[];
  estimatedTokens: number;
}

export interface PlatformTemplate {
  platform: AIPlatform;
  format(context: ComposedContext): string;
  maxTokens: number;
}

export interface ContextBundle {
  version: string;
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  identity?: {
    name?: string;
    role?: string;
    company?: string;
    [key: string]: string | undefined;
  };
  fields: ContextField[];
}

export interface ContextField {
  id: string;
  label: string;
  content: string;
  weight: number;
  tags: string[];
  conditional?: {
    platform?: AIPlatform[];
    bundleTag?: string;
  };
}

export interface RankConfig {
  platform: AIPlatform;
  tokenBudget: number;
  activeTags?: string[];
  query?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ContextBridge {
  platform: AIPlatform;
  detect(): boolean;
  getInjectionPoint(): Element | null;
  inject(context: string): Promise<void>;
  canReadConversation(): boolean;
  readConversation?(): ConversationMessage[];
  getChatLength?(): number;
}
