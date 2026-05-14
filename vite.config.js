import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const futuQuoteScript = path.join(rootDir, 'scripts', 'fetch_futu_quotes.py')

const readJsonBody = (req) => new Promise((resolve, reject) => {
  let body = ''
  req.setEncoding('utf8')
  req.on('data', (chunk) => {
    body += chunk
    if (body.length > 1024 * 1024) {
      reject(new Error('request body too large'))
      req.destroy()
    }
  })
  req.on('end', () => {
    try {
      resolve(body ? JSON.parse(body) : {})
    } catch (error) {
      reject(error)
    }
  })
  req.on('error', reject)
})

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

const fetchFutuQuotes = (payload) => new Promise((resolve) => {
  const pythonBin = process.env.PYTHON || process.env.PYTHON3 || 'python3'
  const child = spawn(pythonBin, [futuQuoteScript], {
    cwd: rootDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  const timeout = setTimeout(() => {
    child.kill('SIGTERM')
    resolve({
      ok: false,
      error: 'Futu quote fetch timed out after 45 seconds',
    })
  }, 45_000)

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })
  child.on('error', (error) => {
    clearTimeout(timeout)
    const message = error.code === 'ENOENT'
      ? `Python not found (tried "${pythonBin}"). Set PYTHON or PYTHON3 env var to the correct path.`
      : error.message
    resolve({ ok: false, error: message })
  })
  child.on('close', (code) => {
    clearTimeout(timeout)
    try {
      const jsonLine = stdout
        .trim()
        .split(/\r?\n/)
        .reverse()
        .find((line) => line.trim().startsWith('{'))
      const parsed = JSON.parse(jsonLine || stdout.trim())
      resolve(code === 0 ? parsed : { ...parsed, stderr: stderr.trim() })
    } catch (error) {
      resolve({
        ok: false,
        error: stdout.trim() || stderr.trim() || error.message,
      })
    }
  })
  child.stdin.end(JSON.stringify(payload))
})

const futuQuoteApiPlugin = () => ({
  name: 'local-futu-quote-api',
  configureServer(server) {
    server.middlewares.use('/api/industry-quotes', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'POST required' })
        return
      }
      try {
        const payload = await readJsonBody(req)
        const result = await fetchFutuQuotes(payload)
        sendJson(res, result.ok ? 200 : 503, result)
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message })
      }
    })
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/industry-quotes', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'POST required' })
        return
      }
      try {
        const payload = await readJsonBody(req)
        const result = await fetchFutuQuotes(payload)
        sendJson(res, result.ok ? 200 : 503, result)
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message })
      }
    })
  },
})

export default defineConfig({
  plugins: [react(), futuQuoteApiPlugin()],
})
