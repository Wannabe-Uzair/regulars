// Runs the API (port 5175) and the Vite client (port 5174) together; Ctrl-C stops both.
import { spawn } from 'node:child_process'
import path from 'node:path'
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const procs = [['api', 'server'], ['web', 'client']].map(([tag, dir]) => {
  const p = spawn('npm', ['--prefix', path.join(root, dir), 'run', 'dev'], { stdio: ['ignore', 'pipe', 'pipe'] })
  for (const s of [p.stdout, p.stderr]) s.on('data', (d) => process.stdout.write(String(d).replace(/^(?=.)/gm, `[${tag}] `)))
  p.on('exit', (code) => { console.log(`[${tag}] exited ${code}`); stop() })
  return p
})
let stopping = false
function stop() { if (stopping) return; stopping = true; for (const p of procs) if (p.exitCode === null) p.kill('SIGTERM') }
process.on('SIGINT', stop); process.on('SIGTERM', stop)
