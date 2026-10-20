import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'package.json'));
createRequire(require.resolve('next/package.json'))('@next/env').loadEnvConfig(root, true);
const model = process.env.OLLAMA_ANALYSIS_MODEL || process.env.OLLAMA_MODEL || 'deepseek-r1:7b';
const base = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const command = process.argv[2] || 'check';

async function main() {
  if (command === 'check') {
    const response = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
    const { models } = await response.json();
    const installed = models.find(item => item.name === model || item.model === model);
    if (!installed) throw new Error(`Model ${model} is missing. Run npm run llm:pull.`);
    const show = await fetch(`${base}/api/show`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model }), signal: AbortSignal.timeout(5000) });
    if (!show.ok) throw new Error(`Model inspection returned HTTP ${show.status}`);
    const details = await show.json();
    console.log(JSON.stringify({ ready: true, model, digest: installed.digest, sizeBytes: installed.size, details: installed.details, capabilities: details.capabilities, thinking: details.thinking }, null, 2));
    return;
  }
  if (!['serve', 'pull'].includes(command)) throw new Error('Use check, serve or pull.');
  const url = new URL(base);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Local launcher requires a plain localhost HTTP URL.');
  const child = spawn(process.env.OLLAMA_EXECUTABLE || 'ollama', command === 'pull' ? ['pull', model] : ['serve'], {
    cwd: root, stdio: 'inherit', windowsHide: true,
    env: { ...process.env, OLLAMA_HOST: url.host, OLLAMA_NO_CLOUD: '1', OLLAMA_NUM_PARALLEL: '1', OLLAMA_MAX_LOADED_MODELS: '1' }
  });
  child.on('error', error => { console.error(`Could not start Ollama: ${error.message}. Install Ollama or set OLLAMA_EXECUTABLE in .env.local.`); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 0; });
  process.on('SIGINT', () => child.kill());
  process.on('SIGTERM', () => child.kill());
}
main().catch(error => { console.error(error.message); console.error('Start Ollama with npm run llm:serve, then run npm run llm:pull and npm run llm:check.'); process.exitCode = 1; });
