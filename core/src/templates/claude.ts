import { PlatformTemplate, ComposedContext } from "../types";

export const claudeTemplate: PlatformTemplate = {
  platform: "claude",
  maxTokens: 4000,
  format(context: ComposedContext): string {
    const lines = [];
    if (context.identity?.name || context.identity?.role || context.identity?.company) {
      let idStr = `System Instruction: You are assisting ${context.identity?.name || "the user"}`;
      if (context.identity?.role) idStr += `, ${context.identity.role}`;
      if (context.identity?.company) idStr += ` at ${context.identity.company}`;
      idStr += `.`;
      lines.push(idStr);
      lines.push("");
    }
    
    context.fields.forEach(f => {
      lines.push(`<${f.label.replace(/\s+/g, '_').toLowerCase()}>`);
      lines.push(f.content);
      lines.push(`</${f.label.replace(/\s+/g, '_').toLowerCase()}>`);
      lines.push("");
    });
    
    return lines.join("\n").trim();
  }
};
