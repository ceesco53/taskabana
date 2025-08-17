// server/index.js (ESM)

import express from 'express'
import session from 'express-session'
import axios from 'axios'
import cors from 'cors'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

// ----- env -----
const {
  PORT = 4000,
  GOOGLE_CLIENT_ID = '',
  GOOGLE_CLIENT_SECRET = '',
  REDIRECT_URI = 'http://localhost:4000/auth/callback',
  SESSION_SECRET = 'dev_secret_change_me'
} = process.env

// ----- constants -----
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const OIDC_USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo'
const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/tasks'
].join(' ')

// ----- utils -----
function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}
function genCodeVerifier() {
  return base64url(crypto.randomBytes(32))
}
function genCodeChallenge(verifier) {
  return base64url(crypto.createHash('sha256').update(verifier).digest())
}

// ----- middleware -----
app.use(express.json())

app.use(
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  })
)

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: 'lax', secure: false }, // local http
  })
)

// Tiny request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
  next()
})

// ----- health -----
app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

// ----- auth (PKCE) -----
app.get('/auth/login', (req, res) => {
  const state = base64url(crypto.randomBytes(16))
  const code_verifier = genCodeVerifier()
  const code_challenge = genCodeChallenge(code_verifier)

  req.session.oauth = { state, code_verifier }

  const url = new URL(GOOGLE_AUTH)
  url.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', code_challenge)
  url.searchParams.set('code_challenge_method', 'S256')

  res.redirect(url.toString())
})

app.get('/auth/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query
    if (error) {
      console.error('OAuth error:', error)
      return res.redirect('/')
    }
    if (!code || !state) return res.redirect('/')

    const saved = req.session.oauth
    if (!saved || saved.state !== state) {
      console.error('State mismatch')
      return res.redirect('/')
    }

    const params = new URLSearchParams()
    params.set('client_id', GOOGLE_CLIENT_ID)
    if (GOOGLE_CLIENT_SECRET) params.set('client_secret', GOOGLE_CLIENT_SECRET)
    params.set('code', code)
    params.set('grant_type', 'authorization_code')
    params.set('redirect_uri', REDIRECT_URI)
    params.set('code_verifier', saved.code_verifier)

    const tokenResp = await axios.post(GOOGLE_TOKEN, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    req.session.tokens = tokenResp.data
    delete req.session.oauth
    res.redirect('/')
  } catch (e) {
    console.error('Callback failed:', e?.response?.data || e)
    res.redirect('/')
  }
})

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

// ----- session & userinfo -----
app.get('/api/session', (req, res) => {
  const authed = !!req.session?.tokens?.access_token
  res.json({ authed })
})

app.get('/api/userinfo', async (req, res, next) => {
  try {
    const tokens = req.session?.tokens
    if (!tokens?.access_token) return res.status(401).json({ error: 'Not authed' })
    const r = await axios.get(OIDC_USERINFO, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    res.json(r.data)
  } catch (e) { next(e) }
})

// ----- helpers -----
function requireAuth(req, res) {
  const tokens = req.session?.tokens
  if (!tokens?.access_token) {
    res.status(401).json({ error: 'Not authed' })
    return null
  }
  return tokens
}

// ----- Google Tasks API -----

// GET tasklists
app.get('/api/tasklists', async (req, res, next) => {
  try {
    const tokens = requireAuth(req, res); if (!tokens) return
    const r = await axios.get(`${TASKS_API_BASE}/users/@me/lists`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    res.json(r.data)
  } catch (e) { next(e) }
})

// GET tasks in list
// ?tasklist=<id>
app.get('/api/tasks', async (req, res, next) => {
  try {
    const tokens = requireAuth(req, res); if (!tokens) return
    const tasklist = req.query.tasklist
    if (!tasklist) return res.status(400).json({ error: 'tasklist required' })
    const r = await axios.get(`${TASKS_API_BASE}/lists/${encodeURIComponent(tasklist)}/tasks`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      params: {
        showCompleted: true,
        showHidden: true,   // ensure parents/subtasks aren’t dropped
        showDeleted: false,
        maxResults: 200
      }
    })
    res.json(r.data)
  } catch (e) { next(e) }
})

// POST create task (optionally as subtask)
// Body: { tasklist, task, parent?, previous? }
app.post('/api/tasks', async (req, res, next) => {
  try {
    const tokens = requireAuth(req, res); if (!tokens) return
    const { tasklist, task, parent, previous } = req.body || {}
    if (!tasklist || !task) return res.status(400).json({ error: 'tasklist and task required' })

    const params = new URLSearchParams()
    if (parent) params.set('parent', parent)
    if (previous) params.set('previous', previous)

    console.log('Creating task with params:', { parent, previous, tasklist })

    const r = await axios.post(
      `${TASKS_API_BASE}/lists/${encodeURIComponent(tasklist)}/tasks`,
      task,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        params
      }
    )
    res.json(r.data)
  } catch (e) { next(e) }
})

// PATCH update task
// Body: { tasklist, updates }
app.patch('/api/tasks/:id', async (req, res, next) => {
  try {
    const tokens = requireAuth(req, res); if (!tokens) return
    const { id } = req.params
    const { tasklist, updates } = req.body || {}
    if (!tasklist || !id) return res.status(400).json({ error: 'tasklist and id required' })

    const r = await axios.patch(
      `${TASKS_API_BASE}/lists/${encodeURIComponent(tasklist)}/tasks/${encodeURIComponent(id)}`,
      updates,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    res.json(r.data)
  } catch (e) { next(e) }
})

// DELETE task  (?tasklist=<id>)
app.delete('/api/tasks/:id', async (req, res, next) => {
  try {
    const tokens = requireAuth(req, res); if (!tokens) return
    const { id } = req.params
    const { tasklist } = req.query
    if (!tasklist || !id) return res.status(400).json({ error: 'tasklist and id required' })

    await axios.delete(
      `${TASKS_API_BASE}/lists/${encodeURIComponent(tasklist)}/tasks/${encodeURIComponent(id)}`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    )
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// POST move task (reorder and/or set parent)
// Body: { tasklist, previous?, parent? }
app.post('/api/tasks/:id/move', async (req, res, next) => {
  try {
    const tokens = requireAuth(req, res); if (!tokens) return
    const { id } = req.params
    const { tasklist, previous, parent } = req.body || {}
    if (!tasklist || !id) return res.status(400).json({ error: 'tasklist and id required' })

    const params = new URLSearchParams()
    if (previous) params.set('previous', previous)
    if (parent) params.set('parent', parent)

    const r = await axios.post(
      `${TASKS_API_BASE}/lists/${encodeURIComponent(tasklist)}/tasks/${encodeURIComponent(id)}/move`,
      null,
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        params
      }
    )
    res.json(r.data)
  } catch (e) { next(e) }
})

// ----- error handler -----
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err?.response?.data || err)
  try { res.status(500).json({ error: 'Internal Server Error' }) } catch {}
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})