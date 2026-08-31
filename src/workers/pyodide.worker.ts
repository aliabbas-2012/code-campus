/**
 * Pyodide Web Worker for Python code execution
 * Runs in a separate thread to avoid blocking the UI
 */

declare function importScripts(...urls: string[]): void;

let pyodideReady = false;
let pyodide: any = null;

// Initialize Pyodide on worker load
async function initPyodide(): Promise<void> {
  try {
    const cdnUrl = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/';
    importScripts(`${cdnUrl}pyodide.js`);
    
    // @ts-ignore - pyodide is loaded via importScripts
    pyodide = await loadPyodide({
      indexURL: cdnUrl,
    });
    
    pyodideReady = true;
    self.postMessage({ type: 'ready', data: { version: pyodide.version } });
  } catch (error) {
    self.postMessage({
      type: 'error',
      data: { message: `Failed to initialize Pyodide: ${error}` },
    });
  }
}

interface ExecuteMessage {
  type: 'execute';
  data: {
    code: string;
    timeout?: number;
  };
}

interface InitMessage {
  type: 'init';
}

type Message = InitMessage | ExecuteMessage;

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<Message>) => {
  if (event.data.type === 'init') {
    await initPyodide();
  } else if (event.data.type === 'execute') {
    if (!pyodideReady || !pyodide) {
      self.postMessage({
        type: 'error',
        data: { message: 'Pyodide not ready' },
      });
      return;
    }

    const startTime = Date.now();
    const stdout: string[] = [];
    const stderr: string[] = [];

    try {
      // Capture stdout/stderr
      const oldLog = console.log;
      const oldError = console.error;

      console.log = (...args: any[]) => {
        stdout.push(args.join(' '));
      };

      console.error = (...args: any[]) => {
        stderr.push(args.join(' '));
      };

      // Run code
      await pyodide.runPythonAsync(event.data.data.code, {
        printResult: true,
      });

      // Restore console
      console.log = oldLog;
      console.error = oldError;

      self.postMessage({
        type: 'result',
        data: {
          stdout: stdout.join('\n'),
          stderr: stderr.join('\n'),
          returnCode: 0,
          executionTime: Date.now() - startTime,
        },
      });
    } catch (error: any) {
      console.log = console.log; // Restore in case of error
      console.error = console.error;

      self.postMessage({
        type: 'result',
        data: {
          stdout: stdout.join('\n'),
          stderr: stderr.join('\n') + (stderr.length > 0 ? '\n' : '') + String(error),
          returnCode: 1,
          executionTime: Date.now() - startTime,
        },
      });
    }
  }
};

// Inform main thread that worker is loaded
initPyodide();
