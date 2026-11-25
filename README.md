<div align="center">

# 🌿 LearnLeaf Organizer

**A student-first task, subject, and project manager — built offline-first as an installable PWA.**

_Streamlining success, one task at a time._

![Version](https://img.shields.io/badge/version-3.0.0-355147)
![React](https://img.shields.io/badge/React-18.3-5B8E9F)
![Vite](https://img.shields.io/badge/Vite-5.4-8E5B9F)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-B6CDC8)
![Firebase](https://img.shields.io/badge/Firebase-10.14-9F6C5B)
![PWA](https://img.shields.io/badge/PWA-installable-907474)

</div>

---

## Table of Contents

- [What it does](#what-it-does)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
  - [Offline-first data flow](#offline-first-data-flow)
  - [Tiered loading](#tiered-loading)
  - [Auth & persistence](#auth--persistence)
- [Data model](#data-model)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration (Firebase)](#configuration-firebase)
- [Scripts](#scripts)
- [Personal API (assistant access)](#personal-api-assistant-access)
  - [Connected apps](#connected-apps)
  - [MCP server (Claude CLI and other assistants)](#mcp-server-claude-cli-and-other-assistants)
- [Build & deploy](#build--deploy)
- [PWA notes](#pwa-notes)
- [Design system](#design-system)
- [Roadmap & known limitations](#roadmap--known-limitations)

---

## What it does

LearnLeaf helps students keep school work organized in one place. You create **subjects** (your classes), group work into **projects**, and track individual **tasks** with due dates, priorities, and statuses. Everything is color-coded by subject, grouped by urgency, and viewable on a calendar.

The defining trait of v3.0 is that it's **offline-first**: the interface always reads from a local IndexedDB cache, so the app stays fast and usable even with no connection. Firebase is the source of truth in the cloud, and the two reconcile in the background.

---

## Features

**Task management**
- Tasks grouped automatically by urgency: Overdue, Today, Tomorrow, Upcoming, No Due Date
- Inline status cycling — click a task's status badge to move it through Not Started → In Progress → Completed
- Priority levels (High / Medium / Low), start dates, due dates, and due times
- Subject color-coded left border on every card
- Full-text filter bar with status, priority, subject, project, and date-comparison operators (on / before / after / on-or-before / on-or-after)

**Subjects & projects**
- Subjects carry a semester, description, and custom color (preset swatches + a custom hex picker)
- Projects link to one or more subjects and show donut-style completion progress with per-status counts
- "Next up" surfacing of the soonest open task per project
- Slide-out detail panels and create/edit sidebars for everything (no blocking modals)

**Calendar**
- Month / week / agenda views via `react-big-calendar`
- Mobile defaults to the agenda view; click any event to edit the underlying task

**Archive**
- Completed tasks plus archived subjects and projects live here
- One-click reactivation (reactivated tasks return as In Progress)

**Account & preferences**
- Email/password and Google sign-in
- Time format (12h / 24h), date format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD), and notification preferences
- Connected apps — give another of your apps its own API key, see when it was last used, revoke it any time
- Account deletion ("danger zone")

**Platform**
- Installable PWA with manifest, icons, and a service worker (auto-update)
- Mobile bottom-tab navigation + pull-to-refresh; sticky frosted-glass top bar on desktop
- Toast notifications and confirm dialogs for all destructive actions

---

## Tech stack

| Area              | Choice                                  |
|-------------------|-----------------------------------------|
| UI framework      | React 18.3                              |
| Build tool        | Vite 5.4 + `@vitejs/plugin-react`       |
| Styling           | Tailwind CSS 3.4 (+ inline styles)      |
| Routing           | React Router 6.29 (`createBrowserRouter`)|
| Backend           | Firebase 10.14 — Auth + Cloud Firestore |
| Local cache       | IndexedDB via `idb` 8                    |
| Calendar          | `react-big-calendar` 1.17 + `date-fns` 3 |
| Charts            | `recharts` 2.15                          |
| Color picker      | `react-colorful` 5.6                     |
| Calendar feeds    | `ical.js` 2.1                            |
| PWA               | `vite-plugin-pwa` 0.21                   |

---

## Architecture

### Offline-first data flow

The UI **never reads directly from Firestore**. Every page calls `getAllFromStore()` against IndexedDB and renders from that cache. Writes go to Firestore *and* the local store, with Firestore treated as best-effort:

```
                ┌──────────────┐
   read         │  IndexedDB   │   ← every page renders from here
 ───────────►   │   (idb)      │
                └──────┬───────┘
                       │ write (always)
   user action ────────┤
                       │ write (only if navigator.onLine)
                       ▼
                ┌──────────────┐
                │  Firestore   │   ← cloud source of truth
                └──────────────┘
```

- `tryFirestoreWrite()` short-circuits when offline, so the app never blocks on the network.
- If IndexedDB itself is unavailable (Safari ITP, private mode, certain hosts), `db.js` transparently falls back to an in-memory store so the app still functions for the session.
- Deletes and user-profile edits made while offline are pushed onto a queue (`queueDelete` / `queueUserUpdate`) for later reconciliation.

### Tiered loading

To make first paint after login feel instant, data loads in two tiers (see `LearnLeaf_Functions.jsx`):

- **Tier 1 — `fetchCriticalData(uid)`** (awaited, blocks navigation): pulls active subjects, active projects, and open tasks (`Not Started` / `In Progress`) ordered by due date, then writes them to IndexedDB before the router lets you into `/tasks`.
- **Tier 2 — `backgroundFetchRemaining(uid)`** (fire-and-forget): pulls *all* tasks (including completed) plus archived subjects/projects, and upserts them into the cache. Pages pick this up on their next render via a bumped `dataVersion`.

On a returning visit (page refresh), `UserState.jsx` detects a warm cache, renders immediately, then re-pulls in the background and bumps `dataVersion` to re-render with fresh data. Pull-to-refresh and explicit refreshes call `refreshAllData(uid, { clear: true })`, which wipes the stores first so records deleted in Firebase don't linger locally.

### Auth & persistence

`firebase.js` pre-tests IndexedDB before letting Firebase Auth attempt it, then falls back through `indexedDBLocalPersistence → browserLocalPersistence → inMemoryPersistence`. Consumers `await authReady` before any sign-in call so persistence is configured first. `UserState.jsx` exposes the session via the `useUser()` context (`user`, `loading`, `dataLoading`, `dataVersion`, `refreshing`, and helpers).

---

## Data model

All user data is namespaced under the signed-in user in Firestore.

```
users/{uid}
 ├─ name, email
 ├─ timeFormat, dateFormat
 ├─ notifications, notificationsFrequency[]
 ├─ icsURLs {}                         # calendar-feed URLs
 │
 ├─ tasks/{taskId}
 │    taskName, taskDescription, taskPriority, taskStatus
 │    taskSubject  → ref(subjects/{id} | noneSubject/None)
 │    taskProject  → ref(projects/{id} | noneProject/None)
 │    taskDueDate (Timestamp), taskDueTime, taskStartDate
 │    taskLMSDetails {}
 │
 ├─ subjects/{subjectId}
 │    subjectName, subjectSemester, subjectDescription
 │    subjectColor, subjectStatus, subjectLMSDetails {}
 │
 └─ projects/{projectId}
      projectName, projectDescription, projectStatus
      projectSubjects [→ refs], projectDueDate, projectDueTime
```

**Status values**

| Entity  | Allowed statuses                         |
|---------|------------------------------------------|
| Task    | `Not Started`, `In Progress`, `Completed` |
| Subject | `Active`, `Archived`, `Blocked`           |
| Project | `Active`, `Archived`                      |

Firestore stores subject/project links as document references; `docToLocal()` flattens these to plain IDs before they hit IndexedDB, and the pages re-hydrate them into objects at render time.

---

## Project structure

```
src/
├── components/
│   ├── layout/TopBar.jsx              # Sticky nav + mobile bottom tabs
│   ├── tasks/
│   │   ├── TaskCard.jsx               # Card with inline status cycling
│   │   ├── TaskForm.jsx               # Add/edit sidebar (can create subjects/projects inline)
│   │   └── TaskDetailPanel.jsx        # Read-only slide-out detail
│   ├── subjects/
│   │   ├── SubjectForm.jsx            # Create/edit + color picker
│   │   └── SubjectDetailPanel.jsx
│   ├── projects/
│   │   ├── ProjectForm.jsx
│   │   └── ProjectDetailPanel.jsx
│   ├── account/
│   │   └── ConnectedApps.jsx          # Mint/revoke API keys for your other apps
│   └── ui/
│       ├── Sidebar.jsx                # Reusable slide-out panel
│       ├── Toast.jsx
│       ├── LoadingSpinner.jsx
│       ├── ConfirmDialog.jsx
│       ├── FilterBar.jsx
│       └── PullToRefresh.jsx
├── pages/
│   ├── LoginPage / RegisterPage / ResetPasswordPage
│   ├── TasksPage.jsx                  # Main dashboard (urgency groups)
│   ├── SubjectsPage / SubjectTasksPage
│   ├── ProjectsPage / ProjectTasksPage
│   ├── CalendarPage.jsx
│   ├── ArchivePage.jsx
│   └── UserProfilePage.jsx
├── App.jsx                            # Outlet + network toasts + pull-to-refresh
├── main.jsx                           # Router, route guards, SW registration
├── UserState.jsx                      # Auth/session context (useUser)
├── LearnLeaf_Functions.jsx           # All Firebase + IndexedDB operations
├── db.js                              # IndexedDB helpers + memory fallback
├── firebase.js                        # Firebase init + persistence strategy
├── SplashScreen.jsx
└── index.css                          # Tailwind layers + global styles
```

---

## Getting started

**Prerequisites**
- Node.js 18+ and npm
- A Firebase project (Auth + Firestore enabled) if you want to run against your own backend

**Install & run**

```bash
git clone <your-repo-url>
cd learnleaf
npm install
npm run dev
```

The dev server prints a local URL (default `http://localhost:5173`).

---

## Configuration (Firebase)

The Firebase web config currently lives directly in `src/firebase.js`. To point the app at your own project, replace the `firebaseConfig` object there with your project's values, and in the Firebase console:

1. Enable **Authentication** → Email/Password and Google providers.
2. Create a **Cloud Firestore** database.
3. Add Firestore **security rules** so each user can only read/write their own document tree, e.g.:

   ```
   match /users/{uid}/{document=**} {
     allow read, write: if request.auth != null && request.auth.uid == uid;
   }
   ```

> **Note:** A Firebase web API key is not a secret — access is controlled entirely by your Auth setup and Firestore security rules, not by hiding the key. Lock down your rules before going to production. If you'd rather not commit the config, move `firebaseConfig` into a `.env` file and read it via Vite's `import.meta.env.VITE_*` variables.

---

## Scripts

| Command           | Description                                  |
|-------------------|----------------------------------------------|
| `npm run dev`     | Start the Vite dev server                    |
| `npm run start`   | Alias for `dev`                              |
| `npm run build`   | Production build to `dist/`                  |
| `npm run preview` | Preview the production build locally         |
| `npm run deploy`  | Build, then publish `dist/` via `gh-pages`   |
| `npm test`        | Run the API token tests (`node --test`)      |

---

## Personal API (assistant access)

`netlify/functions/api.mjs` is a bearer-token REST API over **one** user's tasks, subjects and projects, served at `/api/*` on the Netlify site. It uses the Firebase Admin SDK, so Firestore security rules don't apply; access is limited in code to the single user whose document stores the caller's token hash. Routes and field shapes are documented at the top of that file.

No user id, email or token is kept in Netlify. Setup:

1. **Netlify variable.** Add `FIREBASE_SERVICE_ACCOUNT` (Firebase console → Project settings → Service accounts → Generate new private key; raw JSON or base64) under Site configuration → Environment variables. Redeploy.
2. **Connect an app.** Sign in, open **Account & Preferences** (the profile page) → **Connected apps**, choose **Connect an app**, and name it (for example "Fridge Board"). The app shows a key starting `llapp_` once; copy it into the other app. See [Connected apps](#connected-apps) below.

Callers then send `Authorization: Bearer <token>`. Due dates and times use the `timezone` field on your user document, which the web app fills in automatically with your browser's timezone each time you open it (open the app once after deploying). It is per user, so people in different zones can share one deployment. Until it is set the API falls back to an optional `LEARNLEAF_TZ` variable, then to `UTC`. Never commit a token or the service-account key. Subjects and projects can be archived through the API but not deleted; tasks can be deleted.

### Connected apps

**Where:** Account & Preferences → Connected apps (`src/components/account/ConnectedApps.jsx`).

**What a key can do:** everything the personal API above can do for your account — read, create and update tasks, subjects and projects, archive subjects and projects, and delete tasks. It cannot see other people's data, and it cannot mint or revoke keys.

**Revoking:** choose **Revoke** next to the app and confirm. The key stops working straight away. Each app has its own key, so revoking one leaves the others alone. You can have up to 20 connected apps.

**How it works:** `netlify/functions/connections.mjs` (served at `/api/connections`, authenticated with your Firebase sign-in) mints a random `llapp_` token on the server and stores only its SHA-256 hash, as the document id in the top-level `apiTokens` collection (`{ uid, label, createdAt, lastUsedAt, revokedAt }`). The API checks `apiTokens/{hash}` first and records `lastUsedAt`. Client access to `apiTokens` must be denied in your Firestore rules (only the Admin SDK reads it):

```
match /apiTokens/{document=**} {
  allow read, write: if false;
}
```

**Legacy tokens still work.** Tokens made with `node scripts/make-api-token.mjs` and stored as `apiTokenHash` (string) or `apiTokenHashes` (array) on your user document are still accepted; remove the field or array entry to revoke one. New tokens should come from the Connected apps screen.

### MCP server (Claude CLI and other assistants)

`mcp/` is an [MCP](https://modelcontextprotocol.io) server over the personal API, so Claude (Claude Code CLI, Claude Desktop, or any MCP client) can read and manage your LearnLeaf data as tools. It has no dependencies and runs two ways; both use a Connected-apps key and both go through `/api`, so they can do exactly what the API can and no more.

**Tools:** `get_summary`, `list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`, `list_subjects`, `create_subject`, `update_subject`, `list_projects`, `create_project`, `update_project`.

**1. Get a key.** Account & Preferences → Connected apps → Connect an app (name it "Claude"). Copy the `llapp_` key.

**2a. Local (stdio), for Claude CLI in this repo.** `.mcp.json` already registers the `learnleaf` server (`node mcp/server.mjs`). Export the key in your shell and start Claude here; approve the project server when asked (or check `/mcp`):

```bash
export LEARNLEAF_API_TOKEN=llapp_...
```

To use it from any directory instead:

```bash
claude mcp add learnleaf --scope user -e LEARNLEAF_API_TOKEN=llapp_... -- node /path/to/LearnLeaf-Organizer/mcp/server.mjs
```

`LEARNLEAF_API_URL` overrides the API address (default `https://learnleaf.flyingdoublemranch.com/api`). `.mcp.json` also sets `NODE_USE_ENV_PROXY=1` for this server only, so it uses `HTTPS_PROXY` where one is set (Claude cloud sessions, whose proxy adds the key for `learnleaf-organizer.netlify.app`; their environment sets `LEARNLEAF_API_URL` to that address). Where no proxy is set it changes nothing.

**2b. Hosted (Streamable HTTP), nothing to run locally.** The site serves the same server at `/mcp` (`netlify/functions/mcp.mjs`):

```bash
claude mcp add --transport http learnleaf https://learnleaf.flyingdoublemranch.com/mcp --scope user --header "Authorization: Bearer llapp_..."
```

Revoking the key on the Connected apps screen cuts off either one straight away. Keep the key out of the repo: `.mcp.json` only reads it from your environment.

---

## Build & deploy

```bash
npm run build      # outputs to dist/
npm run preview    # sanity-check the build
```

**Netlify (recommended)** — `netlify.toml` is preconfigured: it runs `npm install && npm run build`, publishes `dist`, adds an SPA catch-all redirect (`/* → /index.html`), and sets no-cache headers on the service worker. Just connect the repo in Netlify and push.

**GitHub Pages** — the `deploy` script (`gh-pages -d dist`) is also wired up if you'd prefer Pages. If you deploy to a sub-path, set Vite's `base` accordingly.

---

## PWA notes

- The manifest (`public/manifest.json`) defines the installable app, icons (64/192/512), theme color `#355147`, and standalone display.
- `vite-plugin-pwa` runs in `autoUpdate` mode and precaches built assets.
- `serviceWorkerRegistration.js` verifies the SW script actually exists (and is JS) before registering, and silently bails when offline — avoiding the classic "SW registered but 404s" failure on some hosts.
- The service worker is served with no-cache headers (via `netlify.toml`) so updates roll out promptly.

---

## Design system

Built on the original LearnLeaf palette, with **Playfair Display** headings over **DM Sans** body text.

| Name          | Hex       | Usage                    |
|---------------|-----------|--------------------------|
| Opal          | `#B6CDC8` | Top bar, accents         |
| Mineral Green | `#355147` | Primary actions, text    |
| Leather       | `#9F6C5B` | Secondary, menu icon     |
| Hemp          | `#907474` | Page titles              |
| Misty Blue    | `#5B8E9F` | In-progress, links       |
| Orchid        | `#8E5B9F` | Projects accent          |
| Scarlet       | `#F3161E` | Errors, danger, overdue  |

Tokens are also exposed as Tailwind theme colors (`forest`, `opal`, `leather`, `hemp`, `misty`, `orchid`, `scarlet`) in `tailwind.config.js`.

---

## Roadmap & known limitations

- **Offline write queue isn't drained yet.** Deletes and profile edits made offline are recorded via `queueDelete` / `queueUserUpdate`, but there's no reconnect handler that flushes them back to Firestore. Wiring a flush into the `online` event in `App.jsx` would close the loop.
- **No automated tests** are configured.
- **Calendar-feed import** is scaffolded (`icsURLs` on the user, the `ical.js` dependency) but not yet surfaced as a full import flow.
- **LMS fields** (`taskLMSDetails`, `subjectLMSDetails`) exist on the model for a future import integration.
- Firebase config is committed in source — fine for a public web key, but consider env vars + strict Firestore rules for production.

---

<div align="center">
<sub>LearnLeaf Organizer v3.0 · React · Vite · Firebase · PWA</sub>
</div>
