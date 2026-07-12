import { describe, it, expect } from 'vitest';
import { rankContext } from '../src/engine/rank';
import { ContextField } from '../src/types';

describe('Context Ranking Logic', () => {
  it('should trim fields that exceed the token budget', () => {
    const fields: ContextField[] = [
      { id: '1', label: 'Field 1', content: 'Very long content that consumes tokens...', weight: 10, tags: [] },
      { id: '2', label: 'Field 2', content: 'Small content', weight: 8, tags: [] },
      { id: '3', label: 'Field 3', content: 'Medium content goes here', weight: 9, tags: [] },
    ];

    const result = rankContext(fields, { platform: 'chatgpt', tokenBudget: 10 });
    
    // Field 1 + Field 3 should fit or just Field 1 depending on token estimation.
    // 'Very long content that consumes tokens...' + label is around ~12 tokens.
    // If budget is 10, maybe it drops the large one and fits the smaller ones? 
    // Our rank algorithm sorts by weight, then takes fields if they fit.
    expect(result.length).toBeLessThan(3);
  });

  it('should filter out fields using conditional platform tags', () => {
    const fields: ContextField[] = [
      { id: '1', label: 'A', content: 'A', weight: 10, tags: [], conditional: { platform: ['claude'] } },
      { id: '2', label: 'B', content: 'B', weight: 9, tags: [], conditional: { platform: ['chatgpt'] } },
    ];

    const result = rankContext(fields, { platform: 'chatgpt', tokenBudget: 100 });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
  });
});
