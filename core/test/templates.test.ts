import { describe, it, expect } from 'vitest';
import { getTemplate } from '../src/templates/index';

describe('Templates Engine', () => {
  it('should format ChatGPT template correctly', () => {
    const template = getTemplate('chatgpt');
    const result = template.format({
      bundleId: '1',
      estimatedTokens: 50,
      identity: { name: 'Alice', role: 'Engineer' },
      fields: [
        { id: '1', label: 'Stack', content: 'Node.js', weight: 10, tags: [] }
      ]
    });
    
    expect(result).toContain('You are assisting Alice, Engineer');
    expect(result).toContain('[Stack]');
    expect(result).toContain('Node.js');
  });

  it('should format Claude template using XML tags', () => {
    const template = getTemplate('claude');
    const result = template.format({
      bundleId: '1',
      estimatedTokens: 50,
      identity: {},
      fields: [
        { id: '1', label: 'Tech Stack', content: 'React', weight: 10, tags: [] }
      ]
    });

    expect(result).toContain('<tech_stack>');
    expect(result).toContain('React');
    expect(result).toContain('</tech_stack>');
  });
});
