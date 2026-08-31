/**
 * CodeExecutionService interface
 * Abstracts code execution backend (client-side Pyodide vs remote Docker/SSH service)
 */

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  returnCode: number;
  executionTime: number; // milliseconds
}

export interface ICodeExecutionService {
  /**
   * Execute Python code
   * Returns execution result with stdout, stderr, return code
   */
  execute(code: string, timeout?: number): Promise<ExecutionResult>;

  /**
   * Check if execution service is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get service info (version, capabilities)
   */
  getInfo(): Promise<{ name: string; version?: string }>;
}
