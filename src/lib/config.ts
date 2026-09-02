// Configuration constants - env-driven, never hardcoded
export const CONFIG = {
  // File upload limits
  MAX_FILE_SIZE_BYTES: (parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024),
  
  // Storage quota defaults
  DEFAULT_STORAGE_QUOTA_BYTES: parseInt(process.env.DEFAULT_STORAGE_QUOTA_MB || '500') * 1024 * 1024,
  
  // Session
  SESSION_TIMEOUT_MINUTES: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '1440'),
  
  // Storage
  STORAGE_BASE_PATH: process.env.STORAGE_BASE_PATH || './storage',
  
  // Pyodide CDN
  NEXT_PUBLIC_PYODIDE_CDN_URL: process.env.NEXT_PUBLIC_PYODIDE_CDN_URL || 'https://cdn.jsdelivr.net/pyodide/v314.0.6/full/',
  
  // File types
  SUPPORTED_FILE_EXTENSIONS: ['.py', '.txt', '.md', '.json', '.csv'],
  PYTHON_EXTENSIONS: ['.py'],
  
  // Valid filename chars (alphanumeric, dash, underscore, dot)
  VALID_FILENAME_PATTERN: /^[a-zA-Z0-9._-]+$/,
};

// Derived constants
export const CONFIG_DERIVED = {
  MAX_TOTAL_STORAGE_BYTES: CONFIG.DEFAULT_STORAGE_QUOTA_BYTES * 100, // Allow admins to configure per-user
};

export function validateFileSize(bytes: number): boolean {
  return bytes >= 0 && bytes <= CONFIG.MAX_FILE_SIZE_BYTES;
}

export function validateFilename(filename: string): boolean {
  // Check pattern
  if (!CONFIG.VALID_FILENAME_PATTERN.test(filename)) {
    return false;
  }
  
  // Reject dangerous names
  if (filename === '.' || filename === '..' || filename === '') {
    return false;
  }
  
  // Reject control characters and path separators
  if (/[\/\\:\*\?"<>|]/.test(filename) || /[\x00-\x1f]/.test(filename)) {
    return false;
  }
  
  return true;
}
