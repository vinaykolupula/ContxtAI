import { PlatformTemplate, ComposedContext } from "../types";

export const geminiTemplate: PlatformTemplate = {
  platform: "gemini",
  maxTokens: 2000,
  format(context: ComposedContext): string {
    const lines = [];
    if (context.identity?.name || context.identity?.role || context.identity?.company) {
      let idStr = `Instructions for assisting ${context.identity?.name || "the user"}`;
      if (context.identity?.role) idStr += `, ${context.identity.role}`;
      if (context.identity?.company) idStr += ` at ${context.identity.company}`;
      idStr += `:`;
      lines.push(idStr);
      lines.push("");
    }
    
    context.fields.forEach(f => {
      lines.push(`## ${f.label}`);
      lines.push(f.content);
      lines.push("");
    });
    
    return lines.join("\n").trim();
  }
};
