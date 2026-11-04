// `npm run dev`: everything needed to try the app without Docker, in one terminal.
// Builds the shared contract once, then runs the dev inbox, the API and the web app with labelled output.
// Ctrl+C stops all three.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const isWindows = process.platform === 'win32';
const services = [
  { name: 'inbox', script: 'dev:inbox' },
  { name: 'api', script: 'dev:api' },
  { name: 'web', script: 'dev:web' },
];

const build = spawnSync('npm', ['run', 'build', '-w', '@catalogue/contracts'], {
  stdio: 'inherit',
  shell: true,
});
if (build.status !== 0) process.exit(build.status ?? 1);

const children = services.map(({ name, script }) => {
  // shell: true so `npm` resolves to npm.cmd on Windows.
  const child = spawn('npm', ['run', script], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const print = (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (!line.trim()) continue;
      process.stdout.write(`[${name}] ${line}\n`);
      if (name === 'api' && line.includes('EADDRINUSE')) {
        process.stdout.write(
          `[dev] The API port is taken. Set API_PORT=3001 (or any free port) in .env and rerun.\n`,
        );
      }
    }
  };
  child.stdout.on('data', print);
  child.stderr.on('data', print);
  child.on('exit', (code) => {
    if (code) process.stdout.write(`[dev] ${name} stopped (exit ${code}); the others keep running.\n`);
  });
  return child;
});

process.stdout.write(
  `[dev] App: http://localhost:5173 · Sales inbox: http://localhost:8025 · API: http://localhost:${apiPort()}\n`,
);

function apiPort() {
  try {
    return /^API_PORT=(\d+)/m.exec(readFileSync('.env', 'utf8'))?.[1] ?? '3000';
  } catch {
    return '3000';
  }
}

function stopAll() {
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    // npm starts grandchildren (node, vite, tsc-watch); on Windows only taskkill /T stops the whole tree.
    if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
