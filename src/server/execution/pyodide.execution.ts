/**
 * Pyodide execution service - runs in browser via Web Worker
 * This is a client-side implementation; the backend just provides an interface.
 *
 * In Phase 1, actual execution happens in public/workers/pyodide-worker.js
 * This service is primarily for type definitions and future remote execution.
 */

import { ICodeExecutionService, ExecutionResult } from './execution.interface';

export class PyodideExecutionService implements ICodeExecutionService {
  async execute(_code: string, _timeout?: number): Promise<ExecutionResult> {
    // In Phase 1, this is handled by the browser Web Worker
    // This is a placeholder for future server-side execution
    throw new Error('Execution must be called from client via Web Worker');
  }

  async isAvailable(): Promise<boolean> {
    // Pyodide is always available on the client
    return true;
  }

  async getInfo(): Promise<{ name: string; version?: string }> {
    return {
      name: 'Pyodide',
      version: '0.23.4',
    };
  }
}

export const executionService = new PyodideExecutionService();
