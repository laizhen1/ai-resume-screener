// Local PyTorch setup and development orchestration. No shell interpolation.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'package.json'));
// Resolve through Next itself, so this uses the same environment loader as the app.
const nextRequire = createRequire(require.resolve('next/package.json'));
nextRequire('@next/env').loadEnvConfig(root, true);
const env = { ...process.env, HF_HUB_DISABLE_TELEMETRY: '1', PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8',
  HF_HOME: process.env.HF_HOME || resolve(root, '.model-cache'),
  MODEL_DEVICE: process.env.MODEL_DEVICE || 'cpu' };
const venv = resolve(root, process.env.MODEL_VENV || '.venv');
const python = resolve(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const children = new Set();
let stopping = false;

async function stop() {
  stopping = true;
  await Promise.all([...children].map(child => new Promise(done => {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) return done();
    child.once('exit', done);
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      killer.on('error', () => { child.kill(); });
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill(); }
      const timer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, 5000);
      timer.unref();
      child.once('exit', () => clearTimeout(timer));
    }
  })));
}

function start(command, args, overrides = {}) {
  const child = spawn(command, args, { cwd: root, env: { ...env, ...overrides }, stdio: 'inherit',
    windowsHide: true, detached: process.platform !== 'win32' });
  children.add(child);
  const completion = new Promise((resolveDone, reject) => {
    child.once('error', error => { children.delete(child); reject(error); });
    child.once('exit', (code, signal) => {
      children.delete(child);
      if (code === 0 || stopping) resolveDone();
      else reject(new Error(`${command} exited (${signal || code}).`));
    });
  });
  // Startup may still be awaiting readiness when a child exits.
  completion.catch(() => {});
  return { child, completion };
}

function needPython() {
  if (!existsSync(python)) throw new Error('Python environment missing. Run npm run models:setup first.');
}

function dependencies() {
  needPython();
  const result = spawnSync(python, ['-c', 'import torch, transformers, sentence_transformers, fastapi, uvicorn; print("PyTorch", torch.__version__); print("CUDA available:", torch.cuda.is_available())'],
    { cwd: root, env, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error('Model dependencies are unavailable. Run npm run models:setup.');
}

function endpoint() {
  const url = new URL(env.MODEL_SERVICE_URL || 'http://127.0.0.1:8000');
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('Local launcher requires MODEL_SERVICE_URL=http://127.0.0.1:<port> (or localhost), without credentials or a path.');
  }
  return url;
}

async function health(url) {
  const response = await fetch(new URL('/health', url), { signal: AbortSignal.timeout(2000),
    headers: env.MODEL_SERVICE_TOKEN ? { Authorization: `Bearer ${env.MODEL_SERVICE_TOKEN}` } : {} });
  if (!response.ok) throw new Error(`Model health returned HTTP ${response.status}.`);
  const data = await response.json();
  if (data.status !== 'ready' || !data.packages?.torch || !data.models?.nli) throw new Error('Unexpected model-service health response.');
  return data;
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'setup') {
    if (!existsSync(python)) {
      const candidates = env.MODEL_PYTHON ? [[env.MODEL_PYTHON]] : process.platform === 'win32'
        ? [['py', '-3.12'], ['python']] : [['python3.12'], ['python3']];
      const selected = candidates.find(([command, ...args]) => spawnSync(command, [...args, '-c',
        'import sys; sys.exit(0 if sys.version_info[:2] == (3, 12) else 1)'], { windowsHide: true, stdio: 'ignore' }).status === 0);
      if (!selected) throw new Error('Install Python 3.12 or set MODEL_PYTHON to its executable, then retry.');
      await start(selected[0], [...selected.slice(1), '-m', 'venv', venv]).completion;
    }
    await start(python, ['-m', 'pip', 'install', '--progress-bar', 'off', '-r', 'services/model-service/requirements-training.txt']).completion;
    dependencies();
    console.log('Ready. Run npm run dev:ml. First startup downloads model weights.');
    return;
  }
  if (!['check', 'serve', 'dev'].includes(mode)) throw new Error('Usage: node scripts/pytorch.mjs setup|check|serve|dev');
  dependencies();
  const url = endpoint();
  if (mode === 'check') {
    const data = await health(url);
    console.log(JSON.stringify({ status: data.status, device: data.device, models: data.models, packages: data.packages }, null, 2));
    return;
  }
  const timeout = Number(env.MODEL_STARTUP_TIMEOUT_MS || 900000);
  if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('MODEL_STARTUP_TIMEOUT_MS must be a positive number.');
  await new Promise((done, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error(`Port ${url.port || '80'} is occupied. Stop the existing service or choose another MODEL_SERVICE_URL.`)));
    probe.listen(Number(url.port || 80), url.hostname, () => probe.close(done));
  });
  const service = start(python, ['-m', 'uvicorn', 'app:app', '--app-dir', 'services/model-service',
    '--host', url.hostname, '--port', url.port || '80', '--workers', '1', '--no-access-log']);
  const exited = service.completion.then(() => { throw new Error('Model service stopped.'); });
  exited.catch(() => {});
  console.log(`Loading PyTorch models on ${env.MODEL_DEVICE}; first startup may download several GB.`);
  const waitForReady = async () => {
    const deadline = Date.now() + timeout;
    while (!stopping && Date.now() < deadline) {
      try { await health(url); return; } catch { /* Model loading is synchronous during startup. */ }
      await delay(1000);
    }
    throw new Error('Model startup timed out or was interrupted. Check the service output; adjust MODEL_STARTUP_TIMEOUT_MS if needed.');
  };
  // Abort the polling loop if the service fails; do not leave a timer keeping Node alive.
  try { await Promise.race([waitForReady(), exited]); } catch (error) { stopping = true; throw error; }
  console.log(`PyTorch model service ready at ${url.origin}.`);
  if (mode === 'serve') { await service.completion; return; }
  const web = start(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...process.argv.slice(3)],
    { ENABLE_TRANSFORMER_ANALYSIS: 'true', MODEL_SERVICE_URL: url.origin });
  await Promise.race([web.completion, exited]);
}

for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop(); });
try { await main(); } catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await stop(); }
