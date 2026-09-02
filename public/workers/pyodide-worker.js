/**
 * Pyodide Web Worker for Python code execution.
 *
 * This lives in /public (a plain static file, not compiled by Next.js/
 * Turbopack) and is loaded via new Worker('/workers/pyodide-worker.js',
 * { type: 'module' }) with a literal string URL — NOT the
 * `new Worker(new URL('./file', import.meta.url))` pattern.
 *
 * That's deliberate: Next's dev-mode worker bundling always wraps worker
 * chunks in its own bootstrap script that chain-loads them via
 * importScripts(), regardless of the `type: 'module'` option passed to the
 * Worker constructor — which makes `importScripts` present in the worker's
 * global scope either way. Pyodide (since a recent version) explicitly
 * refuses to run if it detects `importScripts` is available, treating that
 * as "classic worker, not supported." Serving this as an untouched static
 * asset and loading it as a real module worker avoids Next's bootstrap
 * entirely, so `importScripts` is genuinely absent, as Pyodide expects.
 *
 * Since this file isn't processed by the build, it has no access to
 * process.env — the Pyodide base path is hardcoded to the self-hosted
 * copy in /public/pyodide (see scripts/copy-pyodide-assets.js).
 */

const PYODIDE_BASE_URL = '/pyodide/';

let pyodideReady = false;
let pyodide = null;

let stdoutChunks = [];
let stderrChunks = [];

async function initPyodide() {
  try {
    const { loadPyodide } = await import(`${PYODIDE_BASE_URL}pyodide.mjs`);

    pyodide = await loadPyodide({
      indexURL: PYODIDE_BASE_URL,
      stdout: (msg) => stdoutChunks.push(msg),
      stderr: (msg) => stderrChunks.push(msg),
    });

    pyodideReady = true;
    self.postMessage({ type: 'ready', data: { version: pyodide.version } });
  } catch (error) {
    console.error('Failed to initialize Pyodide:', error);
    self.postMessage({
      type: 'error',
      data: { message: `Failed to initialize Pyodide: ${error}` },
    });
  }
}

self.onmessage = async (event) => {
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
    stdoutChunks = [];
    stderrChunks = [];

    try {
      await pyodide.runPythonAsync(event.data.data.code);

      self.postMessage({
        type: 'result',
        data: {
          stdout: stdoutChunks.join('\n'),
          stderr: stderrChunks.join('\n'),
          returnCode: 0,
          executionTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      self.postMessage({
        type: 'result',
        data: {
          stdout: stdoutChunks.join('\n'),
          stderr: stderrChunks.join('\n') + (stderrChunks.length > 0 ? '\n' : '') + String(error),
          returnCode: 1,
          executionTime: Date.now() - startTime,
        },
      });
    }
  }
};

initPyodide();
