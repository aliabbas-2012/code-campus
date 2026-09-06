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
let micropip = null;

let stdoutChunks = [];
let stderrChunks = [];

async function getMicropip() {
  if (!micropip) {
    await pyodide.loadPackage('micropip');
    micropip = pyodide.pyimport('micropip');
  }
  return micropip;
}

async function resolvePackageBaseUrl() {
  // Individual package wheels (numpy, pandas, ...) aren't vendored under /pyodide — only the
  // core runtime is self-hosted (see copy-pyodide-assets.js). Packages instead load from
  // Pyodide's own release CDN, at the exact version actually installed, read from a plain
  // text file written by that same script so this can never drift to a mismatched release.
  try {
    const res = await fetch(`${PYODIDE_BASE_URL}version.txt`);
    if (!res.ok) return undefined;
    const version = (await res.text()).trim();
    return version ? `https://cdn.jsdelivr.net/pyodide/v${version}/full/` : undefined;
  } catch {
    return undefined;
  }
}

async function initPyodide() {
  try {
    const { loadPyodide } = await import(`${PYODIDE_BASE_URL}pyodide.mjs`);
    const packageBaseUrl = await resolvePackageBaseUrl();

    pyodide = await loadPyodide({
      indexURL: PYODIDE_BASE_URL,
      packageBaseUrl,
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
      // Auto-load any of Pyodide's curated packages the code imports, so
      // e.g. `import numpy` just works with no manual install step.
      await pyodide.loadPackagesFromImports(event.data.data.code);
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
  } else if (event.data.type === 'install_packages') {
    if (!pyodideReady || !pyodide) {
      self.postMessage({ type: 'error', data: { message: 'Pyodide not ready' } });
      return;
    }

    const results = [];
    try {
      const mp = await getMicropip();
      for (const pkg of event.data.data.packages) {
        try {
          await mp.install(pkg);
          results.push({ package: pkg, success: true });
        } catch (error) {
          results.push({ package: pkg, success: false, error: String(error) });
        }
      }
    } catch (error) {
      // Failed to even load micropip itself — report every requested package as failed.
      for (const pkg of event.data.data.packages) {
        results.push({ package: pkg, success: false, error: String(error) });
      }
    }

    self.postMessage({ type: 'packages_installed', data: { results } });
  } else if (event.data.type === 'mount_files') {
    if (!pyodideReady || !pyodide) {
      self.postMessage({ type: 'error', data: { message: 'Pyodide not ready' } });
      return;
    }
    for (const file of event.data.data.files) {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        pyodide.FS.mkdirTree(parts.slice(0, -1).join('/'));
      }
      pyodide.FS.writeFile(file.path, file.content);
    }
    self.postMessage({ type: 'files_mounted' });
  } else if (event.data.type === 'list_stdlib_modules') {
    if (!pyodideReady || !pyodide) {
      self.postMessage({ type: 'stdlib_modules', data: { requestId: event.data.data?.requestId, modules: [] } });
      return;
    }
    try {
      const names = pyodide.runPython(
        'import sys, json; json.dumps(sorted(n for n in sys.stdlib_module_names if not n.startswith("_")))',
      );
      self.postMessage({
        type: 'stdlib_modules',
        data: { requestId: event.data.data?.requestId, modules: JSON.parse(names) },
      });
    } catch (error) {
      self.postMessage({ type: 'stdlib_modules', data: { requestId: event.data.data?.requestId, modules: [] } });
    }
  } else if (event.data.type === 'introspect_module') {
    const requestId = event.data.data?.requestId;
    const moduleName = event.data.data?.module ?? '';

    if (!pyodideReady || !pyodide || !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(moduleName)) {
      self.postMessage({ type: 'introspect_result', data: { requestId, module: moduleName, members: [] } });
      return;
    }

    try {
      // Import in an isolated dict so this never touches the user's own globals/variables.
      const script = `
import importlib, inspect, json as _json

def _introspect(mod_name):
    try:
        mod = importlib.import_module(mod_name)
    except Exception:
        return []
    results = []
    for name in dir(mod):
        if name.startswith('_'):
            continue
        try:
            attr = getattr(mod, name)
        except Exception:
            continue
        if inspect.isclass(attr):
            kind = 'class'
        elif inspect.isroutine(attr):
            kind = 'function'
        elif inspect.ismodule(attr):
            kind = 'module'
        else:
            kind = 'value'
        doc = inspect.getdoc(attr)
        summary = doc.strip().splitlines()[0][:160] if doc else ''
        results.append({'name': name, 'kind': kind, 'doc': summary})
    return results

_json.dumps(_introspect(${JSON.stringify(moduleName)}))
`;
      await pyodide.loadPackagesFromImports(`import ${moduleName.split('.')[0]}`);
      const json = await pyodide.runPythonAsync(script);
      self.postMessage({ type: 'introspect_result', data: { requestId, module: moduleName, members: JSON.parse(json) } });
    } catch (error) {
      self.postMessage({ type: 'introspect_result', data: { requestId, module: moduleName, members: [] } });
    }
  } else if (event.data.type === 'repl') {
    if (!pyodideReady || !pyodide) {
      self.postMessage({ type: 'error', data: { message: 'Pyodide not ready' } });
      return;
    }

    stdoutChunks = [];
    stderrChunks = [];

    try {
      // Compiling in 'single' mode mirrors Python's interactive interpreter:
      // a bare expression statement auto-prints its repr(), like a real REPL.
      await pyodide.loadPackagesFromImports(event.data.data.code);
      pyodide.globals.set('__repl_source__', event.data.data.code);
      await pyodide.runPythonAsync('exec(compile(__repl_source__, "<shell>", "single"))');

      self.postMessage({
        type: 'repl_result',
        data: { stdout: stdoutChunks.join('\n'), stderr: stderrChunks.join('\n'), returnCode: 0 },
      });
    } catch (error) {
      self.postMessage({
        type: 'repl_result',
        data: {
          stdout: stdoutChunks.join('\n'),
          stderr: stderrChunks.join('\n') + (stderrChunks.length > 0 ? '\n' : '') + String(error),
          returnCode: 1,
        },
      });
    }
  }
};

initPyodide();
