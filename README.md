<p align="center">
  <img src="https://raw.githubusercontent.com/ceesco53/taskabana/main/client/favicon.svg" alt="Taskabana Logo" width="100" />
</p>

<h1 align="center">Taskabana</h1>

<p align="center">
  A simple <strong>Kanban board UI</strong> powered by your <strong>Google Tasks</strong>.<br/>
  Visualize, manage, and update your Google Task lists in a modern kanban-style workflow.
</p>

---

## ✨ Features

- 🔑 **Google OAuth login** — secure authentication with your Google account.
- 📋 **Google Tasks integration** — fetches your real task lists directly from Google Tasks API.
- 🗂️ **Kanban board view** — drag & drop tasks between columns.
- ➕ **Create, update, complete, and delete tasks** — everything stays synced with Google.
- 📱 **Responsive design** — works nicely on desktop and mobile.
- 💾 **Remember your last chosen Google Task list**
- 🔎 **Search & Filters:**

### Search & Filters

Type into the search bar at the top of the board to instantly narrow down visible tasks.

How it works:

- **Free text:**  
  `meeting design` matches tasks where both “meeting” AND “design” appear in the title or notes (notes are cleaned of HTML first).
- **Tags:**  
  `tag:#icebucket` or `tag:icebucket` matches tasks whose first paragraph is `#icebucket` (your existing tagging convention).
- **Due filters:**  
  - `due:today`  
  - `due:tomorrow`  
  - `due:week`  
  - `overdue`
- **Status:**  
  - `status:completed`  
  - `-status:completed` (exclude done items)

Combinations work too, e.g.:

```
tag:#icebucket overdue
design due:week -status:completed
```

---

## 🚀 Installation

### 1. Clone the repo
```bash
git clone https://github.com/<your-username>/taskabana.git
cd taskabana
```

### 2. Install dependencies
For both **client** and **server**:

```bash
# client
cd client
npm install

# server
cd ../server
npm install
```

### 3. Setup Google OAuth
- Create a project in [Google Cloud Console](https://console.cloud.google.com/).  
- Enable the **Google Tasks API**.  
- Create OAuth credentials for a Web App.  
- Add redirect URIs (e.g., `http://localhost:4000/auth/google/callback`).  
- Copy your `CLIENT_ID` and `CLIENT_SECRET`.

Update `server/.env`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
SESSION_SECRET=your-random-secret
CALLBACK_URL=http://localhost:4000/auth/google/callback
```

### 4. Run the app

Open two terminals:

```bash
# Terminal 1: Server
cd server
npm run dev

# Terminal 2: Client
cd client
npm run dev
```

Now open: **http://localhost:5173** (or whatever Vite shows).

---

## 🖼️ Screenshots

### Login
![Login screen](docs/screenshots/login.png)

### Kanban board
![Kanban board](docs/screenshots/kanban.png)

### Task list picker
![Task list picker](docs/screenshots/list-picker.png)

---

## 🧩 Tech Stack

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Node.js + Express
- **Auth:** Google OAuth2
- **Data:** Google Tasks API
- **State Persistence:** LocalStorage (per-user task list memory)

---

## 🔄 Development Workflow

- PRs welcome! Fork the repo, create a branch, and open a pull request.
- Commit convention:  
  - `feat:` new features  
  - `fix:` bug fixes  
  - `chore:` infra, deps, config  
  - `docs:` readme/docs updates  

---

## 🛠️ Future Improvements

- [ ] Offline mode
- [ ] Dark mode
- [ ] Task filtering & search
- [ ] Multi-column board customization

---

## 📜 License

MIT © [John Nelson](https://github.com/ceesco53)