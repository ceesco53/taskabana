import express from 'express';
import session from 'express-session';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // set true behind HTTPS in production
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 12 // 12h
  }
}));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Optional: serve static production build
if ((process.env.SERVER_SERVE_STATIC || 'false').toLowerCase() === 'true') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// ------------ Utilities (PKCE + OAuth helpers) ---------------
function base64urlencode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

function generateCodeVerifier() {
  // 43..128 chars
  const verifier = base64urlencode(crypto.randomBytes(64));
  return verifier;
}

function codeChallengeFromVerifier(v) {
  return base64urlencode(sha256(Buffer.from(v)));
}

const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/callback`;
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/tasks'
].join(' ');

function ensureAuthed(req, res, next) {
  if (req.session.tokens && req.session.tokens.access_token) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

async function refreshAccessTokenIfNeeded(req) {
  const tokens = req.session.tokens;
  if (!tokens) return;

  const expiresAt = tokens.obtained_at + (tokens.expires_in - 30) * 1000; // refresh 30s early
  if (Date.now() < expiresAt) return;

  if (!tokens.refresh_token) {
    // No refresh token; require re-login
    throw new Error('Access token expired; no refresh token available.');
  }

  const params = new URLSearchParams();
  params.set('client_id', CLIENT_ID);
  params.set('client_secret', CLIENT_SECRET);
  params.set('grant_type', 'refresh_token');
  params.set('refresh_token', tokens.refresh_token);

  const resp = await axios.post(OAUTH_TOKEN_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const data = resp.data;
  req.session.tokens = {
    ...tokens,
    access_token: data.access_token,
    expires_in: data.expires_in,
    scope: data.scope || tokens.scope,
    token_type: data.token_type || 'Bearer',
    obtained_at: Date.now()
  };
}

// ------------------- Auth routes ------------------------
app.get('/auth/login', (req, res) => {
  const code_verifier = generateCodeVerifier();
  const code_challenge = codeChallengeFromVerifier(code_verifier);

  // Store in session
  req.session.pkce = { code_verifier };

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline', // request refresh_token
    prompt: 'consent',      // ensure refresh_token each time (for demo)
    code_challenge,
    code_challenge_method: 'S256',
    include_granted_scopes: 'true'
  });

  res.redirect(`${OAUTH_AUTH_URL}?${params.toString()}`);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  const code_verifier = req.session?.pkce?.code_verifier;
  if (!code || !code_verifier) {
    return res.status(400).send('Missing authorization code or PKCE verifier.');
  }

  try {
    const params = new URLSearchParams();
    params.set('client_id', CLIENT_ID);
    params.set('client_secret', CLIENT_SECRET);
    params.set('code', code);
    params.set('code_verifier', code_verifier);
    params.set('grant_type', 'authorization_code');
    params.set('redirect_uri', REDIRECT_URI);

    const resp = await axios.post(OAUTH_TOKEN_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const data = resp.data;
    req.session.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token, // may be undefined if not first consent
      expires_in: data.expires_in,
      scope: data.scope,
      token_type: data.token_type,
      obtained_at: Date.now()
    };
    delete req.session.pkce;

    // Redirect back to app
    res.redirect('http://localhost:5173/');
  } catch (e) {
    console.error('Token exchange failed:', e?.response?.data || e.message);
    res.status(500).send('Auth failed.');
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/session', (req, res) => {
  try {
    const authed = !!(req.session && req.session.tokens && req.session.tokens.access_token);
    res.json({ authed });
  } catch (err) {
    console.error('Session check failed:', err);
    res.status(200).json({ authed: false });
  }
});

app.get('/api/userinfo', ensureAuthed, async (req, res) => {
  try {
    await refreshAccessTokenIfNeeded(req);
    const tokens = req.session.tokens;
    const resp = await axios.get(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    res.json(resp.data);
  } catch (e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// ------------------- Google Tasks API proxy ------------------------
app.get('/api/tasklists', ensureAuthed, async (req, res) => {
  try {
    await refreshAccessTokenIfNeeded(req);
    const tokens = req.session.tokens;
    const resp = await axios.get(`${TASKS_API_BASE}/users/@me/lists`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      params: { maxResults: 100 }
    });
    res.json(resp.data);
  } catch (e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ error: 'Failed to fetch task lists' });
  }
});

app.get('/api/tasks', ensureAuthed, async (req, res) => {
  const { tasklist } = req.query;
  if (!tasklist) return res.status(400).json({ error: 'Missing tasklist' });
  try {
    await refreshAccessTokenIfNeeded(req);
    const tokens = req.session.tokens;
    const resp = await axios.get(`${TASKS_API_BASE}/lists/${encodeURIComponent(tasklist)}/tasks`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      params: {
        showCompleted: true,
        showHidden: true,   // include hidden parents/subtasks
        showDeleted: false,
        maxResults: 200
      }
    });
    res.json(resp.data);
  } catch (e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.patch('/api/tasks/:taskId', ensureAuthed, async (req, res) => {
  const { taskId } = req.params;
  const { tasklist, updates } = req.body || {};
  if (!tasklist || !taskId) return res.status(400).json({ error: 'Missing tasklist or taskId' });
  try {
    await refreshAccessTokenIfNeeded(req);
    const tokens = req.session.tokens;
    const resp = await axios.patch(`${TASKS_API_BASE}/lists/${encodeURIComponent(tasklist)}/tasks/${encodeURIComponent(taskId)}`, updates, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(resp.data);
  } catch (e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ error: 'Failed to update task' });
  }
});


// Insert (create) a task
app.post('/api/tasks', ensureAuthed, async (req, res) => {
  const { tasklist, task } = req.body || {};
  if (!tasklist || !task) return res.status(400).json({ error: 'Missing tasklist or task' });
  try {
    await refreshAccessTokenIfNeeded(req);
    const tokens = req.session.tokens;
    const resp = await axios.post(`${TASKS_API_BASE}/lists/${encodeURIComponent(tasklist)}/tasks`, task, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(resp.data);
  } catch (e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Delete a task
app.delete('/api/tasks/:taskId', ensureAuthed, async (req, res) => {
  const { taskId } = req.params;
  const { tasklist } = req.query;
  if (!tasklist || !taskId) return res.status(400).json({ error: 'Missing tasklist or taskId' });
  try {
    await refreshAccessTokenIfNeeded(req);
    const tokens = req.session.tokens;
    await axios.delete(`${TASKS_API_BASE}/lists/${encodeURIComponent(tasklist)}/tasks/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Move a task (persist ordering) - append after "previous" if provided
app.post('/api/tasks/:taskId/move', ensureAuthed, async (req, res) => {
  const { taskId } = req.params;
  const { tasklist, previous, parent } = req.body || {};
  if (!tasklist || !taskId) return res.status(400).json({ error: 'Missing tasklist or taskId' });
  try {
    await refreshAccessTokenIfNeeded(req);
    const tokens = req.session.tokens;
    const params = new URLSearchParams();
    if (previous) params.set('previous', previous);
    if (parent) params.set('parent', parent);
    const resp = await axios.post(`${TASKS_API_BASE}/lists/${encodeURIComponent(tasklist)}/tasks/${encodeURIComponent(taskId)}/move`, null, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      params
    });
    res.json(resp.data);
  } catch (e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ error: 'Failed to move task' });
  }
});

// healthcheck
app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err && (err.stack || err));
  try {
    res.status(500).json({ error: 'Internal Server Error' });
  } catch {}
});

// Fallback to SPA (prod)
if ((process.env.SERVER_SERVE_STATIC || 'false').toLowerCase() === 'true') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
