import { validateFilename, validateFileSize } from '@/lib/config';
import { describe, it, expect } from 'vitest';

describe('Config Validators', () => {
  describe('validateFilename', () => {
    it('should accept valid filenames', () => {
      expect(validateFilename('hello.py')).toBe(true);
      expect(validateFilename('my-file_v2.txt')).toBe(true);
      expect(validateFilename('data.json')).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(validateFilename('..')).toBe(false);
      expect(validateFilename('../etc/passwd')).toBe(false);
      expect(validateFilename('file/name.py')).toBe(false);
    });

    it('should reject control characters', () => {
      expect(validateFilename('file\x00.py')).toBe(false);
      expect(validateFilename('file\n.py')).toBe(false);
    });

    it('should reject dangerous characters', () => {
      expect(validateFilename('file:name.py')).toBe(false);
      expect(validateFilename('file*name.py')).toBe(false);
      expect(validateFilename('file?name.py')).toBe(false);
    });

    it('should reject empty and dot names', () => {
      expect(validateFilename('')).toBe(false);
      expect(validateFilename('.')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should accept valid file sizes', () => {
      expect(validateFileSize(100)).toBe(true);
      expect(validateFileSize(1024 * 1024 * 10)).toBe(true); // 10 MB max
    });

    it('should reject oversized files', () => {
      expect(validateFileSize(1024 * 1024 * 11)).toBe(false);
    });

    it('should reject zero and negative sizes', () => {
      expect(validateFileSize(0)).toBe(false);
      expect(validateFileSize(-100)).toBe(false);
    });
  });
});
