import { PlatformTemplate, ComposedContext } from "../types";

export const chatgptTemplate: PlatformTemplate = {
  platform: "chatgpt",
  maxTokens: 1500,
  format(context: ComposedContext): string {
    const lines = [];
    if (context.identity?.name || context.identity?.role || context.identity?.company) {
      let idStr = `You are assisting ${context.identity?.name || "the user"}`;
      if (context.identity?.role) idStr += `, ${context.identity.role}`;
      if (context.identity?.company) idStr += ` at ${context.identity.company}`;
      idStr += `.`;
      lines.push(idStr);
      lines.push("");
    }
    
    context.fields.forEach(f => {
      lines.push(`[${f.label}]`);
      lines.push(f.content);
      lines.push("");
    });
    
    return lines.join("\n").trim();
  }
};
