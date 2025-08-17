# Google Tasks Kanban (PKCE + React + Express)

A minimal, expandable Kanban board for Google Tasks using **Authorization Code + PKCE** (server exchange) and a lightweight React front‑end.

## Features
- **Auth**: Google OAuth2 **Authorization Code** flow with **PKCE** (handled by the Express server).
- **Kanban**: Columns for **In Progress**, **Completed**, and **Icebucket**.
- **Drag & Drop**: Move tasks between columns; updates Google Tasks accordingly.
  - Dropping to **Completed** sets `status=completed`.
  - Dropping to **In Progress** sets `status=needsAction` and removes `#icebucket` marker from notes.
  - Dropping to **Icebucket** sets/keeps `status=needsAction` and **adds** `#icebucket` marker in notes.
- **Theme switcher**: Light, Dark, and High Contrast themes with persistence.
- **Tasklist chooser**: Pick any of your Google Task lists.
- **Vite proxy**: `client` dev server proxies `/api` & `/auth` to `server`.

> This app is intentionally simple so you can expand it later: subtasks, due dates, sorting, filters, etc.

---

## Quick Start (Local Dev)

### 1) Create a Google Cloud OAuth Client
1. Go to **Google Cloud Console** → APIs & Services → **Credentials**.
2. **Create OAuth client ID**:
   - **Application type**: **Web application** (confidential client).
   - **Authorized redirect URIs**: add `http://localhost:4000/auth/callback`
   - (Optional) Add `http://localhost:5173` to authorized JavaScript origins if you wish, though not strictly required for server-side code flow.
3. **Enable APIs**: Under **APIs & Services → Library**, enable **Google Tasks API** and **Google People API** (for basic profile) if desired.

> Using a **Web application** client provides a client secret; the server uses it to exchange the authorization code for tokens. We also use **PKCE** to protect the auth code.

### 2) Configure server env
Copy and edit `server/.env.example` to `server/.env`:
```
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
REDIRECT_URI=http://localhost:4000/auth/callback
SESSION_SECRET=dev_change_me
```
> `SESSION_SECRET` can be any random string for local dev.

### 3) Install deps & run
In one terminal:
```
cd server
npm i
npm run dev
```

In another terminal:
```
cd client
npm i
npm run dev
```

- Open **http://localhost:5173**
- Click **Sign in with Google** → consent → you’ll land back on the app.
- Choose a Task List, drag tasks between columns, and switch themes.

---

## Production build
1. Build client: `cd client && npm run build`
2. Copy `client/dist` to `server/public` (or set `SERVER_SERVE_STATIC=true` and place files accordingly).
3. Run server: `cd server && npm run start`

> For a real deployment, use a proper session store (Redis/DB) and HTTPS. This demo uses in-memory sessions for simplicity.

---

## How categorization works
The Google Tasks API has only two statuses per task: `needsAction` and `completed`. To support three columns:
- **Completed**: `status === "completed"`
- **Icebucket**: `status === "needsAction"` **AND** notes contain the tag `#icebucket` (case-insensitive)
- **In Progress**: everything else (`status === "needsAction"` without the `#icebucket` tag)

When you drag a card:
- → **Completed**: set `status=completed`, remove `#icebucket` if present, set `completed` timestamp.
- → **In Progress**: set `status=needsAction`, clear `completed`, remove `#icebucket`.
- → **Icebucket**: set `status=needsAction`, clear `completed`, **add** `#icebucket` to notes.

You can change the marker or logic in `client/src/kanban.ts` and server update handler.

---

## Notes & Security
- This demo uses **Authorization Code + PKCE** and exchanges the code on the server, not in the browser.
- Tokens (access & refresh) are stored in the server session. The front-end never sees refresh tokens.
- In production: use HTTPS, secure cookies, and a durable session store.

---

## Customize / Extend
- Add sorting by `updated` or `due`.
- Add create/delete tasks or move between Task **lists**.
- Persist per-column order using Tasks API `move` (add calls in server).
- Add labels by using note markers (`#tag`) or dedicate separate Task lists.

Enjoy hacking! 🚀
