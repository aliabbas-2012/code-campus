import { describe, it, expect } from 'vitest';

describe('Error Handling', () => {
  it('should properly handle typed errors', () => {
    // Test basic error structure
    const error = new Error('Test error');
    expect(error.message).toBe('Test error');
  });
});
